/**
 * The Intent level: Why, Done when, Abort if, Out of scope.
 *
 * INTENT IS FOUR SECTIONS, ONE PER PART OF THE CONTRACT. The level was one panel with
 * four parts and ran to 4.2 pages, so a reader met the plan a screen at a time only if
 * they scrolled. Each part is now its own box on the pager track and each carries the
 * whole width of the box, which is the room the contract's lists deserve.
 *
 * THE BODY OF EVERY PART IS UNCHANGED. Its `ColumnHead`, its `Box`, its `TextList`, and
 * its absence line are the ones the single panel rendered; only the container around
 * them changed.
 *
 * Each part also carries its own absence gate now. The single panel gated all four on
 * the goal record alone, so a work with a goal and no abort condition showed an "Abort
 * if" part with nothing under it and no pill to say why. A part that fails its own rule
 * is absent, which is the rule every other panel in this shell already follows.
 *
 * The four sections carry no lead. The single panel's lead named all four parts, so
 * repeating it four times would state the other three, and writing four new sentences
 * would invent prose the record does not hold. The panel's own title and its ColumnHead
 * name the part between them.
 *
 * THE WHY PANEL HOLDS THE CONTAINER DRAWING. This level used to render a Diagrams section
 * of its own beside the four parts of the contract, and the engineer moved the drawing
 * inside Why. The panel therefore draws the tiles for the level numbers its caller hands
 * it, and this level renders no section named Diagrams at all. The tiles sit at the END of
 * the panel body, after the outcome, so a reader meets the reason before the drawing.
 *
 * A DRAWING THE RECORD LACKS IS NOT AN ABSENCE. A record that carries no level "1" gives
 * this panel its prose and no tile. The panel states no gap for one, because a reader who
 * never asked about a drawing does not need to read about a missing one.
 *
 * THIS FILE IS THE PORTED PROTOTYPE at `src/variations/sections-e/panels.tsx`, split by
 * level so `panels/` holds one file per level. It reads the shipped record type from
 * `@/data/bundle`, which declares every goal field possibly absent, so the one excerpt
 * below coalesces a missing outcome to an empty string rather than passing undefined.
 */

import { Ban, ListChecks, Target, TriangleAlert } from "lucide-react";

import { excerpt } from "../records";
import type { WorkItem } from "../model";
import { Box, Missing, Panel, TextList } from "../atoms";
import { DiagramTiles } from "../DiagramTiles";
import type { Theme } from "../DiagramTiles";

/**
 * Why. The goal record's outcome, and the container drawing.
 *
 * The caller chooses the level numbers, and it names the level by its NUMBER and never by
 * its position in the record. A record that carries levels 2 and 3 alone therefore draws
 * no tile here, because neither of them is the container drawing.
 */
export function WhySection({
  work,
  theme,
  levels,
}: {
  work: WorkItem;
  /** The container drawing's level numbers: `["1"]`, or empty when the record lacks one. */
  levels: string[];
  theme: Theme;
}) {
  const goal = work.record?.goal;
  const sources = work.record?.diagrams ?? null;

  return (
    <Panel title="Why" icon={Target} absent={!goal}>
      <div className="flex min-w-0 flex-col gap-2">
        <ColumnHead label="Why" />
        {goal ? (
          <Box label="Outcome">{excerpt(goal.outcome ?? "", 260)}</Box>
        ) : (
          <Missing>No goal record, so the work states no outcome.</Missing>
        )}
        {/*
          The drawing closes the panel, so the reason comes first. It draws nothing when
          the record carries no level the caller named, and it marks no absence.
        */}
        {levels.length > 0 && sources ? (
          <DiagramTiles levels={levels} sources={sources} theme={theme} />
        ) : null}
      </div>
    </Panel>
  );
}

/** Done when. The conditions that make the work done. */
export function DoneWhenSection({ work }: { work: WorkItem }) {
  const goal = work.record?.goal;
  const done = goal?.done_when ?? [];

  return (
    <Panel title="Done when" icon={ListChecks} absent={done.length === 0}>
      <div className="flex min-w-0 flex-col gap-2">
        <ColumnHead label="Done when" />
        {done.length > 0 ? (
          <TextList items={done} ordered />
        ) : (
          <Missing>No done-when condition is recorded.</Missing>
        )}
      </div>
    </Panel>
  );
}

/** Abort if. The conditions that would stop the work. */
export function AbortIfSection({ work }: { work: WorkItem }) {
  const abort = work.record?.goal?.abort_if ?? [];

  return (
    <Panel title="Abort if" icon={TriangleAlert} absent={abort.length === 0}>
      <div className="flex min-w-0 flex-col gap-2">
        <ColumnHead label="Abort if" />
        {abort.length > 0 ? (
          <TextList items={abort} />
        ) : (
          <Missing>No abort condition is recorded.</Missing>
        )}
      </div>
    </Panel>
  );
}

/** Out of scope. The boundary the intent states. */
export function OutOfScopeSection({ work }: { work: WorkItem }) {
  const scope = work.record?.intent?.out_of_scope ?? [];

  return (
    <Panel title="Out of scope" icon={Ban} absent={scope.length === 0}>
      <div className="flex min-w-0 flex-col gap-2">
        <ColumnHead label="Out of scope" />
        {scope.length > 0 ? (
          <TextList items={scope} />
        ) : (
          <Missing>No scope boundary is recorded.</Missing>
        )}
      </div>
    </Panel>
  );
}

/**
 * A column's own heading.
 *
 * It carries the visible word and nothing else. It used to print the field path under
 * the word, so a reader saw `goal.outcome` where they needed to see `WHY`. The engineer
 * removed that, and the whole shell now follows the rule.
 */
function ColumnHead({ label }: { label: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 border-b border-line-soft pb-1.5">
      <span className="font-mono text-[12.5px] font-bold tracking-[0.08em] uppercase">
        {label}
      </span>
    </div>
  );
}
