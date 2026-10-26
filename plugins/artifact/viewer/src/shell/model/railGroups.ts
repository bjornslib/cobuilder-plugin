import { BUILD_ROW_KEYS } from "./accounts";
import { changeRowsOf, programRowOf } from "./railRows";
import type { RailGroup, RailReading, RailRow, RailSource } from "./railTypes";

/** The rows a press can reach: the ones whose record the rail could read. */
function reached(rows: RailRow[]): RailRow[] {
  return rows.filter((row) => row.available);
}

/**
 * Every row a press can reach, in the order the rail renders them.
 *
 * ONE FLAT LIST SERVES THE WALK. The arrow-key traversal steps this list, so a folded
 * group is a display choice and never a gap: the walk reaches every reachable row of both
 * groups whether a group is open or closed. The list carries the rows of both accounts, so
 * a group boundary is one step.
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
 * LEVELS LISTS THE WORK'S THREE LEVELS. ALSO LISTS THE ROWS OF THE WORK NO LEVEL OWNS:
 * Plan, Epics, and Rubrics. REVIEW LISTS THE PULL REQUEST'S FOUR ROWS: its three levels
 * and File Diffs. A row of the Review group opens the pull request's account, so a reader
 * reaches it from any address. One function returns all three groups, so the rail and the
 * arrow walk cannot drift.
 *
 * With no change the Review group keeps one disabled File Diffs row that states why. The
 * board is not a row of any group, and `Rail.tsx` draws no row for it.
 */
export function railGroups(source: RailSource): RailGroup[] {
  const { work, gates, levels } = source;
  /* No work item, no account. The board's own row belongs to the rail, not to this list. */
  if (work === null) return [];
  const { changePr = null, changeLevels = [], diffFiles = null, servedAudio = {} } = source;
  return groupsOf({ work, gates, levels, changePr, changeLevels, diffFiles, servedAudio });
}
