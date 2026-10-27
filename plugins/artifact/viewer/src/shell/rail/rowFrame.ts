import { ClipboardCheck, FileText, ListTree, Network, ScrollText, Target, TriangleAlert, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * The icon is decoration, so it lives here rather than in `model.ts`: that file is
 * the data layer and it imports no React. The map is keyed on the row key, so it
 * carries no order of its own, and the two accounts share the three shapes their
 * shared sections use.
 */
export const ICONS: Record<string, LucideIcon> = {
  "program-intent": Target,
  "program-problem-and-solution": TriangleAlert,
  "program-architecture": Network,
  "program-epics": ListTree,
  "program-rubrics": ClipboardCheck,
  "program-plan": ScrollText,
  "change-intent": Target,
  "change-problem-and-solution": TriangleAlert,
  "change-architecture": Network,
  "change-file-diffs": FileText,
};

export function absentLine(missing: string[]): string {
  if (missing.length === 0) return "no record";
  return missing.join(", ");
}

/**
 * An available row adds the sidebar's menu treatment on top of this frame, and a
 * row whose record is absent keeps the frame alone.
 *
 * `min-h-9` is section 11.2's 36 px floor for an expanded item.
 * `group-data-[collapsible=icon]:size-11!` is the same table's 44 px floor for a
 * collapsed one, and it has to carry `!` because the sidebar ships its own
 * collapsed size as important.
 *
 * `outline-solid` is not decoration. The sidebar's own rows carry `outline-hidden`,
 * which sets `--tw-outline-style: none`, and `outline-2` reads that variable for
 * its style. Without this line the focus ring would be two pixels of no outline.
 */
export const ROW_FRAME = cn(
  "min-h-9 min-w-0 gap-2.5 rounded-md px-2.5 py-1.5",
  "cursor-pointer font-mono text-[13px] leading-[1.3]",
  "transition-colors duration-150 ease-house",
  "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring",
  "group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!",
);

export function whoOf(row: { account: string }): string {
  return row.account === "change" ? "pull request" : "work item";
}
