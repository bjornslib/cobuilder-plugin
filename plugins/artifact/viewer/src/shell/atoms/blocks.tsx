import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { TINT_BAR } from "./headings";

/**
 * A labelled box inside a panel.
 *
 * This is the record mosaic's `InfoBox`, and it is the shape that turns prose into a
 * card. The tone names what the box holds rather than how important it is: a problem
 * reads amber, a solution reads green, a note reads dashed and quiet.
 */
/**
 * The attribute a record part carries to become a link in the Sheet's jumplink row.
 *
 * `Box` and `SubHead` are its only writers, and both write it from the label they
 * already render, so the row cannot name a heading the record does not have. The
 * constant lives here rather than beside its reader in `Sheet.tsx`, because `Sheet.tsx`
 * imports this file and the reverse would be a cycle. `jump.tsx` holds `JUMP_ATTR` for
 * the pane's own links, and that one is read by its own module.
 */
export const SHEET_HEADING_ATTR = "data-sheet-heading";

function anchorAttr(anchor: boolean): Record<string, string> {
  return anchor ? { [SHEET_HEADING_ATTR]: "" } : {};
}

type BoxTone = "plain" | "problem" | "solution" | "note";

const BOX_TONE: Record<BoxTone, string> = {
  problem: "border-warn/60 bg-warn-wash/60",
  solution: "border-good/60 bg-good-wash/60",
  note: "border-dashed border-line bg-surface-2/70",
  plain: "border-line bg-surface-2/60",
};

interface BoxProps {
  label: string;
  children: ReactNode;
  tone?: BoxTone;
  className?: string;
  /** True when the Sheet's jumplink row should link to this part. */
  anchor?: boolean;
}

const BOX_LABEL_CLASS = "font-mono text-[12px] font-bold tracking-[0.08em] text-ink-dim uppercase";

const BOX_BODY_CLASS = "mt-1.5 min-w-0 font-serif text-[16px] leading-[1.6] text-foreground";

export function Box({ label, children, tone = "plain", className, anchor = false }: BoxProps) {
  return (
    <div
      {...anchorAttr(anchor)}
      className={cn("min-w-0 rounded-lg border px-3.5 py-3", BOX_TONE[tone], className)}
    >
      <div className={BOX_LABEL_CLASS}>{label}</div>
      <div className={BOX_BODY_CLASS}>{children}</div>
    </div>
  );
}

const TEXT_ROW_CLASS =
  "flex min-w-0 gap-2.5 rounded-lg border border-line-soft bg-surface-2/50 px-3 py-2";

const TEXT_ITEM_CLASS = "min-w-0 font-serif text-[16px] leading-[1.55] break-words text-ink-mid";

function TextListRow({ item, number }: { item: string; number?: number }) {
  return (
    <li className={TEXT_ROW_CLASS}>
      {number === undefined ? (
        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-faint" aria-hidden="true" />
      ) : (
        <span className="mt-0.5 font-mono text-[13px] font-bold text-ink-faint tabular-nums">{number}</span>
      )}
      <span className={TEXT_ITEM_CLASS}>{item}</span>
    </li>
  );
}

interface TextListProps {
  items: string[];
  ordered?: boolean;
  className?: string;
}

/** One list row per entry, so a list of prose reads as a stack of cards. */
export function TextList({ items, ordered, className }: TextListProps) {
  if (items.length === 0) return null;
  return (
    <ol className={cn("m-0 flex min-w-0 list-none flex-col gap-2 p-0", className)}>
      {items.map((item, index) => (
        <TextListRow key={`${index}-${item.slice(0, 24)}`} item={item} number={ordered ? index + 1 : undefined} />
      ))}
    </ol>
  );
}

interface SubHeadProps {
  children: ReactNode;
  count?: number;
  className?: string;
  /** True when the Sheet's jumplink row should link to this part. */
  anchor?: boolean;
}

const SUB_HEAD_CLASS =
  "m-0 inline-flex min-w-0 items-baseline gap-2 self-start font-mono text-[14px] font-bold tracking-[0.02em]";

/**
 * The level-three heading: a bar inside a panel, with its count beside it.
 *
 * `self-start` is load-bearing. Every call site is a flex column, and a flex child
 * stretches across the column unless it says otherwise, so the bar would run the full
 * width of the panel and stop hugging its own text.
 */
export function SubHead({ children, count, className, anchor = false }: SubHeadProps) {
  return (
    <h3 {...anchorAttr(anchor)} className={cn(SUB_HEAD_CLASS, TINT_BAR, className)}>
      <span className="min-w-0">{children}</span>
      {typeof count === "number" ? (
        <span className="font-mono text-[13px] text-tint-ink/70 tabular-nums">{count}</span>
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
