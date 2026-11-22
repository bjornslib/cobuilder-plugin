import { cn } from "@/lib/utils";

import type { NoProgramModel } from "./shape";

const LINK_CLASS = cn(
  "flex h-11 items-center gap-2.5 rounded-lg border border-l-2 border-dashed border-line border-l-ink-faint bg-surface px-3",
  "transition-colors duration-[var(--motion-hover)] ease-[var(--ease)] hover:border-primary hover:bg-surface-2 active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

function countOf(count: number, unit: string): string {
  return count === 1 ? `1 ${unit}` : `${count} ${unit}s`;
}

export function NoProgramCard({ card }: { card: NoProgramModel }) {
  return (
    <div className="shrink-0 px-4 pt-3">
      <a href={card.href} className={LINK_CLASS}>
        <span className="font-mono text-[13px] font-bold text-ink">No program</span>
        <span aria-hidden="true" className="text-ink-faint">·</span>
        <span className="font-mono text-[11.5px] text-ink-dim tabular-nums">{countOf(card.count, "slice")} in {countOf(card.plans, "plan")}</span>
        <span aria-hidden="true" className="ml-auto font-mono text-[12px] text-ink-dim">›</span>
      </a>
    </div>
  );
}
