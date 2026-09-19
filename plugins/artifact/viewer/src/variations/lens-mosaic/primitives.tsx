/**
 * The pieces every lens tile is built from.
 *
 * Three rules hold across this file, and they are the answer to three of the ten
 * feedback items:
 *
 *   Type is large. Body prose is 16px serif, a card title is 15px, a tile heading is
 *   17px mono, and no read text sits below 12px. The scaffold this variation
 *   replaces ran at 10px to 13.5px.
 *
 *   Every clickable thing looks clickable. `CLICKABLE` carries the pointer cursor
 *   and the hover wash, `FOCUS_RING` carries the inset ring, and a clickable row
 *   always ends in a chevron or an arrow so the affordance is visible before the
 *   pointer arrives. Tailwind's preflight gives a button `cursor: default`, so the
 *   pointer cursor is set rather than inherited.
 *
 *   A record that is absent says so. `LensTile` and `EmptyLensBody` never render a
 *   blank body. An absent record disables the tile, states which file is missing,
 *   and states what would fill it.
 */

import type { ReactNode } from "react";
import { ChevronRight, Lock, type LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/** The pointer cursor, the hover wash, and the house timing on one string. */
export const CLICKABLE =
  "cursor-pointer transition-colors duration-150 ease-house hover:bg-surface-2";

/** A ring that survives the tile's `overflow-hidden`, because it draws inward. */
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

export const CLICKABLE_ROW = `${CLICKABLE} ${FOCUS_RING}`;

/** One mono size for every meta chip, so the small type stays one size. */
export function Chip({
  children,
  tone = "plain",
  title,
}: {
  children: ReactNode;
  tone?: "plain" | "muted" | "accent" | "good" | "warn" | "dashed";
  title?: string;
}) {
  const tones: Record<string, string> = {
    plain: "border-line bg-surface-2 text-ink-dim",
    muted: "border-line-soft bg-transparent text-ink-faint",
    accent: "border-primary bg-accent-wash text-accent-deep",
    good: "border-good bg-good-wash text-good",
    warn: "border-warn bg-warn-wash text-warn",
    dashed: "border-dashed border-line text-ink-faint",
  };
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[12px] whitespace-nowrap tabular-nums",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

/** A labelled sub-heading inside a tile. The second level of the hierarchy. */
export function SectionLabel({
  children,
  count,
}: {
  children: ReactNode;
  count?: number;
}) {
  return (
    <div className="mb-2 flex items-baseline gap-2">
      <h4 className="m-0 font-mono text-[12px] font-bold tracking-[0.08em] text-ink-dim uppercase">
        {children}
      </h4>
      {typeof count === "number" ? (
        <span className="font-mono text-[12px] text-ink-faint tabular-nums">
          {count}
        </span>
      ) : null}
    </div>
  );
}

/** Record prose. Serif, 16px, and the only place paragraphs are allowed. */
export function Prose({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "m-0 max-w-[74ch] font-serif text-[16px] leading-[1.6] text-foreground/90",
        className,
      )}
    >
      {children}
    </p>
  );
}

/**
 * A bordered box around record prose. The problem and solution lenses put their
 * prose in these, so the content reads as a box rather than as a bare paragraph.
 */
export function ProseBox({
  title,
  source,
  children,
  tone = "plain",
}: {
  title: string;
  source?: string;
  children: ReactNode;
  tone?: "plain" | "muted";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3.5 py-3",
        tone === "muted"
          ? "border-line-soft bg-surface-2"
          : "border-line bg-surface-2",
      )}
    >
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="font-mono text-[12px] font-bold tracking-[0.06em] text-accent-deep uppercase">
          {title}
        </span>
        {source ? (
          <span className="truncate font-mono text-[12px] text-ink-faint">
            {source}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/** One card in a list of cards. The unit the problem and solution lenses use. */
export function ContentCard({
  label,
  labelTone = "plain",
  title,
  children,
}: {
  label?: string;
  labelTone?: "plain" | "good" | "warn" | "accent";
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-card px-3.5 py-3 transition-shadow duration-150 ease-house hover:shadow-card">
      {label ? (
        <div className="mb-1.5">
          <Chip tone={labelTone}>{label}</Chip>
        </div>
      ) : null}
      {title ? (
        <p className="m-0 mb-1 font-mono text-[15px] leading-[1.4] font-bold">
          {title}
        </p>
      ) : null}
      <div className="font-serif text-[15.5px] leading-[1.55] text-foreground/85">
        {children}
      </div>
    </div>
  );
}

/** A numbered card, for a list the record already orders. */
export function NumberedCard({
  n,
  children,
}: {
  n: number;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-line bg-card px-3.5 py-3">
      <span className="mt-px grid size-6 shrink-0 place-items-center rounded border border-line bg-surface-2 font-mono text-[12px] font-bold text-ink-dim tabular-nums">
        {n}
      </span>
      <div className="font-serif text-[15.5px] leading-[1.55] text-foreground/85">
        {children}
      </div>
    </div>
  );
}

/**
 * A disclosure. The affordance is the chevron and the hover wash, and the trigger
 * is a real button so it takes a ring and the keyboard.
 */
export function Disclosure({
  label,
  count,
  kind,
  children,
  defaultOpen = false,
}: {
  label: string;
  count?: number;
  /** A short label shown before the title, usually a diagram kind. */
  kind?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="rounded-lg border border-line bg-surface-2">
      <CollapsibleTrigger
        className={cn(
          "group flex w-full items-center gap-2 rounded-lg px-3.5 py-2.5 text-left",
          CLICKABLE_ROW,
        )}
      >
        <ChevronRight className="size-4 shrink-0 text-ink-faint transition-transform duration-200 ease-house group-data-[state=open]:rotate-90" />
        {kind ? <Chip tone="accent">{kind}</Chip> : null}
        <span className="font-mono text-[12.5px] font-bold text-ink-mid">
          {label}
        </span>
        {typeof count === "number" ? (
          <span className="font-mono text-[12px] text-ink-faint tabular-nums">
            {count}
          </span>
        ) : null}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3.5 pt-0.5 pb-3.5">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

/** The icon well that heads every tile. */
function TileIcon({ icon: Icon, muted }: { icon: LucideIcon; muted?: boolean }) {
  return (
    <span
      className={cn(
        "mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border",
        muted
          ? "border-dashed border-line bg-transparent text-ink-faint"
          : "border-line bg-card text-accent-deep",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}

/**
 * The tile shell. One heading level per tile, a sub-heading line, and an optional
 * action on the right. `muted` is how an absent record reads: dashed, washed out,
 * and never confused with a record that loaded.
 */
export function LensTile({
  id,
  icon,
  title,
  sub,
  action,
  muted,
  className,
  children,
}: {
  /** An anchor for the tile body, so a heading can point at it. */
  id?: string;
  icon: LucideIcon;
  title: string;
  sub: string;
  action?: ReactNode;
  muted?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "h-full gap-0 py-0 ring-1 shadow-card",
        muted ? "border-dashed ring-line-soft opacity-90" : "ring-line",
        className,
      )}
    >
      <div
        className={cn(
          "border-b px-4 py-3",
          muted ? "border-dashed border-line-soft" : "border-line bg-surface-2",
        )}
      >
        <div className="flex items-start gap-3">
          <TileIcon icon={icon} muted={muted} />
          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "m-0 font-mono text-[17px] leading-[1.25] font-bold tracking-[-0.01em]",
                muted && "text-ink-dim",
              )}
            >
              {title}
            </h3>
            <p className="m-0 mt-1 font-mono text-[12px] leading-[1.4] text-ink-dim">
              {sub}
            </p>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
      <div id={id} className="min-h-0 flex-1 px-4 py-3.5">
        {children}
      </div>
    </Card>
  );
}

/**
 * The body of a tile whose record is absent.
 *
 * The tile is disabled rather than blank. It names the file that is missing, the
 * stage that would write it, and the note the design itself carries when one
 * exists. Nothing here is a control, so nothing here takes a click it cannot honor.
 */
export function EmptyLensBody({
  file,
  what,
  note,
}: {
  file: string;
  what: string;
  note?: string;
}) {
  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-line bg-surface-2 px-3.5 py-3">
        <Lock className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden="true" />
        <div>
          <p className="m-0 font-mono text-[12.5px] leading-[1.5] font-bold text-ink-dim">
            This lens is disabled. The record is absent.
          </p>
          <p className="m-0 mt-1 font-serif text-[15.5px] leading-[1.5] text-ink-mid">
            {what}
          </p>
        </div>
      </div>
      <p className="m-0 font-mono text-[12px] leading-[1.5] text-ink-faint">
        missing file{" "}
        <code className="rounded border border-line-soft bg-surface-2 px-1 py-px text-[12px]">
          {file}
        </code>
      </p>
      {note ? (
        <p className="m-0 border-l-2 border-line pl-3 font-serif text-[14.5px] leading-[1.5] text-ink-dim">
          {note}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A long list inside a tile, capped so the mosaic stays a board rather than a wall.
 *
 * The cap is stated on screen, because a list that scrolls without saying so hides
 * its own end. The container takes a tab stop so a keyboard can scroll it.
 */
export function ScrollList({
  label,
  count,
  maxClass = "max-h-[58vh]",
  children,
}: {
  label: string;
  count: number;
  maxClass?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line-soft bg-surface-2">
      <div className="flex items-center gap-2 border-b border-line-soft px-2.5 py-1.5">
        <span className="font-mono text-[12px] text-ink-faint">{label}</span>
        <span className="font-mono text-[12px] text-ink-faint tabular-nums">
          {count} {count === 1 ? "entry" : "entries"}
        </span>
        <span className="ml-auto font-mono text-[12px] text-ink-faint">
          scrolls
        </span>
      </div>
      <div
        tabIndex={0}
        role="group"
        aria-label={`${label}, ${count} entries, scrollable`}
        className={cn(
          "overflow-y-auto p-2.5",
          maxClass,
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** A quiet line for a record that loaded and holds no entry for this lens. */
export function AbsentLine({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 rounded-lg border border-dashed border-line-soft bg-surface-2 px-3.5 py-3 font-serif text-[15.5px] leading-[1.5] text-ink-dim">
      {children}
    </p>
  );
}

/** A one-line loading state, sized so a short load does not shift the page. */
export function LoadingLine({ children }: { children: ReactNode }) {
  return (
    <p
      className="m-0 animate-pulse font-mono text-[13px] text-ink-dim"
      aria-live="polite"
    >
      {children}
    </p>
  );
}

/**
 * The raw state, as the index carries it. The badge never shows an intended state,
 * so a reader can always tell the record from the plan.
 */
const RAW_TONE: Record<string, "plain" | "muted" | "accent" | "good" | "warn" | "dashed"> = {
  planned: "warn",
  unstarted: "warn",
  "no-pull-request": "plain",
  open: "accent",
  merged: "good",
  completed: "good",
  closed: "dashed",
  superseded: "dashed",
  unknown: "dashed",
  red: "warn",
  green: "accent",
  validated: "accent",
  failed: "dashed",
  skipped: "dashed",
  approved: "good",
  review: "accent",
  decided: "warn",
  backlog: "warn",
  implemented: "good",
};

export function rawTone(state: string) {
  return RAW_TONE[state] ?? "plain";
}

export function StateBadge({
  state,
  title,
}: {
  state: string;
  title?: string;
}) {
  return (
    <Chip tone={rawTone(state)} title={title}>
      {state}
    </Chip>
  );
}
