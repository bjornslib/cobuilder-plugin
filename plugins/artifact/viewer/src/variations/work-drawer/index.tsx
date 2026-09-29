/**
 * Prototype A: the Work drawer, the house kanban.
 *
 * THE IDEA IN ONE LINE. The Work board stops being a page the reader has to
 * travel to and becomes a drawer that opens over whatever Build or Review
 * surface they were reading: one press on the Work icon, and every work item
 * in the bundle is on a kanban at sixty percent of the viewport, searchable,
 * with the page still visible and unmoved above it.
 *
 * THE SHAPE.
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ top bar          [Work ▦]  CoBuilder viewer  │  ← the page, unmoved
 *   │ muted Build-like surface                     │
 *   ├──────────────────────────────────────────────┤
 *   ╞═ handle ═════════════════════════════════════╡
 *   │ Work · 19 designs   [search……………]  n shown   │  ← the drawer, 60 vh
 *   │ ┌lane┐ ┌lane┐ ┌lane┐ ┌lane┐ ┌lane┐           │    drag to 95 vh
 *   │ └────┘ └────┘ └────┘ └────┘ └────┘           │
 *   │ excluded: 33 decisions · 5 open pull requests│
 *   └──────────────────────────────────────────────┘
 *
 * THE DRAWER IS VAUL, the engine under shadcn's Drawer. Two snap points:
 * 0.6, where it opens, and 0.95, where a reader who wants the whole board can
 * drag to. The snap, not a second layout, is the difference between the two
 * states — the board is the same board at both, and the reader never re-learns
 * anything to use it taller.
 *
 * THE EXCLUSION RULE IS THE CORRECTION THE FEEDBACK ASKED FOR, and it lives in
 * `./board`: ADRs and unfinished pull requests are not work, so they are held
 * out of the lanes. The rule is never silent — the drawer's footer states what
 * it held out and how many, so a reader who expected a row finds the reason in
 * one line.
 *
 * THE SEARCH IS INCREMENTAL. One input refines the board as the reader types,
 * across design names, ids, stages, outcomes, epic ids, branches, and pull
 * request numbers. The match is marked on the card's name, and a lane that
 * holds no match says so in its own body rather than disappearing, because a
 * lane that vanished would teach nothing about why.
 *
 * DATA. The index and its joins come from `@/data/bundle`, exactly as the
 * shipped surfaces read them: `BUNDLE_DATA_URL` is `/bundle/data/index.json`
 * off disk on the dev server and the inlined `window.INDEX` global in a
 * published Artifact. Nothing here derives a join a second time.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Database, X } from "lucide-react";
import { Drawer } from "vaul";
import { motion, useReducedMotion } from "motion/react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { designRowsOf, entitiesOf, loadIndex } from "@/data/bundle";
import type { DesignRow, RecordIndex } from "@/data/types";
import { cn } from "@/lib/utils";

import { LANES, matches, workSourcesOf } from "./board";
import { Kanban } from "./cards";

type Load =
  | { state: "loading" }
  | { state: "ready"; index: RecordIndex }
  | { state: "failed"; message: string };

/* ------------------------------------------------------------------- backdrop */

/**
 * The page the drawer overlays.
 *
 * The prototype's backdrop is a muted Build-like surface built from the same
 * real index, so the drawer's contrast with a working page is visible. It is
 * not the shell and does not pretend to be: the line beside the corpus counts
 * says the page is the prototype's own stand-in.
 */
function Backdrop({
  rows,
  index,
  onOpenWork,
}: {
  rows: DesignRow[];
  index: RecordIndex;
  onOpenWork: () => void;
}) {
  const entities = entitiesOf(index);
  const stageDesign =
    rows.find((row) => row.design.id === "cobuilder-viewer") ?? rows[0] ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-center gap-4 border-b border-line bg-surface px-4 py-2.5">
        <button
          type="button"
          onClick={onOpenWork}
          aria-haspopup="dialog"
          className={cn(
            "inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2",
            "font-mono text-[13px] font-bold text-ink-mid transition-colors duration-150 ease-house",
            "hover:border-primary hover:bg-accent-wash hover:text-accent-deep",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          )}
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Work
        </button>

        <div className="min-w-0 flex-1">
          <p className="m-0 truncate font-mono text-[15px] font-bold tracking-[-0.02em]">
            cobuilder-viewer
          </p>
          <p className="m-0 truncate font-mono text-[11.5px] text-ink-faint">
            Build · {stageDesign?.epics.length ?? 0} epics · the muted surface the drawer
            overlays
          </p>
        </div>

        <div className="shrink-0 text-right font-mono text-[10.5px] leading-[1.7] text-ink-dim">
          <span className="tabular-nums">
            {entities.design.length} designs · {entities.epic.length} epics ·{" "}
            {entities.adr.length} decisions · {entities.pull_request.length} pull requests
          </span>
          <p className="m-0 flex items-center justify-end gap-1 text-ink-faint">
            <Database className="size-3" aria-hidden="true" />
            prototype backdrop, not the shell
          </p>
        </div>
      </header>

      {stageDesign ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 opacity-55">
          <p className="m-0 max-w-[80ch] font-serif text-[17px] leading-[1.5] text-ink-mid">
            {stageDesign.design.outcome}
          </p>
          <div className="mt-5 grid grid-cols-1 gap-2.5 lg:grid-cols-3">
            {stageDesign.epics.slice(0, 9).map((epic) => (
              <div
                key={epic.id}
                className="min-w-0 rounded-lg border border-line bg-card px-3 py-2.5"
              >
                <p className="m-0 truncate font-mono text-[12.5px] font-bold">
                  {epic.epic_id}
                </p>
                <p className="m-0 truncate font-mono text-[11px] text-ink-faint">
                  {epic.state} · {epic.branch ?? "no branch"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- the drawer */

const DRAWER_FRAME = cn(
  "fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[100dvh] flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-frame outline-none",
);

function DrawerBody({ index, open }: { index: RecordIndex; open: boolean }) {
  const reduce = useReducedMotion();
  const searchRef = useRef<HTMLInputElement>(null);
  const [needle, setNeedle] = useState("");

  const entities = entitiesOf(index);
  const rows: DesignRow[] = useMemo(() => designRowsOf(index), [index]);
  const { sources, excluded } = useMemo(
    () => workSourcesOf(rows, entities.pull_request, entities.adr.length),
    [rows, entities],
  );

  const needleText = needle.trim().toLowerCase();
  const shown = sources.filter((source) => matches(source, needleText)).length;

  /* The search reclaims its focus on open and clears itself on close, so the
     board a reader meets next time is the whole board, never a stale filter. */
  useEffect(() => {
    if (open) searchRef.current?.focus();
    else setNeedle("");
  }, [open]);

  return (
    <>
      <div className="mx-auto mt-2.5 mb-0 h-1 w-10 shrink-0 rounded-full bg-ink-faint/40" />

      <div className="flex shrink-0 flex-wrap items-baseline gap-x-3 gap-y-1 px-4 pt-2.5">
        <Drawer.Title className="m-0 font-mono text-[19px] font-bold tracking-[-0.02em]">
          Work
        </Drawer.Title>
        <span className="font-mono text-[12px] text-ink-faint tabular-nums">
          {sources.length} items in five lanes
        </span>
        <span className="ml-auto font-mono text-[11px] text-ink-faint">
          drag up for the full board &middot; <kbd>esc</kbd> closes
        </span>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line-soft px-4 py-2.5">
        <div className="flex h-9 min-w-0 flex-1 basis-64 items-center gap-2 rounded-lg border border-line bg-surface px-2.5">
          <svg
            viewBox="0 0 24 24"
            className="size-4 shrink-0 text-ink-faint"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={searchRef}
            value={needle}
            onChange={(event) => setNeedle(event.target.value)}
            placeholder="Search designs, epics, branches, pull requests…"
            aria-label="Search the work items"
            className="h-full min-w-0 flex-1 bg-transparent font-mono text-[13px] text-foreground outline-none placeholder:text-ink-faint"
          />
          {needle.length > 0 ? (
            <button
              type="button"
              onClick={() => setNeedle("")}
              aria-label="Clear the search"
              className="shrink-0 cursor-pointer rounded p-0.5 text-ink-faint transition-colors duration-150 ease-house hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <p
          className="m-0 font-mono text-[11.5px] text-ink-faint tabular-nums"
          aria-live="polite"
        >
          {needleText.length === 0
            ? `${sources.length} shown`
            : `${sources.length} → ${shown} shown`}
        </p>
      </div>

      <div className="min-h-0 flex-1 pt-1">
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
          className="h-full"
        >
          <Kanban lanes={LANES} sources={sources} needle={needleText} />
        </motion.div>
      </div>

      <footer className="shrink-0 border-t border-line bg-surface-2 px-4 py-2">
        <p className="m-0 font-mono text-[11px] leading-[1.5] text-ink-dim">
          Held out of the board by rule:{" "}
          <b className="text-foreground tabular-nums">{excluded.decisions}</b> decision
          records (ADR) and{" "}
          <b className="text-foreground tabular-nums">{excluded.openPulls}</b> unfinished
          pull requests. A merged pull request reads inside its design, and a merged one
          no design carries reads in Shipped.
        </p>
      </footer>

      <Drawer.Description className="sr-only">
        The Work board as a kanban of lanes. Drag the handle or the board to make it
        taller; the search refines the cards as you type.
      </Drawer.Description>
    </>
  );
}

/**
 * The prototype.
 *
 * The load rule is the shipped surface's: one `loadIndex`, three states, and a
 * failed load states the failure instead of rendering an empty board.
 */
export default function WorkDrawer() {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let live = true;
    loadIndex()
      .then((index) => {
        if (live) setLoad({ state: "ready", index });
      })
      .catch((error: unknown) => {
        if (live) {
          setLoad({
            state: "failed",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });
    return () => {
      live = false;
    };
  }, []);

  const rows: DesignRow[] = useMemo(() => {
    if (load.state !== "ready") return [];
    return designRowsOf(load.index);
  }, [load]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="h-dvh overflow-hidden">
        {load.state === "ready" ? (
          <Backdrop rows={rows} index={load.index} onOpenWork={() => setOpen(true)} />
        ) : (
          <div className="flex h-full items-center justify-center px-6">
            <p className="max-w-[60ch] font-serif text-[15px] leading-[1.55] text-ink-dim">
              {load.state === "loading"
                ? "Reading the record index."
                : `The record index did not load: ${load.message}`}
            </p>
          </div>
        )}

        <Drawer.Root
          open={open}
          onOpenChange={setOpen}
          snapPoints={[0.6, 0.95]}
          fadeFromIndex={1}
        >
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/35" />
            <Drawer.Content className={DRAWER_FRAME}>
              {load.state === "ready" ? <DrawerBody index={load.index} open={open} /> : null}
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    </TooltipProvider>
  );
}