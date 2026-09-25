/**
 * The change's two written records: its intent, and the assessment against its diff.
 *
 * WHERE THEY COME FROM. The bundle keeps two blocks on one pull request's timeline entry.
 * `intent` is the author's own statement, captured by Generate mode before the code
 * existed. `assessment` is the reading written against the merged diff. Both belong to the
 * change's account and to no other account, so both render here.
 *
 * ABSENCE IS A STATE HERE TOO. A pull request carries an intent block when Generate mode
 * captured one, and an assessment when one was written. An entry with neither states that
 * in place rather than rendering two blank panels, which is what most of this bundle's
 * pull requests need: the records exist for a few of them and not for the rest.
 *
 * NOTHING HERE JUDGES A RECORD. An `inferred` intent says so, because a reading of the
 * diff is not an author's statement, and a reader who mistakes the two has been misled.
 * That single flag is the whole of the judgement this module makes.
 */

import { TriangleAlert } from "lucide-react";

import {
  Box,
  Chip,
  Missing,
  StateBadge,
  SubHead,
  TextList,
  toneForVerdict,
} from "@/shell/atoms";

import type {
  StoryAssessment,
  StoryAssessmentAnswer,
  StoryIntent,
} from "@/data/bundle";

/**
 * One field as a list of lines, whether the record wrote a list or one string.
 *
 * `intent.testing` is a single string in every entry this bundle carries that holds one,
 * while its four siblings are lists. No document states which shape the field takes, so
 * this reads both rather than assuming either.
 */
function asLines(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value === "string" && value.trim() !== "") return [value];
  return [];
}

/** One of the assessment's three answers: what it says, and what it stands on. */
function AnswerBlock({
  title,
  answer,
}: {
  title: string;
  answer: StoryAssessmentAnswer | undefined;
}) {
  if (!answer?.answer) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SubHead anchor>{title}</SubHead>
      {answer.verdict ? (
        <span>
          <StateBadge word={answer.verdict} tone={toneForVerdict(answer.verdict)} />
        </span>
      ) : null}
      <p className="m-0 max-w-[92ch] font-serif text-[16px] leading-[1.6] text-foreground">
        {answer.answer}
      </p>
      {answer.constraint_introduced ? (
        <Box label="Constraint introduced" tone="note">
          {answer.constraint_introduced}
        </Box>
      ) : null}
      {answer.evidence ? (
        <Box label="Evidence" tone="note">
          {answer.evidence}
        </Box>
      ) : null}
      {Array.isArray(answer.duplicates) && answer.duplicates.length > 0 ? (
        <Box label={`Duplicates · ${answer.duplicates.length}`} tone="note">
          <TextList items={answer.duplicates.map((entry) => JSON.stringify(entry))} />
        </Box>
      ) : null}
    </div>
  );
}

/** The author's own statement of the change, with every part it holds. */
export function ChangeIntentBody({ intent }: { intent: StoryIntent | undefined }) {
  if (!intent) {
    return (
      <Missing>
        This pull request carries no intent block. Generate mode captures intent before a
        pull request opens, and this entry holds none.
      </Missing>
    );
  }
  const inferred = intent.source === "inferred";
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        {intent.source ? (
          <Chip
            tone={inferred ? "warn" : "neutral"}
            title={
              inferred
                ? "No author statement survives, so this block is a reading of the diff."
                : undefined
            }
          >
            source: {intent.source}
          </Chip>
        ) : null}
        {intent.authorship ? <Chip>authorship: {intent.authorship}</Chip> : null}
        {intent.captured ? <Chip>captured {intent.captured}</Chip> : null}
      </span>

      {inferred ? (
        <p className="m-0 flex min-w-0 items-start gap-2 font-mono text-[12.5px] leading-[1.6] text-warn">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>No author wrote this. It is a reading of the diff, and the record says so.</span>
        </p>
      ) : null}

      {intent.problem ? (
        <Box label="Problem" tone="problem" anchor>
          {intent.problem}
        </Box>
      ) : null}
      {intent.why_now ? (
        <Box label="Why now" tone="note" anchor>
          {intent.why_now}
        </Box>
      ) : null}
      {intent.approach ? (
        <Box label="Approach" tone="solution" anchor>
          {intent.approach}
        </Box>
      ) : null}

      {(intent.alternatives ?? []).length > 0 ? (
        <div className="flex min-w-0 flex-col gap-2">
          <SubHead count={(intent.alternatives ?? []).length} anchor>
            Rejected alternatives
          </SubHead>
          <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">
            {(intent.alternatives ?? []).map((alternative, index) => (
              <li
                key={`${index}-${alternative.option ?? ""}`}
                className="min-w-0 rounded-lg border border-line-soft bg-surface-2/50 px-3.5 py-3"
              >
                <div className="font-serif text-[16px] leading-[1.5] text-foreground">
                  {alternative.option}
                </div>
                <div className="mt-1.5 font-serif text-[15px] leading-[1.55] text-ink-dim">
                  &times; {alternative.rejected_because}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {[
        ["Out of scope", intent.out_of_scope],
        ["Risks", intent.risks],
        ["Testing", intent.testing],
        ["Reviewer focus", intent.reviewer_focus],
        ["Unknowns", intent.unknowns],
      ].map(([label, held]) => {
        const items = asLines(held);
        if (items.length === 0) return null;
        return (
          <div key={label as string} className="flex min-w-0 flex-col gap-2">
            <SubHead count={items.length} anchor>
              {label as string}
            </SubHead>
            <TextList items={items} />
          </div>
        );
      })}
    </div>
  );
}

/** The reading written against the merged diff, with the evidence each answer stands on. */
export function ChangeAssessmentBody({
  assessment,
}: {
  assessment: StoryAssessment | undefined;
}) {
  if (!assessment) {
    return (
      <Missing>
        This pull request carries no assessment block. The assessment is written against a
        merged diff, and this entry holds none.
      </Missing>
    );
  }
  const findings = assessment.findings ?? [];
  const drift = assessment.drift ?? [];
  const checks = assessment.boundary_checks ?? [];
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        {assessment.verdict ? (
          <StateBadge
            word={assessment.verdict}
            tone={toneForVerdict(assessment.verdict)}
            gloss="The whole-diff verdict."
          />
        ) : null}
        {assessment.risk_tier ? <Chip>risk tier: {assessment.risk_tier}</Chip> : null}
        {assessment.stage ? <Chip>stage: {assessment.stage}</Chip> : null}
        {assessment.generated ? <Chip>written {assessment.generated}</Chip> : null}
      </span>

      {assessment.stage === "retrospective" ? (
        <p className="m-0 font-mono text-[12.5px] leading-[1.6] text-ink-dim">
          Written after the merge, so its findings are observations and drift rather than
          predictions.
        </p>
      ) : null}

      {assessment.summary ? (
        <Box label="Summary" anchor>
          {assessment.summary}
        </Box>
      ) : null}

      <AnswerBlock title="Is this sensible" answer={assessment.sensible} />
      <AnswerBlock title="Maintainability and constraints" answer={assessment.maintainability} />
      <AnswerBlock title="Patterns and duplicates" answer={assessment.pattern} />

      <div className="flex min-w-0 flex-col gap-2">
        <SubHead count={findings.length} anchor>
          Findings
        </SubHead>
        {findings.length === 0 ? (
          <Missing>This assessment recorded no finding against the diff.</Missing>
        ) : (
          <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">
            {findings.map((finding, index) => (
              <li
                key={finding.id ?? `${index}-${finding.title ?? ""}`}
                className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-line-soft bg-surface-2/50 px-3.5 py-3"
              >
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <Chip tone={finding.severity === "concern" ? "warn" : "neutral"}>
                    {finding.severity ?? "finding"}
                  </Chip>
                  <Chip dashed>{finding.kind ?? "observation"}</Chip>
                  {finding.id ? <Chip className="text-ink-faint">{finding.id}</Chip> : null}
                </span>
                <div className="font-serif text-[16px] leading-[1.5] font-semibold text-foreground">
                  {finding.title}
                </div>
                <div className="font-serif text-[15.5px] leading-[1.6] text-ink-mid">
                  {finding.claim ?? finding.detail}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {checks.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-2">
          <SubHead count={checks.length} anchor>
            Boundary checks
          </SubHead>
          <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">
            {checks.map((check, index) => (
              <li
                key={`${index}-${check.rule?.slice(0, 20) ?? ""}`}
                className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-line-soft bg-surface-2/50 px-3.5 py-3"
              >
                <Chip tone={check.result === "not-checkable" ? "warn" : "neutral"}>
                  {check.result ?? "no result"}
                </Chip>
                <div className="font-serif text-[15.5px] leading-[1.55] text-ink-mid">
                  {check.rule}
                </div>
                <div className="font-mono text-[12.5px] leading-[1.6] text-ink-faint">
                  {check.source} &mdash; {check.evidence}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {assessment.regret_risk ? (
        <Box label="Regret risk" tone="problem" anchor>
          {assessment.regret_risk}
        </Box>
      ) : null}

      <div className="flex min-w-0 flex-col gap-2">
        <SubHead count={drift.length} anchor>
          Drift
        </SubHead>
        {drift.length === 0 ? (
          <Missing>
            No drift finding on this entry. A drift finding says a record in the bundle no
            longer matches the tree, and this one holds none.
          </Missing>
        ) : (
          <TextList items={asLines(drift.map((entry) => entry.claim ?? entry.title ?? ""))} />
        )}
      </div>
    </div>
  );
}
