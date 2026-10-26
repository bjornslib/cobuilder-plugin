/**
 * How this application reaches a bundle's data.
 *
 * The shipped viewer is committed inside a bundle, so it reads its data as sibling
 * script tags: `<script src="../data/story.js">` assigns `window.STORY`, and so on
 * for every file under `data/`. This application lives outside every bundle, in
 * `plugins/artifact/viewer/src/`, so it needs a reader instead. There are two, and
 * `loadIndex` picks between them at runtime.
 *
 *   1. Served, during development. `vite.config.ts` mounts the bundle root at
 *      `/bundle/`. The file is read straight off disk, so the dev server always
 *      shows the corpus as it stands, with no regeneration step.
 *
 *   2. Published, as one Artifact. ADR-0001 gives that file a CSP that blocks every
 *      outbound request, so a fetch cannot be how it works. `export_artifact.py`
 *      inlines the data as a global instead, exactly as the shipped viewer does.
 *
 * Both readers meet at the same global, so a surface never asks which one ran.
 *
 * EVERY SIBLING UNDER `data/` HAS A `.js` TWIN, AND THAT TWIN IS HOW A PUBLISHED
 * FILE SEES IT. The mount serves all of them, so a served surface can read either
 * form. This module reads every one of them, and it is the only place under `src/`
 * that names a global:
 *
 *   data/index.json  window.INDEX     the record index and its joins. Wired here.
 *   data/story.json  window.STORY     the narrated timeline and the world districts.
 *   data/adrs.json   window.ADRS      every decision record, keyed by ADR id. Its
 *                                     reader is at `./adrs`, a sibling module under
 *                                     `src/data/`.
 *   data/designs.js  window.DESIGNS   goal, intent, narrative, and assessment per design.
 *                                     It carries no `.json` twin, so its reader appends a
 *                                     script tag and reads the global that tag assigns.
 *   data/diagrams.js window.DIAGRAMS  Mermaid source per pull request and level.
 *   data/manifest.js window.ODYSSEY   hero art, diff pull requests, excluded pull requests.
 *   data/diffs-pr{N}.js window.DIFFS_BY_PR one pull request's diff hunks, keyed by path.
 *
 * `window.DIFFS_BY_PR` IS THE NAME THE BUNDLE WRITES, and an earlier header here called
 * it `window.DIFFS`. No file in any bundle assigns `window.DIFFS`: `extract_diffs.py`
 * writes one entry of `window.DIFFS_BY_PR` per pull request. The reader reads what the
 * file assigns.
 *
 * The shipped viewer loads them in that order at plugins/artifact/viewer/index.html:1096.
 * `window.STORY`, `window.ODYSSEY`, `window.DIFFS_BY_PR`, `window.ADRS`, `window.DESIGNS`,
 * `window.INDEX`, and `window.DIAGRAMS` are the same globals a published file inlines,
 * so a surface that reads the global works under both readers with no branch.
 */

import type { DesignStage } from "./types";

export { BUNDLE_DATA_URL, BUNDLE_MOUNT, appendScript, readGlobal, readScriptGlobal } from "./bundle/readers";
export { entitiesOf, joinsOf, loadIndex, unresolvedSliceCount } from "./bundle/entities";
export { designRows, designRowsOf } from "./bundle/rows";
export { loadDesigns } from "./bundle/designs";
export { loadStory } from "./bundle/story";
export { loadDiagrams, loadManifest } from "./bundle/assets";
export { loadDiff } from "./bundle/diffs";
export type {
  AssessmentFinding,
  DesignAlternative,
  DesignAssessment,
  DesignGoal,
  DesignIntent,
  DesignNarrative,
  DesignRecord,
  DesignRecords,
  MinWork,
  NarrativeBeat,
  NarrativeLevel,
  PlanEpicRow,
} from "./bundle/designTypes";
export type {
  Story,
  StoryAssessment,
  StoryAssessmentAnswer,
  StoryAssessmentFinding,
  StoryBeat,
  StoryBoundaryCheck,
  StoryDiffGroup,
  StoryEntry,
  StoryIntent,
  StoryIntentAlternative,
  StoryLevel,
} from "./bundle/storyTypes";
export type { DiagramsByPr, Manifest } from "./bundle/assets";
export type { DiffByPr } from "./bundle/diffs";

/** A design's stage, in the order the Work board groups by. */
export const STAGE_ORDER: DesignStage[] = [
  "backlog",
  "decided",
  "approved",
  "review",
  "implemented",
  "superseded",
];

export function isKnownStage(stage: string): stage is DesignStage {
  return (STAGE_ORDER as string[]).includes(stage);
}

/** What a stage means, in one line. A badge carries this as its tooltip. */
export const STAGE_GLOSS: Record<DesignStage, string> = {
  backlog: "Goal only. Design stages 2 to 7 have not run.",
  decided: "The decision is recorded. The build has not started.",
  approved: "Approved for build. No slice has landed yet.",
  review: "The build has landed and the design is under review.",
  implemented: "Shipped. The record still describes the tree.",
  superseded: "Closed by a later design. Read it as history.",
};
