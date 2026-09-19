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
 * form. This scaffold wires only `index.json`. The rest are listed here so the next
 * surface does not have to rediscover the mapping:
 *
 *   data/index.json  window.INDEX     the record index and its joins. Wired here.
 *   data/story.json  window.STORY     the narrated timeline and the world districts.
 *   data/adrs.json   window.ADRS      every decision record, keyed by ADR id.
 *   data/designs.js  window.DESIGNS   goal, intent, narrative, and assessment per design.
 *   data/diagrams.js window.DIAGRAMS  Mermaid source per pull request and level.
 *   data/manifest.js window.ODYSSEY   hero art, diff pull requests, excluded pull requests.
 *   data/diffs-pr{N}.js window.DIFFS  one pull request's diff hunks.
 *
 * The shipped viewer loads them in that order at plugins/artifact/viewer/index.html:1096.
 * `window.STORY`, `window.ODYSSEY`, `window.DIFFS`, `window.ADRS`, `window.DESIGNS`,
 * `window.INDEX`, and `window.DIAGRAMS` are the same globals a published file inlines,
 * so a surface that reads the global works under both readers with no branch.
 */

import type {
  DesignRow,
  DesignStage,
  Entities,
  EpicEntity,
  Joins,
  RecordIndex,
  SliceEntity,
} from "./types";

/** The dev-server mount, declared in `vite.config.ts`. */
export const BUNDLE_MOUNT = "/bundle/";
export const BUNDLE_DATA_URL = `${BUNDLE_MOUNT}data/`;

declare global {
  interface Window {
    INDEX?: RecordIndex;
  }
}

function isRecordIndex(value: unknown): value is RecordIndex {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<RecordIndex>;
  return (
    typeof candidate.schema_version === "string" &&
    typeof candidate.entities === "object" &&
    candidate.entities !== null &&
    typeof candidate.joins === "object" &&
    candidate.joins !== null
  );
}

/**
 * Read the record index, from the inlined global when a published file provided
 * one, and from the served bundle otherwise.
 */
export async function loadIndex(): Promise<RecordIndex> {
  if (isRecordIndex(window.INDEX)) {
    return window.INDEX;
  }
  const response = await fetch(`${BUNDLE_DATA_URL}index.json`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      `The dev server returned ${response.status} for ${BUNDLE_DATA_URL}index.json. ` +
        `Check that the bundle exists at .cobuilder-architect/self/ and that ` +
        `npm run dev is the server you are reading.`,
    );
  }
  const parsed: unknown = await response.json();
  if (!isRecordIndex(parsed)) {
    throw new Error(`${BUNDLE_DATA_URL}index.json is not a record index.`);
  }
  return parsed;
}

const DONE_STATES = new Set(["completed", "merged"]);

function emptyEntities(): Entities {
  return {
    adr: [],
    design: [],
    epic: [],
    context: [],
    district: [],
    boundary_rule: [],
    pull_request: [],
    slice: [],
    publication: [],
    program_design: [],
    epic_design: [],
    interaction_design: [],
  };
}

export function entitiesOf(index: RecordIndex): Entities {
  return index.entities ?? emptyEntities();
}

export function joinsOf(index: RecordIndex): Joins {
  return index.joins;
}

function sortedUnique(numbers: number[]): number[] {
  return [...new Set(numbers)].sort((a, b) => a - b);
}

/**
 * Resolve one row per design. Every join the Work board needs is computed here and
 * nowhere else, because ADR-0018 already computed them in `index.json` and a second
 * derivation in a component is how the two drift.
 */
export function designRows(
  designs: Entities["design"],
  epics: EpicEntity[],
  slices: SliceEntity[],
  joins: Joins,
): DesignRow[] {
  const epicsByDesign = new Map<string, EpicEntity[]>();
  for (const epic of epics) {
    const list = epicsByDesign.get(epic.design);
    if (list) list.push(epic);
    else epicsByDesign.set(epic.design, [epic]);
  }

  const slicesByEpic = new Map<string, SliceEntity[]>();
  for (const slice of slices) {
    const epicId = joins.slice_to_epic[slice.id];
    if (!epicId) continue;
    const list = slicesByEpic.get(epicId);
    if (list) list.push(slice);
    else slicesByEpic.set(epicId, [slice]);
  }

  return designs.map((design) => {
    const own = (epicsByDesign.get(design.id) ?? []).slice().sort((a, b) =>
      a.epic_id.localeCompare(b.epic_id),
    );
    const ownSlices: SliceEntity[] = [];
    const pullRequests: number[] = [];
    let done = 0;

    for (const epic of own) {
      const status = joins.epic_status[epic.id] ?? epic.state;
      if (DONE_STATES.has(status)) done += 1;
      const pr = joins.epic_to_pull_request[epic.id] ?? epic.pr;
      if (typeof pr === "number") pullRequests.push(pr);
      ownSlices.push(...(slicesByEpic.get(epic.id) ?? []));
    }

    ownSlices.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

    return {
      design,
      epics: own,
      slices: ownSlices,
      done,
      pullRequests: sortedUnique(pullRequests),
    };
  });
}

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
