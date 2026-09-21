/**
 * The small pieces every panel of this shell is built from.
 *
 * Four rules hold across all of them, and they come from the engineer's earlier
 * feedback on the prototype.
 *
 *   1. A clickable thing looks clickable. It carries `cursor-pointer`, a hover fill,
 *      a focus ring, and a lucide icon. Tailwind v4 gives a `<button>` the default
 *      cursor, so every button here names `cursor-pointer` for itself.
 *   2. Type is a reading size. Labels are 12px mono, body prose is 16px serif, and
 *      nothing anywhere is smaller than 12px.
 *   3. No state relies on colour alone. Every badge carries a word and a shape marker,
 *      so the rail and the badges survive greyscale.
 *   4. The shell states absence, and it never states presence. A reader does not need
 *      to be told that a record is there. A reader does need to be told when it is not.
 *      So one readiness state survives: absent. It reads "not present", and it is the
 *      only state that paints a pill. The present and partial pills are gone.
 *
 * The card, box, and absence vocabulary below is the record-mosaic's, copied here
 * rather than imported. The engineer named that variation as the one that "does a
 * better job at displaying content in cards and boxes", so this shell now draws with
 * the same tones: a record that exists is a solid card, and a record that is absent is
 * a dashed muted card that names nothing. The copy is deliberate. Every directory under
 * `variations/` stays independently removable while the arrangement is still under
 * review, and a cross-variation import would break that.
 *
 * No component here quotes where a value came from. A panel never prints a field path,
 * a file name, or a join name. The rule is the engineer's, and the reason is simple: a
 * reader who wants an outcome does not need to know that the field is called
 * `goal.outcome`.
 */

import { useId, useState } from "react";
import type { ReactNode } from "react";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  CircleDot,
  CircleSlash,
  Info,
  Minus,
  TriangleAlert,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SmoothButton from "@/components/smoothui/smooth-button";
import { cn } from "@/lib/utils";

import { JUMP_ATTR, panelId } from "./jump";

export type Tone = "neutral" | "accent" | "good" | "warn" | "danger";

/**
 * The two attributes that make a panel a jump target.
 *
 * The id addresses it, and `JUMP_ATTR` carries its heading, so the section-link bar
 * reads one link per panel without holding a list of its own. The return type names
 * the literal key, so the spread below type-checks.
 */
export function jumpTarget(title: string): { id: string; "data-shell-panel": string } {
  return { id: panelId(title), [JUMP_ATTR]: title };
}


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

/* ----------------------------------------------------------------- absence */

/**
 * The one readiness state that survives: a record the bundle does not hold.
 *
 * A record that exists needs no marker. The shell paints nothing for it. A record that
 * is absent paints a dashed muted card and this pill, and the pill says so in two words
 * with a strikethrough circle beside them, so it survives greyscale, per section 8.3.
 */
export const ABSENT_CARD = "border-dashed border-line bg-surface-2/80";

/** The absent pill, and its one shape marker. */
export function NotPresentPill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 font-mono text-[12px] font-bold tracking-[0.04em] text-ink-faint uppercase",
        className,
      )}
    >
      <CircleSlash className="size-3.5 shrink-0" aria-hidden="true" />
      not present
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
 * The frame follows the record mosaic's tile: a solid card when the record is there,
 * a dashed muted card when it is absent. A panel that states an absence still occupies
 * its place, and the pill in its header is the only thing that says so.
 *
 * A panel inside a `Bento` names its `span` and becomes one tile of that grid. The
 * panel then fills the tile, so a row of tiles reads as one band rather than as cards
 * of three different heights.
 *
 * A panel may start closed. `collapsible` with `defaultOpen={false}` renders the body
 * inside a height-animated container, and the header becomes a toggle. The heading and
 * the `count` stay on the closed row, so a reader sees what the section holds without
 * opening it. An absent panel ignores `collapsible`, because an absence that is hidden
 * is an absence the reader cannot see.
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
  absent = false,
  count,
  collapsible = false,
  defaultOpen = true,
  span,
  children,
  className,
}: {
  title: string;
  lead?: string;
  icon?: LucideIcon;
  tone?: Tone;
  action?: ReactNode;
  /** True when the record is absent. Paints the dashed frame and the pill. */
  absent?: boolean;
  /** A count shown beside the heading, so a closed panel still says what it holds. */
  count?: number;
  /** True when the reader may open and close the body. */
  collapsible?: boolean;
  /** The state the body starts in. Only read when `collapsible` is true. */
  defaultOpen?: boolean;
  /** The bento span. Omitted, the panel is not a tile and no grid is required. */
  span?: TileSpan;
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  /* An absent record is always shown, so the reader never has to open a panel to learn
     that something is missing. */
  const shown = absent || !collapsible || open;
  const closable = collapsible && !absent;

  const heading = (
    <span className="flex min-w-0 flex-1 items-center gap-x-3">
      {Icon ? (
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-accent-deep">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      ) : null}
      <h2 className="m-0 min-w-0 font-mono text-[15px] font-bold tracking-[-0.01em]">
        {title}
      </h2>
      {typeof count === "number" ? (
        <span className="shrink-0 font-mono text-[13px] text-ink-faint tabular-nums">
          {count}
        </span>
      ) : null}
      {closable ? (
        <motion.span
          className="shrink-0 text-ink-faint"
          animate={{ rotate: shown ? 180 : 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
        >
          <ChevronDown className="size-4" aria-hidden="true" />
        </motion.span>
      ) : null}
    </span>
  );

  const card = (
    <section
      {...jumpTarget(title)}
      className={cn(
        "rounded-xl border",
        absent ? ABSENT_CARD : "border-line bg-card shadow-card",
        span && "min-w-0 flex-1",
        className,
      )}
      aria-label={title}
    >
      <header className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line-soft bg-surface-2 px-4 py-2.5">
        {closable ? (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={shown}
            aria-controls={bodyId}
            className={cn(
              "flex min-h-9 min-w-0 flex-1 cursor-pointer items-center rounded-md",
              "transition-colors duration-150 ease-house hover:text-accent-deep",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            )}
          >
            {heading}
          </button>
        ) : (
          heading
        )}
        {absent ? <NotPresentPill className="ml-auto" /> : <span className="ml-auto" />}
        {action ? <div className="flex min-w-0 flex-wrap items-center gap-2">{action}</div> : null}
      </header>
      <motion.div
        id={bodyId}
        inert={!shown}
        initial={false}
        animate={{ height: shown ? "auto" : 0, opacity: shown ? 1 : 0 }}
        transition={reduce ? { duration: 0 } : { height: { duration: 0.22 }, opacity: { duration: 0.22 } }}
        className="min-w-0 overflow-hidden"
      >
        <div
          className={cn(
            "min-w-0 px-4 py-3.5",
            tone !== "neutral" && TONE_RULE[tone],
            tone !== "neutral" && "border-l-4",
          )}
        >
          {lead ? (
            <p className="m-0 mb-3 max-w-[86ch] font-serif text-[15px] leading-[1.5] text-ink-dim italic">
              {lead}
            </p>
          ) : null}
          {children}
        </div>
      </motion.div>
    </section>
  );

  /*
   * A closed panel does not stretch to the row's height. A bento row is as tall as its
   * tallest tile, and a closed tile that filled the row would paint a large empty card.
   * `self-start` lets the closed tile hug its own heading instead.
   */
  return span ? (
    <Tile span={span} className={cn(closable && !shown && "self-start")}>
      {card}
    </Tile>
  ) : (
    card
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
 * A control that navigates somewhere, drawn with SmoothUI's `smooth-button`.
 *
 * The engineer asked for every navigating control to become a proper button, and
 * `smooth-button` is the one the design system names. `variant="outline"` suits a
 * document: a reading surface is not a marketing page, and a filled brand button
 * would shout on a page whose subject is a record. The trailing arrow is the
 * `suffix` icon, and it says the control moves the reader forward rather than
 * toggling something in place.
 *
 * `size="lg"` is `h-11`, which is 44 px, so section 11.2's hit target holds. The
 * horizontal padding is pulled back from the registry's `px-8`, because a document
 * control does not need the width of a call to action. `self-start` is in the base
 * class, because every call site is a flex column and a stretched button would span
 * the panel it sits in.
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
  return (
    <SmoothButton
      variant="outline"
      size="lg"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      prefix={Icon ? <Icon aria-hidden="true" /> : undefined}
      suffix={<ArrowRight aria-hidden="true" />}
      className={cn("self-start px-3.5 font-mono text-[13px] font-bold", className)}
    >
      {children}
    </SmoothButton>
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
 * This is the shell's empty state, and it is the point of the mockup. A missing record
 * is stated in place, never hidden and never rendered as a blank box. It names the
 * record kind and stops there: the panel does not enumerate the files it looked in,
 * because a reader cannot act on a file name and does not need one.
 */
export function Missing({ children, className }: { children: ReactNode; className?: string }) {
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

/** A quiet mono line that states an absence of a whole record, with no source named. */
export function AbsentRecordLine({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 font-mono text-[12px] leading-[1.6] text-ink-faint">{children}</p>
  );
}

/* -------------------------------------------------------------------- points */

/**
 * One point: a bullet, the point itself, and the kind it carries.
 *
 * A row is a row, not a box. The engineer asked twice for this shape. A point in its
 * own outlined box competes with the card that holds it, and a column of five boxes
 * reads as five things rather than one list.
 */
export interface Point {
  text: string;
  /** The beat's own kind, or the column's kind when the list is uniform. */
  kind?: string;
}

/**
 * One column of points: a shadcn `Card`, one unboxed lead, then striped rows.
 *
 * The lead is the record's own words, so it stays. It is set as prose rather than as a
 * box, above the rows, because the rows are the list and the lead is what the list is
 * about. `intent.problem` and `intent.approach` are the two leads this shell passes.
 *
 * THE STRIPE IS AN EXPLICIT INDEX, not `odd:` or `even:`. The rows sit in an `ol`
 * beside a header and a lead paragraph, and an index cannot be thrown off by a sibling
 * that joins the list later. Row 0 paints `bg-card`, which is `--surface` and the card's
 * own colour, and row 1 paints `bg-surface-2`. Both tokens are redefined for dark mode
 * in `index.css`, so the stripe holds in either theme.
 */
export function PointCard({
  title,
  lead,
  points,
  empty,
  className,
}: {
  title: string;
  lead?: string;
  points: Point[];
  /** What the card says when it holds no point. */
  empty: string;
  className?: string;
}) {
  return (
    <Card className={cn("min-w-0 gap-0 rounded-xl py-0", className)}>
      <CardHeader className="border-b border-line-soft bg-surface-2 px-4 py-2.5">
        <CardTitle className="font-mono text-[12.5px] font-bold tracking-[0.08em] uppercase">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 px-0 pb-0">
        {lead ? (
          <p className="m-0 max-w-[86ch] border-b border-line-soft px-4 py-3 font-serif text-[16px] leading-[1.6] text-foreground">
            {lead}
          </p>
        ) : null}
        {points.length > 0 ? (
          <ol className="m-0 flex min-w-0 list-none flex-col p-0">
            {points.map((point, index) => (
              <li
                key={`${index}-${point.text.slice(0, 24)}`}
                className={cn(
                  "flex min-w-0 items-start gap-2.5 px-4 py-2.5",
                  index % 2 === 0 ? "bg-card" : "bg-surface-2",
                )}
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-faint" aria-hidden="true" />
                <span className="min-w-0 flex-1 font-serif text-[16px] leading-[1.55] break-words text-ink-mid">
                  {point.text}
                </span>
                {point.kind ? (
                  <span className="mt-0.5 shrink-0 font-mono text-[12px] text-ink-faint">
                    {point.kind}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="m-0 flex min-w-0 items-start gap-2 px-4 py-3 font-mono text-[12.5px] leading-[1.6] text-ink-faint">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warn" aria-hidden="true" />
            <span>{empty}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------- bento */

/**
 * The bento grid a content section lays its tiles in.
 *
 * An explicit twelve-column grid, not a row of flex children. Each tile names its own
 * span, so the widths are written down rather than left to the content. The grid is
 * the container the spans measure against, so a tile's span follows the pane rather
 * than the viewport.
 *
 * Section 11.3's rule 4 is the reason every tile carries `min-w-0`. A grid child
 * defaults to its content width, so one wide row would stretch the pane and push its
 * siblings off the edge. Rule 3 is the tile's own job: a table, a code fence, or a
 * diagram inside a tile keeps its own `overflow-x: auto` wrapper.
 */
export function Bento({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("@container grid min-w-0 grid-cols-12 gap-4", className)}>{children}</div>
  );
}

/**
 * The named spans. One tile names its content weight, and the weight decides the span.
 *
 * `band` runs the full width, for a tile that carries a long list or a wide band.
 * `wide` takes two thirds beside a `narrow` tile of one third, and `half` splits a row
 * with one other tile. Below a 48 rem pane every span falls back to the full width, so
 * a narrow pane stacks rather than squeezing.
 */
export const TILE_SPAN = {
  band: "col-span-12",
  wide: "col-span-12 @3xl:col-span-8",
  half: "col-span-12 @3xl:col-span-6",
  narrow: "col-span-12 @3xl:col-span-4",
} as const;

export type TileSpan = keyof typeof TILE_SPAN;

/**
 * One tile of the bento, and the container its own inner grids measure against.
 *
 * The tile is a container, so an inner grid inside it reads the tile's width and not
 * the viewport's. A `sm:` breakpoint inside a one-third tile would otherwise fire on a
 * wide viewport and crush the tile's own columns.
 */
export function Tile({
  span,
  children,
  className,
}: {
  span: TileSpan;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("@container flex min-w-0 flex-col", TILE_SPAN[span], className)}>
      {children}
    </div>
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
