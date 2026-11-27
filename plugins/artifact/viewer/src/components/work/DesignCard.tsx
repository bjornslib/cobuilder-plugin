import AnimatedProgressBar from "@/components/smoothui/animated-progress-bar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { DesignRow } from "@/data/types";

import { nextReadyText } from "./PrChip";
import { StageBadge } from "./StageBadge";
import { TrackerChips } from "./TrackerChips";

const CHIP_MUTED =
  "rounded border border-dashed border-line px-1.5 py-px font-mono text-[10px] text-ink-faint tabular-nums";
const CHIP_PLAIN =
  "rounded border border-line bg-surface-2 px-1.5 py-px font-mono text-[10px] text-ink-dim tabular-nums";

function Chip({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <span className={muted ? CHIP_MUTED : CHIP_PLAIN}>{children}</span>;
}

function percentOf(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function CardName({ name }: { name: string }) {
  return (
    <CardTitle className="font-mono text-[12.5px] font-bold tracking-[-0.01em]">
      {name}
    </CardTitle>
  );
}

function CardOutcome({ outcome }: { outcome: string }) {
  return (
    <CardDescription className="line-clamp-4 font-serif text-[13.5px] leading-[1.45] text-card-foreground/75">
      {outcome}
    </CardDescription>
  );
}

function CardHead({ design }: { design: DesignRow["design"] }) {
  return (
    <CardHeader>
      <CardName name={design.name} />
      <CardAction>
        <StageBadge stage={design.stage} />
      </CardAction>
      <CardOutcome outcome={design.outcome} />
    </CardHeader>
  );
}

function EpicsClosed({ done, total }: { done: number; total: number }) {
  return (
    <span>
      <span className="font-bold text-foreground tabular-nums">{done}</span>
      <span className="text-ink-faint"> of {total} epics closed</span>
    </span>
  );
}

interface CountsProps {
  row: DesignRow;
  total: number;
  percent: number;
}

function ProgressCounts({ row, total, percent }: CountsProps) {
  const { done, slicesDone, slicesTotal } = row;
  return (
    <div className="flex items-baseline justify-between font-mono text-[10px] text-ink-dim">
      <EpicsClosed done={done} total={total} />
      <span className="text-ink-faint tabular-nums">
        {slicesDone}/{slicesTotal} slices · {percent}%
      </span>
    </div>
  );
}

function NextReady({ next }: { next: string | null }) {
  if (next === null) return null;
  return (
    <p className="m-0 truncate font-mono text-[10px] text-ink-dim" title={next}>
      {next}
    </p>
  );
}

function CardProgress({ row }: { row: DesignRow }) {
  const total = row.epics.length;
  const percent = percentOf(row.done, total);
  return (
    <CardContent className="flex flex-col gap-2">
      <ProgressCounts row={row} total={total} percent={percent} />
      <AnimatedProgressBar className="[&>div]:h-1.5" color="var(--good)" value={percent} />
      <NextReady next={nextReadyText(row)} />
    </CardContent>
  );
}

function EpicChip({ count }: { count: number }) {
  return (
    <Chip>
      {count} {count === 1 ? "epic" : "epics"}
    </Chip>
  );
}

function BranchTag({ branch }: { branch: string | null }) {
  if (!branch) return null;
  return (
    <span
      className="ml-auto max-w-[16ch] truncate font-mono text-[10px] text-ink-faint"
      title={branch}
    >
      {branch}
    </span>
  );
}

function CardTags({ row }: { row: DesignRow }) {
  const branch = row.epics.find((epic) => epic.branch)?.branch ?? null;
  return (
    <CardFooter className="flex-wrap gap-1.5 border-t-0 bg-transparent pt-0 pb-3">
      <EpicChip count={row.epics.length} />
      <TrackerChips row={row} />
      <BranchTag branch={branch} />
    </CardFooter>
  );
}

/**
 * The epic count and the progress figure use `joins.epic_status`, never
 * `epic.state`, because the join holds the refined value.
 */
export function DesignCard({ row }: { row: DesignRow }) {
  return (
    <Card className="h-full gap-3 shadow-card transition-shadow duration-150 ease-house hover:shadow-raise">
      <CardHead design={row.design} />
      <CardProgress row={row} />
      <Separator className="bg-line-soft" />
      <CardTags row={row} />
    </Card>
  );
}
