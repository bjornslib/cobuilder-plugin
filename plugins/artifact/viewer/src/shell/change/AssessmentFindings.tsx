import type { StoryAssessment, StoryAssessmentFinding, StoryBoundaryCheck } from "@/data/bundle";
import { Chip, Missing, SubHead } from "@/shell/atoms";

type PartProps = { assessment: StoryAssessment };

const CARD_CLASS =
  "flex min-w-0 flex-col gap-1.5 rounded-lg border border-line-soft bg-surface-2/50 px-3.5 py-3";
const LIST_CLASS = "m-0 flex min-w-0 list-none flex-col gap-2 p-0";

function FindingChips({ finding }: { finding: StoryAssessmentFinding }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      <Chip tone={finding.severity === "concern" ? "warn" : "neutral"}>{finding.severity ?? "finding"}</Chip>
      <Chip dashed>{finding.kind ?? "observation"}</Chip>
      {finding.id ? <Chip className="text-ink-faint">{finding.id}</Chip> : null}
    </span>
  );
}

function FindingItem({ finding }: { finding: StoryAssessmentFinding }) {
  return (
    <li className={CARD_CLASS}>
      <FindingChips finding={finding} />
      <div className="font-serif text-[16px] leading-[1.5] font-semibold text-foreground">{finding.title}</div>
      <div className="font-serif text-[15.5px] leading-[1.6] text-ink-mid">{finding.claim ?? finding.detail}</div>
    </li>
  );
}

function FindingList({ findings }: { findings: StoryAssessmentFinding[] }) {
  return (
    <ul className={LIST_CLASS}>
      {findings.map((finding, index) => (
        <FindingItem key={finding.id ?? `${index}-${finding.title ?? ""}`} finding={finding} />
      ))}
    </ul>
  );
}

function Findings({ findings }: { findings: StoryAssessmentFinding[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SubHead anchor>Findings</SubHead>
      {findings.length === 0 ? (
        <Missing>This assessment recorded no finding against the diff.</Missing>
      ) : (
        <FindingList findings={findings} />
      )}
    </div>
  );
}

function CheckItem({ check }: { check: StoryBoundaryCheck }) {
  return (
    <li className={CARD_CLASS}>
      <Chip tone={check.result === "not-checkable" ? "warn" : "neutral"}>{check.result ?? "no result"}</Chip>
      <div className="font-serif text-[15.5px] leading-[1.55] text-ink-mid">{check.rule}</div>
      <div className="font-mono text-[12.5px] leading-[1.6] text-ink-faint">
        {check.source} &mdash; {check.evidence}
      </div>
    </li>
  );
}

function CheckList({ checks }: { checks: StoryBoundaryCheck[] }) {
  return (
    <ul className={LIST_CLASS}>
      {checks.map((check, index) => (
        <CheckItem key={`${index}-${check.rule?.slice(0, 20) ?? ""}`} check={check} />
      ))}
    </ul>
  );
}

function BoundaryChecks({ checks }: { checks: StoryBoundaryCheck[] }) {
  if (checks.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SubHead anchor>Boundary checks</SubHead>
      <CheckList checks={checks} />
    </div>
  );
}

export function AssessmentFindings({ assessment }: PartProps) {
  return (
    <>
      <Findings findings={assessment.findings ?? []} />
      <BoundaryChecks checks={assessment.boundary_checks ?? []} />
    </>
  );
}
