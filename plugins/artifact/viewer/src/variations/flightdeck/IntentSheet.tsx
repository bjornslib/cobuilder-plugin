/**
 * The sixth part of parity: the intent and the assessment sheet.
 *
 * WHERE IT COMES FROM. The shipped viewer keeps two blocks on one pull request's
 * timeline entry — `intent`, the author's own statement captured before the code
 * existed, and `assessment`, the reading written against the merged diff — and shows
 * both in one sheet. This sheet reads the same two blocks off the same entry, and it
 * names which of the two a reader is looking at.
 *
 * WHY THIS FILE IS NOT `@/shell/Sheet.tsx`. That component's `SheetSubject` union has
 * three members — a decision, a boundary rule, and an epic's technical solution design.
 * A pull request is not one of them, and adding a fourth member would edit `src/shell/`,
 * which this slice may not touch. So the sheet's primitives are reused and its subject
 * union is not: this file is the same Radix `Sheet`, at the same width, with the same
 * heading vocabulary, and its own body.
 *
 * ABSENCE IS A STATE HERE TOO. PR 6, PR 9, and four others in this bundle carry both
 * blocks, and the rest carry neither. A pull request with no assessment states that in
 * the sheet rather than opening an empty drawer.
 */

import { Scale, Sparkles, TriangleAlert } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Box,
  Chip,
  Field,
  Missing,
  StateBadge,
  SubHead,
  TextList,
  toneForVerdict,
} from "@/shell/atoms";

import type { AssessmentAnswer, IntentRecord, AssessmentRecord, StoryEntry } from "./model";

/**
 * One field as a list of lines, whether the record wrote a list or one string.
 *
 * `intent.testing` is a single string in every entry of this bundle that carries it —
 * PR 2, PR 6, and PR 9 all write one paragraph — while its four siblings are lists. No
 * document states which shape the field takes, so this reads both rather than assuming
 * either. A reader that assumed a list threw on the sheet's first open, which is how the
 * shape was found.
 */
function asLines(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string");
  if (typeof value === "string" && value.trim() !== "") return [value];
  return [];
}

/** One of the assessment's three answers: what it says, and what it stands on. */
function AnswerBlock({ title, answer }: { title: string; answer: AssessmentAnswer | undefined }) {
  if (!answer?.answer) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SubHead anchor>{title}</SubHead>
      {answer.verdict ? (
        <span>
          <StateBadge word={answer.verdict} tone={toneForVerdict(answer.verdict)} />
        </span>
      ) : null}
      <p className="m-0 max-w-[86ch] font-serif text-[16px] leading-[1.6] text-foreground">
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

function IntentBody({ intent }: { intent: IntentRecord | undefined }) {
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
          <span>
            No author wrote this. It is a reading of the diff, and the record says so.
          </span>
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

function AssessmentBody({ assessment }: { assessment: AssessmentRecord | undefined }) {
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
                  {check.source} — {check.evidence}
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

export function IntentSheet({
  open,
  onOpenChange,
  entry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The pull request whose two blocks the sheet shows. */
  entry: StoryEntry | null;
}) {
  const pr = entry?.pr ?? null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {pr === null ? null : (
        <SheetContent
          side="right"
          className="flex flex-col gap-0 p-0 data-[side=right]:w-[min(60rem,94vw)] data-[side=right]:sm:max-w-[min(60rem,94vw)]"
          aria-label="The pull request's intent and assessment"
        >
          <SheetHeader className="shrink-0 gap-1.5 border-b border-line bg-surface-2 p-4 pr-14">
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-accent-deep">
                <Scale className="size-4" aria-hidden="true" />
              </span>
              <SheetTitle className="min-w-0 font-mono text-[17px] font-bold tracking-[-0.01em]">
                PR {pr} · intent and assessment
              </SheetTitle>
            </span>
            <SheetDescription className="font-serif text-[15.5px] leading-[1.5] text-ink-dim">
              Two blocks on one timeline entry: the author&apos;s own statement of what this
              pull request is for, and the reading written against its merged diff.
            </SheetDescription>
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <Chip icon={Sparkles}>{entry?.intent ? "intent present" : "no intent"}</Chip>
              <Chip
                tone={entry?.assessment ? "accent" : "warn"}
                dashed={!entry?.assessment}
                icon={entry?.assessment ? undefined : TriangleAlert}
              >
                {entry?.assessment ? "assessment present" : "no assessment"}
              </Chip>
              {entry?.commit ? <Chip className="text-ink-faint">{entry.commit.slice(0, 9)}</Chip> : null}
            </span>
          </SheetHeader>

          <div className="min-h-0 min-w-0 flex-1 overflow-auto px-4 py-4">
            <div className="flex min-w-0 flex-col gap-4">
              <section className="flex min-w-0 flex-col gap-3" aria-label="Intent">
                <h2 className={cn("m-0 font-mono text-[13px] font-bold tracking-[0.08em] text-ink-dim uppercase")}>
                  Intent
                </h2>
                <IntentBody intent={entry?.intent} />
              </section>
              <section className="flex min-w-0 flex-col gap-3" aria-label="Assessment">
                <h2 className={cn("m-0 font-mono text-[13px] font-bold tracking-[0.08em] text-ink-dim uppercase")}>
                  Assessment
                </h2>
                <AssessmentBody assessment={entry?.assessment} />
              </section>
              <Field label="Where this came from">
                Both blocks sit on this pull request&apos;s own timeline entry, beside its
                levels. The shipped viewer reads the same two blocks from the same place.
              </Field>
            </div>
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
