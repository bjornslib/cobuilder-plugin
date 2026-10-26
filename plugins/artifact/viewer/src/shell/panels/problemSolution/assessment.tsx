import { BookMarked } from "lucide-react";

import BasicAccordion, { type AccordionItem } from "@/components/smoothui/basic-accordion";
import type { AssessmentFinding, DesignAssessment } from "@/data/bundle";

import { Box, Chip, Missing, Panel, StateBadge, toneForSeverity, toneForVerdict } from "../../atoms";
import type { WorkItem } from "../../model";
import { excerpt } from "../../records";
import { VERDICT_GLOSS } from "../../gloss";

const NO_ASSESSMENT_TEXT =
  "This work carries no assessment record, so the panel shows no verdict. An absent verdict is not a pass.";

function FindingMeta({ finding }: { finding: AssessmentFinding }) {
  return (
    <>
      <Chip tone={toneForSeverity(finding.severity)}>{finding.severity ?? finding.kind}</Chip>
      {finding.id ? <span className="font-mono text-[12px] text-ink-faint">{finding.id}</span> : null}
    </>
  );
}

function findingItem(finding: AssessmentFinding, index: number): AccordionItem {
  return {
    id: finding.id ?? index,
    title: (
      <span className="min-w-0 font-serif text-[16px] leading-[1.45] font-semibold">{finding.title}</span>
    ),
    meta: <FindingMeta finding={finding} />,
    content: (
      <p className="m-0 min-w-0 font-serif text-[16px] leading-[1.6] text-ink-mid">{finding.detail}</p>
    ),
  };
}

/** Findings repeat, so they are an accordion. The detail opens on the reader's press. */
function FindingList({ findings }: { findings: AssessmentFinding[] }) {
  return <BasicAccordion allowMultiple idPrefix="finding" items={findings.map(findingItem)} />;
}

function AssessmentChips({ assessment, count }: { assessment: DesignAssessment; count: number }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Chip tone={toneForSeverity(assessment.risk_tier)}>
        risk tier {assessment.risk_tier ?? "unrecorded"}
      </Chip>
      <Chip>{count} findings</Chip>
      <Chip>{assessment.stage ?? "stage unrecorded"}</Chip>
    </div>
  );
}

function AssessmentBody({ assessment }: { assessment: DesignAssessment }) {
  const findings = assessment.findings ?? [];
  return (
    <div className="flex min-w-0 flex-col gap-3.5">
      <Box label="Summary">{excerpt(assessment.summary ?? "", 300)}</Box>
      <AssessmentChips assessment={assessment} count={findings.length} />
      {findings.length > 0 ? <FindingList findings={findings} /> : null}
    </div>
  );
}

/*
 * A record may carry an assessment and no verdict in it. The badge then
 * carries no word, exactly as it did before the shipped type declared the
 * field possibly absent, and the gloss states what an unrecorded verdict
 * means: it is not a pass.
 */
function VerdictBadge({ verdict }: { verdict: string | undefined }) {
  const word = verdict ?? "";
  const gloss = VERDICT_GLOSS[word] ?? "A verdict outside the recorded vocabulary.";
  return <StateBadge word={word} tone={toneForVerdict(word)} gloss={gloss} className="text-[14px]" />;
}

/** Assessment. The verdict leads, because it is the answer a reader came for. */
export function AssessmentSection({ work }: { work: WorkItem }) {
  const assessment = work.record?.assessment;
  const action = assessment ? <VerdictBadge verdict={assessment.verdict} /> : null;
  return (
    <Panel title="Assessment" icon={BookMarked} absent={!assessment} count={assessment?.findings?.length ?? 0} action={action}>
      {assessment ? <AssessmentBody assessment={assessment} /> : <Missing>{NO_ASSESSMENT_TEXT}</Missing>}
    </Panel>
  );
}
