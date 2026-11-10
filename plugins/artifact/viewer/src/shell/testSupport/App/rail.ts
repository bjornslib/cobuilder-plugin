import { buildWorkItems, gatesOf, levelsOf, type AccountId } from "../../model";
import { DESIGNS, INDEX } from "./fixtures";

/*
  The rail's input, built as `App.tsx` builds it. The change is the work's first pull
  request: these addresses name no change, so `App.tsx` falls back to it and the Review
  group draws its four rows. No level is read there, so the rows state no count.
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

export interface RailStep {
  label: string;
  account: AccountId;
  count: string;
  href: string;
  available: boolean;
}

/* The rail's name for a row, as `Rail.tsx` writes it (label, account, count), so a case holds both to one spelling. */
export function nameOf(row: RailStep): string {
  const who = row.account === "change" ? "the pull request" : "the work item";
  return row.count === "" ? `${row.label}, ${who}` : `${row.label}, ${who}, ${row.count}`;
}
