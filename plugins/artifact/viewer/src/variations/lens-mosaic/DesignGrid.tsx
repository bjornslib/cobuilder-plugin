/**
 * The design picker: one real card per design, inside the lane tab that owns it.
 *
 * The cards are the first thing a reader sees, so they carry the whole hierarchy the
 * feedback asked for: a name at 17px, a stage badge, the design's own title, the
 * outcome as prose, a progress bar, and a chip row of real counts. Every number comes
 * from the record index or from the design's own goal record.
 *
 * A superseded design reads differently on purpose. Its card is dashed, washed out,
 * and carries a second, separate control that opens the design which replaced it.
 * The two controls are siblings rather than nested, because a button inside a button
 * is not valid markup and does not behave under the keyboard.
 */

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, CornerDownRight, Hammer, Layers, ScrollText } from "lucide-react";

import AnimatedProgressBar from "@/components/smoothui/animated-progress-bar";
import { Card } from "@/components/ui/card";
import type { DesignRow } from "@/data/types";
import { cn } from "@/lib/utils";

import { Chip, CLICKABLE_ROW, LoadingLine, StateBadge } from "./primitives";
import { laneLabelFor, type Lane } from "./lanes";
import type { RecordsLoad } from "./records";

const ENTER_EASE = [0.22, 0.75, 0.3, 1] as const;

export function LaneSection({
  lane,
  rows,
  recordsLoad,
  onOpen,
}: {
  lane: Lane | null;
  rows: DesignRow[];
  recordsLoad: RecordsLoad;
  onOpen: (designId: string) => void;
}) {
  const reduce = useReducedMotion();
  const live = lane === null ? rows.filter((row) => row.design.stage !== "superseded") : rows;
  const closed =
    lane === null ? rows.filter((row) => row.design.stage === "superseded") : [];

  const title = lane?.label ?? "All designs";
  const blurb =
    lane?.blurb ??
    "Every design in this bundle, in one place. A superseded design sits in its own group at the foot, because it belongs to no lane. Each one states which design replaced it.";
  const empty = lane?.empty ?? "No design is recorded in this bundle.";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <h2 className="m-0 font-mono text-[20px] leading-tight font-bold tracking-[-0.02em]">
            {title}
          </h2>
          <span className="font-mono text-[13px] text-ink-faint tabular-nums">
            {rows.length} {rows.length === 1 ? "design" : "designs"}
          </span>
          <span className="font-mono text-[12px] text-ink-faint">
            lane rule: stage in {lane ? lane.stages.join(", ") : "any stage"}
          </span>
        </div>
        <p className="m-0 max-w-[84ch] font-serif text-[16px] leading-[1.55] text-ink-mid">
          {blurb}
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="m-0 rounded-lg border border-dashed border-line bg-surface-2 px-4 py-3 font-serif text-[16px] text-ink-dim">
          {empty}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2 2xl:grid-cols-3">
          {live.map((row, index) => (
            <Enter key={row.design.id} index={index} reduce={Boolean(reduce)}>
              <DesignCard
                row={row}
                recordsLoad={recordsLoad}
                onOpen={onOpen}
                onOpenDesign={onOpen}
              />
            </Enter>
          ))}
        </div>
      )}

      {closed.length > 0 ? (
        <section className="flex flex-col gap-3">
          <header className="flex flex-col gap-1.5 border-t border-line-soft pt-5">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h2 className="m-0 font-mono text-[18px] leading-tight font-bold tracking-[-0.02em] text-ink-dim">
                Superseded
              </h2>
              <span className="font-mono text-[13px] text-ink-faint tabular-nums">
                {closed.length}
              </span>
              <span className="font-mono text-[12px] text-ink-faint">
                lane rule: stage "superseded", which no lane claims
              </span>
            </div>
            <p className="m-0 max-w-[84ch] font-serif text-[16px] leading-[1.55] text-ink-mid">
              These designs are closed. Each card names the design that replaced it, and
              that name is a control. Nothing here is hidden: a closed record is still a
              record, and the reason it closed is the useful part.
            </p>
          </header>
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2 2xl:grid-cols-3">
            {closed.map((row, index) => (
              <Enter key={row.design.id} index={index} reduce={Boolean(reduce)}>
                <DesignCard
                  row={row}
                  recordsLoad={recordsLoad}
                  onOpen={onOpen}
                  onOpenDesign={onOpen}
                />
              </Enter>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** The entrance: 180 ms, four pixels, staggered, and off under reduced motion. */
function Enter({
  index,
  reduce,
  children,
}: {
  index: number;
  reduce: boolean;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduce ? 0 : 0.18,
        delay: reduce ? 0 : Math.min(index * 0.02, 0.14),
        ease: ENTER_EASE,
      }}
      whileHover={reduce ? undefined : { y: -3 }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

function DesignCard({
  row,
  recordsLoad,
  onOpen,
  onOpenDesign,
}: {
  row: DesignRow;
  recordsLoad: RecordsLoad;
  onOpen: (designId: string) => void;
  onOpenDesign: (designId: string) => void;
}) {
  const { design, epics, slices, done, pullRequests } = row;
  const superseded = design.stage === "superseded";
  const record =
    recordsLoad.state === "ready" ? (recordsLoad.records[design.id] ?? null) : null;
  const goal = record?.goal;
  const supersededBy = goal?.superseded_by ?? null;
  const supersedes = goal?.supersedes ?? [];
  const decisions = goal?.adrs?.length ?? 0;
  const title = goal?.title ?? null;
  const total = epics.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <Card
      className={cn(
        "h-full gap-0 py-0 ring-1 shadow-card transition-shadow duration-150 ease-house hover:shadow-raise",
        superseded ? "border-dashed bg-surface-2 ring-line-soft" : "ring-line",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(design.id)}
        aria-label={`Open ${design.id}`}
        className={cn(
          "flex flex-1 flex-col gap-3 px-4 py-3.5 text-left",
          CLICKABLE_ROW,
        )}
      >
        <span className="flex w-full items-start gap-3">
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span
                className={cn(
                  "font-mono text-[17px] leading-[1.25] font-bold tracking-[-0.01em] underline decoration-line decoration-1 underline-offset-[3px]",
                  superseded && "text-ink-dim",
                )}
              >
                {design.name}
              </span>
              <StateBadge
                state={design.stage}
                title={`stage: ${design.stage}. Lane: ${laneLabelFor(design.stage)}.`}
              />
            </span>
            {title ? (
              <span className="mt-1.5 block max-w-[70ch] font-serif text-[16px] leading-[1.45] font-semibold text-ink-mid">
                {title}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 flex shrink-0 items-center gap-1 font-mono text-[12px] font-bold text-primary">
            open
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </span>
        </span>

        <span className="block max-w-[74ch] font-serif text-[15.5px] leading-[1.5] text-foreground/80">
          {design.outcome}
        </span>

        <span className="mt-auto flex w-full flex-col gap-2">
          <span className="flex items-baseline justify-between font-mono text-[12px] text-ink-dim">
            <span>
              <span className="font-bold text-foreground tabular-nums">{done}</span>
              <span className="text-ink-faint"> / {total} epics done</span>
            </span>
            <span className="text-ink-faint tabular-nums">{percent}%</span>
          </span>
          <AnimatedProgressBar
            className="[&>div]:h-2"
            color={superseded ? "var(--ink-faint)" : "var(--good)"}
            value={percent}
          />
          <span className="flex flex-wrap items-center gap-1.5">
            <Chip>
              <Layers className="size-3.5" aria-hidden="true" />
              {epics.length} {epics.length === 1 ? "epic" : "epics"}
            </Chip>
            {slices.length > 0 ? (
              <Chip>
                <Hammer className="size-3.5" aria-hidden="true" />
                {slices.length} {slices.length === 1 ? "slice" : "slices"}
              </Chip>
            ) : null}
            {pullRequests.length > 0 ? (
              <Chip tone="accent">
                {pullRequests.length === 1 ? "PR" : "PRs"} {pullRequests.join(", ")}
              </Chip>
            ) : (
              <Chip tone="muted">no pull request</Chip>
            )}
            {decisions > 0 ? (
              <Chip>
                <ScrollText className="size-3.5" aria-hidden="true" />
                {decisions} {decisions === 1 ? "decision" : "decisions"}
              </Chip>
            ) : null}
          </span>
        </span>

        {recordsLoad.state === "loading" ? (
          <LoadingLine>Reading the authored records.</LoadingLine>
        ) : null}
        {recordsLoad.state === "failed" ? (
          <span className="block font-mono text-[12px] text-warn">
            the authored records did not load, so this card shows the index's own fields
          </span>
        ) : null}
      </button>

      {supersededBy ? (
        <div className="border-t border-dashed border-line px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[12.5px] text-ink-dim">
              superseded by
            </span>
            <button
              type="button"
              onClick={() => onOpenDesign(supersededBy)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-card px-2 py-1 font-mono text-[12.5px] font-bold text-accent-deep transition-colors duration-150 ease-house hover:bg-accent-wash hover:text-accent-deep",
                CLICKABLE_ROW,
              )}
            >
              <CornerDownRight className="size-3.5" aria-hidden="true" />
              <span className="underline decoration-line underline-offset-2">
                {supersededBy}
              </span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </button>
          </div>
          {supersedes.length > 0 ? (
            <p className="m-0 mt-1.5 font-mono text-[12px] text-ink-faint">
              this design itself superseded {supersedes.join(", ")}
            </p>
          ) : null}
        </div>
      ) : superseded ? (
        <div className="border-t border-dashed border-line px-4 py-2.5">
          <p className="m-0 font-mono text-[12px] text-ink-dim">
            stage superseded, and no record names the design that replaced it
          </p>
        </div>
      ) : null}
    </Card>
  );
}
