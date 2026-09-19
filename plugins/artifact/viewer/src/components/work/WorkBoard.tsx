import { motion, useReducedMotion } from "motion/react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DesignRow } from "@/data/types";

import { DesignCard } from "./DesignCard";

/**
 * The lane rule is the one the approved Work board prototype fixes
 * (`docs/architecture/designs/cobuilder-viewer/prototypes/work-prototype.html`).
 * A superseded design belongs to no lane, and it stays reachable under All.
 */
interface Lane {
  key: string;
  label: string;
  stages: string[];
  blurb: string;
}

const LANES: Lane[] = [
  {
    key: "decision",
    label: "Needs a decision",
    stages: ["backlog", "decided"],
    blurb:
      "The design is not settled. Either design mode stopped after stage 1, or a decision is recorded and no approved design has followed.",
  },
  {
    key: "build",
    label: "Ready to build",
    stages: ["approved"],
    blurb: "The design is approved. No epic has left the plan, so the work can start.",
  },
  {
    key: "review",
    label: "In review",
    stages: ["review"],
    blurb: "The design reached design mode's review stage and waits on a reviewer.",
  },
  {
    key: "shipped",
    label: "Shipped",
    stages: ["implemented"],
    blurb:
      "Design mode recorded the design as implemented. A shipped design may still carry an epic that a merged pull request holds open in the index.",
  },
];

function laneRows(rows: DesignRow[], lane: Lane): DesignRow[] {
  return rows.filter((row) => lane.stages.includes(row.design.stage));
}

/**
 * One restrained entrance, and nothing else moves.
 *
 * A document tool earns a fade that says "the board arrived", not an animation a
 * reader has to wait through. 180 ms, four pixels, and a stagger capped at 120 ms
 * so a fifteen-tile board never trails. `useReducedMotion` turns it off whole.
 */
const ENTER_EASE = [0.22, 0.75, 0.3, 1] as const;

function Board({ rows }: { rows: DesignRow[] }) {
  const reduce = useReducedMotion();

  if (rows.length === 0) {
    return (
      <p className="font-serif text-[14px] text-ink-dim">
        No design in this bundle is in that lane.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row, index) => (
        <motion.div
          key={row.design.id}
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.18,
            delay: reduce ? 0 : Math.min(index * 0.012, 0.12),
            ease: ENTER_EASE,
          }}
        >
          <DesignCard row={row} />
        </motion.div>
      ))}
    </div>
  );
}

function LaneHead({
  title,
  count,
  blurb,
}: {
  title: string;
  count: number;
  blurb: string;
}) {
  return (
    <div className="mb-3 flex flex-col gap-1">
      <div className="flex items-baseline gap-2">
        <h2 className="font-mono text-[12.5px] font-bold tracking-[0.02em]">
          {title}
        </h2>
        <span className="font-mono text-[11px] text-ink-faint tabular-nums">
          {count}
        </span>
      </div>
      <p className="max-w-[74ch] font-serif text-[13px] text-ink-dim">{blurb}</p>
    </div>
  );
}

/**
 * The Work board: every design in the bundle, one tile each, behind a lane filter.
 *
 * The three bento variations belong here. `Board` is the arrangement to replace,
 * and it is deliberately the only thing that decides where a tile sits.
 */
export function WorkBoard({ rows }: { rows: DesignRow[] }) {
  return (
    <Tabs defaultValue="all" className="flex h-full min-h-0 flex-col gap-0">
      <div className="border-b border-line bg-surface-2 px-5 py-2">
        <TabsList className="bg-transparent p-0">
          <TabsTrigger value="all" className="font-mono text-[10.5px]">
            All
            <span className="ml-1.5 text-ink-faint tabular-nums">{rows.length}</span>
          </TabsTrigger>
          {LANES.map((lane) => {
            const count = laneRows(rows, lane).length;
            return (
              <TabsTrigger
                key={lane.key}
                value={lane.key}
                className="font-mono text-[10.5px]"
              >
                {lane.label}
                <span className="ml-1.5 text-ink-faint tabular-nums">{count}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-5 py-4 pb-10">
          <TabsContent value="all" className="mt-0">
            <Board rows={rows} />
          </TabsContent>
          {LANES.map((lane) => {
            const scoped = laneRows(rows, lane);
            return (
              <TabsContent key={lane.key} value={lane.key} className="mt-0">
                <LaneHead
                  title={lane.label}
                  count={scoped.length}
                  blurb={lane.blurb}
                />
                <Board rows={scoped} />
              </TabsContent>
            );
          })}
        </div>
      </ScrollArea>
    </Tabs>
  );
}
