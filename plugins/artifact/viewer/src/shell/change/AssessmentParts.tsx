import type { ComponentType } from "react";

import type { StoryAssessment, StoryAssessmentFinding } from "@/data/bundle";
import { Box, Chip, Missing, StateBadge, SubHead, TextList, toneForVerdict } from "@/shell/atoms";

import { AnswerBlock } from "./AssessmentAnswer";
import { AssessmentFindings } from "./AssessmentFindings";
import { asLines } from "./sheetLines";

export type AssessmentPart = "assessment" | "findings" | "risk";

type PartProps = { assessment: StoryAssessment };

const NO_ASSESSMENT =
  "This pull request carries no assessment block. The assessment is written against a merged diff, and this entry holds none.";
const NO_DRIFT =
  "No drift finding on this entry. A drift finding says a record in the bundle no longer matches the tree, and this one holds none.";

function VerdictBadge({ verdict }: { verdict: string }) {
  return <StateBadge word={verdict} tone={toneForVerdict(verdict)} gloss="The whole-diff verdict." />;
}

function VerdictRow({ assessment }: PartProps) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      {assessment.verdict ? <VerdictBadge verdict={assessment.verdict} /> : null}
      {assessment.risk_tier ? <Chip>risk tier: {assessment.risk_tier}</Chip> : null}
      {assessment.stage ? <Chip>stage: {assessment.stage}</Chip> : null}
      {assessment.generated ? <Chip>written {assessment.generated}</Chip> : null}
    </span>
  );
}

function RetrospectiveNote() {
  return (
    <p className="m-0 font-mono text-[12.5px] leading-[1.6] text-ink-dim">
      Written after the merge, so its findings are observations and drift rather than
      predictions.
    </p>
  );
}

function AssessmentOverview({ assessment }: PartProps) {
  return (
    <>
      <VerdictRow assessment={assessment} />
      {assessment.stage === "retrospective" ? <RetrospectiveNote /> : null}
      {assessment.summary ? <Box label="Summary" anchor>{assessment.summary}</Box> : null}
      <AnswerBlock title="Is this sensible" answer={assessment.sensible} />
      <AnswerBlock title="Maintainability and constraints" answer={assessment.maintainability} />
      <AnswerBlock title="Patterns and duplicates" answer={assessment.pattern} />
    </>
  );
}

function Drift({ drift }: { drift: StoryAssessmentFinding[] }) {
  const lines = asLines(drift.map((entry) => entry.claim ?? entry.title ?? ""));
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SubHead anchor>Drift</SubHead>
      {drift.length === 0 ? <Missing>{NO_DRIFT}</Missing> : <TextList items={lines} />}
    </div>
  );
}

function AssessmentRisk({ assessment }: PartProps) {
  return (
    <>
      {assessment.regret_risk ? <Box label="Regret risk" tone="problem" anchor>{assessment.regret_risk}</Box> : null}
      <Drift drift={assessment.drift ?? []} />
    </>
  );
}

const ASSESSMENT_PARTS: Record<AssessmentPart, ComponentType<PartProps>> = {
  assessment: AssessmentOverview,
  findings: AssessmentFindings,
  risk: AssessmentRisk,
};

export interface ChangeAssessmentPartProps {
  assessment: StoryAssessment | undefined;
  part: AssessmentPart;
}

export function ChangeAssessmentPart({ assessment, part }: ChangeAssessmentPartProps) {
  if (!assessment) return <Missing>{NO_ASSESSMENT}</Missing>;
  const Part = ASSESSMENT_PARTS[part];
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Part assessment={assessment} />
    </div>
  );
}
