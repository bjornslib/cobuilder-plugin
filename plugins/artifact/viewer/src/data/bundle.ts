/**
 * How this application reaches a bundle's data.
 *
 * The shipped viewer is committed inside a bundle, so it reads its data as sibling
 * script tags: `<script src="../data/story.js">` assigns `window.STORY`. This
 * application lives outside every bundle, so it needs a reader. There are two, and
 * `loadIndex` picks one at runtime:
 *
 *   1. Served, during development. `vite.config.ts` mounts the bundle root at
 *      `/bundle/`, and the file is read straight off disk, so the dev server shows
 *      the corpus as it stands.
 *   2. Published, as one Artifact. ADR-0001 gives that file a CSP that blocks every
 *      outbound request, so a fetch cannot work. `export_artifact.py` inlines the
 *      data as a global instead.
 *
 * Both readers meet at the same global, so a surface never asks which one ran. Every
 * sibling under `data/` has a `.js` twin, and that twin is how a published file sees
 * it. Only `src/data/` names a global.
 *
 * The diff global is `window.DIFFS_BY_PR`, not `window.DIFFS`: `extract_diffs.py`
 * writes one entry of it per pull request. The reader reads what the file assigns.
 * `designs.js` has no `.json` twin, so its reader appends a script tag.
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

export const STAGE_GLOSS: Record<DesignStage, string> = {
  backlog: "Goal only. Design stages 2 to 7 have not run.",
  decided: "The decision is recorded. The build has not started.",
  approved: "Approved for build. No slice has landed yet.",
  review: "The build has landed and the design is under review.",
  implemented: "Shipped. The record still describes the tree.",
  superseded: "Closed by a later design. Read it as history.",
};
