import { BUILD_ROW_KEYS } from "./accounts";
import { changeRowsOf, programRowOf } from "./railRows";
import type { RailGroup, RailReading, RailRow, RailSource } from "./railTypes";

function reached(rows: RailRow[]): RailRow[] {
  return rows.filter((row) => row.available);
}

/**
 * Every row a press can reach, in the order the rail renders them.
 *
 * One flat list serves the walk. The arrow-key traversal steps this list, so a folded
 * group is a display choice and never a gap: the walk reaches every reachable row of
 * both groups whether a group is open or closed, and a group boundary is one step.
 */
export function rowsOf(groups: RailGroup[]): RailRow[] {
  return groups.flatMap((group) => group.entries);
}

function reviewLabelOf(changePr: number | null): string {
  return changePr === null ? "Pull request" : `Pull request ${changePr}`;
}

function groupsOf(reading: RailReading): RailGroup[] {
  const programRows = BUILD_ROW_KEYS.map((section) => programRowOf(reading, section));
  const levelRows = programRows.filter((row) => row.shared !== null);
  const alsoRows = programRows.filter((row) => row.shared === null);
  const changeRows = changeRowsOf(reading);
  const reviewLabel = reviewLabelOf(reading.changePr);
  return [
    { key: "levels", label: "Levels", account: "program", rows: levelRows, entries: reached(levelRows) },
    { key: "also", label: "Also", account: "program", rows: alsoRows, entries: reached(alsoRows) },
    { key: "review", label: reviewLabel, account: "change", rows: changeRows, entries: reached(changeRows) },
  ];
}

/**
 * The rail's three groups, in the order a reader reads down them.
 *
 * Levels lists the work's three levels. Also lists the rows no level owns: Plan, Epics,
 * and Rubrics. Review lists the pull request's four rows: its three levels and File
 * Diffs. A Review row opens the pull request's account, so a reader reaches it from any
 * address. One function returns all three groups, so the rail and the arrow walk cannot
 * drift.
 *
 * The board is not a row of any group, and `Rail.tsx` draws no row for it.
 */
export function railGroups(source: RailSource): RailGroup[] {
  const { work, gates, levels } = source;
  /* No work item, no account. The board's own row belongs to the rail, not to this list. */
  if (work === null) return [];
  const { changePr = null, changeLevels = [], diffFiles = null, servedAudio = {} } = source;
  return groupsOf({ work, gates, levels, changePr, changeLevels, diffFiles, servedAudio });
}
