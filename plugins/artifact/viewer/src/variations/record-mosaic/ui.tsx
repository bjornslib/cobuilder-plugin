/**
 * The shared pieces every tile of the record mosaic draws with.
 *
 * Three rules hold across this file.
 *
 *   1. Type is large enough to read. The board it replaces sets body text at 13px
 *      and labels at 10px, and this variation raises both. Prose sits at 17px,
 *      tile headings at 17px, and the smallest label at 12.5px.
 *   2. A clickable thing looks clickable. Every control carries a pointer cursor, a
 *      hover treatment, a focus ring from the global `:focus-visible` rule, and an
 *      icon or an underline.
 *   3. Readiness is visible. A record kind is present, partial, or absent, and the
 *      pill says which and names the missing part.
 */

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { CircleDashed, CircleSlash, Check, Info } from "lucide-react";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

import type { Readiness, Verdict } from "./types";

/* ------------------------------------------------------------------- tone */

/**
 * How a record's readiness reads. The three tones are distinct at a glance:
 * a solid card, a dashed card, and a muted dashed card.
 */
export const TONE: Record<Readiness, string> = {
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

const READINESS_WORD: Record<Readiness, string> = {
  present: "present",
  partial: "partial",
  absent: "absent",
};

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
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[12.5px] font-bold tracking-[0.04em] uppercase",
        READINESS_PILL[state],
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {word ?? READINESS_WORD[state]}
    </span>
  );
}

/** The parts a record is missing, named rather than implied. */
export function MissingParts({ parts }: { parts: string[] }) {
  if (parts.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[12.5px] text-ink-dim">missing:</span>
      {parts.map((part) => (
        <span
          key={part}
          className="rounded border border-dashed border-primary/60 bg-accent-wash/60 px-1.5 py-0.5 font-mono text-[12.5px] text-accent-deep"
        >
          {part}
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ state */

type Tone = "good" | "accent" | "warn" | "danger" | "muted" | "history";

const STATE_TONE: Record<string, Tone> = {
  /* Values the index refines today. */
  merged: "good",
  open: "accent",
  unstarted: "muted",
  "no-pull-request": "muted",
  completed: "good",
  /* Values the wider vocabulary adds. The badge renders them already, so a newer
     index reads correctly with no code change. The legend names which are absent. */
  planned: "muted",
  "in-progress": "accent",
  blocked: "warn",
  "in-review": "accent",
  superseded: "history",
  red: "warn",
  green: "good",
  validated: "good",
  failed: "danger",
  skipped: "muted",
  /* Decision and pull-request states. */
  approved: "accent",
  decided: "muted",
  rejected: "danger",
  /* Assessment verdicts, finding kinds, and finding severities. */
  proceed: "good",
  concerns: "warn",
  rework: "danger",
  prediction: "accent",
  observation: "muted",
  drift: "warn",
  "skill-gap": "warn",
  high: "danger",
  medium: "warn",
  low: "muted",
  sensitive: "warn",
  /* Round feedback classes. */
  changed: "accent",
  unchanged: "muted",
  material: "warn",
};

const TONE_CLASS: Record<Tone, string> = {
  good: "border-good bg-good-wash text-good",
  accent: "border-primary bg-accent-wash text-accent-deep",
  warn: "border-warn bg-warn-wash text-warn",
  danger: "border-destructive bg-danger-wash text-destructive",
  muted: "border-line bg-surface-2 text-ink-dim",
  history: "border-dashed border-line text-ink-faint",
};

/** One state value, toned. An unknown value reads as itself and never as an error. */
export function StateBadge({
  state,
  className,
  title,
}: {
  state: string;
  className?: string;
  title?: string;
}) {
  const tone = STATE_TONE[state] ?? "muted";
  return (
    <span
      title={title}
      className={cn(
        "inline-flex shrink-0 items-center rounded border px-2 py-0.5 font-mono text-[12.5px] tracking-[0.03em] whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {state}
    </span>
  );
}

/** A plain counted fact, for tile footers. */
export function Chip({
  children,
  muted,
  className,
}: {
  children: React.ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[12.5px] tabular-nums",
        muted
          ? "border-dashed border-line text-ink-faint"
          : "border-line bg-surface-2 text-ink-dim",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- controls */

/**
 * A control that reads as a link and behaves as a button.
 *
 * Motion adds a two-pixel lift on hover, and `useReducedMotion` removes it.
 */
export function ActionButton({
  children,
  icon: Icon,
  onClick,
  className,
  ariaLabel,
  title,
}: {
  children: React.ReactNode;
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
        "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-surface-2/70 px-2.5 py-1 font-mono text-[13px] font-bold text-accent-deep transition-colors duration-150 ease-house hover:border-primary hover:bg-accent-wash hover:underline underline-offset-2",
        className,
      )}
    >
      {Icon ? <Icon className="size-4" aria-hidden /> : null}
      {children}
    </motion.button>
  );
}

/** A bare icon control, with a label for screen readers and a hover wash. */
export function IconButton({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-line bg-card text-ink-mid transition-colors duration-150 ease-house hover:border-primary hover:bg-accent-wash hover:text-accent-deep",
        className,
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}

/* -------------------------------------------------------------- structure */

/** The span each tile takes on the wide grid, chosen by the record's weight. */
export const SPAN: Record<number, string> = {
  2: "md:col-span-1 xl:col-span-2",
  3: "md:col-span-2 xl:col-span-3",
  4: "md:col-span-2 xl:col-span-4",
  6: "md:col-span-2 xl:col-span-6",
};

/** One tile of the mosaic: a heading that names the record, then the record. */
export function Tile({
  label,
  icon: Icon,
  verdict,
  span,
  absentHint,
  children,
  headerExtra,
  note,
  pillWord,
  delay = 0,
}: {
  label: string;
  icon: LucideIcon;
  verdict: Verdict;
  span: string;
  absentHint: string;
  children?: React.ReactNode;
  headerExtra?: React.ReactNode;
  note?: string;
  pillWord?: string;
  /** Stagger for the entrance, in seconds. */
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      aria-label={`${label} record, ${verdict.state}`}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.22, delay: reduce ? 0 : delay, ease: [0.22, 0.75, 0.3, 1] }}
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 transition-shadow duration-150 ease-house hover:shadow-raise",
        TONE[verdict.state],
        span,
      )}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-accent-deep">
          <Icon className="size-4" aria-hidden />
        </span>
        <h3 className="m-0 font-mono text-[17px] font-bold tracking-[-0.01em]">{label}</h3>
        {headerExtra}
        <ReadinessPill state={verdict.state} word={pillWord} className="ml-auto" />
      </header>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
        <p className="m-0 max-w-[70ch] font-serif text-[15px] leading-[1.5] text-ink-dim">
          {note ?? verdict.note}
        </p>
        <MissingParts parts={verdict.missing} />
      </div>

      {verdict.state === "absent" ? (
        <>
          <p className="m-0 flex items-start gap-2 rounded-lg border border-dashed border-line bg-card/60 px-3.5 py-3 font-serif text-[15.5px] leading-[1.55] text-ink-dim">
            <Info className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden />
            <span>{absentHint}</span>
          </p>
          {children}
        </>
      ) : (
        children
      )}
    </motion.section>
  );
}

/** A labelled block. This is the shape that turns problem and solution prose into cards. */
export function InfoBox({
  label,
  children,
  tone = "plain",
  className,
}: {
  label: string;
  children: React.ReactNode;
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
    <div className={cn("rounded-lg border px-3.5 py-3", toneClass, className)}>
      <div className="font-mono text-[12.5px] font-bold tracking-[0.08em] text-ink-dim uppercase">
        {label}
      </div>
      <div className="mt-1.5 font-serif text-[17px] leading-[1.6] text-foreground">
        {children}
      </div>
    </div>
  );
}

/** A numbered or bulleted list where each entry is its own row. */
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
    <ol className={cn("m-0 flex list-none flex-col gap-2 p-0", className)}>
      {items.map((item, index) => (
        <li
          key={`${index}-${item.slice(0, 24)}`}
          className="flex gap-2.5 rounded-lg border border-line-soft bg-surface-2/50 px-3 py-2"
        >
          {ordered ? (
            <span className="mt-0.5 font-mono text-[13px] font-bold text-ink-faint tabular-nums">
              {index + 1}
            </span>
          ) : (
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-faint" aria-hidden />
          )}
          <span className="font-serif text-[16px] leading-[1.55] text-ink-mid">{item}</span>
        </li>
      ))}
    </ol>
  );
}

/** A count with its noun, so a chip never reads "1 decisions". */
export function plural(value: number, one: string, many: string): string {
  return `${value} ${value === 1 ? one : many}`;
}

/** One key and one value on a line, for record metadata. */
export function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-mono text-[12.5px] tracking-[0.05em] text-ink-faint uppercase">
        {label}
      </span>
      <span className="font-mono text-[13px] text-ink-mid">{value}</span>
    </span>
  );
}

/** A section heading inside a tile, so a long record stays readable. */
export function SubHead({
  children,
  count,
  className,
}: {
  children: React.ReactNode;
  count?: number;
  className?: string;
}) {
  return (
    <h4
      className={cn(
        "m-0 flex items-baseline gap-2 font-mono text-[14px] font-bold tracking-[0.02em] text-ink-mid",
        className,
      )}
    >
      {children}
      {typeof count === "number" ? (
        <span className="font-mono text-[13px] text-ink-faint tabular-nums">{count}</span>
      ) : null}
    </h4>
  );
}

/* ----------------------------------------------------------------- motion */

/** A height animation for expand and collapse. Reduced motion makes it instant. */
export function Reveal({ children, show }: { children: React.ReactNode; show: boolean }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.div
          key="reveal"
          initial={reduce ? false : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.24, ease: [0.22, 0.75, 0.3, 1] }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* --------------------------------------------------------------- markdown */

type Block =
  | { kind: "h1" | "h2" | "h3" | "p" | "li" | "pre"; text: string }
  | { kind: "table"; rows: string[][] };

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isSeparatorRow(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes("-");
}

function toBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (/^\s*$/.test(line) || /^\s*---+\s*$/.test(line)) {
      index += 1;
      continue;
    }
    if (/^\s*```/.test(line)) {
      const buffer: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```/.test(lines[index])) {
        buffer.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ kind: "pre", text: buffer.join("\n") });
      continue;
    }
    if (/^\s*\|/.test(line)) {
      const rows: string[][] = [];
      while (index < lines.length && /^\s*\|/.test(lines[index])) {
        if (!isSeparatorRow(lines[index])) rows.push(splitRow(lines[index]));
        index += 1;
      }
      blocks.push({ kind: "table", rows });
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const depth = heading[1].length;
      blocks.push({ kind: depth === 1 ? "h1" : depth === 2 ? "h2" : "h3", text: heading[2] });
      index += 1;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      blocks.push({ kind: "li", text: line.replace(/^\s*[-*]\s+/, "") });
      index += 1;
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      blocks.push({ kind: "li", text: line.replace(/^\s*\d+\.\s+/, "") });
      index += 1;
      continue;
    }
    const buffer: string[] = [line.trim()];
    index += 1;
    while (
      index < lines.length &&
      !/^\s*$/.test(lines[index]) &&
      !/^\s*(#{1,4}\s|[-*]\s|\d+\.\s|```|\||---)/.test(lines[index])
    ) {
      buffer.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ kind: "p", text: buffer.join(" ") });
  }
  return blocks;
}

function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let match = pattern.exec(text);
  let tick = 0;
  while (match !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("`")) {
      parts.push(
        <code
          key={`${keyPrefix}-c${tick}`}
          className="rounded bg-surface-3 px-1 py-px font-mono text-[15px] text-accent-deep"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      parts.push(
        <strong key={`${keyPrefix}-b${tick}`} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    }
    last = match.index + token.length;
    tick += 1;
    match = pattern.exec(text);
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/**
 * A small markdown reader for the pr-draft record.
 *
 * The draft is authored markdown, and a reader of this tile must see a heading as a
 * heading. This reader covers the six shapes the corpus uses: headings, paragraphs,
 * list items, fenced code, tables, and inline code and bold. It is not a general
 * markdown engine and it does not try to be one.
 */
export function MarkdownBlock({ markdown }: { markdown: string }) {
  const blocks = useMemo(() => toBlocks(markdown), [markdown]);
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, index) => {
        const key = `block-${index}`;
        if (block.kind === "h1") {
          return (
            <h4 key={key} className="m-0 font-mono text-[17px] font-bold tracking-[-0.01em]">
              {inline(block.text, key)}
            </h4>
          );
        }
        if (block.kind === "h2") {
          return (
            <h5
              key={key}
              className="mt-1 mb-0 border-b border-line-soft pb-1 font-mono text-[15px] font-bold text-accent-deep"
            >
              {inline(block.text, key)}
            </h5>
          );
        }
        if (block.kind === "h3") {
          return (
            <h6 key={key} className="m-0 font-mono text-[14px] font-bold text-ink-mid">
              {inline(block.text, key)}
            </h6>
          );
        }
        if (block.kind === "li") {
          return (
            <p key={key} className="m-0 flex gap-2.5 font-serif text-[16px] leading-[1.6] text-ink-mid">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-faint" aria-hidden />
              <span>{inline(block.text, key)}</span>
            </p>
          );
        }
        if (block.kind === "pre") {
          return (
            <pre
              key={key}
              className="m-0 overflow-x-auto rounded-lg border border-line bg-surface-2 p-3 font-mono text-[13.5px] leading-[1.5] text-ink-mid"
            >
              <code>{block.text}</code>
            </pre>
          );
        }
        if (block.kind === "table") {
          const [head, ...body] = block.rows;
          return (
            <div key={key} className="overflow-x-auto">
              <table className="w-full border-collapse font-serif text-[15px]">
                <thead>
                  <tr>
                    {(head ?? []).map((cell, cellIndex) => (
                      <th
                        key={`${key}-h${cellIndex}`}
                        className="border-b border-line px-2 py-1.5 text-left font-mono text-[12.5px] tracking-[0.05em] text-ink-dim uppercase"
                      >
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, rowIndex) => (
                    <tr key={`${key}-r${rowIndex}`}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`${key}-r${rowIndex}-c${cellIndex}`}
                          className="border-b border-line-soft px-2 py-1.5 align-top text-ink-mid"
                        >
                          {inline(cell, `${key}-r${rowIndex}-c${cellIndex}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={key} className="m-0 font-serif text-[16.5px] leading-[1.65] text-ink-mid">
            {inline(block.text, key)}
          </p>
        );
      })}
    </div>
  );
}
