/**
 * The Work board: every design in the bundle, one row each, before a reader picks one.
 *
 * The shell had no surface for "nothing is selected". A route that named a work item
 * rendered it, and a route that named none fell through to the error the shell keeps for
 * an unknown id. So the board becomes the landing surface, and the route that names an
 * unknown id keeps its own error.
 *
 * THE BOARD IS A FLAT LIST, NOT FOUR LANES. The lane rule is approved, and it is the one
 * `src/components/work/WorkBoard.tsx` fixes: a design that needs a decision comes first,
 * then one ready to build, then one in review, then one shipped. Two things decided the
 * flat read. A superseded design holds no lane, and this bundle holds four of them, so a
 * lane board would need an extra tab and a second story to list work every reader must
 * still be able to reach. And a row carries more than a card does: a stage, six record
 * marks, and the epic figure. Lanes are the arrangement for a grid of cards, and the
 * board is not that grid.
 *
 * The order still follows the lane rule, so the work that waits on somebody reads first
 * and a superseded design reads last. Each row states its own stage, so the order is
 * never the only thing telling a reader where an item stands.
 *
 * THE BOARD IS NOT A PAGED LEVEL. It draws no section strip, no pager, and no level
 * progress bar. It draws no reading-progress strip and no section-link bar either: the
 * page is a list of short rows, so a progress reading would sit at a constant value, and
 * a bar holds one link per panel and the board has none. The pane owns the scroll and the
 * document does not scroll.
 *
 * A ROW IS A DESTINATION. A row is an anchor with the shell's own work-item address, the
 * way a rail item is, so a reader can right-click it and open it in a new tab on its own.
 * A row has one destination, so it carries one link and no second control.
 *
 * THE SECTION A ROW NAMES IS THE FIRST ONE THE DESIGN CAN FILL. Intent fills exactly when
 * the record file carries the design, which is the fact the record map beside the rows
 * already holds. A design that file misses fills no level, so its row names the first
 * section its own figures fill, which is Build when it carries an epic. Intent for that
 * design would name a level the shell then redirects away from.
 *
 * HOVER AND FOCUS STAY OUT OF `--band`. The anchor takes `--surface-2` on hover and a
 * `--primary` border, and the focus ring takes `--ring`, which resolves to the same teal
 * as `--primary`. `--band` is the heading fill, and no row state takes it, because a row
 * that took it would read as a heading.
 */

import { useMemo } from "react";

import { Check, CircleDashed, CircleDot, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { StageBadge } from "@/components/work/StageBadge";
import { STAGE_ORDER } from "@/data/bundle";
import type { DesignRow } from "@/data/types";
import { cn } from "@/lib/utils";

import type { SectionKey } from "./model";
import { routeHref } from "./model";
import type { DesignRecords, Readiness, RecordKind, RecordVerdicts } from "./readiness";
import { RECORD_KINDS, RECORD_LABEL, presentCount, recordVerdicts } from "./readiness";

export interface BoardProps {
  /** The resolved rows the record index yields, one per design. */
  rows: DesignRow[];
  /** The record map `data/designs.js` carries, keyed by design id. */
  records: DesignRecords;
  /** False while the index is still in flight, so the board states that and nothing else. */
  ready: boolean;
  /** The heading the shell moves focus to on a route change. */
  headingId: string;
}

interface BoardRow {
  row: DesignRow;
  verdicts: RecordVerdicts;
  present: number;
  /** The section this row's link names. It is the first one the design can fill. */
  section: SectionKey;
}

/**
 * The section a row's link names: the first section the design's own figures fill.
 *
 * Intent fills exactly when `designs.js` carries a record for the design, and the record
 * map beside the rows holds that fact. A design the file misses fills no level, so its row
 * names the first section its own figures fill, and Build fills when the row carries an
 * epic. Intent is the shell's own last resort.
 */
function rowSection(row: DesignRow, records: DesignRecords): SectionKey {
  if (records[row.design.id] !== undefined) return "intent";
  if (row.epics.length > 0) return "build";
  return "intent";
}

/**
 * Where a stage sorts. A stage outside the recorded vocabulary sorts after every other
 * one, so a newer bundle still renders that design and renders it last rather than
 * dropping it from the list.
 */
function stageRank(stage: string): number {
  const rank = (STAGE_ORDER as string[]).indexOf(stage);
  return rank === -1 ? STAGE_ORDER.length : rank;
}

/** Every design, ordered by the lane rule and then by id, with its verdicts resolved. */
function boardRows(rows: DesignRow[], records: DesignRecords): BoardRow[] {
  return rows
    .slice()
    .sort((a, b) => {
      const rank = stageRank(a.design.stage) - stageRank(b.design.stage);
      return rank !== 0 ? rank : a.design.id.localeCompare(b.design.id);
    })
    .map((row) => {
      const verdicts = recordVerdicts(records[row.design.id]);
      return {
        row,
        verdicts,
        present: presentCount(verdicts),
        section: rowSection(row, records),
      };
    });
}

export function Board({ rows, records, ready, headingId }: BoardProps) {
  const ordered = useMemo(() => boardRows(rows, records), [rows, records]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      {/* The pane owns the scroll, so the document never scrolls on this surface. */}
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-6 py-6 pb-12">
        <BoardHeading headingId={headingId} />

        {/*
          A board that is still reading states that and nothing else. It renders no row
          list, so a reader never meets a half-read index as a short board.
        */}
        {!ready ? (
          <p className="m-0 min-w-0 font-mono text-[13px] text-ink-dim">
            Reading the record index.
          </p>
        ) : (
          <>
            <BoardKey count={ordered.length} />

            {ordered.length === 0 ? (
              <p className="m-0 min-w-0 font-serif text-[16px] text-ink-dim">
                The record index resolved and lists no design.
              </p>
            ) : (
              <ul className="m-0 flex min-w-0 list-none flex-col gap-3 p-0">
                {ordered.map((boardRow, index) => (
                  <BoardRowView key={boardRow.row.design.id} boardRow={boardRow} index={index} />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** The page title. The shell moves focus here on a route change, so it carries the id. */
function BoardHeading({ headingId }: { headingId: string }) {
  return (
    <header className="mb-5 min-w-0 rounded-[16px] bg-band px-[26px] py-[22px] text-band-ink">
      <h1
        id={headingId}
        tabIndex={-1}
        className="m-0 min-w-0 font-mono text-[24px] leading-tight font-bold tracking-[-0.02em] text-band-ink outline-none"
      >
        Work
      </h1>
      <p className="mt-1.5 mb-0 min-w-0 max-w-[92ch] font-serif text-[16px] leading-[1.55] text-band-ink/85">
        Every design in the bundle. A design that waits on a decision comes first, and a
        superseded design comes last.
      </p>
    </header>
  );
}

/**
 * The key, and the one line that teaches the signature.
 *
 * The board states completeness, which no panel in this shell does, so a reader meets
 * three readiness words here for the first time. The key names all three beside the mark
 * that carries them, and it states how many designs the board lists.
 */
function BoardKey({ count }: { count: number }) {
  return (
    <div className="mb-5 flex min-w-0 flex-col gap-2.5 rounded-xl border border-line bg-card p-4">
      <p className="m-0 min-w-0 max-w-[92ch] font-serif text-[15px] leading-[1.5] text-ink-mid">
        <b className="font-mono font-bold text-foreground tabular-nums">{count}</b>{" "}
        {count === 1 ? "design" : "designs"}. Each row carries one mark per authored
        record, in this order:{" "}
        <span className="font-mono text-[14px]">
          {RECORD_KINDS.map((kind) => RECORD_LABEL[kind]).join(", ")}
        </span>
        . A mark names its record and its readiness.
      </p>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <ReadinessPill state="present" />
        <span className="min-w-0 font-serif text-[15px] text-ink-dim">
          the record exists and is whole
        </span>
        <ReadinessPill state="partial" />
        <span className="min-w-0 font-serif text-[15px] text-ink-dim">
          it exists and a named part is empty
        </span>
        <ReadinessPill state="absent" />
        <span className="min-w-0 font-serif text-[15px] text-ink-dim">
          no record exists, and the mark names the part that is missing
        </span>
      </div>
    </div>
  );
}

/*
 * One readiness state, as a pill. The three fills are the house tone table's, and the
 * words are the rule's three states: a whole record takes `good`, a gap takes `accent`,
 * and a record that does not exist takes the neutral surface.
 */
const READINESS_TONE: Record<Readiness, string> = {
  present: "border-good bg-good-wash text-good",
  partial: "border-primary bg-accent-wash text-accent-deep",
  absent: "border-line bg-surface-2 text-ink-mid",
};

const READINESS_MARK: Record<Readiness, LucideIcon> = {
  present: Check,
  partial: CircleDot,
  absent: Minus,
};

const READINESS_WORD: Record<Readiness, string> = {
  present: "present",
  partial: "partial",
  absent: "absent",
};

function ReadinessPill({ state }: { state: Readiness }) {
  const Mark = READINESS_MARK[state];
  return (
    <span
      className={cn(
        "inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[12px] font-bold tracking-[0.04em] uppercase",
        READINESS_TONE[state],
      )}
    >
      <Mark className="size-3.5 min-w-0 shrink-0" aria-hidden="true" />
      {READINESS_WORD[state]}
    </span>
  );
}

/** The label the row's one record signature carries. One row, one signature. */
const SIGNATURE_LABEL = "Records this work item holds";

/**
 * The compact record signature of one work item: one mark per kind, in a fixed order.
 *
 * A mark states three things without spending the row: the record's name, whether it
 * exists, and whether it is whole. A whole record takes a solid mark, and a gap takes a
 * dashed mark with a shape marker beside it, so the difference survives greyscale. The
 * full sentence sits in the mark's tooltip and, for assistive technology, in text a
 * reader does not see.
 */
const MARK: Record<Readiness, string> = {
  present: "border-line bg-surface-2 text-ink-dim",
  partial: "border-dashed border-primary/70 bg-accent-wash/50 text-accent-deep",
  absent: "border-dashed border-line text-ink-faint",
};

function RecordSignature({ verdicts }: { verdicts: RecordVerdicts }) {
  return (
    <ul
      aria-label={SIGNATURE_LABEL}
      className="m-0 flex min-w-0 list-none flex-wrap items-center gap-1.5 p-0"
    >
      {RECORD_KINDS.map((kind: RecordKind) => {
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
              "inline-flex min-w-0 items-center gap-1.5 rounded border px-1.5 py-0.5 font-mono text-[12px]",
              MARK[verdict.state],
            )}
          >
            {verdict.state === "present" ? null : (
              <CircleDashed className="size-3 min-w-0 shrink-0" aria-hidden="true" />
            )}
            <span aria-hidden="true" className="min-w-0">
              {RECORD_LABEL[kind]}
            </span>
            <span className="sr-only">{said}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * One restrained entrance, and nothing else moves.
 *
 * The same 180 ms fade and four-pixel rise the lane board uses, with the stagger capped
 * so a fifteen-row board never trails. `useReducedMotion` turns it off whole.
 */
const ENTER_EASE = [0.22, 0.75, 0.3, 1] as const;

function BoardRowView({ boardRow, index }: { boardRow: BoardRow; index: number }) {
  const reduce = useReducedMotion();
  const { row, verdicts, present, section } = boardRow;
  const { design, epics, done } = row;
  const href = routeHref(design.id, section);

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.18,
        delay: reduce ? 0 : Math.min(index * 0.012, 0.12),
        ease: ENTER_EASE,
      }}
      className="min-w-0"
    >
      {/*
        The row is one anchor, so a reader can right-click it and open it in a new tab
        without the board. It is the row's only control, and nothing interactive sits
        inside it.
      */}
      <a
        href={href}
        aria-label={`Open ${design.name}, stage ${design.stage}`}
        className={cn(
          "flex min-w-0 flex-col gap-2.5 rounded-xl border border-line bg-card p-4 shadow-card",
          "transition-colors duration-150 ease-house hover:border-primary hover:bg-surface-2",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
      >
        <div className="flex min-w-0 flex-wrap items-start gap-x-3 gap-y-2">
          <h2 className="m-0 min-w-0 flex-1 font-mono text-[16px] leading-[1.25] font-bold tracking-[-0.01em] break-words">
            {design.name}
          </h2>
          <StageBadge stage={design.stage} className="min-w-0" />
          <Badge
            variant="outline"
            title="How many of the six authored records this item holds, whole or in part."
            className="min-w-0 shrink-0 border-line bg-surface-2 font-mono text-[10px] text-ink-dim tabular-nums"
          >
            {present} of {RECORD_KINDS.length} records
          </Badge>
        </div>

        <p className="m-0 min-w-0 max-w-[92ch] font-serif text-[15px] leading-[1.5] text-ink-mid">
          {design.outcome}
        </p>

        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-line-soft pt-2.5">
          <RecordSignature verdicts={verdicts} />

          <span className="ml-auto flex min-w-0 flex-wrap items-center gap-1.5">
            {/*
              The completed figure comes from `DesignRow.done`, which the data layer
              refined against `joins.epic_status`. A second count here would let the row
              and the index disagree about one epic.
            */}
            <Badge
              variant="outline"
              title="Epics whose refined state is completed or merged."
              className="min-w-0 shrink-0 border-line bg-surface-2 font-mono text-[10px] text-ink-dim tabular-nums"
            >
              {done} of {epics.length} {epics.length === 1 ? "epic" : "epics"}
            </Badge>
          </span>
        </div>
      </a>
    </motion.li>
  );
}
