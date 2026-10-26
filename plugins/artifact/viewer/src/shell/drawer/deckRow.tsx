import { useEffect, useRef, type RefObject } from "react";

import { motion, useReducedMotion } from "motion/react";

import { nextReadyText } from "@/components/work/PrChip";
import { TrackerChips } from "@/components/work/TrackerChips";
import type { DesignRow } from "@/data/types";
import { cn } from "@/lib/utils";

import { highlight } from "../workDeck";

const STAGE_DOT: Record<string, string> = {
  implemented: "bg-good",
  review: "bg-primary",
  backlog: "bg-warn",
  decided: "bg-warn",
  superseded: "bg-ink-faint/50",
};

const ROW_BASE = cn(
  "flex min-w-0 cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left",
  "font-mono text-[14px] transition-colors duration-150 ease-house",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

const SELECTED_CLASS = "border-l-2 border-l-primary bg-accent-wash text-foreground";
const IDLE_CLASS =
  "border-l-2 border-l-transparent text-ink-mid hover:bg-surface-2 hover:text-foreground";
const METER_CLASS = "shrink-0 font-mono text-[11.5px] text-ink-faint tabular-nums";
const EPIC_METER_CLASS = "ml-auto shrink-0 pl-2.5 font-mono text-[11.5px] text-ink-faint tabular-nums";

function rowMotion(reduce: boolean | null, index: number) {
  return {
    initial: reduce ? false : { opacity: 0, x: 6 },
    animate: { opacity: 1, x: 0 },
    transition: {
      duration: 0.16,
      delay: reduce ? 0 : Math.min(index * 0.008, 0.1),
      ease: [0.22, 0.75, 0.3, 1] as const,
    },
  };
}

/* The keyboard walk must never lose its place: a row the walk lands on
   scrolls itself into view, minimally. jsdom carries no scroll target and
   the guard is for it, not for any browser. */
function useScrollIntoView(selected: boolean): RefObject<HTMLButtonElement | null> {
  const rowRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const row = rowRef.current;
    if (selected) row?.scrollIntoView?.({ block: "nearest" });
  }, [selected]);
  return rowRef;
}

function StageDot({ stage }: { stage: string }) {
  return <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", STAGE_DOT[stage])} />;
}

function NameText({ name, needle }: { name: string; needle: string }) {
  const parts = highlight(name, needle);
  if (parts === null) return name;
  return (
    <>
      {parts.before}
      <mark className="rounded-xs bg-amber/70 px-0.5 text-inherit">{parts.hit}</mark>
      {parts.after}
    </>
  );
}

function RowName({ row, needle }: { row: DesignRow; needle: string }) {
  const struck = row.design.stage === "superseded" && "text-ink-faint line-through decoration-1";
  return (
    <span className={cn("min-w-0 shrink truncate", struck)}>
      <NameText name={row.design.name} needle={needle} />
    </span>
  );
}

function EpicMeter({ done, total }: { done: number; total: number }) {
  if (total === 0) return null;
  return (
    <span className={EPIC_METER_CLASS} title={`${done} of ${total} epics closed`}>
      {done}/{total}
    </span>
  );
}

function SliceMeter({ done, total }: { done: number; total: number }) {
  if (total === 0) return null;
  return (
    <span className={METER_CLASS} title={`${done} of ${total} slices closed`}>
      {done}/{total} slices
    </span>
  );
}

function NextNote({ next }: { next: string | null }) {
  if (next === null) return null;
  return (
    <span className="min-w-0 max-w-[28ch] shrink truncate text-[11.5px] text-ink-dim" title={next}>
      {next}
    </span>
  );
}

function RowBody({ row, needle }: { row: DesignRow; needle: string }) {
  return (
    <>
      <StageDot stage={row.design.stage} />
      <RowName row={row} needle={needle} />
      <EpicMeter done={row.done} total={row.epics.length} />
      <SliceMeter done={row.slicesDone} total={row.slicesTotal} />
      <NextNote next={nextReadyText(row)} />
      <TrackerChips row={row} />
    </>
  );
}

interface DeckRowProps {
  row: DesignRow;
  needle: string;
  selected: boolean;
  onSelect: () => void;
  index: number;
}

/**
 * One deck row: the design's name with its search hit marked, the epic meter,
 * the slice count, and the pull request records that the tracker holds. One line, because the deck reads
 * deep.
 */
export function DeckRow({ row, needle, selected, onSelect, index }: DeckRowProps) {
  const reduce = useReducedMotion();
  const rowRef = useScrollIntoView(selected);
  const label = `${row.design.name}, stage ${row.design.stage}`;
  return (
    <motion.button ref={rowRef} type="button" onClick={onSelect} aria-pressed={selected} aria-label={label} {...rowMotion(reduce, index)} className={cn(ROW_BASE, selected ? SELECTED_CLASS : IDLE_CLASS)}>
      <RowBody row={row} needle={needle} />
    </motion.button>
  );
}
