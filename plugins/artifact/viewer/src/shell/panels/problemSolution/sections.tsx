import { CircleHelp, Scale, ShieldAlert, type LucideIcon } from "lucide-react";

import type { NarrativeBeat } from "@/data/bundle";

import { Missing, Panel, PointCard, TextList, type Point } from "../../atoms";
import { splitBeats, type LevelState, type WorkItem } from "../../model";
import { excerpt } from "../../records";

function beatLead(text: string | undefined): string | undefined {
  return text ? excerpt(text, 320) : undefined;
}

function beatPoints(beats: NarrativeBeat[]): Point[] {
  return beats.map((beat) => ({ text: beat.text, kind: beat.kind }));
}

function BeatCards({ work }: { work: WorkItem }) {
  const intent = work.record?.intent;
  const beats = splitBeats(work.record?.narrative?.problem_solution?.beats);
  return (
    <div className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-5 @xl:grid-cols-2">
      {/* One card per column. The lead is the record's own prose; the rows are the beats. */}
      <PointCard title="Problem" lead={beatLead(intent?.problem)} points={beatPoints(beats.problem)} />
      <PointCard title="Solution" lead={beatLead(intent?.approach)} points={beatPoints(beats.solution)} />
    </div>
  );
}

export function ProblemSolutionSection({ work, levelState }: { work: WorkItem; levelState: LevelState }) {
  return (
    <Panel title="Problem and solution" icon={Scale} absent={!levelState.available}>
      <BeatCards work={work} />
    </Panel>
  );
}

interface ListSectionProps {
  title: string;
  icon: LucideIcon;
  lead: string;
  items: string[];
  empty: string;
}

function ListSection({ title, icon, lead, items, empty }: ListSectionProps) {
  return (
    <Panel title={title} icon={icon} lead={lead} absent={items.length === 0} count={items.length}>
      {items.length > 0 ? <TextList items={items} /> : <Missing>{empty}</Missing>}
    </Panel>
  );
}

/** Risks. */
export function RisksSection({ work }: { work: WorkItem }) {
  const risks = work.record?.intent?.risks ?? [];
  return (
    <ListSection title="Risks" icon={ShieldAlert} lead="The cost of this work if it ships without changes." items={risks} empty="No risk is recorded." />
  );
}

export function UnknownsSection({ work }: { work: WorkItem }) {
  const unknowns = work.record?.intent?.unknowns ?? [];
  return (
    <ListSection title="Unknowns" icon={CircleHelp} lead="The open questions." items={unknowns} empty="No open question is recorded." />
  );
}
