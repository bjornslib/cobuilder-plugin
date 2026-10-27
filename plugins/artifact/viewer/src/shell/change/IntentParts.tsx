import { TriangleAlert } from "lucide-react";
import type { ComponentType } from "react";

import type { StoryIntent, StoryIntentAlternative } from "@/data/bundle";
import { Box, Chip, Missing, SubHead, TextList } from "@/shell/atoms";

import { asLines } from "./sheetLines";

export type IntentPart = "why" | "approach" | "scope";

type PartProps = { intent: StoryIntent };

const NO_INTENT =
  "This pull request carries no intent block. Generate mode captures intent before a pull request opens, and this entry holds none.";
const INFERRED_TITLE = "No author statement survives, so this block is a reading of the diff.";
const ALTERNATIVE_CLASS =
  "min-w-0 rounded-lg border border-line-soft bg-surface-2/50 px-3.5 py-3";

function SourceChip({ source, inferred }: { source: string; inferred: boolean }) {
  return (
    <Chip tone={inferred ? "warn" : "neutral"} title={inferred ? INFERRED_TITLE : undefined}>
      source: {source}
    </Chip>
  );
}

function SourceChips({ intent }: PartProps) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      {intent.source ? <SourceChip source={intent.source} inferred={intent.source === "inferred"} /> : null}
      {intent.authorship ? <Chip>authorship: {intent.authorship}</Chip> : null}
      {intent.captured ? <Chip>captured {intent.captured}</Chip> : null}
    </span>
  );
}

function InferredNote() {
  return (
    <p className="m-0 flex min-w-0 items-start gap-2 font-mono text-[12.5px] leading-[1.6] text-warn">
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>A reading of the diff. No author wrote this block.</span>
    </p>
  );
}

function IntentWhy({ intent }: PartProps) {
  return (
    <>
      <SourceChips intent={intent} />
      {intent.source === "inferred" ? <InferredNote /> : null}
      {intent.problem ? <Box label="Problem" tone="problem" anchor>{intent.problem}</Box> : null}
      {intent.why_now ? <Box label="Why now" tone="note" anchor>{intent.why_now}</Box> : null}
    </>
  );
}

function AlternativeItem({ alternative }: { alternative: StoryIntentAlternative }) {
  return (
    <li className={ALTERNATIVE_CLASS}>
      <div className="font-serif text-[16px] leading-[1.5] text-foreground">{alternative.option}</div>
      <div className="mt-1.5 font-serif text-[15px] leading-[1.55] text-ink-dim">
        &times; {alternative.rejected_because}
      </div>
    </li>
  );
}

function AlternativeList({ alternatives }: { alternatives: StoryIntentAlternative[] }) {
  return (
    <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">
      {alternatives.map((alternative, index) => (
        <AlternativeItem key={`${index}-${alternative.option ?? ""}`} alternative={alternative} />
      ))}
    </ul>
  );
}

function Alternatives({ alternatives }: { alternatives: StoryIntentAlternative[] }) {
  if (alternatives.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SubHead anchor>Rejected alternatives</SubHead>
      <AlternativeList alternatives={alternatives} />
    </div>
  );
}

function IntentApproach({ intent }: PartProps) {
  return (
    <>
      {intent.approach ? <Box label="Approach" tone="solution" anchor>{intent.approach}</Box> : null}
      <Alternatives alternatives={intent.alternatives ?? []} />
    </>
  );
}

function ScopeBlock({ label, held }: { label: string; held: unknown }) {
  const items = asLines(held);
  if (items.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SubHead anchor>{label}</SubHead>
      <TextList items={items} />
    </div>
  );
}

function scopeRows(intent: StoryIntent): Array<[string, unknown]> {
  return [
    ["Out of scope", intent.out_of_scope],
    ["Risks", intent.risks],
    ["Testing", intent.testing],
    ["Reviewer focus", intent.reviewer_focus],
    ["Unknowns", intent.unknowns],
  ];
}

function IntentScope({ intent }: PartProps) {
  return (
    <>
      {scopeRows(intent).map(([label, held]) => (
        <ScopeBlock key={label} label={label} held={held} />
      ))}
    </>
  );
}

const INTENT_PARTS: Record<IntentPart, ComponentType<PartProps>> = {
  why: IntentWhy,
  approach: IntentApproach,
  scope: IntentScope,
};

export interface ChangeIntentPartProps {
  intent: StoryIntent | undefined;
  part: IntentPart;
}

export function ChangeIntentPart({ intent, part }: ChangeIntentPartProps) {
  if (!intent) return <Missing>{NO_INTENT}</Missing>;
  const Part = INTENT_PARTS[part];
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Part intent={intent} />
    </div>
  );
}
