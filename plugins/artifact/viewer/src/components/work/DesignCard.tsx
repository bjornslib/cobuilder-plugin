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

import { nextReadyText, PrChip } from "./PrChip";
import { StageBadge } from "./StageBadge";

function Chip({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={
        muted
          ? "rounded border border-dashed border-line px-1.5 py-px font-mono text-[10px] text-ink-faint tabular-nums"
          : "rounded border border-line bg-surface-2 px-1.5 py-px font-mono text-[10px] text-ink-dim tabular-nums"
      }
    >
      {children}
    </span>
  );
}

/**
 * One design, as a tile. This is the unit that a bento variation arranges.
 *
 * Every number on the tile comes from the record index. The epic count and the
 * progress figure use `joins.epic_status`, never `epic.state`, because the join is
 * the refined value.
 */
export function DesignCard({ row }: { row: DesignRow }) {
  const { design, epics, done, slicesDone, slicesTotal, trackerPullRequests } = row;
  const next = nextReadyText(row);
  const total = epics.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const branch = epics.find((epic) => epic.branch)?.branch ?? null;

  return (
    <Card className="h-full gap-3 shadow-card transition-shadow duration-150 ease-house hover:shadow-raise">
      <CardHeader>
        <CardTitle className="font-mono text-[12.5px] font-bold tracking-[-0.01em]">
          {design.name}
        </CardTitle>
        <CardAction>
          <StageBadge stage={design.stage} />
        </CardAction>
        <CardDescription className="line-clamp-4 font-serif text-[13.5px] leading-[1.45] text-card-foreground/75">
          {design.outcome}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between font-mono text-[10px] text-ink-dim">
          <span>
            <span className="font-bold text-foreground tabular-nums">{done}</span>
            <span className="text-ink-faint"> of {total} epics closed</span>
          </span>
          <span className="text-ink-faint tabular-nums">
            {slicesDone}/{slicesTotal} slices · {percent}%
          </span>
        </div>
        <AnimatedProgressBar
          className="[&>div]:h-1.5"
          color="var(--good)"
          value={percent}
        />
        {next !== null ? (
          <p className="m-0 truncate font-mono text-[10px] text-ink-dim" title={next}>
            {next}
          </p>
        ) : null}
      </CardContent>

      <Separator className="bg-line-soft" />

      <CardFooter className="flex-wrap gap-1.5 border-t-0 bg-transparent pt-0 pb-3">
        <Chip>
          {epics.length} {epics.length === 1 ? "epic" : "epics"}
        </Chip>
        {row.trackerRead
          ? trackerPullRequests.map((pr) => <PrChip key={pr.ref} pr={pr} />)
          : null}
        {branch ? (
          <span
            className="ml-auto max-w-[16ch] truncate font-mono text-[10px] text-ink-faint"
            title={branch}
          >
            {branch}
          </span>
        ) : null}
      </CardFooter>
    </Card>
  );
}
