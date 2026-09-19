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
 *
 * The card, box, and readiness vocabulary below is the record-mosaic's, copied here
 * rather than imported. The engineer named that variation as the one that "does a
 * better job at displaying content in cards and boxes", so this shell now draws with
 * the same three tones: a present record is a solid card, a partial one is a dashed
 * accent card, an absent one is a dashed muted card. The copy is deliberate. Every
 * directory under `variations/` stays independently removable while the arrangement
 * is still under review, and a cross-variation import would break that.
 */

import type { ReactNode } from "react";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Check,
  CircleAlert,
  CircleDashed,
  CircleDot,
  CircleSlash,
  Info,
  Minus,
  TriangleAlert,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

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

/* --------------------------------------------------------------- readiness */

/**
 * How much of a record the bundle holds.
 *
 * The three tones are distinct at a glance, and the pill beside them carries a word
 * and a shape marker, so the three survive greyscale, per section 8.3.
 */
export type Readiness = "present" | "partial" | "absent";

/** The card frame per readiness. A present record is solid, an absent one is dashed. */
export const CARD_TONE: Record<Readiness, string> = {
  present: "border-line bg-card shadow-card",
  partial: "border-dashed border-primary/70 bg-card shadow-card",
  absent: "border-dashed border-line bg-surface-2/80",
};

const READINESS_PILL: Record<Readiness, string> = {
  present: "border-good bg-good-wash text-good",
  partial: "border-primary bg-accent-wash text-accent-deep",
  absent: "border-line bg-surface-2 text-ink-faint",
};

const READINESS_ICON: Record<Readiness, LucideIcon> = {
  present: Check,
  partial: CircleDashed,
  absent: CircleSlash,
};

/** The parts of a record the bundle did not find, named rather than implied. */
export function MissingParts({ parts }: { parts: string[] }) {
  if (parts.length === 0) return null;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[12px] text-ink-dim">missing:</span>
      {parts.map((part) => (
        <span
          key={part}
          className="rounded border border-dashed border-primary/60 bg-accent-wash/60 px-1.5 py-0.5 font-mono text-[12px] text-accent-deep"
        >
          {part}
        </span>
      ))}
    </span>
  );
}

export function ReadinessPill({
  state,
  word,
  className,
}: {
  state: Readiness;
  word?: string;
  className?: string;
}) {
  const Icon = READINESS_ICON[state];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[12px] font-bold tracking-[0.04em] uppercase",
        READINESS_PILL[state],
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {word ?? state}
    </span>
  );
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
 * The frame follows the record mosaic's tile: a solid card when the record is
 * present, a dashed accent card when it is partial, and a dashed muted card when it
 * is absent. A panel that states an absence still occupies its place, and the pill in
 * its header says which of the three it is.
 *
 * Every panel in this shell is short on purpose. The mockup exists to judge the
 * information hierarchy, so a panel states what belongs there and shows one real
 * excerpt rather than the whole record. Where the whole record matters, the panel
 * carries a control that opens it in a Sheet.
 */
export function Panel({
  title,
  lead,
  icon: Icon,
  tone = "neutral",
  action,
  readiness,
  missing,
  children,
  className,
}: {
  title: string;
  lead?: string;
  icon?: LucideIcon;
  tone?: Tone;
  action?: ReactNode;
  /** The record's readiness. Absent leaves the frame in the plain card tone. */
  readiness?: Readiness;
  /** The parts the record is missing, named under the header. */
  missing?: string[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border",
        readiness ? CARD_TONE[readiness] : "border-line bg-card shadow-card",
        className,
      )}
      aria-label={title}
    >
      <header className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line-soft bg-surface-2 px-4 py-2.5">
        {Icon ? (
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-accent-deep">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        ) : null}
        <h2 className="m-0 min-w-0 font-mono text-[15px] font-bold tracking-[-0.01em]">
          {title}
        </h2>
        {readiness ? (
          <ReadinessPill state={readiness} className="ml-auto" />
        ) : (
          <span className="ml-auto" />
        )}
        {action ? <div className="flex min-w-0 flex-wrap items-center gap-2">{action}</div> : null}
      </header>
      <div
        className={cn(
          "min-w-0 px-4 py-3.5",
          tone !== "neutral" && TONE_RULE[tone],
          tone !== "neutral" && "border-l-4",
        )}
      >
        {missing && missing.length > 0 ? (
          <div className="mb-3">
            <MissingParts parts={missing} />
          </div>
        ) : null}
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

/**
 * A labelled box inside a panel.
 *
 * This is the record mosaic's `InfoBox`, and it is the shape that turns prose into a
 * card. The tone names what the box holds rather than how important it is: a problem
 * reads amber, a solution reads green, a note reads dashed and quiet.
 */
export function Box({
  label,
  children,
  tone = "plain",
  className,
}: {
  label: string;
  children: ReactNode;
  tone?: "plain" | "problem" | "solution" | "note";
  className?: string;
}) {
  const toneClass =
    tone === "problem"
      ? "border-warn/60 bg-warn-wash/60"
      : tone === "solution"
        ? "border-good/60 bg-good-wash/60"
        : tone === "note"
          ? "border-dashed border-line bg-surface-2/70"
          : "border-line bg-surface-2/60";
  return (
    <div className={cn("min-w-0 rounded-lg border px-3.5 py-3", toneClass, className)}>
      <div className="font-mono text-[12px] font-bold tracking-[0.08em] text-ink-dim uppercase">
        {label}
      </div>
      <div className="mt-1.5 min-w-0 font-serif text-[16px] leading-[1.6] text-foreground">
        {children}
      </div>
    </div>
  );
}

/** One list row per entry, so a list of prose reads as a stack of cards. */
export function TextList({
  items,
  ordered,
  className,
}: {
  items: string[];
  ordered?: boolean;
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <ol className={cn("m-0 flex min-w-0 list-none flex-col gap-2 p-0", className)}>
      {items.map((item, index) => (
        <li
          key={`${index}-${item.slice(0, 24)}`}
          className="flex min-w-0 gap-2.5 rounded-lg border border-line-soft bg-surface-2/50 px-3 py-2"
        >
          {ordered ? (
            <span className="mt-0.5 font-mono text-[13px] font-bold text-ink-faint tabular-nums">
              {index + 1}
            </span>
          ) : (
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-faint" aria-hidden="true" />
          )}
          <span className="min-w-0 font-serif text-[16px] leading-[1.55] break-words text-ink-mid">
            {item}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** A heading inside a panel, with its count beside it. */
export function SubHead({
  children,
  count,
  className,
}: {
  children: ReactNode;
  count?: number;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "m-0 flex min-w-0 items-baseline gap-2 font-mono text-[14px] font-bold tracking-[0.02em] text-ink-mid",
        className,
      )}
    >
      <span className="min-w-0">{children}</span>
      {typeof count === "number" ? (
        <span className="font-mono text-[13px] text-ink-faint tabular-nums">{count}</span>
      ) : null}
    </h3>
  );
}

/** One key and one value on a line, for record metadata. */
export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-baseline gap-1.5">
      <span className="font-mono text-[12px] tracking-[0.05em] text-ink-faint uppercase">
        {label}
      </span>
      <span className="min-w-0 font-mono text-[13px] break-words text-ink-mid">{value}</span>
    </span>
  );
}

/**
 * A control that reads as a link and behaves as a button.
 *
 * Motion adds a two-pixel lift on hover, and `useReducedMotion` removes it. The
 * control is at least 44 px tall, per section 11.2.
 */
export function ActionButton({
  children,
  icon: Icon,
  onClick,
  className,
  ariaLabel,
  title,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
  title?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      whileHover={reduce ? undefined : { y: -1 }}
      whileTap={reduce ? undefined : { y: 0 }}
      transition={{ duration: 0.15, ease: [0.22, 0.75, 0.3, 1] }}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface-2/70 px-3 font-mono text-[13px] font-bold text-accent-deep",
        "transition-colors duration-150 ease-house hover:border-primary hover:bg-accent-wash hover:underline underline-offset-2",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      {Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}
      {children}
    </motion.button>
  );
}

/** The shape an empty panel uses, kept beside the panel it belongs to. */
export function EmptyNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "m-0 flex min-w-0 items-start gap-2 rounded-lg border border-dashed border-line bg-card/60 px-3.5 py-3 font-serif text-[15.5px] leading-[1.55] text-ink-dim",
        className,
      )}
    >
      <Info className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </p>
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
        "flex min-w-0 flex-col gap-1.5 rounded-lg border border-dashed border-line bg-surface-2/50 px-3 py-2.5",
        className,
      )}
    >
      <p className="m-0 flex min-w-0 items-start gap-2 font-serif text-[15.5px] leading-[1.5] text-ink-dim">
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
    <p className="m-0 flex min-w-0 items-start gap-2 font-mono text-[12.5px] leading-[1.6] text-ink-faint">
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warn" aria-hidden="true" />
      <span>{children}</span>
    </p>
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
