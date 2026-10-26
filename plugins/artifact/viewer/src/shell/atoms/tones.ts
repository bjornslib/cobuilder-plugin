import {
  AlertTriangle,
  Check,
  CircleAlert,
  CircleDot,
  Minus,
  type LucideIcon,
} from "lucide-react";

export type Tone = "neutral" | "accent" | "good" | "warn" | "danger";

/** A pill fill, keyed by tone. Reads the house tokens and never a literal colour. */
export const TONE_PILL: Record<Tone, string> = {
  neutral: "border-line bg-surface-2 text-ink-mid",
  accent: "border-primary bg-accent-wash text-accent-deep",
  good: "border-good bg-good-wash text-good",
  warn: "border-warn bg-warn-wash text-warn",
  danger: "border-destructive bg-danger-wash text-destructive",
};

export const TONE_RULE: Record<Tone, string> = {
  neutral: "border-l-line",
  accent: "border-l-primary",
  good: "border-l-good",
  warn: "border-l-warn",
  danger: "border-l-destructive",
};

/**
 * The shape marker per tone.
 *
 * The marker is the second channel beside the colour, per section 8.3. A reader who
 * cannot separate teal from amber still separates a dot from a triangle.
 */
export const TONE_MARK: Record<Tone, LucideIcon> = {
  neutral: Minus,
  accent: CircleDot,
  good: Check,
  warn: AlertTriangle,
  danger: CircleAlert,
};

export function toneForStage(stage: string): Tone {
  if (stage === "implemented") return "good";
  if (stage === "review") return "accent";
  if (stage === "approved" || stage === "decided") return "accent";
  if (stage === "superseded") return "warn";
  return "neutral";
}

/**
 * The tone for a pull request's own state word.
 *
 * A pull request that belongs to no design holds no stage. `merged` is done, so it
 * reads good. `open` is live and waits on somebody, so it reads accent, the same tone a
 * design in review takes.
 */
export function toneForState(state: string): Tone {
  if (state === "merged") return "good";
  if (state === "open") return "accent";
  return "neutral";
}

export function toneForSeverity(severity: string | undefined): Tone {
  if (severity === "high") return "danger";
  if (severity === "medium") return "warn";
  if (severity === "low") return "neutral";
  return "neutral";
}

/** The tone for an assessment verdict. `concerns` is not a pass, so it reads warn. */
export function toneForVerdict(verdict: string): Tone {
  if (verdict === "proceed") return "good";
  if (verdict === "concerns") return "warn";
  if (verdict === "rework") return "danger";
  return "neutral";
}
