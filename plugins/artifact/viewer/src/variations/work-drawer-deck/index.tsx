/**
 * Prototype B: the Work drawer, the day deck.
 *
 * THE IDEA IN ONE LINE. The same drawer brief as prototype A — the Work icon
 * opens a vaul drawer at sixty percent of the viewport, the search refines as
 * the reader types, ADRs and unfinished pull requests are held out by rule —
 * answered in a different arrangement: a light, dense, search-first departure
 * board with a state filter above it and a fold on every lane.
 *
 * THE SHAPE.
 *
 *   ┌────────────────────────────────────────────────────────────┐
 *   │ top bar        [Work ▦]   cobuilder-viewer  ·  the page    │
 *   ├────────────────────────────────────────────────────────────┤
 *   ╞═ WORK ═══ 19 designs ══════════════════════════════════════╡
 *   │ › search………          / focuses · 29 → 9 shown              │
 *   │ [all ·5] [needs a decision ·9] [ready ·2] [review ·2] …    │
 *   │ ⌄ NEEDS A DECISION ·9 ──────────────────────┐ ┌────────────┤
 *   │ ● beads-storage ·············· 0/3 ▏        │ │ the detail │
 *   │ ● gate-doc-surfacing ········· 0/2 ·#19     │ │ pane, when │
 *   │ ⌄ READY TO BUILD ·2 ────────────────────────┤ │ a row is   │
 *   │ ● cobuilder-implement ········ 2/2 ·#11 #12 │ │ shown      │
 *   └─────────────────────────────────────────────┴─┴────────────┘
 *
 * THE ENGINEER'S SEVEN REFINEMENTS ARE THE CONTRACT, each one shaped by the
 * review that named it:
 *
 *   1. TYPING RESETS THE FILTER. The moment the search holds a needle, the
 *      state strip reads All, whatever it held before — a find is a new
 *      question, and a filter from the previous one would silently narrow
 *      it. `filterForTyping` in `./deck` is the one place the rule lives.
 *   2. SLASH FINDS THE FIELD. From any row, chip, fold, or footer in the open
 *      drawer, `/` moves the cursor into the search input; from the field
 *      itself, `/` types the character. The command-palette convention.
 *   3. THE HEADER KEEPS THE BOARD'S OWN FACT. The held-out counts left the
 *      header line: the header states what the board holds, and the footer
 *      states what it held out and how many, permanently.
 *   4. ONE RESULT READS ITSELF. A needle whose result set is exactly one
 *      selects that row and shows the detail pane with no second press; a
 *      second character that broadens the set past one takes the read away.
 *      The mirror is the render's own derivation — `soleOf` — so a Close or
 *      a second press is a decision the board remembers and does not undo
 *      while the same sole result holds.
 *   5. THE PANE'S LINK READS "Open work item" — what the reader opens, not
 *      where it opens. The address is the shell's own deep link.
 *   6. THE PANE'S DISMISS READS "Close". One word; the control's job is
 *      obvious and its label spends nothing proving it.
 *   7. LEFT AND RIGHT STEP THE FILTER. While a chip holds the focus, `←` and
 *      `→` make the previous and next chip active through the lanes'
 *      vocabulary, stopping at the ends. Up and down still walk the rows;
 *      the two walks never steal each other's key.
 *
 * THE LANES THEMSELVES FOLD. Each lane header is a shadcn `Collapsible`
 * trigger, and a folded lane leaves the keyboard walk and the counts, so the
 * walk never lands on a row the reader cannot see.
 * THE SEARCH IS THE SAME PREDICATE AS A's, minus the pull-request words the
 * deck carries no rows for. It reads names, ids, stages, outcomes, epic ids,
 * branches, and pull request numbers, and the header counts the refinement as
 * it happens.
 *
 * DATA. The index and its joins come from `@/data/bundle`; the record marks
 * come from `@/shell/readiness`, the shipped shell's own rule, so this pane
 * and the shipped board cannot disagree about one record.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Database, GitMerge, X } from "lucide-react";
import { Drawer } from "vaul";
import { motion, useReducedMotion } from "motion/react";

import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { designRowsOf, entitiesOf, loadIndex } from "@/data/bundle";
import { resolvedJoinsOf } from "@/data/joins";
import type { DesignRow, RecordIndex } from "@/data/types";
import { cn } from "@/lib/utils";

import DetailPane, { useDesignRecords } from "./detail";
import {
  FILTER_ALL,
  LANES,
  chipStepped,
  filterForTyping,
  highlight,
  laneRows,
  soleOf,
  walkedRows,
} from "./deck";

type Load =
  | { state: "loading" }
  | { state: "ready"; index: RecordIndex }
  | { state: "failed"; message: string };

/* ------------------------------------------------------------------- backdrop */

/**
 * The page the drawer overlays — the deck's own muted Build-like surface, dark
 * because the deck is dark. It is the prototype's stand-in, not the shell.
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
            Build · the muted surface the deck overlays
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
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 opacity-50">
          <p className="m-0 max-w-[80ch] font-serif text-[17px] leading-[1.5] text-ink-mid">
            {stageDesign.design.outcome}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------- the deck */

/**
 * One deck row: the design's id, a dotted leader, the epic meter, and the
 * merged pull requests it carries. One line, because the deck reads deep.
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
      <span className={cn("min-w-0 shrink truncate", design.stage === "superseded" && "text-ink-faint line-through decoration-1")}>
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
      <span aria-hidden="true" className="min-w-0 flex-1 border-b border-dotted border-line" />
      {pct !== null ? (
        <span className="shrink-0 font-mono text-[12px] text-ink-faint tabular-nums">
          {done}/{epics.length}
        </span>
      ) : (
        <span className="shrink-0 font-mono text-[12px] text-ink-faint">no epic</span>
      )}
      {pullRequests.length > 0 ? (
        <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[11.5px] text-good">
          <GitMerge className="size-3.5" aria-hidden="true" />
          {pullRequests.map((id) => `#${id}`).join(" ")}
        </span>
      ) : null}
    </motion.button>
  );
}

function DrawerBody({
  index,
  open,
  setSnap,
}: {
  index: RecordIndex;
  open: boolean;
  /** The controlled snap, so Enter's expand contract can set the height. */
  setSnap: (snapPoint: number) => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [needle, setNeedle] = useState("");
  /* The state filter selects whole lanes; `all` is the value that clears it. */
  const [laneFilter, setLaneFilter] = useState<string>("all");
  /* The fold, per lane key. A lane the reader folded is out of the walk. */
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  /*
   * THE SELECTION AND ITS TWO SOURCES. An explicit selection is a row the
   * reader chose; an automatic one is the mirror of a result set of exactly
   * one. A dismissed automatic read is remembered for as long as the same
   * sole result holds, so a Close or a second press is a decision the board
   * does not undo, and a changed needle starts a new read.
   */
  const [selection, setSelection] = useState<{ id: string; auto: boolean } | null>(null);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const recordsLoad = useDesignRecords(0);

  const rows: DesignRow[] = useMemo(() => designRowsOf(index), [index]);
  /*
   * THE RULE THE BOARD DOES NOT UNDO. The exclusion counts live in the
   * footer, permanently: the header keeps the one number the reader came
   * for, and the footer states what the board held out and how many, so a
   * reader who expected a row finds the reason in one line.
   */
  const heldOut = useMemo(() => {
    const entities = entitiesOf(index);
    return {
      decisions: entities.adr.length,
      openPulls: entities.pull_request.filter((pull) => pull.state !== "merged").length,
    };
  }, [index]);

  const needleText = needle.trim().toLowerCase();

  /* THE WALK READS ONLY WHAT THE READER CAN SEE. The filter drops whole lanes,
     the fold drops their rows, and the search refines what remains — in that
     order, once, so the strip's counts, the walk, and the board cannot
     disagree about what is visible. */
  const visibleLanes = useMemo(
    () =>
      LANES.filter(
        (lane) => (laneFilter === "all" || laneFilter === lane.key) && !folded[lane.key],
      ),
    [laneFilter, folded],
  );
  const walk = useMemo(
    () => walkedRows(visibleLanes, rows, needleText),
    [visibleLanes, rows, needleText],
  );
  const shown = walk.length;
  const filterCountOf = (laneKey: string) =>
    laneKey === "all"
      ? rows.length
      : rows.filter((row) =>
          (LANES.find((lane) => lane.key === laneKey)?.stages ?? []).includes(
            row.design.stage,
          ),
        ).length;
  const selected = selection ? (rows.find((row) => row.design.id === selection.id) ?? null) : null;

  /*
   * THE PANE FOLLOWS THE WALK. There is no second "detail open" state to lie
   * about the pane: the pane shows exactly while a row is selected, so the
   * arrows move the preview as they move the highlight, and Enter's job is
   * only the snap — reading it tall, or dropping it back.
   */
  const detailOpen = selected !== null;

  /*
   * THE ROW CONTRACT, POINTER AND ENTER ALIKE. Choosing the row the board
   * already shows closes the pane and drops the drawer back — a dismissed
   * automatic read is remembered for as long as the same sole result holds.
   * Choosing any other row moves the pane to it and reads it tall.
   */
  function toggleDetail(id: string): boolean {
    if (selection && selection.id === id) {
      setDismissed((prev) => new Set(prev).add(id));
      setSelection(null);
      setSnap(0.6);
      return true;
    }
    setSelection({ id, auto: false });
    setSnap(0.95);
    return false;
  }

  /* The search reclaims its focus on open and clears itself on close, so the
     deck a reader meets next time is the whole deck, never a stale filter —
     the search, the state strip, the fold, the selection, and the dismissed
     reads all reset with it. */
  useEffect(() => {
    if (open) searchRef.current?.focus();
    else {
      setNeedle("");
      setSelection(null);
      setDismissed(new Set());
      setLaneFilter(FILTER_ALL);
      setFolded({});
    }
  }, [open]);

  /*
   * THE SELECTION FOLLOWS THE RESULT SET.
   *
   * A sole result mirrors itself into the board with no second press — the
   * reader who narrows to a name and stops is reading the record. A set that
   * broadens past one takes the automatic read away, and a visible explicit
   * row stays only while it is visible. A stale selection from a previous
   * read resolves to nothing rather than dead-ending the walk.
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
    /*
     * THE RESULT SET BROADENED PAST ONE, so the automatic read is gone. An
     * automatic selection was never the reader's — it was the mirror of a
     * result set that no longer exists — so it does not survive its own
     * broadening as a highlight without a pane. An explicit one stays only
     * while its row is visible.
     */
    if (selection !== null && (selection.auto || !walk.some((row) => row.design.id === selection.id))) {
      setSelection(null);
    }
  }, [sole, walk, selection, dismissed]);

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

  function onKeyDown(event: React.KeyboardEvent) {
    const onInput = event.target instanceof HTMLInputElement;

    /*
     * THE FILTER OWNS LEFT AND RIGHT FROM ITS STRIP. While a chip holds the
     * focus, the arrows step the active chip through the lanes' vocabulary
     * and stop at the ends. From anywhere else, left and right mean nothing
     * here: up and down mean rows, and the two walks never steal a key.
     */
    const onChip =
      event.target instanceof HTMLElement && event.target.closest("[data-chip-strip]") !== null;
    if (onChip && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      const chips = [FILTER_ALL, ...LANES.map((lane) => lane.key)];
      setLaneFilter(chipStepped(laneFilter, event.key === "ArrowRight" ? 1 : -1, chips));
      return;
    }

    /* ESCAPE IS NOT THIS HANDLER'S. Radix's dismissable layer listens in the
       capture phase, so Escape closes the whole drawer before this handler
       can see it, and the honest contract is the one that implies: Escape
       closes the deck, Enter toggles the detail. */
    if (event.key === "/" && !onInput) {
      event.preventDefault();
      searchRef.current?.focus();
      return;
    }

    /* THE WALK AND THE SEARCH SHARE THE UP AND DOWN ARROWS. The deck opens
       with the search focused, so the walk has to work from inside it — the
       command-palette convention. j and k stay for a reader whose hands have
       left the field. */
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
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
    if (onInput) return;

    /* ESCAPE IS NOT THIS HANDLER'S. Radix's dismissable layer listens in the
       capture phase, so Escape closes the whole drawer before this handler
       can see it, and the honest contract is the one that implies: Escape
       closes the deck, Enter toggles the detail. */
    if (event.key === "j") {
      event.preventDefault();
      moveSelection(1);
    } else if (event.key === "k") {
      event.preventDefault();
      moveSelection(-1);
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
            /* TYPING RESETS THE FILTER. The search owns the result set, so
               the filter resets the moment the search has a needle — and
               `filterForTyping` is the one place the rule lives. */
            setLaneFilter(filterForTyping());
            /* A NEW NEEDLE IS A NEW READ. The dismissed sole belongs to the
               previous read, so the fresh result set may read itself again —
               the close the reader made says "this read, closed", and the
               needle moved on. */
            setDismissed(new Set());
          }}
          placeholder="refine the deck…"
          aria-label="Search the work items"
          className="h-7 min-w-0 flex-1 bg-transparent font-mono text-[14px] text-foreground outline-none placeholder:text-ink-faint"
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
        <span className="shrink-0 font-mono text-[11.5px] text-ink-faint">
          <kbd>/</kbd> search &middot; <kbd>j</kbd>/<kbd>k</kbd> walk &middot;{" "}
          <kbd>↵</kbd> detail &middot; <kbd>esc</kbd> closes
        </span>
      </div>

      {/*
        THE STATE FILTER. Whole lanes, in the lanes' own vocabulary, with the
        count each keeps. It combines with the search as AND: the strip narrows
        where to read, the search narrows what is on the page, and the counts
        beside the strip never disagree with either because they read the same
        rows the walk does.
      */}
      <div
        aria-label="Filter the lanes by state"
        data-chip-strip=""
        className="flex min-w-0 shrink-0 flex-wrap items-center gap-1.5 border-b border-line px-4 py-2"
      >
        {[
          { key: "all", label: "All" },
          ...LANES.map((lane) => ({ key: lane.key, label: lane.label })),
        ].map(({ key, label }) => {
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
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-3 py-2" tabIndex={-1}>
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
                  onOpenChange={(next) =>
                    setFolded((was) => ({ ...was, [lane.key]: !next }))
                  }
                >
                  <section aria-label={lane.label} className="mb-2 min-w-0">
                    <CollapsibleTrigger
                      className={cn(
                        "group flex min-w-0 w-full cursor-pointer items-baseline gap-2 rounded-md px-2.5 pt-2 pb-1 text-left",
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
                          {scoped.map((row, index) => (
                            <DeckRow
                              key={row.design.id}
                              row={row}
                              needle={needleText}
                              selected={row.design.id === selection?.id}
                              onSelect={() => toggleDetail(row.design.id)}
                              index={index}
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
              recordsLoad={recordsLoad}
              epicState={(epic) => resolvedJoinsOf(index).epicState(epic)}
              onClose={() => {
                setDismissed((prev) => new Set(prev).add(selected.design.id));
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
          pull requests. A merged pull request reads inside its design
          {detailOpen
            ? ", and the pane follows the walk: ↵ from the board drops the deck back."
            : "."}
        </p>
      </footer>

      <Drawer.Description className="sr-only">
        The Work board as a dense departure board of collapsible lanes, behind a state
        filter. The search refines as you type; j and k walk the rows; Enter opens the
        selected design in a detail pane and expands the drawer.
      </Drawer.Description>
    </div>
  );
}

/**
 * The prototype.
 *
 * The load rule is the shipped surface's: one `loadIndex`, three states, and a
 * failed load states the failure instead of rendering an empty deck.
 */
export default function WorkDeck() {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [open, setOpen] = useState(false);
  /* Controlled snap: Enter's expand contract needs to set the height, not ask. */
  const [snap, setSnap] = useState<number | null>(0.6);

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
          activeSnapPoint={snap}
          setActiveSnapPoint={setSnap as (snapPoint: string | number | null) => void}
          fadeFromIndex={1}
        >
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/55" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[100dvh] flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-frame outline-none">
              {load.state === "ready" ? (
                <DrawerBody index={load.index} open={open} setSnap={setSnap} />
              ) : null}
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    </TooltipProvider>
  );
}