import { Ban, ListChecks, Target, TriangleAlert, type LucideIcon } from "lucide-react";

import { Box, Missing, Panel, TextList } from "../../atoms";
import type { WorkItem } from "../../model";
import { excerpt } from "../../records";
import { DiagramTiles, type Theme } from "../../DiagramTiles";

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
      <span className="font-mono text-[12.5px] font-bold tracking-[0.08em] uppercase">{label}</span>
    </div>
  );
}

function WhyOutcome({ work }: { work: WorkItem }) {
  const goal = work.record?.goal;
  if (!goal) return <Missing>No goal record, so the work states no outcome.</Missing>;
  return <Box label="Outcome">{excerpt(goal.outcome ?? "", 260)}</Box>;
}

interface WhyProps {
  work: WorkItem;
  /** The container drawing's level numbers: `["1"]`, or empty when the record lacks one. */
  levels: string[];
  theme: Theme;
}

/*
  The drawing closes the panel, so the reason comes first. It draws nothing when
  the record carries no level the caller named, and it marks no absence.
*/
function WhyDrawing({ work, levels, theme }: WhyProps) {
  const sources = work.record?.diagrams ?? null;
  if (levels.length === 0 || !sources) return null;
  return <DiagramTiles levels={levels} sources={sources} theme={theme} />;
}

/**
 * Why. The goal record's outcome, and the container drawing.
 *
 * The caller chooses the level numbers, and it names the level by its NUMBER and never by
 * its position in the record. A record that carries levels 2 and 3 alone therefore draws
 * no tile here, because neither of them is the container drawing.
 */
export function WhySection({ work, theme, levels }: WhyProps) {
  return (
    <Panel title="Why" icon={Target} absent={!work.record?.goal}>
      <div className="flex min-w-0 flex-col gap-2">
        <ColumnHead label="Why" />
        <WhyOutcome work={work} />
        <WhyDrawing work={work} levels={levels} theme={theme} />
      </div>
    </Panel>
  );
}

interface ContractPartProps {
  title: string;
  icon: LucideIcon;
  items: string[];
  empty: string;
  ordered?: boolean;
}

function ContractPart({ title, icon, items, empty, ordered }: ContractPartProps) {
  return (
    <Panel title={title} icon={icon} absent={items.length === 0}>
      <div className="flex min-w-0 flex-col gap-2">
        <ColumnHead label={title} />
        {items.length > 0 ? <TextList items={items} ordered={ordered} /> : <Missing>{empty}</Missing>}
      </div>
    </Panel>
  );
}

/** Done when. The conditions that make the work done. */
export function DoneWhenSection({ work }: { work: WorkItem }) {
  const done = work.record?.goal?.done_when ?? [];
  return (
    <ContractPart title="Done when" icon={ListChecks} items={done} empty="No done-when condition is recorded." ordered />
  );
}

/** Abort if. The conditions that would stop the work. */
export function AbortIfSection({ work }: { work: WorkItem }) {
  const abort = work.record?.goal?.abort_if ?? [];
  return (
    <ContractPart title="Abort if" icon={TriangleAlert} items={abort} empty="No abort condition is recorded." />
  );
}

/** Out of scope. The boundary the intent states. */
export function OutOfScopeSection({ work }: { work: WorkItem }) {
  const scope = work.record?.intent?.out_of_scope ?? [];
  return (
    <ContractPart title="Out of scope" icon={Ban} items={scope} empty="No scope boundary is recorded." />
  );
}
