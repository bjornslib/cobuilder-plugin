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
  const { design, epics, slices, done, pullRequests } = row;
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
            <span className="text-ink-faint"> / {total} epics</span>
          </span>
          <span className="text-ink-faint tabular-nums">{percent}%</span>
        </div>
        <AnimatedProgressBar
          className="[&>div]:h-1.5"
          color="var(--good)"
          value={percent}
        />
      </CardContent>

      <Separator className="bg-line-soft" />

      <CardFooter className="flex-wrap gap-1.5 border-t-0 bg-transparent pt-0 pb-3">
        <Chip>
          {epics.length} {epics.length === 1 ? "epic" : "epics"}
        </Chip>
        {slices.length > 0 ? (
          <Chip>
            {slices.length} {slices.length === 1 ? "slice" : "slices"}
          </Chip>
        ) : null}
        {pullRequests.length > 0 ? (
          <Chip>
            {pullRequests.length === 1
              ? `PR ${pullRequests[0]}`
              : `${pullRequests.length} PRs`}
          </Chip>
        ) : (
          <Chip muted>no PR</Chip>
        )}
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
