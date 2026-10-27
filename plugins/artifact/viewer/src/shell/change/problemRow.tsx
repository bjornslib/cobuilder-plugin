import type { ReactNode } from "react";

import type { StoryBeat, StoryLevel } from "@/data/bundle";
import { Box, Missing, Panel } from "@/shell/atoms";

import { narrationOf, type RowContext } from "./rowContext";
import { CHANGE_LEVEL_KEY } from "./sectionModel";
import { ChangeAssessmentPart, type AssessmentPart } from "./Sheets";

const NOT_STATED =
  "This pull request states no problem and no solution for this level. The bundle records neither the two prose fields nor a beat.";

function BeatItem({ beat }: { beat: StoryBeat }) {
  return (
    <li className="min-w-0 rounded-lg border border-line-soft bg-surface-2/50 px-3.5 py-2.5">
      <span className="font-mono text-[11.5px] font-bold tracking-[0.08em] text-ink-faint uppercase">
        {beat.kind ?? "beat"}
      </span>
      <p className="mt-1 mb-0 min-w-0 font-serif text-[15.5px] leading-[1.6] text-foreground">{beat.text}</p>
    </li>
  );
}

function Beats({ beats }: { beats: StoryBeat[] }) {
  return (
    <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">
      {beats.map((beat, index) => (
        <BeatItem key={`${index}-${beat.kind ?? ""}`} beat={beat} />
      ))}
    </ul>
  );
}

function ProblemBody({ gap }: { gap: StoryLevel | undefined }) {
  const beats = gap?.beats ?? [];
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {gap?.problem ? <Box label="Problem" tone="problem">{gap.problem}</Box> : null}
      {gap?.solution ? <Box label="Solution" tone="solution">{gap.solution}</Box> : null}
      {beats.length === 0 ? null : <Beats beats={beats} />}
    </div>
  );
}

function isStated(gap: StoryLevel | undefined): boolean {
  return Boolean(gap?.problem || gap?.solution) || (gap?.beats ?? []).length > 0;
}

function problemPanel(ctx: RowContext): ReactNode {
  const gap = ctx.entry.levels?.[CHANGE_LEVEL_KEY["problem-and-solution"]];
  const stated = isStated(gap);
  return (
    <Panel key="problem" title="Problem and solution" icon={ctx.icon} absent={ctx.level === null && !stated}>
      {narrationOf(ctx)}
      {stated ? <ProblemBody gap={gap} /> : <Missing>{NOT_STATED}</Missing>}
    </Panel>
  );
}

function assessmentPanel(ctx: RowContext, part: AssessmentPart, title: string): ReactNode {
  const assessment = ctx.entry.assessment;
  return (
    <Panel key={part} title={title} icon={ctx.icon} absent={assessment === undefined}>
      <ChangeAssessmentPart assessment={assessment} part={part} />
    </Panel>
  );
}

export function problemSections(ctx: RowContext): ReactNode[] {
  return [
    problemPanel(ctx),
    assessmentPanel(ctx, "assessment", "Assessment"),
    assessmentPanel(ctx, "findings", "Findings and checks"),
    assessmentPanel(ctx, "risk", "Regret risk and drift"),
  ];
}
