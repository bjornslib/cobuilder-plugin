/**
 * The Work board: every work item in the bundle, one row each, before a reader picks one.
 *
 * The shell had no surface for "nothing is selected". It landed on a work item, and a
 * route naming an unknown id rendered an error. So the board becomes the landing
 * surface, at the bare route `#/sections-e`, and the rail's top entry returns to it from
 * any level. The route that names an unknown id keeps its error.
 *
 * THE BOARD IS A FLAT LIST, NOT FOUR LANES. The lane rule is approved, and it is the one
 * `src/components/work/WorkBoard.tsx` fixes: a design that needs a decision comes first,
 * then one ready to build, then one in review, then one shipped. Two things decided the
 * flat read. A superseded design holds no lane, and this bundle holds four of them, so a
 * lane board would need an extra tab and a second story to list work every reader must
 * still be able to reach. And a row carries more than a card does: a stage, six record
 * marks, and an epic and a slice figure. Lanes are the arrangement for a grid of cards,
 * and the board is not that grid.
 *
 * The order still follows the lane rule, so the work that waits on somebody reads first
 * and a superseded design reads last. Each row states its own stage, so the order is
 * never the only thing telling a reader where an item stands.
 *
 * THE BOARD IS NOT A PAGED LEVEL. It draws no section strip, no pager, and no level
 * progress bar. It is also the one surface that draws no reading-progress strip and no
 * section-link bar: the page is a list of fifteen short rows, so a progress reading would
 * sit at a constant value, and the bar holds one link per panel and the board has none.
 * The pane still owns the scroll, and the document still does not scroll.
 */

import { useMemo } from "react";

import { CircleDashed, Layers } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

import type { Tone } from "./atoms";
import {
  Chip,
  SectionHeading,
  StateBadge,
  TONE_MARK,
  TONE_PILL,
  toneForStage,
} from "./atoms";
import { STATE_GLOSS } from "./gloss";
import type { WorkItem } from "./model";
import { routeHref } from "./model";
import type { Readiness, RecordKind, RecordVerdicts } from "./readiness";
import { RECORD_KINDS, RECORD_LABEL, presentCount, recordVerdicts } from "./readiness";

/**
 * The order the board lists work items in, taken from the approved lane rule above.
 *
 * A superseded design sorts after every live stage, because no work waits on it. A stage
 * outside the recorded vocabulary sorts after that one, so a newer bundle still renders
 * and still renders last rather than disappearing.
 */
const STAGE_ORDER = ["backlog", "decided", "approved", "review", "implemented", "superseded"];

function stageRank(stage: string): number {
  const rank = STAGE_ORDER.indexOf(stage);
  return rank === -1 ? STAGE_ORDER.length : rank;
}

export interface BoardProps {
  works: Map<string, WorkItem>;
  /** False while the index is still in flight, so the board states that and nothing else. */
  ready: boolean;
  /** The heading the shell moves focus to on a route change. */
  headingId: string;
}

interface BoardRow {
  work: WorkItem;
  verdicts: RecordVerdicts;
  present: number;
  epicsDone: number;
  slicesDone: number;
}

function boardRows(works: Map<string, WorkItem>): BoardRow[] {
  return [...works.values()]
    .sort((a, b) => {
      const rank = stageRank(a.design.stage) - stageRank(b.design.stage);
      return rank !== 0 ? rank : a.id.localeCompare(b.id);
    })
    .map((work) => {
      const verdicts = recordVerdicts(work.record);
      /*
       * The refined state from the join, never the entity's own placeholder, for the same
       * reason `TopLinePanel` reads it that way. A slice is done when it records
       * `completed`, which is the one value this corpus writes.
       */
      const epicsDone = work.epics.filter((epic) => {
        const state = work.epicState(epic);
        return state === "completed" || state === "merged";
      }).length;
      return {
        work,
        verdicts,
        present: presentCount(verdicts),
        epicsDone,
        slicesDone: work.slices.filter((slice) => slice.state === "completed").length,
      };
    });
}

export function Board({ works, ready, headingId }: BoardProps) {
  const rows = useMemo(() => boardRows(works), [works]);

  if (!ready) {
    return (
      <div className="min-w-0 px-6 py-6 pb-12">
        <SectionHeading
          id={headingId}
          title="Work"
          lead="Every design in the bundle. Press a row to open that item."
        />
        <p className="m-0 font-mono text-[13px] text-ink-dim">Reading the record index.</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 px-6 py-6 pb-12">
      <SectionHeading
        id={headingId}
        title="Work"
        lead="Every design in the bundle. A design that needs a decision comes first, and a superseded design comes last. Press a row to open that item."
      />

      <BoardKey count={rows.length} />

      {rows.length === 0 ? (
        <p className="m-0 font-serif text-[16px] text-ink-dim">
          The index resolved and lists no design.
        </p>
      ) : (
        <ul className="m-0 flex min-w-0 list-none flex-col gap-3 p-0">
          {rows.map((row, index) => (
            <BoardRowView key={row.work.id} row={row} index={index} />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The key, and the one line that teaches the signature.
 *
 * The board states completeness, which no panel in this shell does, so a reader meets
 * three readiness words here for the first time. The key names all three beside the mark
 * that carries them.
 */
function BoardKey({ count }: { count: number }) {
  return (
    <div className="mb-5 flex min-w-0 flex-col gap-2.5 rounded-xl border border-line bg-card p-4">
      <p className="m-0 min-w-0 max-w-[92ch] font-serif text-[15px] leading-[1.5] text-ink-mid">
        <b className="font-mono font-bold text-foreground tabular-nums">{count}</b>{" "}
        {count === 1 ? "design" : "designs"}. Each row carries one mark per authored record,
        in this order:{" "}
        <span className="font-mono text-[14px]">
          {RECORD_KINDS.map((kind) => RECORD_LABEL[kind]).join(", ")}
        </span>
        . A mark names its record and its readiness in its tooltip.
      </p>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <ReadinessPill state="present" />
        <span className="min-w-0 font-serif text-[15px] text-ink-dim">
          the record exists and is complete
        </span>
        <ReadinessPill state="partial" />
        <span className="min-w-0 font-serif text-[15px] text-ink-dim">
          it exists and a named part is empty
        </span>
        <ReadinessPill state="absent" />
        <span className="min-w-0 font-serif text-[15px] text-ink-dim">
          no record exists, and the mark names what is missing
        </span>
      </div>
    </div>
  );
}

/**
 * One readiness state, as the same pill the shell already uses for absence.
 *
 * `NotPresentPill` in `atoms.tsx` is this shape for one state. The board needs all three,
 * so the fill and the shape marker come from the atoms' tone tables and the words are the
 * record mosaic's three.
 */
const READINESS_TONE: Record<Readiness, Tone> = {
  present: "good",
  partial: "accent",
  absent: "neutral",
};

const READINESS_WORD: Record<Readiness, string> = {
  present: "present",
  partial: "partial",
  absent: "absent",
};

function ReadinessPill({ state }: { state: Readiness }) {
  const Mark = TONE_MARK[READINESS_TONE[state]];
  return (
    <span
      className={cn(
        "inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[12px] font-bold tracking-[0.04em] uppercase",
        TONE_PILL[READINESS_TONE[state]],
      )}
    >
      <Mark className="size-3.5 shrink-0" aria-hidden="true" />
      {READINESS_WORD[state]}
    </span>
  );
}

/**
 * The compact record signature of one work item: one mark per kind, in a fixed order.
 *
 * A mark states three things without spending the row: the record's name, whether it
 * exists, and whether it is whole. The tone follows the record mosaic's rule — a solid
 * mark is a whole record, a dashed mark is a gap — and the shape marker beside a dashed
 * mark survives greyscale, per `atoms.tsx` rule 3.
 *
 * The row is a link to the item, so the whole signature is inside that link and carries
 * no control of its own.
 */
const MARK: Record<Readiness, string> = {
  present: "border-line bg-surface-2 text-ink-dim",
  partial: "border-dashed border-primary/70 bg-accent-wash/50 text-accent-deep",
  absent: "border-dashed border-line text-ink-faint",
};

function RecordSignature({ verdicts }: { verdicts: RecordVerdicts }) {
  return (
    <ul
      aria-label="Records this work item holds"
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
              <CircleDashed className="size-3 shrink-0" aria-hidden="true" />
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
 * The same 180 ms fade and four-pixel rise the base board uses, with the stagger capped
 * so a fifteen-row board never trails. `useReducedMotion` turns it off whole.
 */
const ENTER_EASE = [0.22, 0.75, 0.3, 1] as const;

function BoardRowView({ row, index }: { row: BoardRow; index: number }) {
  const reduce = useReducedMotion();
  const { work, verdicts } = row;
  const supersededBy = work.record?.goal.superseded_by ?? null;
  const sliceTotal = work.slices.length;

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
        An anchor, like every other destination in this shell, so a row is
        right-clickable and openable in a new tab. A press on it is the existing route for
        that work item. Hover stays in the tint family: `--surface-2` and `--primary`,
        never `--band`.
      */}
      <a
        href={routeHref(work.id, "intent")}
        aria-label={`Open ${work.design.name}, stage ${work.design.stage}`}
        className={cn(
          "flex min-w-0 flex-col gap-2.5 rounded-xl border border-line bg-card p-4",
          "shadow-card transition-colors duration-150 ease-house hover:border-primary hover:bg-surface-2",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
      >
        <div className="flex min-w-0 flex-wrap items-start gap-x-3 gap-y-2">
          <h2 className="m-0 min-w-0 flex-1 font-mono text-[16px] leading-[1.25] font-bold tracking-[-0.01em] break-words">
            {work.design.name}
          </h2>
          <StateBadge
            word={work.design.stage}
            tone={toneForStage(work.design.stage)}
            gloss={STATE_GLOSS[work.design.stage] ?? "A stage outside the recorded vocabulary."}
            className="min-w-0"
          />
          <Chip
            title="How many of the six authored records this item holds, whole or in part."
            className="min-w-0"
          >
            {row.present} of {RECORD_KINDS.length} records
          </Chip>
        </div>

        <p className="m-0 line-clamp-2 min-w-0 max-w-[92ch] font-serif text-[15px] leading-[1.5] text-ink-mid">
          {work.design.outcome}
        </p>

        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-line-soft pt-2.5">
          <RecordSignature verdicts={verdicts} />

          <span className="ml-auto flex min-w-0 flex-wrap items-center gap-1.5">
            <Chip
              icon={Layers}
              title="Epics whose refined state is completed or merged."
              className="min-w-0"
            >
              {row.epicsDone} of {work.epics.length}{" "}
              {work.epics.length === 1 ? "epic" : "epics"}
            </Chip>
            {sliceTotal > 0 ? (
              <Chip title="Slices whose state is completed." className="min-w-0">
                {row.slicesDone} of {sliceTotal} {sliceTotal === 1 ? "slice" : "slices"}
              </Chip>
            ) : null}
            {supersededBy ? (
              <Chip
                tone="warn"
                dashed
                title="A later design closed this one."
                className="min-w-0"
              >
                superseded by {supersededBy}
              </Chip>
            ) : null}
          </span>
        </div>
      </a>
    </motion.li>
  );
}
