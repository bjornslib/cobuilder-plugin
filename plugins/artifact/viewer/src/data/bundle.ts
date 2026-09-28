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

import type {
  DesignRow,
  DesignStage,
  Entities,
  EpicEntity,
  Joins,
  RecordIndex,
  SliceEntity,
} from "./types";

/**
 * Where a bundle's root sits, relative to whoever reads this file.
 *
 * The dev server mounts one bundle tree at `/bundle/`, declared in `vite.config.ts`.
 * The shipped file is committed inside a bundle at `viewer/index.html`, so its bundle
 * root is the directory above it and its data sits at `../data/`.
 *
 * `import.meta.env.DEV` is Vite's own switch, and it is resolved while the build runs.
 * The build therefore ships one path and drops the other, and no runtime guess decides
 * which reader is in play.
 */
export const BUNDLE_MOUNT = import.meta.env.DEV ? "/bundle/" : "../";
export const BUNDLE_DATA_URL = `${BUNDLE_MOUNT}data/`;

declare global {
  interface Window {
    INDEX?: RecordIndex;
    /**
     * `data/designs.js` assigns this global.
     *
     * THE DECLARATION MOVED HERE IN SLICE 4 OF COBUILDER-VIEWER. Every variation that
     * read the record file used to declare this property for itself, and each one typed
     * it as its own copy of the record shape, so a declaration here collided with all of
     * them. No variation declares a bundle global now: each reads through the readers in
     * this module. So this is the one declaration, and it is the same shape `loadDesigns`
     * validates a value against.
     */
    DESIGNS?: DesignRecords;
  }
}

/*
 * `loadDesigns` still reads the global through a guard rather than through the
 * declaration above. The declaration says what a caller who writes the global may
 * assign, and the guard is the real check: it runs at read time against the value the
 * file assigned, which may be anything at all.
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
 *
 * The fetch below is the served path: it reaches outside the built file for a
 * sibling. A published Artifact inlines `window.INDEX` as a literal instead, so the
 * served path is the code `export_artifact.py` deletes at that point. The marker
 * pair that names it lives in `src/index.html`'s seam block, because no `.ts` module
 * here can carry a `//` comment through the build.
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
  intent?: NarrativeLevel;
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
    intent?: NarrativeLevel;
    problem_solution?: NarrativeLevel;
    architecture?: NarrativeLevel;
  };
  /**
   * A LEVEL KEY THIS BUILD DOES NOT NAME IS TOLERATED, AND THE TOLERANCE IS THE POINT.
   *
   * ADR-0029 renamed the first level's key, and a record written before that rename carries
   * the key the level used to have. Such a record is still a record this reader must
   * compile against and read: `narrativeVerdict` in `src/shell/readiness.ts` asks for the
   * current key first and for the older one second, so a design narrated before the rename
   * still reads as narrated instead of crashing a reader on the way in.
   *
   * So this index signature is not a hole in the type. It states that one key of this
   * record is not this build's to name, and every named key above keeps its own type.
   */
  [unreadLevel: string]: unknown;
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
 * One bundle global, read from the value the script tag assigned.
 *
 * THE NAME IS A PARAMETER, AND EVERY CALLER PASSES A LITERAL. That is deliberate: a
 * caller that writes the name states which global it reads, so one search for a name
 * finds every reader of it. No file outside `src/data/` names a global at all.
 *
 * The value is checked rather than trusted. A file that loaded and assigned nothing
 * useful reads as absent, and the reader that needed it says so.
 */
export function readGlobal<T>(
  globalName: string,
  looksRight: (value: unknown) => value is T,
): T | undefined {
  const value = (window as unknown as Record<string, unknown>)[globalName];
  return looksRight(value) ? value : undefined;
}

/**
 * Append one sibling script tag, and resolve once it has run.
 *
 * The tag below is the served path: it reaches outside the built file for a sibling.
 * A published Artifact inlines the global as a literal instead, so this is the code
 * `export_artifact.py` deletes at that point. The pair that names it lives in
 * `src/index.html`'s seam block, because no `.ts` module here can carry a `//`
 * comment through the build.
 *
 * A file the server does not serve rejects with the path and the likely cause, so a
 * surface states the reason rather than showing an empty panel.
 */
export function appendScript(url: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = url;
    tag.async = true;
    tag.onload = () => resolve();
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

/**
 * Read one sibling file's global: the inlined value when a published file provided
 * one, and the served sibling otherwise.
 */
export function readScriptGlobal<T>(
  url: string,
  globalName: string,
  looksRight: (value: unknown) => value is T,
): Promise<T> {
  const inlined = readGlobal(globalName, looksRight);
  if (inlined) return Promise.resolve(inlined);

  return appendScript(url).then(() => {
    const loaded = readGlobal(globalName, looksRight);
    if (loaded) return loaded;
    throw new Error(
      `${url} loaded but assigned no window.${globalName}. The file is a ` +
        `sibling under data/, and it assigns exactly one global.`,
    );
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

/* ---------------------------------------------- the remaining four globals */

/*
 * WHAT THESE FOUR READERS ARE FOR, AND WHO CONSUMES THEM TODAY.
 *
 * No shipped surface reads a narration, a diagram, a hero picture, or a diff hunk yet.
 * `docs/plans/cobuilder-viewer/04-slices.md` gives those to slices 15 and 16, which add
 * the pull request's art, audio, and diffs. The four readers live here because the data
 * module is the one place under `src/` that names a bundle global: a second reader
 * beside the surface that needs one is how two files come to disagree about a file's
 * shape.
 *
 * Each type below is narrowed to what its reader validates, and a slice that needs more
 * widens the type where the record is declared.
 */

/* --------------------------------------------------------------- story.json */

/** One narrative beat. `kind` names the beat's own job: background, intuition, boundary. */
export interface StoryBeat {
  kind?: string;
  text?: string;
}

/** One group of files the fourth level walks together, and why they belong together. */
export interface StoryDiffGroup {
  title?: string;
  note?: string;
  files?: string[];
}

/** One level of one pull request's narration, as `story.json` writes it. */
export interface StoryLevel {
  narration?: string;
  /** Present exactly when the bundle holds narration audio for this level. */
  voice?: string;
  /** The gap the change closes. The second level authors it beside its narration. */
  problem?: string;
  /** The shape the change closes the gap with. */
  solution?: string;
  beats?: StoryBeat[];
  /** The fourth level's own grouping of the files the diff touches. */
  groups?: StoryDiffGroup[];
}

/** One rejected option, with the reason the author gives. */
export interface StoryIntentAlternative {
  option?: string;
  rejected_because?: string;
}

/**
 * The author's own statement, captured by Generate mode before the code existed.
 *
 * `source` is `inferred` when no author statement survives and the block is a reading of
 * the diff. The surface states that in place rather than passing it off as authorship.
 */
export interface StoryIntent {
  captured?: string;
  source?: string;
  authorship?: string;
  problem?: string;
  why_now?: string;
  approach?: string;
  alternatives?: StoryIntentAlternative[];
  out_of_scope?: string[];
  risks?: string[];
  /**
   * A single string in every entry this bundle carries, and a list by the shape of its
   * four siblings. No document says which, so the reader accepts both.
   */
  testing?: string[] | string;
  reviewer_focus?: string[];
  unknowns?: string[];
}

/** One of the assessment's three answers, each with the evidence it stands on. */
export interface StoryAssessmentAnswer {
  answer?: string;
  verdict?: string;
  constraint_introduced?: string;
  evidence?: string;
  duplicates?: unknown[];
}

export interface StoryAssessmentFinding {
  kind?: string;
  id?: string;
  severity?: string;
  title?: string;
  claim?: string;
  detail?: string;
}

export interface StoryBoundaryCheck {
  rule?: string;
  source?: string;
  result?: string;
  evidence?: string;
}

/**
 * The reading written against the merged diff, as `story.json` writes it.
 *
 * `stage` is `design` for an assessment written before the code existed, and
 * `retrospective` for one written after the merge, whose findings are observations.
 */
export interface StoryAssessment {
  stage?: string;
  generated?: string;
  verdict?: string;
  risk_tier?: string;
  summary?: string;
  sensible?: StoryAssessmentAnswer;
  maintainability?: StoryAssessmentAnswer;
  pattern?: StoryAssessmentAnswer;
  findings?: StoryAssessmentFinding[];
  boundary_checks?: StoryBoundaryCheck[];
  regret_risk?: string;
  drift?: StoryAssessmentFinding[];
}

/**
 * One pull request's timeline entry.
 *
 * THE LEVELS ARE KEYED BY NAME, NOT BY NUMBER. The entry holds `levels` as an object
 * whose keys are `intent`, `problem_solution`, `architecture`, and `file_changes`.
 * A level's number is the position of its key in that order, and no field carries it.
 *
 * A PULL REQUEST WITH NO NARRATION CARRIES NO `levels` KEY AT ALL. An empty object would
 * state a level record that is not there, and a reader that finds the key cannot tell the
 * two apart. `extract_story.py` writes a stub entry without the key, and `?? {}` below
 * reads an older entry that carries it.
 */
export interface StoryEntry {
  pr: number;
  date?: string;
  title?: string;
  tagline?: string;
  depth?: string;
  size?: { files?: number; adds?: number; dels?: number };
  touched?: Record<string, number>;
  /** The decisions this pull request landed, by ADR id. */
  adrs?: string[];
  /** `merged`, or `open` for a pull request that has not merged. */
  status?: string;
  commit?: string;
  levels?: Record<string, StoryLevel>;
  /** The two blocks Generate mode and the assessment write onto the entry. */
  intent?: StoryIntent;
  assessment?: StoryAssessment;
}

export interface Story {
  meta?: { repo?: string; generated?: string; schema_version?: string; levels?: string[] };
  timeline?: StoryEntry[];
}

function isStory(value: unknown): value is Story {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as Story).timeline)
  );
}

let storyPending: Promise<Story> | null = null;

/** The narrated timeline, and the world districts beside it. */
export function loadStory(): Promise<Story> {
  if (!storyPending) {
    storyPending = readScriptGlobal(`${BUNDLE_DATA_URL}story.js`, "STORY", isStory).catch(
      (error: unknown) => {
        storyPending = null;
        throw error;
      },
    );
  }
  return storyPending;
}

/* ------------------------------------------------------------- manifest.js */

/**
 * `manifest.js`, which the bundle writes as `window.ODYSSEY`.
 *
 * The hero list is the record of which pull request levels carry scene art. A surface
 * that assumed `assets/pr-{N}/level-{L}.webp` for every level would ask for a picture
 * the bundle does not hold, so the list is read rather than assumed.
 */
export interface Manifest {
  schema_version?: string;
  excluded_prs?: number[];
  hero?: string[];
  diff_prs?: number[];
  diagrams?: string[];
}

function isManifest(value: unknown): value is Manifest {
  return typeof value === "object" && value !== null;
}

let manifestPending: Promise<Manifest> | null = null;

/** The hero art list, the diff pull requests, and the excluded ones. */
export function loadManifest(): Promise<Manifest> {
  if (!manifestPending) {
    manifestPending = readScriptGlobal(
      `${BUNDLE_DATA_URL}manifest.js`,
      "ODYSSEY",
      isManifest,
    ).catch((error: unknown) => {
      manifestPending = null;
      throw error;
    });
  }
  return manifestPending;
}

/* -------------------------------------------------------------- diagrams.js */

/** Every diagram, keyed by pull request number and then by level number, both as strings. */
export type DiagramsByPr = Record<string, Record<string, string>>;

function isDiagramsByPr(value: unknown): value is DiagramsByPr {
  return typeof value === "object" && value !== null;
}

let diagramsPending: Promise<DiagramsByPr> | null = null;

/**
 * One pull request's Mermaid source, keyed by level number as a string.
 *
 * `diagrams.js` assigns one global holding every pull request, so one reader serves
 * them all and the promise is cached once rather than once per pull request.
 */
export async function loadDiagrams(pr: number): Promise<Record<string, string>> {
  if (!diagramsPending) {
    diagramsPending = readScriptGlobal(
      `${BUNDLE_DATA_URL}diagrams.js`,
      "DIAGRAMS",
      isDiagramsByPr,
    ).catch((error: unknown) => {
      diagramsPending = null;
      throw error;
    });
  }
  return (await diagramsPending)[String(pr)] ?? {};
}

/* --------------------------------------------------------- diffs-pr{N}.js */

/** One pull request's diff hunks, keyed by the path the diff names. */
export type DiffByPr = Record<number, Record<string, string>>;

function isDiffByPr(value: unknown): value is DiffByPr {
  return typeof value === "object" && value !== null;
}

const diffPending = new Map<number, Promise<Record<string, string>>>();

/**
 * One pull request's diff hunks, keyed by the path the diff names.
 *
 * THE GLOBAL IS `DIFFS_BY_PR`, AND EACH FILE ADDS ONE ENTRY TO IT. `diffs-pr{N}.js`
 * runs `window.DIFFS_BY_PR = window.DIFFS_BY_PR || {}` and then assigns its own pull
 * request's entry, so the object exists from the first file that loads and carries one
 * entry per pull request. The reader therefore checks for this pull request's entry
 * before it appends a tag, and again after the tag has run. A reader that accepted the
 * object alone would resolve with a map that does not hold the entry it was asked for.
 */
export function loadDiff(pr: number): Promise<Record<string, string>> {
  const held = diffPending.get(pr);
  if (held) return held;

  const pending = (async (): Promise<Record<string, string>> => {
    const existing = readGlobal("DIFFS_BY_PR", isDiffByPr)?.[pr];
    if (existing) return existing;

    const url = `${BUNDLE_DATA_URL}diffs-pr${pr}.js`;
    await appendScript(url);

    const written = readGlobal("DIFFS_BY_PR", isDiffByPr)?.[pr];
    if (written) return written;
    throw new Error(`${url} loaded but wrote no window.DIFFS_BY_PR[${pr}].`);
  })().catch((error: unknown) => {
    diffPending.delete(pr);
    throw error;
  });

  diffPending.set(pr, pending);
  return pending;
}

/* --------------------------------------------------------------- the index */

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
    product_doc: [],
    architecture_doc: [],
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

/**
 * How many slices the index could not join to an epic.
 *
 * The index carries the unresolved ones as a map keyed by slice id, and the shell shows
 * the count. The key is named here rather than in the shell, so one module knows the
 * shape of the index and no surface does.
 */
export function unresolvedSliceCount(index: RecordIndex): number {
  return Object.keys(joinsOf(index).slice_to_epic_unresolved).length;
}

function sortedUnique(numbers: number[]): number[] {
  return [...new Set(numbers)].sort((a, b) => a - b);
}

/**
 * One row per design, for the board, resolved from the index alone.
 *
 * `designRows` below is the derivation. This is the whole of what a board needs, so a
 * surface hands over the index and never the joins it carries.
 */
export function designRowsOf(index: RecordIndex): DesignRow[] {
  const entities = entitiesOf(index);
  return designRows(entities.design, entities.epic, entities.slice, joinsOf(index));
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
