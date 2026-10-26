import type { ReactNode } from "react";

import { CircleSlash, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { TONE_MARK, TONE_PILL, type Tone } from "./tones";

/**
 * The one readiness state that survives: a record the bundle does not hold.
 *
 * A record that exists needs no marker. The shell paints nothing for it. A record that
 * is absent paints a dashed muted card and this pill, and the pill says so in two words
 * with a strikethrough circle beside them, so it survives greyscale, per section 8.3.
 */
export const ABSENT_CARD = "border-dashed border-line bg-surface-2/80";

const NOT_PRESENT_CLASS =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 font-mono text-[12px] font-bold tracking-[0.04em] text-ink-faint uppercase";

/** The absent pill, and its one shape marker. */
export function NotPresentPill({ className }: { className?: string }) {
  return (
    <span className={cn(NOT_PRESENT_CLASS, className)}>
      <CircleSlash className="size-3.5 shrink-0" aria-hidden="true" />
      not present
    </span>
  );
}

interface ChipProps {
  children: ReactNode;
  tone?: Tone;
  dashed?: boolean;
  title?: string;
  icon?: LucideIcon;
  className?: string;
}

const CHIP_CLASS =
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[12px] whitespace-nowrap";

export function Chip({ children, tone = "neutral", dashed = false, title, icon: Icon, className }: ChipProps) {
  return (
    <span title={title} className={cn(CHIP_CLASS, TONE_PILL[tone], dashed && "border-dashed", className)}>
      {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
      {children}
    </span>
  );
}

interface StateBadgeProps {
  word: string;
  tone: Tone;
  gloss?: string;
  className?: string;
}

const BADGE_CLASS =
  "inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[12.5px] font-bold";

/**
 * The status badge. A word, a colour, and a shape marker, at least 24px tall.
 *
 * The badge is not a control, so it is not a button. It carries a `title` so the
 * gloss is available on hover, and it stays focusable through the `tabIndex` only
 * when a gloss exists, so a keyboard reader reaches the same sentence.
 */
export function StateBadge({ word, tone, gloss, className }: StateBadgeProps) {
  const Mark = TONE_MARK[tone];
  return (
    <span tabIndex={gloss ? 0 : undefined} title={gloss} className={cn(BADGE_CLASS, TONE_PILL[tone], className)}>
      <Mark className="size-3.5 shrink-0" aria-hidden="true" />
      {word}
    </span>
  );
}
