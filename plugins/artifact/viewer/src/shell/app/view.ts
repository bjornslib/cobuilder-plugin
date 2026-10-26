import { unresolvedSliceCount } from "@/data/bundle";

import { CHANGE_KEYS } from "../change/sections";
import { changeRowIndex, type LevelState, type SectionKey } from "../model";
import type { AdrRecords } from "../records";
import { isPaged, type PagedLevelKey } from "./pagedSections";
import type { ShellState } from "./useShellState";

function programKeyOf(section: SectionKey, sub: string | null): PagedLevelKey | null {
  if (!isPaged(section)) return null;
  return section === "build" && (sub === "rubrics" || sub === "plan") ? null : section;
}

function pagedLevelOf(levels: ShellState["levels"], key: PagedLevelKey | null): LevelState | null {
  if (key === null || key === "build") return null;
  return levels?.[key] ?? null;
}

/*
 * A record file that did not load and a story entry the bundle does not hold are two
 * different facts, and the second one is already a whole sentence.
 */
function changeNoticeOf({ changePr, change }: ShellState): string | null {
  if (changePr === null) return null;
  if (change.state !== "failed") return change.message;
  return `The change's records did not load, so these four rows state what they could not read: ${change.message ?? "no reason was given"}`;
}

function branchesOf(work: ShellState["work"]): string[] {
  return [...new Set((work?.epics ?? []).map((epic) => epic.branch).filter((b): b is string => !!b))];
}

/*
 * The level state behind a paged section. Build has none, because the rail's own gate
 * decides it. Every other section stacks its panels in the pane's own scroll, so this
 * reads null there and the layout below stays the shell's.
 *
 * Rubrics is not paged. The rail's Rubrics entry is a sub-view of Build, and it keeps
 * its one panel and its own scroll. Only the epics sub-view lays an epic per section on
 * a track.
 *
 * The change's account is a paged surface too. Its four rows page through the same
 * strip, stage, and pager the program's levels use, so the two accounts cannot disagree
 * about how a row reads. `paged` is the layout flag, and `programKey` narrows the
 * section to a level of the program's own records.
 *
 * The appended segment decides which row opens. `#/<work>/pull-requests/<pr>/architecture`
 * names the change's Architecture row. A segment that names no row opens the first,
 * which is the row the bare address opens.
 */
function pagingOf(s: ShellState) {
  const { section, route, levels, changePr } = s;
  const programKey = programKeyOf(section, route.sub);
  return {
    programKey,
    changeAccount: changePr !== null,
    paged: programKey !== null || changePr !== null,
    pagedLevel: pagedLevelOf(levels, programKey),
    changeRow: CHANGE_KEYS[changeRowIndex(route.subId)],
    focusEpic: section === "build" && route.sub === "epics" ? route.subId : null,
  };
}

/*
 * The data module counts the slices the index could not join, because the join is the
 * index's own shape and the shell names no key of it.
 */
function factsOf(s: ShellState) {
  const { load, route } = s;
  const adrs: AdrRecords = load.state === "ready" ? load.adrs : {};
  const unresolvedSlices = load.state === "ready" ? unresolvedSliceCount(load.index) : 0;
  const routeKey = `${route.workId ?? ""}/${route.section}/${route.sub ?? ""}/${route.subId ?? ""}`;
  return { adrs, unresolvedSlices, routeKey, changeNotice: changeNoticeOf(s), topBarBranches: branchesOf(s.work) };
}

export type ShellView = ShellState & ReturnType<typeof pagingOf> & ReturnType<typeof factsOf>;

export function viewOf(s: ShellState): ShellView {
  return { ...s, ...pagingOf(s), ...factsOf(s) };
}
