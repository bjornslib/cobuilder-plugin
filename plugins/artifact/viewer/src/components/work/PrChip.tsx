import { GitMerge } from "lucide-react";

import type { TrackerPullRequest } from "@/data/types";

/** The text of one pull request record: `#43 open`, or the ref when the record has no number. */
export function prChipText(pr: TrackerPullRequest): string {
  return `${pr.number === null ? pr.ref : `#${pr.number}`} ${pr.state}`;
}

/** One chip for one pull request record. The merge icon shows for a merged record only. */
export function PrChip({ pr }: { pr: TrackerPullRequest }) {
  return (
    <span
      data-pr-state={pr.state}
      className="inline-flex shrink-0 items-center gap-1 rounded border border-line bg-surface-2 px-1.5 py-px font-mono text-[10px] text-ink-dim tabular-nums"
    >
      {pr.state === "merged" ? <GitMerge className="size-3 text-good" aria-hidden="true" /> : null}
      {prChipText(pr)}
    </span>
  );
}

/** The next ready slice on one line, or null when the tracker names none. */
export function nextReadyText(row: {
  nextReady: { id: string; title: string } | null;
  trackerRead: boolean;
}): string | null {
  if (!row.trackerRead || row.nextReady === null) return null;
  const tail = row.nextReady.id.split("/").pop() ?? row.nextReady.id;
  return `next: ${tail} ${row.nextReady.title}`;
}
