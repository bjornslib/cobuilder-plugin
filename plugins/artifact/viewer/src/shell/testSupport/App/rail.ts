import { buildWorkItems, gatesOf, levelsOf, type AccountId } from "../../model";
import { DESIGNS, INDEX } from "./fixtures";

/**
 * The rail's own input, built the way `App.tsx` builds it: the work item, its gates, its
 * level states, and the change the Review group addresses, each derived the way the
 * shell derives it. The row list below is only as good as that input, so it is the same
 * input the shell uses.
 *
 * THE CHANGE IS THE WORK'S OWN FIRST PULL REQUEST. This file's addresses name no change
 * of their own, so `App.tsx` falls back to the first pull request the work's epics carry,
 * and the Review group then draws its four rows rather than stating an absence. The
 * route names no change, so the rail has read no level there and the four rows state no
 * count, which is the state `App.tsx` passes on the same address.
 */
export function railSource(workId: string) {
  const work = buildWorkItems(INDEX, DESIGNS).get(workId) ?? null;
  return {
    work,
    gates: work === null ? null : gatesOf(work),
    levels: work === null ? null : levelsOf(work),
    changePr: work !== null && work.pullRequests.length > 0 ? work.pullRequests[0].id : null,
    changeLevels: [],
    diffFiles: null,
    servedAudio: {},
  };
}

/**
 * The least one rail row must carry: the word a reader reads, the account it reads, what
 * it holds, the address a press opens, and whether a press can reach it at all.
 */
export interface RailStep {
  label: string;
  account: AccountId;
  count: string;
  href: string;
  available: boolean;
}

/**
 * The rail's own name for a row.
 *
 * `Rail.tsx` writes a row's accessible name from the row's label, its account, and its
 * count, and that name is how the rail tells a reader which row is which. This reads the
 * same three fields off the one row list, so a case can hold the rail and the list to one
 * spelling rather than adding a second copy of the rail's own order.
 */
export function nameOf(row: RailStep): string {
  const who = row.account === "change" ? "the pull request" : "the work item";
  return row.count === "" ? `${row.label}, ${who}` : `${row.label}, ${who}, ${row.count}`;
}
