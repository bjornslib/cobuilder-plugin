import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const BAR_CLASS = "flex min-w-0 shrink-0 items-center gap-3 border-t border-line bg-ground px-6 py-2";
const COUNT_CLASS = "min-w-0 font-mono text-[12.5px] text-ink-dim tabular-nums";
const BUTTON_BASE = [
  "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 font-mono text-[12.5px] font-bold text-ink-mid",
  "transition-colors duration-150 ease-house",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
] as const;
/*
 * A disabled control keeps its frame and drops its affordance. The fill
 * stays in `--surface-2`, never `--band`: the heading colour on a control
 * reads as a heading.
 */
const BUTTON_OFF = "cursor-not-allowed border-dashed bg-surface-2 text-ink-faint";
const BUTTON_ON = "cursor-pointer hover:bg-surface-2";

interface PagerButtonProps {
  label: string;
  icon: LucideIcon;
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}

/** One step of the pager. The icon sits on the side the button moves toward. */
function PagerButton({ label, icon: Icon, side, disabled, onClick }: PagerButtonProps) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} aria-disabled={disabled}
      className={cn(...BUTTON_BASE, disabled ? BUTTON_OFF : BUTTON_ON)}
    >
      {side === "left" ? <Icon className="size-4" aria-hidden="true" /> : null}
      {label}
      {side === "right" ? <Icon className="size-4" aria-hidden="true" /> : null}
    </button>
  );
}

interface PagerProps {
  index: number;
  count: number;
  onPrevious: () => void;
  onNext: () => void;
}

/**
 * The bar under the stage.
 *
 * Two navigation words and a count. Nothing here writes anything back to the bundle:
 * this viewer is a read-only projection, so no label may read as an approval. Previous
 * and Next move the reader through the level and say nothing else.
 *
 * A control at either end is disabled, and it says so twice: `disabled` stops the
 * press, and `aria-disabled` states the reason to a reader who reaches it by keyboard.
 * The pointer cursor is dropped with the state, because a control that cannot act must
 * not look like one that can.
 */
export function SectionPager({ index, count, onPrevious, onNext }: PagerProps) {
  return (
    <div className={BAR_CLASS}>
      <PagerButton label="Previous" icon={ChevronLeft} side="left" disabled={index <= 0} onClick={onPrevious} />
      <span className={COUNT_CLASS}>Section {index + 1} of {count}</span>
      <PagerButton label="Next" icon={ChevronRight} side="right" disabled={index >= count - 1} onClick={onNext} />
    </div>
  );
}
