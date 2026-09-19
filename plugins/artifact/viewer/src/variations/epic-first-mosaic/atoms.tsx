/**
 * The small pieces every surface of this variation is built from.
 *
 * Three rules hold across all of them.
 *
 *   1. A clickable thing looks clickable: `cursor-pointer`, a hover fill, a focus
 *      ring, and a lucide icon. Tailwind v4 gives a `<button>` the default cursor, so
 *      every button here names `cursor-pointer` for itself.
 *   2. A real value and a prototype value never share a look. A real value reads in a
 *      solid pill. A prototype value reads in a dashed pill that carries the word
 *      "prototype" in its own tooltip.
 *   3. Type is a reading size. Prose is 16px on the serif face, labels are 12px mono,
 *      and nothing is smaller than 11px.
 */

import type { ReactNode } from "react";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Ban, Check, Minus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

import type { SlotState } from "./data";
import { TONE_DOT, TONE_PILL, TONE_RULE, type Tone } from "./states";

export const ENTER_EASE = [0.22, 0.75, 0.3, 1] as const;

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
 * A real value from the index, and the intended value beside it.
 *
 * The real value always leads. The intended value sits in a dashed chip named
 * "prototype", so no reader can mistake the prototype rule for the record.
 */
export function StatePill({
  value,
  intended,
  intendedWhy,
  className,
}: {
  value: string;
  intended: string | null;
  intendedWhy?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <Chip tone="neutral" title={`The index records "${value}" for this row.`}>
        {value}
      </Chip>
      {intended && intended !== value ? (
        <Chip
          tone="neutral"
          dashed
          className="text-ink-faint"
          title={`Prototype mapping, not a record. This value would read as "${intended}" because ${intendedWhy ?? "the mapping states so"}.`}
        >
          prototype: {intended}
        </Chip>
      ) : null}
    </span>
  );
}

/* ------------------------------------------------------------------ buttons */

export function TextButton({
  children,
  onClick,
  icon: Icon,
  iconEnd: IconEnd,
  current = false,
  tone = "accent",
  className,
  title,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: LucideIcon;
  iconEnd?: LucideIcon;
  current?: boolean;
  tone?: Tone;
  className?: string;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      aria-current={current ? "true" : undefined}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-[12.5px] transition-colors duration-150 ease-house",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        current
          ? TONE_PILL[tone]
          : "border-line bg-surface text-ink-mid hover:bg-surface-2 hover:text-foreground",
        className,
      )}
    >
      {Icon ? <Icon className="size-4 shrink-0" /> : null}
      {children}
      {IconEnd ? <IconEnd className="size-4 shrink-0" /> : null}
    </button>
  );
}

/** A button that reads as a text link: underlined, with a trailing icon. */
export function LinkButton({
  children,
  onClick,
  icon: Icon,
  className,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: LucideIcon;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-sm font-mono text-[12.5px] text-primary underline decoration-primary/40 underline-offset-4",
        "transition-colors duration-150 ease-house hover:decoration-primary",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      {children}
      {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
    </button>
  );
}

/* ------------------------------------------------------------------- shells */

export function Tile({
  title,
  icon: Icon,
  scope,
  children,
  empty = false,
  className,
}: {
  title: string;
  icon: LucideIcon;
  /** What this tile is currently about: design, epic E6, or slice #4. */
  scope: string;
  children: ReactNode;
  empty?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      layout={reduce ? false : "position"}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: ENTER_EASE }}
      data-empty={empty ? "true" : undefined}
      aria-disabled={empty ? "true" : undefined}
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-card",
        empty ? "border-dashed border-line" : "border-line",
        className,
      )}
    >
      <header className="flex items-center gap-2.5 border-b border-line-soft bg-surface-2 px-4 py-2.5">
        <Icon className="size-4 shrink-0 text-ink-faint" />
        <h3 className="font-mono text-[13px] font-bold tracking-[0.06em] uppercase">
          {title}
        </h3>
        <span className="ml-auto truncate font-mono text-[11.5px] text-ink-faint">
          {scope}
        </span>
      </header>
      <div className={cn("px-4 py-3.5", empty && "bg-surface-2/40")}>
        {children}
      </div>
    </motion.section>
  );
}

/**
 * The state of a tile that holds no record for this selection.
 *
 * It is disabled, it is dashed, and it states why. It never renders blank. When an
 * action can reach a record, it offers that action rather than only the reason.
 */
export function Unavailable({
  reason,
  detail,
  action,
}: {
  reason: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="m-0 flex items-start gap-2 font-serif text-[15.5px] leading-[1.55] text-ink-dim">
        <Ban className="mt-0.5 size-4 shrink-0 text-ink-faint" />
        <span>{reason}</span>
      </p>
      {detail ? (
        <p className="m-0 pl-6 font-mono text-[12px] leading-[1.6] text-ink-faint">
          {detail}
        </p>
      ) : null}
      {action ? <div className="pl-6">{action}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: {
  title: string;
  tone?: Tone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line-soft border-l-4 bg-surface-2 px-3.5 py-3",
        TONE_RULE[tone],
        className,
      )}
    >
      <p className="m-0 mb-2 flex items-center gap-2 font-mono text-[12px] font-bold tracking-[0.08em] text-ink-dim uppercase">
        {Icon ? <Icon className="size-4 shrink-0 text-ink-faint" /> : null}
        {title}
      </p>
      <div className="font-serif text-[16px] leading-[1.6] text-foreground">
        {children}
      </div>
    </div>
  );
}

/** A label and its value, stacked. The board's one key/value shape. */
export function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1", wide && "sm:col-span-2")}>
      <span className="font-mono text-[12px] tracking-[0.06em] text-ink-faint uppercase">
        {label}
      </span>
      <span className="font-serif text-[16px] leading-[1.5] break-words text-foreground">
        {children}
      </span>
    </div>
  );
}

export function Bullets({
  items,
  tone = "neutral",
  ordered = false,
}: {
  items: string[];
  tone?: Tone;
  ordered?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {items.map((item, index) => (
        <li key={item} className="flex items-start gap-2.5">
          {ordered ? (
            <span className="mt-0.5 font-mono text-[12.5px] text-ink-faint tabular-nums">
              {index + 1}.
            </span>
          ) : (
            <span
              className={cn(
                "mt-[9px] size-1.5 shrink-0 rounded-full",
                TONE_DOT[tone],
              )}
            />
          )}
          <span className="font-serif text-[16px] leading-[1.55] text-foreground">
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SectionLabel({
  children,
  icon: Icon,
  className,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "m-0 mb-2 flex items-center gap-2 font-mono text-[12px] font-bold tracking-[0.08em] text-ink-faint uppercase",
        className,
      )}
    >
      {Icon ? <Icon className="size-4 shrink-0" /> : null}
      {children}
    </p>
  );
}

/** A big number with its caption. The board's one stat shape. */
export function Stat({
  value,
  label,
  tone = "neutral",
  title,
}: {
  value: string | number;
  label: string;
  tone?: Tone;
  title?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5" title={title}>
      <span
        className={cn(
          "font-mono text-[26px] leading-none font-bold tabular-nums",
          tone === "good" && "text-good",
          tone === "warn" && "text-warn",
          tone === "danger" && "text-destructive",
          tone === "accent" && "text-accent-deep",
          tone === "neutral" && "text-foreground",
        )}
      >
        {value}
      </span>
      <span className="font-mono text-[11.5px] tracking-[0.04em] text-ink-faint uppercase">
        {label}
      </span>
    </div>
  );
}

/** A quiet statement of a prototype rule. Never used for a record. */
export function PrototypeNote({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "m-0 flex items-start gap-2 rounded-md border border-dashed border-line bg-surface-2 px-2.5 py-1.5 font-mono text-[11.5px] leading-[1.6] text-ink-dim",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warn" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Which authored records exist, as a row of chips.
 *
 * A missing record is a chip that says so in its tooltip, never an empty box. The
 * count beside it is the only summary number the board draws from the record files
 * rather than from the index.
 */
export function RecordStrip({
  slots,
  label,
}: {
  slots: SlotState[];
  label: string;
}) {
  const present = slots.filter((slot) => slot.present).length;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-mono text-[19px] leading-none font-bold tabular-nums">
          {present} of {slots.length}
        </span>
        <span className="font-mono text-[12px] tracking-[0.06em] text-ink-faint uppercase">
          {label}
        </span>
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {slots.map((slot) => (
          <li key={slot.slot}>
            <Chip
              tone={slot.present ? "good" : "neutral"}
              dashed={!slot.present}
              icon={slot.present ? Check : Minus}
              title={slot.present ? slot.detail : `Absent. ${slot.detail}`}
              className={slot.present ? undefined : "text-ink-faint"}
            >
              {slot.slot}
            </Chip>
          </li>
        ))}
      </ul>
    </div>
  );
}
