import { cn } from "@/lib/utils";

import { routeHref } from "../model";
import type { ProgramCardModel } from "./shape";
import { STATUS_COLUMNS, type StatusColumnKey, type StatusShape } from "./status";

const CARD_CLASS = cn(
  "group relative flex flex-col gap-1.5 overflow-clip rounded-lg border border-line bg-surface p-2.5 shadow-card",
  "transition-colors duration-150 ease-house hover:border-primary hover:shadow-raise focus-within:border-primary",
);
const NAME_CLASS = cn(
  "relative z-10 self-start font-mono text-[13px] font-bold break-words text-ink underline decoration-line decoration-1 underline-offset-[3px]",
  "hover:decoration-primary hover:text-accent-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

const GLYPH: Record<StatusShape, string> = { circle: "○", half: "◐", filled: "●" };
const TONE: Record<StatusColumnKey, string> = { planned: "text-ink-dim", in_progress: "text-warn", done: "text-good" };
const BAR_TONE: Record<StatusColumnKey, string> = { planned: "bg-ink-faint", in_progress: "bg-warn", done: "bg-good" };

function countsByColumn({ counts }: ProgramCardModel): Record<StatusColumnKey, number> {
  return { planned: counts.planned, in_progress: counts.inProgress, done: counts.done };
}

function EpicBar({ counts }: { counts: Record<StatusColumnKey, number> }) {
  return (
    <span aria-hidden="true" className="flex h-1.5 gap-0.5 overflow-clip rounded-sm bg-surface-3">
      {STATUS_COLUMNS.filter(({ key }) => counts[key] > 0).map(({ key }) => (
        <span key={key} className={BAR_TONE[key]} style={{ flexGrow: counts[key] }} />
      ))}
    </span>
  );
}

function EpicCounts({ counts }: { counts: Record<StatusColumnKey, number> }) {
  return (
    <p className="m-0 flex flex-wrap gap-x-2.5 gap-y-0.5 font-mono text-[10.5px] tabular-nums">
      {STATUS_COLUMNS.map(({ key, label, shape }) => (
        <span key={key} className={TONE[key]}>
          <span aria-hidden="true">{GLYPH[shape]}</span> {counts[key]} {label.toLowerCase()}
        </span>
      ))}
    </p>
  );
}

function footerOf({ slices }: ProgramCardModel): string {
  const done = slices.total > 0 ? `${slices.done} of ${slices.total} slices done` : "No slices yet";
  return slices.nextReadyN === null ? done : `${done} · next #${slices.nextReadyN}`;
}

function EpicSummary({ card }: { card: ProgramCardModel }) {
  const counts = countsByColumn(card);
  return (
    <>
      <EpicBar counts={counts} />
      <EpicCounts counts={counts} />
    </>
  );
}

export function ProgramCard({ card }: { card: ProgramCardModel }) {
  const { design } = card.program;
  return (
    <li className={CARD_CLASS}>
      <a href={routeHref(design.id, "intent")} className={NAME_CLASS}>{design.name}</a>
      <p className="m-0 line-clamp-2 font-serif text-[12px] leading-[1.4] text-ink-mid">{design.outcome}</p>
      <EpicSummary card={card} />
      <p className="m-0 font-mono text-[10.5px] text-ink-dim">{footerOf(card)}</p>
    </li>
  );
}
