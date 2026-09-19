/**
 * Variation C of the Work board detail view: the record mosaic.
 *
 * The mosaic puts one tile on screen per record kind — goal, intent, narrative,
 * assessment, pr-draft, diagrams — plus the decisions, epics, slices, and pull
 * requests the index joins to the design. A reviewer sees at a glance which records
 * a design holds and which it lacks, because an absent record keeps its tile and the
 * tile names what is missing.
 *
 * ## How this component gets its data
 *
 * It reads two files, and it can be wired either way.
 *
 *   1. `data/index.json`, through `loadIndex()` in `@/data/bundle`. A host that
 *      already loaded the index passes it as `index`, and the component reads no
 *      file itself. With no `index` prop it loads the index, and it shows a loading
 *      state and an error state for that read.
 *   2. `data/designs.js`, through `loadDesigns()` in `./records`. That read always
 *      belongs to this component, and it has its own loading and error states.
 *
 * Both call shapes work, so a host may render `<RecordMosaic rows={rows} />` exactly
 * as it renders `WorkBoard`, or render `<RecordMosaic />` with no props at all.
 *
 * ## Prototype affordances, marked
 *
 * The query parameter `records` makes two required states reachable for review:
 *
 *   `?records=slow`  holds the loading state for three seconds.
 *   `?records=error` fails the record read on purpose and shows the error state.
 *
 * Both are labelled in the interface while they are active, and neither invents a
 * record. They only change how the read behaves.
 */

import { motion, useReducedMotion } from "motion/react";
import { AlertTriangle, RefreshCw, Sun, Moon, Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { designRows, entitiesOf, joinsOf, loadIndex } from "@/data/bundle";
import type { DesignRow, RecordIndex } from "@/data/types";

import { Board, BoardKey } from "./Board";
import type { Theme } from "./Mermaid";
import { buildBundleModel, loadDesigns } from "./records";
import type { BundleModel } from "./records";
import { Mosaic } from "./tiles/Mosaic";
import type { TileContext } from "./tiles/context";
import type { DesignRecordMap } from "./types";
import { ActionButton, Chip } from "./ui";

export interface RecordMosaicProps {
  /** The record index, when the host already read one from `loadIndex()`. */
  index?: RecordIndex;
  /** The design rows, when the host already resolved them from `designRows()`. */
  rows?: DesignRow[];
}

type IndexLoad =
  | { state: "loading" }
  | { state: "ready"; index: RecordIndex }
  | { state: "failed"; message: string };

type RecordsLoad =
  | { state: "loading" }
  | { state: "ready"; map: DesignRecordMap }
  | { state: "failed"; message: string };

/** The forced-read modes, declared in the header of this file. */
function forcedRecordsMode(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("records");
}

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export default function RecordMosaic(props: RecordMosaicProps = {}) {
  const [indexLoad, setIndexLoad] = useState<IndexLoad>(() =>
    props.index ? { state: "ready", index: props.index } : { state: "loading" },
  );
  const [records, setRecords] = useState<RecordsLoad>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [lane, setLane] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(readTheme);

  /* The theme switch writes the one attribute the palette defines, so it cannot
     drift from the shadcn components that read the same tokens. */
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  /* One read of the record index, unless the host supplied one. */
  useEffect(() => {
    if (props.index) return;
    let live = true;
    loadIndex()
      .then((index) => {
        if (live) setIndexLoad({ state: "ready", index });
      })
      .catch((error: unknown) => {
        if (live) {
          setIndexLoad({
            state: "failed",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });
    return () => {
      live = false;
    };
  }, [props.index, attempt]);

  /* One read of the authored records, always owned by this component. */
  useEffect(() => {
    let live = true;
    setRecords({ state: "loading" });
    const mode = forcedRecordsMode();
    const read = async (): Promise<DesignRecordMap> => {
      if (mode === "error") {
        throw new Error(
          "Forced failure: the records read was made to fail by the records=error query parameter, a prototype affordance.",
        );
      }
      if (mode === "slow") {
        await new Promise((resolve) => window.setTimeout(resolve, 3000));
      }
      return loadDesigns();
    };
    read()
      .then((map) => {
        if (live) setRecords({ state: "ready", map });
      })
      .catch((error: unknown) => {
        if (live) {
          setRecords({
            state: "failed",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });
    return () => {
      live = false;
    };
  }, [attempt]);

  const rows: DesignRow[] = useMemo(() => {
    if (indexLoad.state !== "ready") return [];
    if (props.rows) return props.rows;
    const entities = entitiesOf(indexLoad.index);
    return designRows(entities.design, entities.epic, entities.slice, joinsOf(indexLoad.index));
  }, [indexLoad, props.rows]);

  const model: BundleModel | null = useMemo(() => {
    if (indexLoad.state !== "ready" || records.state !== "ready") return null;
    return buildBundleModel(indexLoad.index, rows, records.map);
  }, [indexLoad, records, rows]);

  const ctx: TileContext | null = useMemo(() => {
    if (!model) return null;
    return { model, theme, openDesign: (id: string) => setSelected(id) };
  }, [model, theme]);

  const active = model && selected ? model.byId.get(selected) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <Toolbar
        indexLoad={indexLoad}
        records={records}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        onRetry={() => setAttempt((value) => value + 1)}
      />

      <div className="border-b border-line-soft bg-surface-2/60 px-4 py-2">
        <BoardKey />
      </div>

      <main className="min-h-0 flex-1">
        {indexLoad.state === "failed" ? (
          <Panel
            title="The record index did not load"
            message={indexLoad.message}
            hint="The board reads every design, epic, and slice from data/index.json. Nothing renders without it."
            onRetry={() => setAttempt((value) => value + 1)}
          />
        ) : indexLoad.state === "loading" ? (
          <Notice text="Reading the record index." />
        ) : records.state === "failed" ? (
          <Panel
            title="The authored records did not load"
            message={records.message}
            hint="The board still holds every design from the index, and it cannot say which records a design carries. A missing record and an unread record are different states, so the board does not draw record strips from a failed read."
            onRetry={() => setAttempt((value) => value + 1)}
          />
        ) : !model || !ctx ? (
          <RecordSkeleton />
        ) : active ? (
          <ScrollArea className="h-full">
            <div className="px-4 pt-4 pb-14">
              <Mosaic design={active} ctx={ctx} onBack={() => setSelected(null)} />
            </div>
          </ScrollArea>
        ) : (
          <Board model={model} lane={lane} onLaneChange={setLane} onOpen={setSelected} />
        )}
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------- toolbar */

function Toolbar({
  indexLoad,
  records,
  theme,
  onToggleTheme,
  onRetry,
}: {
  indexLoad: IndexLoad;
  records: RecordsLoad;
  theme: Theme;
  onToggleTheme: () => void;
  onRetry: () => void;
}) {
  const counts =
    indexLoad.state === "ready"
      ? (() => {
          const entities = entitiesOf(indexLoad.index);
          return [
            [entities.design.length, "designs"],
            [entities.epic.length, "epics"],
            [entities.slice.length, "slices"],
            [entities.adr.length, "decisions"],
            [entities.pull_request.length, "pull requests"],
          ] as Array<[number, string]>;
        })()
      : [];

  const NextIcon = theme === "dark" ? Sun : Moon;

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-3 pb-2">
      <div className="min-w-0">
        <h2 className="m-0 font-mono text-[15px] font-bold tracking-[0.04em] text-ink-mid uppercase">
          Record mosaic
        </h2>
        <p className="m-0 max-w-[80ch] font-serif text-[15px] leading-[1.5] text-ink-dim">
          One tile per record kind. An absent record keeps its tile and names what is
          missing, so the mosaic reads as a completeness map for a design.
        </p>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {counts.map(([count, label]) => (
          <Chip key={String(label)}>
            <b className="text-[14px] font-bold text-foreground tabular-nums">{count}</b>
            {label}
          </Chip>
        ))}

        <span className="inline-flex items-center gap-2">
          {records.state === "ready" ? (
            <Chip muted>records read</Chip>
          ) : records.state === "loading" ? (
            <Chip muted>reading records</Chip>
          ) : (
            <ActionButton icon={RefreshCw} onClick={onRetry}>
              Retry records
            </ActionButton>
          )}
        </span>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-pressed={theme === "dark"}
          aria-label={`Switch to the ${theme === "dark" ? "light" : "dark"} theme`}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 font-mono text-[14px] font-bold text-ink-mid transition-colors duration-150 ease-house hover:border-primary hover:bg-accent-wash hover:text-accent-deep"
        >
          <NextIcon className="size-4" aria-hidden />
          {theme === "dark" ? "Dark" : "Light"}
          <span className="font-normal text-ink-faint">· switch</span>
        </button>
      </div>

      {forcedRecordsMode() !== null ? (
        <p className="m-0 flex w-full items-center gap-2 font-mono text-[13px] text-warn">
          <Info className="size-4" aria-hidden />
          prototype affordance active: records={forcedRecordsMode()}
        </p>
      ) : null}
    </header>
  );
}

/* ------------------------------------------------------------ load states */

function Notice({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-6">
      <p className="m-0 font-serif text-[17px] text-ink-dim">{text}</p>
    </div>
  );
}

function Panel({
  title,
  message,
  hint,
  onRetry,
}: {
  title: string;
  message: string;
  hint: string;
  onRetry: () => void;
}) {
  return (
    <div className="px-4 py-6">
      <div className="flex max-w-[86ch] flex-col gap-3 rounded-xl border border-dashed border-warn bg-warn-wash/70 px-4 py-4">
        <p className="m-0 flex items-center gap-2 font-mono text-[14px] font-bold tracking-[0.05em] text-warn uppercase">
          <AlertTriangle className="size-4" aria-hidden />
          {title}
        </p>
        <p className="m-0 font-serif text-[16.5px] leading-[1.6] text-ink-mid">{message}</p>
        <p className="m-0 font-serif text-[15.5px] leading-[1.55] text-ink-dim">{hint}</p>
        <ActionButton icon={RefreshCw} onClick={onRetry} className="self-start">
          Read again
        </ActionButton>
      </div>
    </div>
  );
}

/** The loading state for the records read. Six placeholder tiles, then the board. */
function RecordSkeleton() {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <p className="m-0 font-serif text-[17px] text-ink-dim">
        Reading designs.js, the file that holds each design's authored records.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <motion.div
            key={index}
            initial={reduce ? false : { opacity: 0.4 }}
            animate={{ opacity: [0.4, 0.85, 0.4] }}
            transition={{
              duration: reduce ? 0 : 1.6,
              repeat: reduce ? 0 : Number.POSITIVE_INFINITY,
              delay: reduce ? 0 : index * 0.08,
              ease: "easeInOut",
            }}
            className="flex h-52 flex-col gap-3 rounded-xl border border-dashed border-line bg-surface-2/60 p-4"
          >
            <div className="h-5 w-2/3 rounded bg-line-soft" />
            <div className="h-4 w-full rounded bg-line-soft" />
            <div className="h-4 w-5/6 rounded bg-line-soft" />
            <div className="mt-auto flex gap-2">
              <div className="h-6 w-20 rounded bg-line-soft" />
              <div className="h-6 w-24 rounded bg-line-soft" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
