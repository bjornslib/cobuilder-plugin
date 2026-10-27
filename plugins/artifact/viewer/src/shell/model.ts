/**
 * What the shell derives, and the two rules it derives from.
 *
 *   The shell renders. It never computes. Every count, state, and join comes from
 *   `data/index.json`, per interaction-design section 1.1 principle 6.
 *
 * So this file holds no new truth. It reads the joins the index already resolved,
 * narrows them to one work item, and answers three questions the rail asks:
 *
 *   1. Which sections does this work fill? A section the work cannot fill is absent,
 *      not empty. Section 3.3 states each rule.
 *   2. Which levels does this work fill? A level whose record is absent stays in the
 *      rail and reads disabled, because the gap is a fact the reader needs in place.
 *   3. Which rows does the rail hold, grouped how? `railGroups` is the one list, and
 *      `rowsOf` flattens it. The rail renders it and the arrow-key traversal steps it,
 *      so the two cannot drift. One copy of the order is the point: a second copy lost
 *      every entry below Architecture.
 *
 * The one value that does not come from `index.json` is the linked-decision list. It
 * comes from `goal.adrs[]` in `designs.js`, and `WorkItem.adrSource` says so.
 *
 * The joins resolve in the data module, not here. `buildWorkItems`, `WorkItem`, and the
 * record shape a work item carries live at `@/data/works`, because building one reads
 * the joins `data/index.json` carries. This file re-exports them so the shell keeps one
 * import path, and it names no join key of its own: a join resolved outside `src/data/`
 * is a second source for one fact.
 */

export { buildWorkItems } from "@/data/works";
export type { WorkItem } from "@/data/works";

export { LEVEL_KEYS, SECTION_KEYS, SECTION_LABEL, isSectionKey } from "./model/sections";
export type { LevelKey, SectionKey } from "./model/sections";
export { gatesOf } from "./model/gates";
export type { Gates } from "./model/gates";
export { PROBLEM_KINDS, SOLUTION_KINDS, levelsOf, splitBeats } from "./model/levels";
export type { LevelState } from "./model/levels";
export { epicGroups, switcherList } from "./model/lists";
export type { SwitcherDesign, SwitcherEpic } from "./model/lists";
export {
  boardHref,
  changeHref,
  counterpartHref,
  programHref,
  pullRequestHref,
  readRoute,
  routeHref,
  worklessPullRequest,
} from "./model/routes";
export type { Route } from "./model/routes";
export { PLAN_KEY, PROGRAM_KEYS, SHARED_KEYS } from "./model/accounts";
export type { AccountId, GroupKey, ProgramKey, SharedKey } from "./model/accounts";
export { carriedSectionIndex, changeRowIndex, readInLabel } from "./model/carry";
export { railGroups, rowsOf } from "./model/railGroups";
export type { RailGroup, RailRow, RailSource } from "./model/railTypes";

/** The lead of the Shipped section and of the pull-request level line. */
export const STAGE_PUBLICATIONS_DEPLOY_LEAD =
  "The stage, the publications, and the deploy status.";
