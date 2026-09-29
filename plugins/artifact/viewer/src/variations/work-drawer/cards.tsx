/**
 * Prototype A's cards and lane columns.
 *
 * A CARD IS QUIET BECAUSE THE DRAWER IS LOUD. The drawer overlays a reader's
 * page at sixty percent of the viewport, so everything in it competes with the
 * page the reader was on. The card spends its height on the two facts a reader
 * picks work by — the name and the stage — and keeps the outcome to one clamped
 * line. The full record opens on the shell, which the card links to.
 *
 * The lane rule lives in `./board`. This file decides appearance alone.
 */

import { motion, useReducedMotion } from "motion/react";
import { GitMerge } from "lucide-react";

import AnimatedProgressBar from "@/components/smoothui/animated-progress-bar";
import { Badge } from "@/components/ui/badge";
import { StageBadge } from "@/components/work/StageBadge";
import type { DesignRow } from "@/data/types";
import { cn } from "@/lib/utils";

import {
  highlight,
  laneSources,
  shippedPulls,
  type Lane,
  type WorkSource,
} from "./board";

/*
 * One restrained entrance, and nothing else moves. The 180 ms fade and
 * four-pixel rise the lane board uses, with the stagger capped so a board of
 * many cards never trails. `useReducedMotion` turns it off whole.
 */
const ENTER_EASE = [0.22, 0.75, 0.3, 1] as const;

const CARD_FRAME = cn(
  "flex min-w-0 cursor-pointer flex-col gap-2 rounded-xl border border-line bg-card p-3 text-left shadow-card",
  "transition-colors duration-150 ease-house hover:border-primary hover:bg-surface-2",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

function Hit({ text, needle }: { text: string; needle: string }) {
  const parts = highlight(text, needle);
  if (parts === null) return <>{text}</>;
  return (
    <>
      {parts.before}
      <mark className="rounded-xs bg-amber/60 px-0.5 text-inherit">{parts.hit}</mark>
      {parts.after}
    </>
  );
}

/** How far one design's epics have come, from the refined `done` figure. */
function EpicMeter({ row }: { row: DesignRow }) {
  const { epics, done } = row;
  if (epics.length === 0) {
    return <p className="m-0 font-mono text-[11px] text-ink-faint">no epic planned</p>;
  }
  const pct = Math.round((done / epics.length) * 100);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex min-w-0 items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] text-ink-dim">
          {done} of {epics.length} {epics.length === 1 ? "epic" : "epics"} done
        </span>
        <span className="font-mono text-[10.5px] text-ink-faint tabular-nums">{pct}%</span>
      </div>
      <AnimatedProgressBar value={pct} color="var(--teal)" className="h-1 w-full" />
    </div>
  );
}

function DesignCard({
  row,
  needle,
  index,
}: {
  row: DesignRow;
  needle: string;
  index: number;
}) {
  const reduce = useReducedMotion();
  const { design } = row;
  const closed = design.stage === "superseded";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.18,
        delay: reduce ? 0 : Math.min(index * 0.012, 0.12),
        ease: ENTER_EASE,
      }}
      className="min-w-0"
    >
      <a href={`#/${design.id}/build`} aria-label={`Open ${design.name} on the shell`} className={cn(CARD_FRAME, closed && "border-dashed bg-surface-2/60 opacity-70")}>
        <div className="flex min-w-0 items-start justify-between gap-2">
          <h3 className="m-0 min-w-0 flex-1 font-mono text-[13.5px] leading-tight font-bold break-words">
            <Hit text={design.name} needle={needle} />
          </h3>
          <StageBadge stage={design.stage} className="shrink-0" />
        </div>

        <p className="m-0 line-clamp-2 min-w-0 font-serif text-[13px] leading-[1.45] text-ink-mid">
          {design.outcome}
        </p>

        {row.pullRequests.length > 0 ? (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <GitMerge className="size-3 shrink-0 text-good" aria-hidden="true" />
            <span className="font-mono text-[10.5px] text-ink-dim">
              {row.pullRequests.map((id) => `#${id}`).join(", ")} merged
            </span>
          </div>
        ) : null}

        <div className="mt-auto min-w-0 border-t border-line-soft pt-2">
          <EpicMeter row={row} />
        </div>
      </a>
    </motion.div>
  );
}

function PullCard({
  pull,
  needle,
  index,
}: {
  pull: { id: number; title: string; state: string };
  needle: string;
  index: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.18,
        delay: reduce ? 0 : Math.min(index * 0.012, 0.12),
        ease: ENTER_EASE,
      }}
      className="min-w-0"
    >
      <a
        href={`#/${pull.id}/pull-requests`}
        aria-label={`Open pull request ${pull.id} on the shell`}
        className={cn(CARD_FRAME, "bg-surface-2/70")}
      >
        <div className="flex min-w-0 items-start justify-between gap-2">
          <h3 className="m-0 min-w-0 flex-1 font-mono text-[13px] leading-tight font-bold">
            <Hit text={pull.title} needle={needle} />
          </h3>
          <Badge
            variant="outline"
            className="shrink-0 border-good bg-good-wash font-mono text-[9.5px] tracking-[0.06em] text-good uppercase"
          >
            pr
          </Badge>
        </div>
        <p className="m-0 font-mono text-[10.5px] text-ink-faint">
          pull request #{pull.id} &middot; no design carries it
        </p>
      </a>
    </motion.div>
  );
}

function CardOf({
  source,
  needle,
  index,
}: {
  source: WorkSource;
  needle: string;
  index: number;
}) {
  return source.kind === "design" ? (
    <DesignCard row={source.row} needle={needle} index={index} />
  ) : (
    <PullCard pull={source.row} needle={needle} index={index} />
  );
}

/**
 * One lane column. The header carries the count the column holds and the rule
 * that put them there; the body scrolls on its own, per section 11.3's rule
 * that a wide block scrolls itself.
 */
function LaneColumn({
  lane,
  sources,
  needle,
}: {
  lane: Lane;
  sources: WorkSource[];
  needle: string;
}) {
  const body =
    lane.key === "shipped"
      ? [
          ...laneSources(lane, sources, needle),
          ...shippedPulls(sources, needle),
        ]
      : laneSources(lane, sources, needle);

  return (
    <section
      aria-label={lane.label}
      className="flex h-full min-w-0 w-[276px] shrink-0 flex-col rounded-xl border border-line bg-surface-2/50"
    >
      <header className="flex flex-col gap-1 border-b border-line px-3 py-2.5">
        <div className="flex min-w-0 items-baseline justify-between gap-2">
          <h3 className="m-0 font-mono text-[12px] font-bold tracking-[0.04em] uppercase">
            {lane.label}
          </h3>
          <span className="font-mono text-[11px] text-ink-faint tabular-nums">
            {body.length}
          </span>
        </div>
        <p className="m-0 line-clamp-2 font-serif text-[12px] leading-[1.4] text-ink-faint" title={lane.blurb}>
          {lane.blurb}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {body.length === 0 ? (
          <p className="m-0 px-1.5 py-2 font-serif text-[13px] text-ink-dim italic">
            {needle.trim().length > 0 ? "nothing here matches the search" : lane.empty}
          </p>
        ) : (
          <div className="flex min-w-0 flex-col gap-2">
            {body.map((source, index) => (
              <CardOf key={source.kind + (source.kind === "design" ? source.row.design.id : source.row.id)} source={source} needle={needle} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * The kanban itself: the lanes in order, side by side, each scrolling its own
 * overflow. The row never wraps; the columns that do not fit need a sideways
 * scroll, and a column that cannot be reached is worse than one that needs it.
 */
export function Kanban({
  lanes,
  sources,
  needle,
}: {
  lanes: Lane[];
  sources: WorkSource[];
  needle: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 gap-2.5 overflow-x-auto px-4 pt-1 pb-3">
        {lanes.map((lane) => (
          <LaneColumn
            key={lane.key}
            lane={lane}
            sources={sources}
            needle={needle}
          />
        ))}
      </div>
    </div>
  );
}