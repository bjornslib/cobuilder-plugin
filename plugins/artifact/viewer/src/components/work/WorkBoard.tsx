import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DesignRow } from "@/data/types";

import { Board, LaneHead } from "./BoardParts";
import { LANES, laneRows, type Lane } from "./workLanes";

interface TriggerProps {
  value: string;
  label: string;
  count: number;
}

function LaneTrigger({ value, label, count }: TriggerProps) {
  return (
    <TabsTrigger value={value} className="font-mono text-[10.5px]">
      {label}
      <span className="ml-1.5 text-ink-faint tabular-nums">{count}</span>
    </TabsTrigger>
  );
}

function LaneTab({ rows, lane }: { rows: DesignRow[]; lane: Lane }) {
  const count = laneRows(rows, lane).length;
  return <LaneTrigger value={lane.key} label={lane.label} count={count} />;
}

function LaneTabs({ rows }: { rows: DesignRow[] }) {
  return (
    <div className="border-b border-line bg-surface-2 px-5 py-2">
      <TabsList className="bg-transparent p-0">
        <LaneTrigger value="all" label="All" count={rows.length} />
        {LANES.map((lane) => (
          <LaneTab key={lane.key} rows={rows} lane={lane} />
        ))}
      </TabsList>
    </div>
  );
}

function LaneContent({ rows, lane }: { rows: DesignRow[]; lane: Lane }) {
  const scoped = laneRows(rows, lane);
  return (
    <TabsContent value={lane.key} className="mt-0">
      <LaneHead title={lane.label} count={scoped.length} blurb={lane.blurb} />
      <Board rows={scoped} />
    </TabsContent>
  );
}

function BoardTabs({ rows }: { rows: DesignRow[] }) {
  return (
    <>
      <TabsContent value="all" className="mt-0">
        <Board rows={rows} />
      </TabsContent>
      {LANES.map((lane) => (
        <LaneContent key={lane.key} rows={rows} lane={lane} />
      ))}
    </>
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
      <LaneTabs rows={rows} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-5 py-4 pb-10">
          <BoardTabs rows={rows} />
        </div>
      </ScrollArea>
    </Tabs>
  );
}
