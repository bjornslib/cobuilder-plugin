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
 * form. This scaffold wires `index.json` and `designs.js`. The rest are listed here so
 * the next surface does not have to rediscover the mapping:
 *
 *   data/index.json  window.INDEX     the record index and its joins. Wired here.
 *   data/story.json  window.STORY     the narrated timeline and the world districts.
 *   data/adrs.json   window.ADRS      every decision record, keyed by ADR id.
 *   data/designs.js  window.DESIGNS   goal, intent, narrative, and assessment per design.
 *                                     Wired here. It carries no `.json` twin, so its
 *                                     reader appends a script tag and reads the global
 *                                     that tag assigns.
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

/*
 * `window.DESIGNS` is deliberately absent from the block above. Every variation that
 * reads the record file declares that global for itself, and each one types it as its
 * own copy of the record shape. A second declaration here collides with all of them, so
 * `loadDesigns` reads the global through the guard below instead. The guard is the real
 * check: it runs at read time against the value the file assigned.
 */

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

/* ------------------------------------------------------------------- designs */

/**
 * One design's authored records, as `data/designs.js` writes them.
 *
 * The index carries a design entity, and it carries no record body. These six fields are
 * the record bodies. Two surfaces read them: the Work board's readiness rule, and every
 * panel of the shell. Every field below is present in the real corpus, read across the
 * fifteen designs of `self/data/designs.js`.
 *
 * A record file is derived, so both readers treat every field as possibly absent. That is
 * why a field is optional even where the corpus always writes it: a type that promised a
 * value would hide the absence the panel exists to state.
 *
 * This is the one declaration of each shape. A surface that reads a field here re-exports
 * these types rather than restating them, so a renamed field fails the build in one place.
 */

/** One row of `goal.epics[]`. The index carries no epic outcome, so this is its source. */
export interface PlanEpicRow {
  id: string;
  slug?: string;
  branch: string | null;
  pr: number | null;
  state: string;
  outcome?: string;
  note?: string | null;
}

/** Design mode's stage-0 and stage-1 grounding, as `goal.json` records it. */
export interface MinWork {
  derived_from?: string;
  alternatives_explored?: number;
  boundary_rules_checked?: boolean;
  /** False on a backlog entry. Design mode stopped after stage 1. */
  challenge_stage_run?: boolean;
  note?: string;
}

export interface DesignGoal {
  name?: string;
  title?: string;
  created?: string;
  outcome?: string;
  done_when?: string[];
  abort_if?: string[];
  min_work?: MinWork | null;
  /** The planned epics. The Build level reads each row's outcome, and nothing else. */
  epics?: PlanEpicRow[];
  stage?: string;
  supersedes?: string[] | null;
  /** Present when a later design closed this one. The authority for "superseded by". */
  superseded_by?: string;
  superseded_note?: string;
  adr?: string | null;
  adrs?: string[];
}

/** One rejected option, with the reason the design gives. */
export interface DesignAlternative {
  option: string;
  rejected_because: string;
}

export interface DesignIntent {
  problem?: string;
  approach?: string;
  alternatives?: DesignAlternative[];
  authorship?: string;
  captured?: string;
  out_of_scope?: string[];
  reviewer_focus?: string[];
  risks?: string[];
  unknowns?: string[];
  why_now?: string;
}

/** One assessment finding. The board counts findings, and a panel reads the prose. */
export interface AssessmentFinding {
  kind?: string;
  id?: string;
  /** The prose of the finding. Some records write `text`, and others `title` and `detail`. */
  text?: string;
  title?: string;
  detail?: string;
  severity?: string;
}

export interface DesignAssessment {
  verdict?: string;
  findings?: AssessmentFinding[];
  constraint_introduced?: string;
  regret_risk?: string;
  risk_tier?: string;
  /** `design` for an assessment written before the code, `retrospective` for one after. */
  stage?: string;
  summary?: string;
}

/** One narrative beat. `kind` is `problem`, `constraint`, `decision`, or `risk`. */
export interface NarrativeBeat {
  kind: string;
  text: string;
}

/** One narrative level: the tagline and the narration a reader hears or reads. */
export interface NarrativeLevel {
  tagline?: string;
  narration?: string;
  beats?: NarrativeBeat[];
}

export interface DesignNarrative {
  landscape?: NarrativeLevel;
  /**
   * The problem and solution level. It also carries the split prose directly, because
   * some records author the statement there and some author the beats beside it.
   */
  problem_solution?: NarrativeLevel & { problem?: string; solution?: string };
  architecture?: NarrativeLevel;
  /**
   * The same three levels, when a record wraps them under this key instead of authoring
   * them at the top level. `review-flight-deck` writes this shape, so a rule that read
   * only the flat one reported its three levels missing while the text sat one key away.
   */
  levels?: {
    landscape?: NarrativeLevel;
    problem_solution?: NarrativeLevel;
    architecture?: NarrativeLevel;
  };
}

/** One design's six records. The corpus always writes `goal`, and the other five vary. */
export interface DesignRecord {
  goal?: DesignGoal;
  intent?: DesignIntent;
  assessment?: DesignAssessment;
  narrative?: DesignNarrative;
  /** Mermaid source, keyed by level number as a string: `"1"`, `"2"`, `"3"`. */
  diagrams?: Record<string, string>;
  pr_draft?: string;
}

/** Every design, keyed by the id the index's design entity carries. */
export type DesignRecords = Record<string, DesignRecord>;

function isDesignRecords(value: unknown): value is DesignRecords {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const first = Object.values(value as DesignRecords)[0];
  if (first === undefined) return true;
  return typeof first === "object" && first !== null && "goal" in first;
}

/**
 * Append one sibling script tag and resolve with the global that tag assigns.
 *
 * A file that assigns no global, and a file the server does not serve, each reject with
 * the path and the likely cause. A surface states both rather than show an empty board.
 */
function readScriptGlobal<T>(
  url: string,
  globalName: string,
  looksRight: (value: unknown) => value is T,
): Promise<T> {
  const read = (): T | undefined => {
    const value = (window as unknown as Record<string, unknown>)[globalName];
    return looksRight(value) ? value : undefined;
  };

  const inlined = read();
  if (inlined) return Promise.resolve(inlined);

  return new Promise<T>((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = url;
    tag.async = true;
    tag.onload = () => {
      const loaded = read();
      if (loaded) resolve(loaded);
      else {
        reject(
          new Error(
            `${url} loaded but assigned no window.${globalName}. The file is a ` +
              `sibling under data/, and it assigns exactly one global.`,
          ),
        );
      }
    };
    tag.onerror = () => {
      reject(
        new Error(
          `The dev server did not serve ${url}. Check that the bundle exists at ` +
            `.cobuilder-architect/self/ and that npm run dev is the server you are reading.`,
        ),
      );
    };
    document.head.appendChild(tag);
  });
}

let designsPending: Promise<DesignRecords> | null = null;

/**
 * Read every design's records, from the inlined global when a published file provided
 * one, and from the served sibling otherwise.
 *
 * `designs.js` assigns a global rather than holding JSON, so this reader appends a
 * script tag and reads what the tag assigns. The promise is cached, because React's
 * strict mode mounts twice and two tags for one file would race.
 */
export function loadDesigns(): Promise<DesignRecords> {
  if (!designsPending) {
    designsPending = readScriptGlobal(
      `${BUNDLE_DATA_URL}designs.js`,
      "DESIGNS",
      isDesignRecords,
    ).catch((error: unknown) => {
      designsPending = null;
      throw error;
    });
  }
  return designsPending;
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
