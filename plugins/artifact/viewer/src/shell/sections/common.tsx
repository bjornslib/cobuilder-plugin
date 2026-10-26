import type { SliceEntity } from "@/data/types";
import { cn } from "@/lib/utils";

import { Chip, StateBadge } from "../atoms";
import type { SheetSubject } from "../Sheet";

export type OpenSheet = (subject: SheetSubject) => void;

const ROW_BUTTON_REST = cn(
  "transition-colors duration-150 ease-house hover:bg-surface-2",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

export const ROW_BUTTON_TALL = cn(
  "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg border border-line-soft bg-card px-3.5 py-2 text-left",
  ROW_BUTTON_REST,
);

export const ROW_BUTTON_SHORT = cn(
  "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg border border-line-soft bg-card px-3.5 py-2 text-left",
  ROW_BUTTON_REST,
);

export function ScoreChip({ score }: { score: string | null }) {
  if (score) return <Chip title="The score the independent validator gave this slice.">{score}</Chip>;
  return (
    <Chip dashed className="text-ink-faint" title="No score is recorded for this slice.">
      no score
    </Chip>
  );
}

export function SliceStateBadge({ slice }: { slice: SliceEntity }) {
  const tone = slice.state === "completed" ? "good" : "neutral";
  return <StateBadge word={slice.state} tone={tone} gloss="The slice's own state field." />;
}

export function SliceNumber({ n }: { n: number }) {
  return (
    <span className="shrink-0 font-mono text-[14px] font-bold text-accent-deep tabular-nums">#{n}</span>
  );
}
