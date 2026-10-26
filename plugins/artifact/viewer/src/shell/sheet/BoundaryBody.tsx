import { Box, Missing, SubHead, TextList } from "../atoms";
import type { SubjectOf } from "./subject";

type Entry = { key: string; value: unknown };

function scalar(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function lines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => scalar(entry) ?? JSON.stringify(entry))
    .filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

/** Minus the two keys the caller already showed. */
function detailEntries(detail: Record<string, unknown>): Entry[] {
  return Object.entries(detail)
    .filter(([key]) => key !== "target" && key !== "why")
    .map(([key, value]) => ({ key, value }));
}

function RuleBox({ subject }: { subject: SubjectOf<"boundary"> }) {
  return (
    <Box label="The rule" tone="problem">
      {subject.kindLabel} · {subject.target}
    </Box>
  );
}

function WhyBox({ why }: { why: unknown }) {
  if (typeof why !== "string") return null;
  return (
    <Box label="Why" tone="note">
      {why}
    </Box>
  );
}

function OtherFields({ entries }: { entries: Entry[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SubHead count={entries.length}>Every other field on this rule</SubHead>
      <DetailList entries={entries} />
    </div>
  );
}

function DetailRow({ entry }: { entry: Entry }) {
  return (
    <div className="min-w-0 rounded-lg border border-line-soft bg-surface-2/50 px-3 py-2">
      <div className="font-mono text-[12px] font-bold tracking-[0.06em] text-ink-faint uppercase">
        {entry.key}
      </div>
      <ValueView value={entry.value} />
    </div>
  );
}

function ScalarText({ text }: { text: string }) {
  return (
    <p className="mt-1 mb-0 min-w-0 font-serif text-[15.5px] leading-[1.6] break-words text-ink-mid">
      {text}
    </p>
  );
}

function JsonText({ value }: { value: unknown }) {
  return (
    <p className="mt-1 mb-0 font-mono text-[13px] break-words text-ink-dim">
      {JSON.stringify(value)}
    </p>
  );
}

function ListValue({ items }: { items: string[] }) {
  return (
    <div className="mt-1.5">
      <TextList items={items} />
    </div>
  );
}

function ValueView({ value }: { value: unknown }) {
  const one = scalar(value);
  const many = lines(value);
  if (one !== null) return <ScalarText text={one} />;
  if (many.length === 0) return <JsonText value={value} />;
  return <ListValue items={many} />;
}

function NoDetail() {
  return (
    <Missing>
      No further field is recorded on this rule, beyond the target and the reason
      above.
    </Missing>
  );
}

function DetailList({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) return <NoDetail />;
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      {entries.map((entry) => (
        <DetailRow key={entry.key} entry={entry} />
      ))}
    </div>
  );
}

export function BoundaryBody({ subject }: { subject: SubjectOf<"boundary"> }) {
  const entries = detailEntries(subject.detail);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <RuleBox subject={subject} />
      <WhyBox why={subject.detail.why} />
      <OtherFields entries={entries} />
    </div>
  );
}
