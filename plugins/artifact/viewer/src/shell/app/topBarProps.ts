import type { TopBarProps } from "../TopBar";
import { PANE_ID } from "./ids";
import type { ShellState } from "./useShellState";
import type { ShellView } from "./view";

function chromeProps(s: ShellState) {
  return {
    onChooseWork: s.chooseWork,
    onChooseEpic: s.chooseEpic,
    theme: s.theme,
    onToggleTheme: s.toggleTheme,
    onOpenWork: () => s.setWorkDrawerOpen(true),
    paneId: PANE_ID,
    nameId: "work-item-name",
  };
}

const NO_WORK = {
  stage: null,
  supersededBy: null,
  branch: null,
  branches: [],
  supersedes: [],
  ready: false,
  board: false,
  designs: [],
  epics: [],
};

/*
  The badge stays here. This state is the index failing to resolve, which is
  exactly what the badge's own gloss says, so it is true and it belongs.
*/
export function failedBarProps(s: ShellState): TopBarProps {
  const { workId } = s.route;
  return { ...NO_WORK, workId, workName: workId, ...chromeProps(s) };
}

/*
  A WORKLESS CHANGE IS NAMED BY ITS PULL REQUEST. The top bar states the work
  item's own name, and a workless route has no work item, so the id alone would
  name it. The pull request's title says more, and it is the same word the board's
  row states for the same pull request.
*/
function workNameOf(v: ShellView): string | null {
  if (v.work) return v.work.design.name;
  return v.worklessPr === null ? v.route.workId : `Pull request ${v.worklessPr.id}`;
}

function goalProps(work: ShellView["work"]) {
  const goal = work?.record?.goal;
  return {
    stage: work?.design.stage ?? null,
    supersededBy: goal?.superseded_by ?? null,
    supersedes: goal?.supersedes ?? [],
  };
}

function identityProps(v: ShellView) {
  const { work, topBarBranches } = v;
  return {
    workId: work?.id ?? v.route.workId,
    workName: workNameOf(v),
    branch: topBarBranches[0] ?? null,
    branches: topBarBranches,
    ...goalProps(work),
  };
}

/*
  A WORKLESS CHANGE NAMES NO WORK ITEM EITHER. The top bar drops the stage badge
  and reads the switcher as "no work item selected" for both routes, because a stage
  and a selected work item both belong to a work item and this route has
  none. The pull request's own state is not a stage, so it takes no badge here.
*/
function listProps(v: ShellView) {
  return {
    ready: v.load.state === "ready",
    board: v.board || v.worklessPr !== null,
    designs: v.workList.designs,
    epics: v.workList.epics,
  };
}

export function populatedBarProps(v: ShellView): TopBarProps {
  return { ...identityProps(v), ...listProps(v), ...chromeProps(v) };
}
