/**
 * The Work drawer: the day deck, ported from prototype B into the shell.
 *
 * ADR-0034 is this file's record. The Work board is a vaul bottom drawer the
 * shell's own Work icon opens, at two snap points: 0.6, where it opens, and
 * 0.95, where a record reads tall. Inside, the deck is the arrangement the
 * two prototypes compared and prototype B won: five collapsible lanes in one
 * vertical read, a state filter strip whose chips the arrow keys step, an
 * incremental search that marks its match, resets the filter the moment it
 * has a needle, and auto-reads a result set of exactly one, and a detail pane
 * beside the board that follows the selection.
 *
 * THE SEVEN REFINEMENTS ARE THE CONTRACT, each one stated in one place:
 *
 *   1. Typing anything resets the filter to All — `filterForTyping`.
 *   2. `/` moves the cursor into the search field, from anywhere in the open
 *      drawer but the field itself.
 *   3. The header states the board's own fact; the held-out rule and its
 *      counts live in the footer, permanently.
 *   4. A result set of exactly one selects itself (`soleOf`), broadening past
 *      one takes the read away, and a changed needle starts a new read.
 *   5. The pane's link reads "Open work item", and opens the shell's own
 *      route for the design.
 *   6. The pane's dismiss reads "Close".
 *   7. `←`/`→` step the filter strip's active chip from its own vocabulary,
 *      stopping at the ends (`chipStepped`).
 *
 * THE LANES FOLD BEHIND SHADCN'S COLLAPSIBLE. A folded lane leaves the walk
 * and the counts, so the walk never lands on a row the reader cannot see.
 *
 * THE RAIL'S ARROW WALK SLEEPS WHILE THE DRAWER HOLDS THE KEYS. The shell's
 * rail walks its own rows from a window-level listener; the deck stops the
 * propagation of the keys it takes over, so an arrow inside the drawer never
 * steps the rail behind it, and the two walks never steal each other's keys.
 *
 * THE ESCAPE IS RADIX'S, NOT THIS FILE'S. The dismissable layer listens in
 * the capture phase, so Escape closes the whole drawer before any handler
 * here runs, and the honest hint is the one that implies: Escape closes the
 * drawer, Enter toggles the detail pane.
 *
 * DRAWER STATE RESETS WHEN THE DRAWER CLOSES, so the next open is the whole
 * deck and no read survives a close the reader does not remember.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, GitMerge, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Drawer } from "vaul";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { StageBadge } from "@/components/work/StageBadge";
import { entitiesOf } from "@/data/bundle";
import type { DesignRecord, DesignRecords } from "@/data/bundle";
import { resolvedJoinsOf } from "@/data/joins";
import type { DesignRow, EpicEntity, RecordIndex } from "@/data/types";
import { cn } from "@/lib/utils";

import { RECORD_KINDS, RECORD_LABEL, recordVerdicts } from "./readiness";
import type { Readiness } from "./readiness";
import { routeHref } from "./model";
import {
  FILTER_ALL,
  LANES,
  chipStepped,
  filterChipsOf,
  filterForTyping,
  highlight,
  laneRows,
  soleOf,
  walkedRows,
} from "./workDeck";

/* ------------------------------------------------------------------ the pane */

/*
 * The three verdict states, as the shell's own tone table paints them. A whole
 * record takes the good wash, a gap takes the accent wash, and a record that
 * does not exist takes the plain surface.
 */
const VERDICT_CLASS: Record<Readiness, string> = {
  present: "border-good/60 bg-good/10 text-good",
  partial: "border-primary/60 bg-accent-wash/40 text-accent-deep",
  absent: "border-line bg-surface-2/60 text-ink-faint",
};

function RecordMarks({
  record,
  designId,
}: {
  record: DesignRecord | undefined;
  designId: string;
}) {
  const verdicts = recordVerdicts(record);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="m-0 font-mono text-[12px] tracking-[0.08em] text-ink-faint uppercase">
        The six authored records
      </p>
      <ul className="m-0 flex min-w-0 list-none flex-wrap gap-1.5 p-0">
        {RECORD_KINDS.map((kind) => {
          const verdict = verdicts[kind];
          const said =
            verdict.missing.length === 0
              ? `${RECORD_LABEL[kind]}: ${verdict.state}`
              : `${RECORD_LABEL[kind]}: ${verdict.state}, missing ${verdict.missing.join(", ")}`;
          return (
            <li
              key={kind}
              title={said}
              className={cn(
                "inline-flex min-w-0 items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[12px]",
                VERDICT_CLASS[verdict.state],
              )}
            >
              {verdict.state === "present" ? "●" : verdict.state === "partial" ? "◐" : "○"}
              <span aria-hidden="true">{RECORD_LABEL[kind]}</span>
              <span className="sr-only">{said}</span>
            </li>
          );
        })}
      </ul>
      <p className="m-0 font-serif text-[13.5px] leading-[1.45] text-ink-faint">
        {record === undefined
          ? `The bundle carries no design record for ${designId}, so every mark reads absent.`
          : "A whole record takes a full mark; a dashed part names what it misses."}
      </p>
    </div>
  );
}

/**
 * The detail pane, the same arrangement prototype B reviewed.
 *
 * THE RECORD MARKS ARE THE SHIPPED SHELL'S OWN RULE — `recordVerdicts` from
 * `./readiness` — so this pane and the Work board cannot disagree about one
 * record. The epics' states come from the index's own join answer through
 * `resolvedJoinsOf`, whose result the drawer resolves once and holds.
 */
function DetailPane({
  row,
  records,
  epicState,
  onLeave,
  onClose,
}: {
  row: DesignRow;
  records: DesignRecords | Record<string, DesignRecord> | null;
  /** The data layer's own refined epic answer, one epic at a time. */
  epicState: (epic: EpicEntity) => { state: string; refined: boolean };
  /** Leave the drawer entirely: the reader chose a route, not a pane. */
  onLeave: () => void;
  onClose: () => void;
}) {
  const { design, epics, done, pullRequests } = row;
  const record = records?.[design.id];

  return (
    <aside
      aria-label={`${design.name} in detail`}
      className="flex h-full min-w-0 flex-col gap-4 overflow-y-auto border-l border-line bg-surface-2/40 px-5 py-4"
    >
      <header className="flex min-w-0 flex-col gap-2.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <h3 className="m-0 min-w-0 font-mono text-[18px] leading-tight font-bold tracking-[-0.02em] break-words">
            {design.name}
          </h3>
          <StageBadge stage={design.stage} className="shrink-0" />
        </div>
        <p className="m-0 font-serif text-[15.5px] leading-[1.55] text-ink-mid">
          {design.outcome}
        </p>
      </header>

      <RecordMarks record={record} designId={design.id} />

      <div className="flex min-w-0 flex-col gap-2">
        <p className="m-0 font-mono text-[12px] tracking-[0.08em] text-ink-faint uppercase">
          Epics · {done} of {epics.length} done
        </p>
        {epics.length === 0 ? (
          <p className="m-0 font-serif text-[14.5px] text-ink-dim italic">
            The plan holds no epic for this design.
          </p>
        ) : (
          <ul className="m-0 flex min-w-0 list-none flex-col gap-1 p-0">
            {epics.map((epic) => (
              <li
                key={epic.id}
                className="flex min-w-0 items-center gap-2 rounded-md bg-surface-2 px-2.5 py-2"
              >
                <span className="min-w-0 flex-1 truncate font-mono text-[13.5px]">
                  {epic.epic_id}
                </span>
                {epic.pr !== null ? (
                  <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[12px] text-ink-faint">
                    <GitMerge className="size-3" aria-hidden="true" />
                    #{epic.pr}
                  </span>
                ) : null}
                <span className="shrink-0 font-mono text-[12px] text-ink-dim">
                  {epicState(epic).state}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pullRequests.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-2">
          <p className="m-0 font-mono text-[12px] tracking-[0.08em] text-ink-faint uppercase">
            Pull requests
          </p>
          <p className="m-0 font-mono text-[13.5px] text-ink-dim">
            {pullRequests.map((id) => `#${id}`).join(", ")} merged
          </p>
        </div>
      ) : null}

      <footer className="mt-auto min-w-0 border-t border-line-soft pt-3">
        <a
          href={routeHref(design.id, "build")}
          aria-label={`Open work item: ${design.name}`}
          onClick={onLeave}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-card px-2.5 py-1.5 font-mono text-[13px] font-bold text-accent-deep transition-colors duration-150 ease-house hover:bg-accent-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Open work item
        </a>
      </footer>

      <button
        type="button"
        onClick={onClose}
        className="shrink-0 cursor-pointer self-start rounded-md border border-line px-2.5 py-1.5 font-mono text-[12.5px] text-ink-dim transition-colors duration-150 ease-house hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Close
      </button>
    </aside>
  );
}

/* -------------------------------------------------------------------- the deck */

/**
 * One deck row: the design's name with its search hit marked, the epic meter,
 * and the merged pull requests it carries. One line, because the deck reads
 * deep.
 */
function DeckRow({
  row,
  needle,
  selected,
  onSelect,
  index,
}: {
  row: DesignRow;
  needle: string;
  selected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const reduce = useReducedMotion();
  const rowRef = useRef<HTMLButtonElement>(null);
  const { design, epics, done, pullRequests } = row;
  const parts = highlight(design.name, needle);
  const pct = epics.length === 0 ? null : Math.round((done / epics.length) * 100);

  /* The keyboard walk must never lose its place: a row the walk lands on
     scrolls itself into view, minimally. */
  useEffect(() => {
    if (selected) rowRef.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <motion.button
      ref={rowRef}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${design.name}, stage ${design.stage}`}
      initial={reduce ? false : { opacity: 0, x: 6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.16,
        delay: reduce ? 0 : Math.min(index * 0.008, 0.1),
        ease: [0.22, 0.75, 0.3, 1],
      }}
      className={cn(
        "flex min-w-0 cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left",
        "font-mono text-[14px] transition-colors duration-150 ease-house",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        selected
          ? "border-l-2 border-l-primary bg-accent-wash text-foreground"
          : "border-l-2 border-l-transparent text-ink-mid hover:bg-surface-2 hover:text-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          design.stage === "implemented" && "bg-good",
          design.stage === "review" && "bg-primary",
          (design.stage === "backlog" || design.stage === "decided") && "bg-warn",
          design.stage === "superseded" && "bg-ink-faint/50",
        )}
      />
      <span
        className={cn(
          "min-w-0 shrink truncate",
          design.stage === "superseded" && "text-ink-faint line-through decoration-1",
        )}
      >
        {parts === null ? (
          design.name
        ) : (
          <>
            {parts.before}
            <mark className="rounded-xs bg-amber/70 px-0.5 text-inherit">{parts.hit}</mark>
            {parts.after}
          </>
        )}
      </span>
      {pct !== null ? (
        <span
          className="ml-auto shrink-0 pl-2.5 font-mono text-[11.5px] text-ink-faint tabular-nums"
          title={`${done} of ${epics.length} epics done`}
        >
          {done}/{epics.length}
        </span>
      ) : null}
      {pullRequests.length > 0 ? (
        <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[11.5px] text-good">
          <GitMerge className="size-3.5" aria-hidden="true" />
          {pullRequests.map((id) => `#${id}`).join(" ")}
        </span>
      ) : null}
    </motion.button>
  );
}

/* ------------------------------------------------------------------ the drawer */

/**
 * The day deck, dressed in the shell's own data.
 *
 * EVERY INPUT IS THE SHELL'S OWN ANSWER. The rows are `designRowsOf`'s, the
 * records are the bundle's loaded design bodies, and the held-out counts read
 * the index's own entity list. The drawer resolves the index's joins once,
 * beside the shell's other readers, and derives nothing of its own.
 */
function DrawerBody({
  rows,
  index,
  records,
  open,
  onLeave,
  setSnap,
}: {
  rows: DesignRow[];
  index: RecordIndex;
  records: DesignRecords | null;
  /** The drawer's own open state, so a closed drawer forgets its last read. */
  open: boolean;
  /** Leave the drawer for a route the reader chose inside it. */
  onLeave: () => void;
  /** The controlled snap, so Enter's expand contract can set the height. */
  setSnap: (snapPoint: number) => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [needle, setNeedle] = useState("");
  /* The state filter selects whole lanes; `all` is the value that clears it. */
  const [laneFilter, setLaneFilter] = useState<string>(FILTER_ALL);
  /* The fold, per lane key. A lane the reader folded is out of the walk. */
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  /*
   * THE SELECTION AND ITS TWO SOURCES. An explicit selection is a row the
   * reader chose; an automatic one is the mirror of a result set of exactly
   * one. A dismissed automatic read is remembered for as long as the same
   * sole result holds — a Close or a second press is a decision the deck does
   * not undo — and a changed needle starts a new read.
   */
  const [selection, setSelection] = useState<{ id: string; auto: boolean } | null>(null);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());

  /* THE RULE THE BOARD DOES NOT UNDO, in the footer's own words. */
  const heldOut = useMemo(() => {
    const entities = entitiesOf(index);
    return {
      decisions: entities.adr.length,
      openPulls: entities.pull_request.filter((pull) => pull.state !== "merged").length,
    };
  }, [index]);

  /* THE INDEX'S JOINS, RESOLVED ONCE AND HELD. This is the shell's own
     sanction: the join is the data layer's answer, and the drawer never
     resolves one of its own. */
  const resolvedJoins = useMemo(() => resolvedJoinsOf(index), [index]);

  const needleText = needle.trim().toLowerCase();

  /* THE WALK READS ONLY WHAT THE READER CAN SEE. The filter drops whole lanes,
     the fold drops their rows, and the search refines what remains — in that
     order, once, so the strip's counts, the walk, and the board cannot
     disagree about what is visible. */
  const visibleLanes = useMemo(
    () =>
      LANES.filter(
        (lane) => (laneFilter === FILTER_ALL || laneFilter === lane.key) && !folded[lane.key],
      ),
    [laneFilter, folded],
  );
  const walk = useMemo(
    () => walkedRows(visibleLanes, rows, needleText),
    [visibleLanes, rows, needleText],
  );
  const chips = useMemo(() => filterChipsOf(LANES), []);
  const filterCountOf = (laneKey: string) =>
    laneKey === FILTER_ALL
      ? rows.length
      : rows.filter((row) =>
          (LANES.find((lane) => lane.key === laneKey)?.stages ?? []).includes(
            row.design.stage,
          ),
        ).length;
  const selected = selection ? (rows.find((row) => row.design.id === selection.id) ?? null) : null;
  const shown = walk.length;

  /*
   * THE SELECTION FOLLOWS THE RESULT SET. A sole result mirrors itself into
   * the deck with no second press; a set that broadens past one takes the
   * automatic read away entirely, because an automatic selection was never
   * the reader's own and a highlight without its pane is a lie; an explicit
   * one stays only while its row is visible.
   */
  const sole = useMemo(() => soleOf(walk), [walk]);
  useEffect(() => {
    if (sole !== null) {
      if (dismissed.has(sole.design.id)) return;
      setSelection((was) =>
        was === null || was.auto || !walk.some((row) => row.design.id === was.id)
          ? { id: sole.design.id, auto: true }
          : was,
      );
      return;
    }
    if (
      selection !== null &&
      (selection.auto || !walk.some((row) => row.design.id === selection.id))
    ) {
      setSelection(null);
    }
  }, [sole, walk, selection, dismissed]);

  /*
   * THE DRAWER RESETS WHEN IT CLOSES, so the next open is the whole deck: the
   * needle, the filter, the fold, the selection, and the dismissed sole all
   * come back to their first state. The guard keeps the reset from firing on
   * the drawer's first mount while it is still open.
   */
  const wasOpen = useRef(open);
  useEffect(() => {
    if (wasOpen.current && !open) {
      setDismissed(new Set());
      setNeedle("");
      setLaneFilter(FILTER_ALL);
      setFolded({});
      setSelection(null);
    }
    wasOpen.current = open;
  }, [open]);

  function moveSelection(step: 1 | -1) {
    if (walk.length === 0) return;
    const at = selection === null ? -1 : walk.findIndex((row) => row.design.id === selection.id);
    const next = Math.min(Math.max(at + step, 0), walk.length - 1);
    setSelected(walk[next].design.id);
  }

  /* The selection moves through the handler in one word: an empty string is
     no selection. */
  function setSelected(id: string) {
    setSelection(id.length > 0 ? { id, auto: false } : null);
  }

  function toggleDetail(id: string): void {
    if (selection?.id === id) {
      /* THE SAME ROW AGAIN IS A CLOSE. The dismissed sole is remembered for
         as long as the same sole result holds, and the deck drops back to its
         working height. */
      setDismissed((prev) => new Set(prev).add(id));
      setSelection(null);
      setSnap(0.6);
      return;
    }
    setSelection({ id, auto: false });
    setSnap(0.95);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const onInput = event.target instanceof HTMLInputElement;

    /*
     * THE FILTER OWNS LEFT AND RIGHT FROM ITS STRIP. While a chip holds the
     * focus, the arrows step the active chip through the lanes' vocabulary
     * and stop at the ends. From any row or lane, left and right mean
     * nothing; up and down mean rows, and the two walks never steal a key.
     */
    const onChip =
      event.target instanceof HTMLElement &&
      event.target.closest("[data-chip-strip]") !== null;
    if (onChip && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      setLaneFilter(
        chipStepped(laneFilter, event.key === "ArrowRight" ? 1 : -1, chips),
      );
      return;
    }

    if (event.key === "/" && !onInput) {
      /* THE SLASH FINDS THE FIELD, from any row, chip, fold, or footer. From
         the field itself, the slash types the character. */
      event.preventDefault();
      searchRef.current?.focus();
      return;
    }

    /* THE WALK AND THE SEARCH SHARE THE UP AND DOWN ARROWS. The stopPropagation
       is not housekeeping: the shell's rail walks its own rows from a window
       listener, and an arrow that took a row in the deck must not take the
       rail behind it too. */
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      moveSelection(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "j" && !onInput) {
      event.preventDefault();
      event.stopPropagation();
      moveSelection(1);
      return;
    }
    if (event.key === "k" && !onInput) {
      event.preventDefault();
      event.stopPropagation();
      moveSelection(-1);
      return;
    }
    if (event.key === "Enter" && walk.length > 0) {
      /* TWO ENTERS, TWO JOBS. From the field, Enter reads the first result
         tall — and again stays tall, because a field press that closed what
         it never opened would read as a fault. From the board, Enter toggles
         the shown row: close what is shown, show what is closed. */
      event.preventDefault();
      if (onInput) {
        setSelected(walk[0].design.id);
        setSnap(0.95);
      } else {
        toggleDetail(selection?.id ?? walk[0].design.id);
      }
      return;
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col" onKeyDown={onKeyDown}>
      <div className="mx-auto mt-2.5 mb-0 h-1 w-10 shrink-0 rounded-full bg-ink-faint/40" />

      <header className="flex shrink-0 flex-wrap items-baseline gap-x-4 gap-y-1 px-4 pt-2.5 pb-1">
        <Drawer.Title className="m-0 font-mono text-[22px] font-bold tracking-[0.02em]">
          WORK
        </Drawer.Title>
        <span className="font-mono text-[13px] text-ink-faint tabular-nums">
          {rows.length} designs · {shown} shown
        </span>
      </header>

      <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-2.5">
        <span aria-hidden="true" className="shrink-0 font-mono text-[15px] text-primary">
          &rsaquo;
        </span>
        <input
          ref={searchRef}
          value={needle}
          onChange={(event) => {
            setNeedle(event.target.value);
            /* TYPING RESETS THE FILTER — `filterForTyping` is the one place
               the rule lives — and the new needle starts a new read, so the
               dismissed sole of the previous find does not outlive it. */
            setLaneFilter(filterForTyping());
            setDismissed(new Set());
          }}
          placeholder="refine the deck…"
          aria-label="Search the work items"
          className="min-h-9 min-w-0 flex-1 bg-transparent font-mono text-[14px] text-foreground outline-none placeholder:text-ink-faint"
        />
        {needle.length > 0 ? (
          <button
            type="button"
            onClick={() => setNeedle("")}
            aria-label="Clear the search"
            className="shrink-0 cursor-pointer rounded-md p-1 text-ink-faint transition-colors duration-150 ease-house hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
        <span className="shrink-0 font-mono text-[11.5px] text-ink-faint">
          <kbd>/</kbd> search &middot; <kbd>↓</kbd>/<kbd>↑</kbd> walk &middot;{" "}
          <kbd>↵</kbd> detail &middot; <kbd>esc</kbd> closes
        </span>
      </div>

      {/*
        THE STATE FILTER. Whole lanes, in the lanes' own vocabulary, with the
        count each keeps. It combines with the search as AND: the strip narrows
        where to read, the search narrows what is on the page.
      */}
      <div
        aria-label="Filter the lanes by state"
        data-chip-strip=""
        className="flex min-w-0 shrink-0 flex-wrap items-center gap-1.5 border-b border-line px-4 py-2"
      >
        {chips.map((key) => {
          const label = key === FILTER_ALL ? "All" : (LANES.find((l) => l.key === key)?.label ?? key);
          const active = laneFilter === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setLaneFilter(key)}
              className={cn(
                "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1",
                "font-mono text-[12.5px] font-bold transition-colors duration-150 ease-house",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active
                  ? "border-primary bg-accent-wash text-accent-deep"
                  : "border-line bg-surface text-ink-mid hover:border-primary/60 hover:bg-surface-2",
              )}
            >
              {label}
              <span
                aria-hidden="true"
                className="font-mono text-[11px] font-normal text-ink-faint tabular-nums"
              >
                {filterCountOf(key)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* The board: one vertical read of five lane sections. */}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-3 py-2">
          {shown === 0 ? (
            <p className="m-0 px-2 py-6 font-serif text-[15.5px] text-ink-dim italic">
              {rows.length === 0
                ? "The bundle holds no design."
                : needleText.length > 0
                  ? `Nothing on the deck matches “${needle.trim()}”. Clear the search, or widen the state filter above.`
                  : "No lane is open and holding rows. Unfold a lane, or widen the state filter."}
            </p>
          ) : (
            visibleLanes.map((lane) => {
              const scoped = laneRows(lane, rows, needleText);
              const isOpen = !folded[lane.key];
              return (
                <Collapsible
                  key={lane.key}
                  open={isOpen}
                  onOpenChange={(next) => setFolded((was) => ({ ...was, [lane.key]: !next }))}
                >
                  <section aria-label={lane.label} className="mb-2 min-w-0">
                    <CollapsibleTrigger
                      className={cn(
                        "group flex w-full min-w-0 cursor-pointer items-baseline gap-2 rounded-md px-2.5 pt-2 pb-1 text-left",
                        "border-b border-line transition-colors duration-150 ease-house hover:bg-surface-2/60",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      )}
                    >
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 self-center text-ink-faint transition-transform duration-150 ease-house",
                          !isOpen && "-rotate-90",
                        )}
                        aria-hidden="true"
                      />
                      <h3 className="m-0 font-mono text-[12.5px] font-bold tracking-[0.08em] text-ink-dim uppercase">
                        {lane.label}
                      </h3>
                      <span className="font-mono text-[12px] text-ink-faint tabular-nums">
                        {scoped.length}
                      </span>
                      <span
                        className="min-w-0 flex-1 truncate font-serif text-[13px] text-ink-faint"
                        title={lane.blurb}
                      >
                        {lane.blurb}
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {scoped.length === 0 ? (
                        <p className="m-0 px-2.5 py-2 font-serif text-[13.5px] text-ink-dim italic">
                          {needleText.length > 0 ? "no match" : lane.empty}
                        </p>
                      ) : (
                        <div className="flex min-w-0 flex-col py-1">
                          {scoped.map((row, rowIndex) => (
                            <DeckRow
                              key={row.design.id}
                              row={row}
                              needle={needleText}
                              selected={row.design.id === selection?.id}
                              onSelect={() => toggleDetail(row.design.id)}
                              index={rowIndex}
                            />
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </section>
                </Collapsible>
              );
            })
          )}
        </div>

        {selected ? (
          <div className="hidden w-[42%] min-w-[340px] max-w-[560px] shrink-0 md:block">
            <DetailPane
              row={selected}
              records={records}
              epicState={(epic) => resolvedJoins.epicState(epic)}
              onLeave={onLeave}
              onClose={() => {
                if (selection === null) return;
                setDismissed((prev) => new Set(prev).add(selection.id));
                setSelection(null);
                setSnap(0.6);
              }}
            />
          </div>
        ) : null}
      </div>

      <footer className="shrink-0 border-t border-line px-4 py-1.5">
        <p className="m-0 font-mono text-[12px] leading-[1.5] text-ink-faint">
          Held out of the board by rule:{" "}
          <b className="text-foreground tabular-nums">{heldOut.decisions}</b> decision
          records (ADR) and{" "}
          <b className="text-foreground tabular-nums">{heldOut.openPulls}</b> unfinished
          pull requests. A merged pull request reads inside its design, and the pane
          follows the walk: a row's second press drops the deck back.
        </p>
      </footer>

      <Drawer.Description className="sr-only">
        The Work board as a dense departure board of collapsible lanes, behind a state
        filter. The search refines as you type; the arrows walk the rows; Enter opens the
        selected design in a detail pane and expands the drawer.
      </Drawer.Description>
    </div>
  );
}

/**
 * The drawer the shell mounts, once, over whatever surface it reads.
 *
 * THE RECORDS MAY STILL BE IN FLIGHT. The pane states the load rather than an
 * empty pane, and the bundle's own load answers in its own time.
 */
export interface WorkDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The data layer's own rows: one per design, `designRowsOf` the only author. */
  rows: DesignRow[];
  /** The index, for the held-out counts and the detail pane's one join read. */
  index: RecordIndex | null;
  /** The loaded design records, for the pane's six marks. */
  records: DesignRecords | null;
}

export function WorkDrawer({ open, onOpenChange, rows, index, records }: WorkDrawerProps) {
  /* Controlled snap: Enter's expand contract needs to set the height, not ask. */
  const [snap, setSnap] = useState<number | null>(0.6);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[0.6, 0.95]}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap as (snapPoint: string | number | null) => void}
      fadeFromIndex={1}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/55" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[100dvh] flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-frame outline-none">
          {index !== null ? (
            <DrawerBody
              rows={rows}
              index={index}
              records={records}
              open={open}
              onLeave={() => onOpenChange(false)}
              setSnap={setSnap}
            />
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export default WorkDrawer;