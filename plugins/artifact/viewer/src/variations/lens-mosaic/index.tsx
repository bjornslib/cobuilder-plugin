/**
 * Variation A of three for the Work board detail view: the lens mosaic.
 *
 * READ THIS FIRST. The board is a bento of six lenses, not a filter row over a
 * uniform grid.
 *
 *   Build is the largest tile. It holds the epic tree with its slices nested inside
 *   it and selectable. Intent, Problem, and Solution sit in one row of three.
 *   Architecture is a wide tile, because it holds the diagram sources. Risks and
 *   verdict is a standard tile carrying the real assessment.
 *
 * Lanes are tabs. Superseded designs belong to no lane, so they sit in their own
 * group under All and each one states which design replaced it.
 *
 * WHAT THIS FILE OWNS. The data load, the lane tabs, the design selection, the theme,
 * and the bento arrangement. Each lens is its own module. The state vocabularies,
 * the lane rule, the lens rules, and the record reader are each in their own file,
 * so a second variation can reuse the parts it agrees with.
 *
 * DATA. The load and the joins come from `@/data/bundle`, which ADR-0018's index
 * already computed. Nothing here derives a join a second time, because a second
 * derivation is how two surfaces drift apart.
 */

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CornerDownRight, RotateCw } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  designRows,
  entitiesOf,
  joinsOf,
  loadIndex,
} from "@/data/bundle";
import type { AdrEntity, DesignRow, RecordIndex } from "@/data/types";
import { cn } from "@/lib/utils";

import { ArchitectureTile } from "./ArchitectureTile";
import { BuildTile } from "./BuildTile";
import { LaneSection } from "./DesignGrid";
import { CorpusLine, LoadPanel, PrototypeNotes, ThemeToggle } from "./PageChrome";
import { Chip, CLICKABLE_ROW, Disclosure, ProseBox } from "./primitives";
import { IntentTile, ProblemTile, SolutionTile } from "./TextTiles";
import { RisksTile } from "./RisksTile";
import { LANES, laneLabelFor } from "./lanes";
import {
  architectureStatus,
  buildStatus,
  intentStatus,
  problemStatus,
  risksStatus,
  solutionStatus,
} from "./lenses";
import { useDesignRecords, type DesignRecord } from "./records";
import { useTheme } from "./theme";

export interface LensMosaicProps {
  /**
   * Preview-harness only. It forces the load into a state a reviewer would
   * otherwise have to break the server to see. Nothing in the application sets it.
   */
  loadOverride?: "slow" | "error" | null;
  /** Open one design straight away. The preview harness uses it to jump. */
  initialDesignId?: string | null;
}

type IndexLoad =
  | { state: "loading" }
  | { state: "ready"; index: RecordIndex }
  | { state: "failed"; message: string; simulated?: boolean };

/**
 * Radix gives the active tab panel a tab stop and its own `outline-none`. A reader
 * who tabs into the panel sees nothing, so the panel gets a ring back.
 */
const PANEL_FOCUS =
  "mt-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

const SIMULATED_ERROR =
  "Simulated failure, set by the preview harness. The real failure path is the one a reader sees when the dev server is not running or the bundle is missing, and it carries the server's own status code and a hint about which file was not found.";

export default function LensMosaic({
  loadOverride = null,
  initialDesignId = null,
}: LensMosaicProps) {
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<IndexLoad>({ state: "loading" });
  const [tab, setTab] = useState("all");
  const [openDesignId, setOpenDesignId] = useState<string | null>(initialDesignId);
  const { theme, toggle } = useTheme();

  // The parent owns `initialDesignId`, so a change to it wins, including a change
  // back to null. The effect keys on the value, so a reader's own navigation inside
  // the board is not undone by a re-render that repeats the same value.
  useEffect(() => {
    setOpenDesignId(initialDesignId);
  }, [initialDesignId]);

  useEffect(() => {
    let live = true;

    if (loadOverride === "error") {
      setLoad({ state: "failed", message: SIMULATED_ERROR, simulated: true });
      return;
    }

    setLoad({ state: "loading" });
    const wait = loadOverride === "slow" ? 2600 : 0;
    const started = Date.now();

    loadIndex()
      .then((index) => {
        const remaining = Math.max(0, wait - (Date.now() - started));
        window.setTimeout(() => {
          if (live) setLoad({ state: "ready", index });
        }, remaining);
      })
      .catch((error: unknown) => {
        if (!live) return;
        setLoad({
          state: "failed",
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      live = false;
    };
  }, [attempt, loadOverride]);

  const recordsLoad = useDesignRecords(attempt);

  const index = load.state === "ready" ? load.index : null;

  const rows: DesignRow[] = useMemo(() => {
    if (!index) return [];
    const entities = entitiesOf(index);
    return designRows(
      entities.design,
      entities.epic,
      entities.slice,
      joinsOf(index),
    );
  }, [index]);

  const adrsById: Map<string, AdrEntity> = useMemo(() => {
    const map = new Map<string, AdrEntity>();
    if (!index) return map;
    for (const adr of entitiesOf(index).adr) map.set(adr.id, adr);
    return map;
  }, [index]);

  const epicDesignTitles: Map<string, string> = useMemo(() => {
    const map = new Map<string, string>();
    if (!index) return map;
    for (const design of entitiesOf(index).epic_design) {
      map.set(`${design.feature_slug}/${design.epic_id}`, design.title);
    }
    return map;
  }, [index]);

  const openRow = openDesignId
    ? (rows.find((row) => row.design.id === openDesignId) ?? null)
    : null;
  const openRecord: DesignRecord | null =
    openDesignId && recordsLoad.state === "ready"
      ? (recordsLoad.records[openDesignId] ?? null)
      : null;

  const laneRows = (stages: string[]) =>
    rows.filter((row) => stages.includes(row.design.stage));

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full min-h-0 flex-col bg-background">
        <header className="flex flex-wrap items-end gap-x-6 gap-y-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <h1 className="m-0 font-mono text-[26px] leading-tight font-bold tracking-[-0.03em]">
              CoBuilder viewer{" "}
              <span className="text-ink-faint">&middot;</span> Work
            </h1>
            <p className="mt-1.5 max-w-[80ch] font-serif text-[17px] leading-[1.5] text-ink-mid">
              Every design in this repository's own record index, read through six
              lenses. Pick a lane to narrow the board, then open a design.
            </p>
          </div>
          <div className="ml-auto flex items-end gap-3">
            {index ? <CorpusLine index={index} /> : null}
            <ThemeToggle theme={theme} onToggle={toggle} />
          </div>
        </header>

        <div className="px-5 pb-3">
          <PrototypeNotes />
        </div>

        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value);
            setOpenDesignId(null);
          }}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          {/*
            The lane strip scrolls sideways rather than pushing the page wider. Five
            tabs at a readable size do not fit a narrow window, and a tab that cannot
            be reached is worse than one that needs a scroll.
          */}
          <div className="overflow-x-auto border-y border-line bg-surface-2 px-5 py-2">
            <TabsList variant="line" className="h-auto gap-1 bg-transparent p-0">
              {/*
                No count while the index is unread. A count of zero would claim the
                board is empty, and an unread index says nothing about the board.
              */}
              <TabTrigger
                value="all"
                label="All"
                count={index ? rows.length : null}
              />
              {LANES.map((lane) => (
                <TabTrigger
                  key={lane.key}
                  value={lane.key}
                  label={lane.label}
                  count={index ? laneRows(lane.stages).length : null}
                />
              ))}
              <span className="ml-2 hidden self-center font-mono text-[12px] whitespace-nowrap text-ink-faint xl:inline">
                a superseded design belongs to no lane, so it lives under All
              </span>
            </TabsList>
          </div>

          <main className="min-h-0 flex-1 overflow-y-auto">
            {load.state === "loading" ? (
              <div className="px-5 py-5">
                <LoadPanel kind="loading" onRetry={() => setAttempt((n) => n + 1)} />
              </div>
            ) : null}

            {load.state === "failed" ? (
              <div className="px-5 py-5">
                <LoadPanel
                  kind="failed"
                  message={load.message}
                  onRetry={() => setAttempt((n) => n + 1)}
                />
              </div>
            ) : null}

            {load.state === "ready" ? (
              <>
                {/*
                  Radix makes the active panel a tab stop, and its own class list
                  hides the outline. A keyboard reader who lands there needs to see
                  where they are, so the panel carries a ring.
                */}
                <TabsContent value="all" className={PANEL_FOCUS}>
                  {openRow ? (
                    <Mosaic
                      row={openRow}
                      record={openRecord}
                      recordsLoad={recordsLoad}
                      index={load.index}
                      adrsById={adrsById}
                      epicDesignTitles={epicDesignTitles}
                      theme={theme}
                      onOpenDesign={setOpenDesignId}
                      onBack={() => setOpenDesignId(null)}
                      onRetryRecords={() => setAttempt((n) => n + 1)}
                    />
                  ) : (
                    <div className="px-5 py-5">
                      <LaneSection
                        lane={null}
                        rows={rows}
                        recordsLoad={recordsLoad}
                        onOpen={setOpenDesignId}
                      />
                    </div>
                  )}
                </TabsContent>

                {LANES.map((lane) => (
                  <TabsContent
                    key={lane.key}
                    value={lane.key}
                    className={PANEL_FOCUS}
                  >
                    <div className="px-5 py-5">
                      <LaneSection
                        lane={lane}
                        rows={laneRows(lane.stages)}
                        recordsLoad={recordsLoad}
                        onOpen={setOpenDesignId}
                      />
                    </div>
                  </TabsContent>
                ))}
              </>
            ) : null}
          </main>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

function TabTrigger({
  value,
  label,
  count,
}: {
  value: string;
  label: string;
  count: number | null;
}) {
  return (
    <TabsTrigger
      value={value}
      className="h-9 cursor-pointer gap-2 rounded-none px-2.5 font-mono text-[13.5px] font-bold data-active:text-accent-deep"
    >
      {label}
      {count === null ? null : (
        <span className="font-mono text-[12px] font-normal text-ink-faint tabular-nums">
          {count}
        </span>
      )}
    </TabsTrigger>
  );
}

/**
 * The mosaic itself: one design, six lenses, one bento.
 *
 * The grid below is the whole arrangement. Change these spans and the variation
 * becomes a different one, which is why the layout sits in one place rather than in
 * six tiles.
 */
function Mosaic({
  row,
  record,
  recordsLoad,
  index,
  adrsById,
  epicDesignTitles,
  theme,
  onOpenDesign,
  onBack,
  onRetryRecords,
}: {
  row: DesignRow;
  record: DesignRecord | null;
  recordsLoad: ReturnType<typeof useDesignRecords>;
  index: RecordIndex;
  adrsById: Map<string, AdrEntity>;
  epicDesignTitles: Map<string, string>;
  theme: ReturnType<typeof useTheme>["theme"];
  onOpenDesign: (designId: string) => void;
  onBack: () => void;
  onRetryRecords: () => void;
}) {
  const { design } = row;
  const joins = joinsOf(index);
  const supersededBy = record?.goal.superseded_by ?? null;
  const supersedes = record?.goal.supersedes ?? [];

  const lenses = [
    { name: "Build", status: buildStatus(row, design.id) },
    { name: "Intent", status: intentStatus(record, design.id) },
    { name: "Problem", status: problemStatus(record, design.id) },
    { name: "Solution", status: solutionStatus(record, design.id) },
    { name: "Architecture", status: architectureStatus(record, design.id) },
    { name: "Risks and verdict", status: risksStatus(record, design.id) },
  ];
  const known = recordsLoad.state === "ready";
  const present = known ? lenses.filter((lens) => lens.status.present) : [];
  const missing = known ? lenses.filter((lens) => !lens.status.present) : [];

  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 font-mono text-[12.5px] font-bold text-ink-mid transition-colors duration-150 ease-house hover:bg-surface-2 hover:text-foreground",
              CLICKABLE_ROW,
            )}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            All designs
          </button>
          <Chip tone="muted" title="The lane this design's stage belongs to.">
            lane: {laneLabelFor(design.stage)}
          </Chip>
          {known ? (
            <Chip
              tone={missing.length === 0 ? "good" : "warn"}
              title={
                missing.length === 0
                  ? "Every lens has a record."
                  : `Disabled: ${missing.map((lens) => lens.name).join(", ")}`
              }
            >
              {present.length} of {lenses.length} lenses hold a record
            </Chip>
          ) : (
            <Chip tone="muted">reading the authored records</Chip>
          )}
          {recordsLoad.state === "failed" ? (
            <button
              type="button"
              onClick={onRetryRecords}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-warn bg-card px-2.5 py-1.5 font-mono text-[12.5px] font-bold text-warn",
                CLICKABLE_ROW,
              )}
            >
              <RotateCw className="size-4" aria-hidden="true" />
              Read the records again
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="m-0 font-mono text-[30px] leading-tight font-bold tracking-[-0.03em]">
            {design.name}
          </h2>
          <Chip tone={design.stage === "superseded" ? "dashed" : "accent"}>
            {design.stage}
          </Chip>
        </div>

        {record?.goal.title ? (
          <p className="m-0 max-w-[92ch] font-serif text-[19px] leading-[1.4] font-semibold text-ink-mid">
            {record.goal.title}
          </p>
        ) : null}

        <ProseBox title="Outcome" source="index.json">
          <p className="m-0 max-w-[92ch] font-serif text-[16px] leading-[1.55] text-foreground/90">
            {design.outcome}
          </p>
        </ProseBox>

        {supersededBy ? (
          <div className="rounded-lg border border-dashed border-line bg-surface-2 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-[12.5px] font-bold tracking-[0.06em] text-ink-dim uppercase">
                superseded
              </span>
              <span className="font-serif text-[16px] leading-[1.5] text-ink-mid">
                A later design closed this one. The record stays, because it still says
                what the team believed when it was written.
              </span>
              <button
                type="button"
                onClick={() => onOpenDesign(supersededBy)}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-card px-2 py-1 font-mono text-[12.5px] font-bold text-accent-deep transition-colors duration-150 ease-house hover:bg-accent-wash",
                  CLICKABLE_ROW,
                )}
              >
                <CornerDownRight className="size-3.5" aria-hidden="true" />
                <span className="underline decoration-line underline-offset-2">
                  {supersededBy}
                </span>
              </button>
            </div>
            {supersedes.length > 0 ? (
              <p className="m-0 mt-2 font-mono text-[12.5px] text-ink-faint">
                {design.name} itself superseded {supersedes.join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </header>

      {known && missing.length > 0 ? (
        <Disclosure label="Which lenses are disabled, and why" count={missing.length}>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {missing.map((lens) => (
              <li
                key={lens.name}
                className="rounded-lg border border-dashed border-line bg-card px-3.5 py-2.5"
              >
                <span className="font-mono text-[12.5px] font-bold text-ink-mid">
                  {lens.name}
                </span>
                <span className="mt-1 block font-serif text-[15.5px] leading-[1.5] text-ink-mid">
                  {lens.status.missing}
                </span>
                <span className="mt-1 block font-mono text-[12px] text-ink-faint">
                  {lens.status.file}
                </span>
              </li>
            ))}
          </ul>
        </Disclosure>
      ) : null}

      {/*
        The bento. Build across the top, the three text lenses in one row, then the
        wide architecture tile beside the standard risks tile.
      */}
      {/*
        `items-start` keeps every tile at its natural height. Stretching the row of
        three to its tallest member buried the shortest tile in empty space, and the
        ragged edge is what a mosaic looks like.
      */}
      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-12">
        <div className="lg:col-span-12">
          <BuildTile
            row={row}
            record={record}
            recordsLoad={recordsLoad}
            joins={joins}
            epicDesignTitles={epicDesignTitles}
          />
        </div>
        <div className="lg:col-span-4">
          <IntentTile record={record} load={recordsLoad} designId={design.id} />
        </div>
        <div className="lg:col-span-4">
          <ProblemTile record={record} load={recordsLoad} designId={design.id} />
        </div>
        <div className="lg:col-span-4">
          <SolutionTile record={record} load={recordsLoad} designId={design.id} />
        </div>
        <div className="lg:col-span-8">
          <ArchitectureTile
            record={record}
            load={recordsLoad}
            designId={design.id}
            adrsById={adrsById}
            joins={joins}
            theme={theme}
          />
        </div>
        <div className="lg:col-span-4">
          <RisksTile record={record} load={recordsLoad} designId={design.id} />
        </div>
      </div>
    </div>
  );
}
