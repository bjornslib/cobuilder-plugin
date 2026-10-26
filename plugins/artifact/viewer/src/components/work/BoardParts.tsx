import { motion, useReducedMotion } from "motion/react";

import TiltCard from "@/components/smoothui/tilt-card";
import type { DesignRow } from "@/data/types";

import { DesignCard } from "./DesignCard";

/**
 * One restrained entrance: a 180 ms fade, a 4 px rise, and a stagger capped at
 * 120 ms so a fifteen-tile board never trails. `useReducedMotion` turns it off.
 */
const ENTER_EASE = [0.22, 0.75, 0.3, 1] as const;

function tileMotion(reduce: boolean | null, index: number) {
  return {
    initial: reduce ? false : { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.18,
      delay: reduce ? 0 : Math.min(index * 0.012, 0.12),
      ease: ENTER_EASE,
    },
  };
}

function BoardEmpty() {
  return (
    <p className="font-serif text-[14px] text-ink-dim">
      No design in this bundle is in that lane.
    </p>
  );
}

/*
 * The card is an object, not a page: the reader picks it up with the pointer, so it
 * tilts. `glare={false}` is the variant without glare, because the component draws
 * its radial glare overlay only when `glare` is true.
 *
 * `h-full` on the tilt wrapper keeps the row's cards equal in height. The wrapper
 * sits between the grid item and the card, and a card with `h-full` against an
 * auto-height wrapper would fall back to its own height.
 */
interface TileProps {
  row: DesignRow;
  index: number;
  reduce: boolean | null;
}

function BoardTile({ row, index, reduce }: TileProps) {
  return (
    <motion.div {...tileMotion(reduce, index)}>
      <TiltCard className="h-full" glare={false}>
        <DesignCard row={row} />
      </TiltCard>
    </motion.div>
  );
}

export function Board({ rows }: { rows: DesignRow[] }) {
  const reduce = useReducedMotion();

  if (rows.length === 0) return <BoardEmpty />;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row, index) => (
        <BoardTile key={row.design.id} row={row} index={index} reduce={reduce} />
      ))}
    </div>
  );
}

function LaneTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <h2 className="font-mono text-[12.5px] font-bold tracking-[0.02em]">
        {title}
      </h2>
      <span className="font-mono text-[11px] text-ink-faint tabular-nums">
        {count}
      </span>
    </div>
  );
}

interface LaneHeadProps {
  title: string;
  count: number;
  blurb: string;
}

export function LaneHead({ title, count, blurb }: LaneHeadProps) {
  return (
    <div className="mb-3 flex flex-col gap-1">
      <LaneTitle title={title} count={count} />
      <p className="max-w-[74ch] font-serif text-[13px] text-ink-dim">{blurb}</p>
    </div>
  );
}
