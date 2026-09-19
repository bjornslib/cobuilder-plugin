/**
 * The small pieces every panel of this shell is built from.
 *
 * Three rules hold across all of them, and they come from the engineer's earlier
 * feedback on the prototype.
 *
 *   1. A clickable thing looks clickable. It carries `cursor-pointer`, a hover fill,
 *      a focus ring, and a lucide icon. Tailwind v4 gives a `<button>` the default
 *      cursor, so every button here names `cursor-pointer` for itself.
 *   2. Type is a reading size. Labels are 12px mono, body prose is 16px serif, and
 *      nothing anywhere is smaller than 12px.
 *   3. No state relies on colour alone. Every badge carries a word and a shape marker,
 *      so the rail and the badges survive greyscale.
 */

import type { ReactNode } from "react";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Check,
  CircleAlert,
  CircleDot,
  Minus,
  TriangleAlert,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type Tone = "neutral" | "accent" | "good" | "warn" | "danger";

/** A pill fill, keyed by tone. Reads the house tokens and never a literal colour. */
export const TONE_PILL: Record<Tone, string> = {
  neutral: "border-line bg-surface-2 text-ink-mid",
  accent: "border-primary bg-accent-wash text-accent-deep",
  good: "border-good bg-good-wash text-good",
  warn: "border-warn bg-warn-wash text-warn",
  danger: "border-destructive bg-danger-wash text-destructive",
};

/** A box's left rule, keyed by tone. */
export const TONE_RULE: Record<Tone, string> = {
  neutral: "border-l-line",
  accent: "border-l-primary",
  good: "border-l-good",
  warn: "border-l-warn",
  danger: "border-l-destructive",
};

export const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-ink-faint",
  accent: "bg-primary",
  good: "bg-good",
  warn: "bg-warn",
  danger: "bg-destructive",
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

/** The tone for a stage word the index carries. */
export function toneForStage(stage: string): Tone {
  if (stage === "implemented") return "good";
  if (stage === "review") return "accent";
  if (stage === "approved" || stage === "decided") return "accent";
  if (stage === "superseded") return "warn";
  return "neutral";
}

/** The tone for an epic state the refined join carries. */
export function toneForEpicState(state: string): Tone {
  if (state === "merged" || state === "completed") return "good";
  if (state === "open" || state === "planned") return "accent";
  if (state === "no-pull-request" || state === "unstarted") return "neutral";
  if (state === "blocked") return "warn";
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

/* -------------------------------------------------------------------- chips */

export function Chip({
  children,
  tone = "neutral",
  dashed = false,
  title,
  icon: Icon,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dashed?: boolean;
  title?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[12px] whitespace-nowrap",
        TONE_PILL[tone],
        dashed && "border-dashed",
        className,
      )}
    >
      {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
      {children}
    </span>
  );
}

/**
 * The status badge. A word, a colour, and a shape marker, at least 24px tall.
 *
 * The badge is not a control, so it is not a button. It carries a `title` so the
 * gloss is available on hover, and it stays focusable through the `tabIndex` only
 * when a gloss exists, so a keyboard reader reaches the same sentence.
 */
export function StateBadge({
  word,
  tone,
  gloss,
  className,
}: {
  word: string;
  tone: Tone;
  gloss?: string;
  className?: string;
}) {
  const Mark = TONE_MARK[tone];
  return (
    <span
      tabIndex={gloss ? 0 : undefined}
      title={gloss}
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[12.5px] font-bold",
        TONE_PILL[tone],
        className,
      )}
    >
      <Mark className="size-3.5 shrink-0" aria-hidden="true" />
      {word}
    </span>
  );
}

/* ------------------------------------------------------------------ layout */

/**
 * A panel: one heading, one optional one-line lead, then its body.
 *
 * Every panel in this shell is short on purpose. The mockup exists to judge the
 * information hierarchy, so a panel states what belongs there and shows one real
 * excerpt rather than the whole record.
 */
export function Panel({
  title,
  lead,
  icon: Icon,
  tone = "neutral",
  action,
  children,
  className,
}: {
  title: string;
  lead?: string;
  icon?: LucideIcon;
  tone?: Tone;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-line bg-card shadow-card",
        className,
      )}
      aria-label={title}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line-soft bg-surface-2 px-4 py-2.5">
        {Icon ? <Icon className="size-4 shrink-0 text-ink-faint" aria-hidden="true" /> : null}
        <h2 className="m-0 font-mono text-[13px] font-bold tracking-[0.06em] uppercase">
          {title}
        </h2>
        {action ? <div className="ml-auto flex items-center gap-2">{action}</div> : null}
      </header>
      <div className={cn("px-4 py-3.5", tone !== "neutral" && TONE_RULE[tone], tone !== "neutral" && "border-l-4")}>
        {lead ? (
          <p className="m-0 mb-3 max-w-[86ch] font-serif text-[15px] leading-[1.5] text-ink-dim italic">
            {lead}
          </p>
        ) : null}
        {children}
      </div>
    </section>
  );
}

/** A label above its value. The shell's one key/value shape. */
export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="font-mono text-[12px] tracking-[0.06em] text-ink-faint uppercase">
        {label}
      </span>
      <span className="font-serif text-[16px] leading-[1.5] break-words text-foreground">
        {children}
      </span>
    </div>
  );
}

/**
 * A record the panel could not read.
 *
 * This is the shell's empty state, and it is the point of the mockup. A missing
 * record is named in place, never hidden and never rendered as a blank box.
 */
export function Missing({
  children,
  detail,
  className,
}: {
  children: ReactNode;
  detail?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border border-dashed border-line bg-surface-2/50 px-3 py-2.5",
        className,
      )}
    >
      <p className="m-0 flex items-start gap-2 font-serif text-[15.5px] leading-[1.5] text-ink-dim">
        <Minus className="mt-1 size-4 shrink-0 text-ink-faint" aria-hidden="true" />
        <span>{children}</span>
      </p>
      {detail ? (
        <p className="m-0 pl-6 font-mono text-[12px] leading-[1.6] text-ink-faint">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

/** A stated absence that is not a record gap: a count of zero, a list that is empty. */
export function AbsentLine({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 flex items-start gap-2 font-mono text-[12.5px] leading-[1.6] text-ink-faint">
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warn" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/**
 * A short list of real values, with a count of what the panel did not show.
 *
 * Every caller passes a `limit`, because a mockup that dumps nineteen `done_when`
 * rows has stopped being a mockup.
 */
export function Bullets({
  items,
  limit = 2,
  tone = "neutral",
  ordered = false,
  onOverflow,
}: {
  items: string[];
  limit?: number;
  tone?: Tone;
  ordered?: boolean;
  onOverflow?: (hidden: number) => ReactNode;
}) {
  if (items.length === 0) return null;
  const shown = items.slice(0, limit);
  const hidden = items.length - shown.length;
  return (
    <div className="flex flex-col gap-2">
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {shown.map((item, index) => (
          <li key={`${index}-${item.slice(0, 24)}`} className="flex items-start gap-2.5">
            {ordered ? (
              <span className="mt-0.5 font-mono text-[12.5px] text-ink-faint tabular-nums">
                {index + 1}.
              </span>
            ) : (
              <span
                className={cn("mt-[9px] size-1.5 shrink-0 rounded-full", TONE_DOT[tone])}
                aria-hidden="true"
              />
            )}
            <span className="font-serif text-[16px] leading-[1.55] text-foreground">
              {item}
            </span>
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <p className="m-0 pl-6 font-mono text-[12px] text-ink-faint">
          {onOverflow
            ? onOverflow(hidden)
            : `${hidden} more ${hidden === 1 ? "entry" : "entries"} in the record.`}
        </p>
      ) : null}
    </div>
  );
}

/** A quiet mono line that names a source field. Every panel states what it read. */
export function SourceLine({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 mt-2 font-mono text-[12px] leading-[1.6] text-ink-faint">{children}</p>
  );
}

/** The heading of a scroll-pane section. Focus moves here when the section changes. */
export function SectionHeading({
  title,
  lead,
  id,
}: {
  title: string;
  lead: string;
  id: string;
}) {
  return (
    <header className="mb-5">
      <h1
        id={id}
        tabIndex={-1}
        className="m-0 font-mono text-[24px] leading-tight font-bold tracking-[-0.02em] outline-none"
      >
        {title}
      </h1>
      <p className="mt-1.5 mb-0 max-w-[92ch] font-serif text-[16px] leading-[1.55] text-ink-mid">
        {lead}
      </p>
    </header>
  );
}
