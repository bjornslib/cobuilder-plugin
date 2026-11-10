import type { DesignRecord } from "@/data/bundle";
import { cn } from "@/lib/utils";

import { RECORD_KINDS, RECORD_LABEL, recordVerdicts, type Readiness, type RecordKind, type RecordVerdicts, type Verdict } from "../readiness";

const VERDICT_CLASS: Record<Readiness, string> = {
  present: "border-good/60 bg-good/10 text-good",
  partial: "border-primary/60 bg-accent-wash/40 text-accent-deep",
  absent: "border-line bg-surface-2/60 text-ink-faint",
};

const GLYPH: Record<Readiness, string> = { present: "●", partial: "◐", absent: "○" };

const MARK_CLASS = "inline-flex min-w-0 items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[12px]";

function saidOf(kind: RecordKind, verdict: Verdict): string {
  const lead = `${RECORD_LABEL[kind]}: ${verdict.state}`;
  return verdict.missing.length === 0 ? lead : `${lead}, missing ${verdict.missing.join(", ")}`;
}

function MarkChip({ kind, verdict }: { kind: RecordKind; verdict: Verdict }) {
  const said = saidOf(kind, verdict);
  return (
    <li title={said} className={cn(MARK_CLASS, VERDICT_CLASS[verdict.state])}>
      {GLYPH[verdict.state]}
      <span aria-hidden="true">{RECORD_LABEL[kind]}</span>
      <span className="sr-only">{said}</span>
    </li>
  );
}

function MarkList({ verdicts }: { verdicts: RecordVerdicts }) {
  return (
    <ul className="m-0 flex min-w-0 list-none flex-wrap gap-1.5 p-0">
      {RECORD_KINDS.map((kind) => (
        <MarkChip key={kind} kind={kind} verdict={verdicts[kind]} />
      ))}
    </ul>
  );
}

function MarksNote({ record, designId }: MarksProps) {
  const said =
    record === undefined
      ? `The bundle carries no design record for ${designId}, so every mark reads absent.`
      : "A whole record takes a full mark; a dashed part names what it misses.";
  return <p className="m-0 font-serif text-[13.5px] leading-[1.45] text-ink-faint">{said}</p>;
}

interface MarksProps {
  record: DesignRecord | undefined;
  designId: string;
}

export function RecordMarks({ record, designId }: MarksProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="m-0 font-mono text-[12px] tracking-[0.08em] text-ink-faint uppercase">
        The six authored records
      </p>
      <MarkList verdicts={recordVerdicts(record)} />
      <MarksNote record={record} designId={designId} />
    </div>
  );
}
