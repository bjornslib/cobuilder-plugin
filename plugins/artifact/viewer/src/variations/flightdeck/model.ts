/**
 * Every bundle read the FlightDeck prototype makes, and every derivation it makes from
 * one. A component in this variation reads this file and never a global of its own.
 *
 * WHAT THIS FILE READS, AND WHERE EACH PART COMES FROM. The shipped viewer reaches its
 * records as sibling `<script src="../data/*.js">` tags and its art and audio as
 * relative paths. This variation lives outside every bundle, so it reaches the same
 * globals through the readers in `@/data/bundle` instead: the dev server mounts the
 * bundle root at `vite.config.ts`'s `MOUNT`. The four readers there append a sibling
 * script tag and resolve with the global that tag assigns:
 *
 *   data/story.js       window.STORY       the narrated timeline, and the intent and
 *                                          assessment blocks on one entry.
 *   data/diagrams.js    window.DIAGRAMS    Mermaid source, keyed by pull request and
 *                                          level, both as strings.
 *   data/manifest.js    window.ODYSSEY     the hero art list and the diff pull requests.
 *   data/diffs-pr{N}.js window.DIFFS_BY_PR one pull request's diff hunks, keyed by path.
 *   data/adrs.js        window.ADRS        one entry per decision, keyed by its id, and
 *                                          read only when a reader opens a decision.
 *
 * THE LAST ONE IS NOT `window.DIFFS`, WHATEVER `src/data/bundle.ts` SAYS. The data
 * module's header names the global `window.DIFFS`, and the file the bundle ships writes
 * `window.DIFFS_BY_PR[N]`. The reader reads what the file writes, and the two names are
 * reported as a correction rather than silently patched.
 *
 * WHY THE ART LIST IS READ AND NOT ASSUMED. `manifest.hero` holds `"pr-2/level-1.webp"`
 * and its siblings, so the bundle itself says which pull request and which level carry
 * a picture. A surface that assumed `assets/pr-{N}/level-{L}.webp` for every level would
 * request three files the bundle does not hold on every other pull request, and a
 * missing asset is a defect. Absence is therefore derived, and the surface states it.
 *
 * WHY THE AUDIO LIST IS DERIVED FROM `voice`. A level carries narration audio exactly
 * when its story entry carries a `voice` string, and the file name is that level's own
 * key: `data/audio/pr{N}_{level_key}.wav`. `manifest.js` holds no audio list, so the
 * story entry is the only record of which levels were voiced.
 */

import {
  BUNDLE_DATA_URL,
  BUNDLE_MOUNT,
  loadDiagrams as readDiagrams,
  loadDiff as readDiff,
  loadManifest as readManifest,
  loadStory as readStory,
} from "@/data/bundle";
import { loadAdrs as readAdrs } from "@/data/adrs";
import type { AdrRecord, AdrRecords } from "@/data/adrs";

/* ------------------------------------------------------------------ shapes */

export interface StoryBeat {
  kind?: string;
  text?: string;
}

export interface StoryDiffGroup {
  title?: string;
  note?: string;
  files?: string[];
}

/**
 * One level of one pull request's narration, as `story.json` writes it.
 *
 * THE KEY IS A NAME, NOT A NUMBER. The entry holds `levels` as an object keyed by
 * `landscape`, `problem_solution`, `architecture`, and `file_changes`. The level's own
 * number is the position of that key in `LEVEL_KEYS`, and no field on the entry carries
 * it. A reader that expected `{ level: 1, title, narration }` per entry would find
 * nothing: those three fields live on the entry and on `meta.levels` instead.
 */
export interface StoryLevel {
  narration?: string;
  /** Present exactly when the bundle holds narration audio for this level. */
  voice?: string;
  problem?: string;
  solution?: string;
  beats?: StoryBeat[];
  groups?: StoryDiffGroup[];
}

export interface IntentAlternative {
  option?: string;
  rejected_because?: string;
}

/** The author's own statement, captured by Generate mode. */
export interface IntentRecord {
  captured?: string;
  /** `inferred` when no author statement survives, and the surface says so. */
  source?: string;
  authorship?: string;
  problem?: string;
  why_now?: string;
  approach?: string;
  alternatives?: IntentAlternative[];
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
export interface AssessmentAnswer {
  answer?: string;
  verdict?: string;
  constraint_introduced?: string;
  evidence?: string;
  duplicates?: unknown[];
}

export interface AssessmentFinding {
  kind?: string;
  id?: string;
  severity?: string;
  title?: string;
  claim?: string;
  detail?: string;
}

export interface AssessmentBoundaryCheck {
  rule?: string;
  source?: string;
  result?: string;
  evidence?: string;
}

export interface AssessmentRecord {
  /** `design` for an assessment written before the code, `retrospective` for one after. */
  stage?: string;
  generated?: string;
  verdict?: string;
  risk_tier?: string;
  summary?: string;
  sensible?: AssessmentAnswer;
  maintainability?: AssessmentAnswer;
  pattern?: AssessmentAnswer;
  findings?: AssessmentFinding[];
  boundary_checks?: AssessmentBoundaryCheck[];
  delta?: Record<string, unknown>;
  regret_risk?: string;
  drift?: AssessmentFinding[];
}

export interface StoryEntry {
  pr: number;
  date?: string;
  title?: string;
  tagline?: string;
  depth?: string;
  size?: { files?: number; adds?: number; dels?: number };
  touched?: Record<string, number>;
  adrs?: string[];
  levels?: Partial<Record<LevelKey, StoryLevel>>;
  status?: string;
  commit?: string;
  /** The two blocks this variation's sheet shows. PR 2 carries both. */
  intent?: IntentRecord;
  assessment?: AssessmentRecord;
}

export interface Story {
  meta?: { repo?: string; generated?: string; schema_version?: string; levels?: string[] };
  timeline?: StoryEntry[];
}

/** `manifest.js`. The hero list is the record of which levels carry scene art. */
export interface Manifest {
  schema_version?: string;
  excluded_prs?: number[];
  hero?: string[];
  diff_prs?: number[];
  diagrams?: string[];
}

/* ----------------------------------------------------------------- levels */

export const LEVEL_KEYS = [
  "landscape",
  "problem_solution",
  "architecture",
  "file_changes",
] as const;

export type LevelKey = (typeof LEVEL_KEYS)[number];

/** The four levels, in the order the shipped viewer reads them. */
export const LEVEL_TITLE: Record<LevelKey, string> = {
  landscape: "Landscape",
  problem_solution: "Problem & Solution",
  architecture: "Architecture",
  file_changes: "File changes",
};

/** What one level is for, in one line. The surface prints this above its sections. */
export const LEVEL_LEAD: Record<LevelKey, string> = {
  landscape:
    "What this pull request is, in one breath: its narration, its scene art, and the districts it touched.",
  problem_solution:
    "The gap the diff closes and the shape it closes it with, beside the author's own statement of both.",
  architecture:
    "The mechanism as three drawings, one per level, with the narration that reads them.",
  file_changes:
    "The diff itself, file by file. The only level with no scene art, no diagram, and no audio.",
};

/** One level of one pull request, as this surface needs it. */
export interface Level {
  /** 1 to 4. The position of the level's key in `LEVEL_KEYS`. */
  number: 1 | 2 | 3 | 4;
  key: LevelKey;
  /** `meta.levels[n-1]` when the bundle records a title for it. */
  title: string;
  narration: string;
  /** Present exactly when this level carries narration audio. */
  voice: string | null;
  /** The art URL, or null when the bundle holds no picture for this level. */
  art: string | null;
  /** The audio URL, or null when this level was never voiced. */
  audio: string | null;
  /** The Mermaid source, or null when the bundle holds no diagram for this level. */
  diagram: string | null;
}

/**
 * The art a level carries, read from the manifest's own hero list.
 *
 * The entry is `pr-{N}/level-{L}.webp` and the file sits at `assets/` under the bundle
 * root. THE EXTENSION IS `webp`, and the epic design that says `png` is wrong about the
 * bundle it measures against. `manifest.js` is the bundle's own record, so this reads it.
 */
function artFor(manifest: Manifest | null, pr: number, number: number): string | null {
  const wanted = `pr-${pr}/level-${number}.webp`;
  if (!manifest?.hero?.includes(wanted)) return null;
  return `${BUNDLE_MOUNT}assets/${wanted}`;
}

/**
 * The four levels of one pull request, derived once and read by both modes.
 *
 * A level the bundle holds no record for still appears, with an empty narration, so the
 * surface can state the absence in place instead of dropping the level and leaving a
 * reader to wonder whether it exists.
 */
export function levelsOf(
  entry: StoryEntry,
  story: Story | null,
  manifest: Manifest | null,
  diagrams: Record<string, string>,
): Level[] {
  return LEVEL_KEYS.map((key, index) => {
    const number = (index + 1) as Level["number"];
    const held = entry.levels?.[key];
    const title = story?.meta?.levels?.[index];
    const voice = typeof held?.voice === "string" && held.voice.length > 0 ? held.voice : null;
    return {
      number,
      key,
      title: typeof title === "string" && title.length > 0 ? title : LEVEL_TITLE[key],
      narration: typeof held?.narration === "string" ? held.narration : "",
      voice,
      art: artFor(manifest, entry.pr, number),
      audio: voice === null ? null : `${BUNDLE_DATA_URL}audio/pr${entry.pr}_${key}.wav`,
      diagram: diagrams[String(number)] ?? null,
    };
  });
}

/* ----------------------------------------------------------------- readers */

/**
 * The four bundle reads, through the one module under `src/` that names a global.
 *
 * This file used to carry its own reader: a `readScriptGlobal` that appended a sibling
 * `<script src>` tag and read the global the tag assigned. Slice 4 of cobuilder-viewer
 * makes `src/data/` the one place under `src/` that names a bundle global, so the four
 * readers live at `@/data/bundle` now, and the four functions below keep this
 * variation's own names for them:
 *
 *   data/story.js       window.STORY       `loadStory`
 *   data/manifest.js    window.ODYSSEY     `loadManifest`
 *   data/diagrams.js    window.DIAGRAMS    `loadDiagrams`
 *   data/diffs-pr{N}.js window.DIFFS_BY_PR `loadDiff`
 *
 * Each shared reader appends the same tag, prefers an inlined global when a published
 * file wrote one, and caches the promise, so React's strict mode cannot race two tags
 * for one file.
 *
 * THE CAST ON `loadStory` IS THE WHOLE OF THE DIFFERENCE. This variation's `StoryEntry`
 * carries the `intent` and `assessment` blocks its sheet shows, and the data module's
 * entry declares the fields a timeline entry always has. Each is a view of one object.
 */

export function loadStory(): Promise<Story> {
  return readStory() as unknown as Promise<Story>;
}

export function loadManifest(): Promise<Manifest> {
  return readManifest();
}

/** One pull request's Mermaid source, keyed by level number as a string. */
export function loadDiagrams(pr: number): Promise<Record<string, string>> {
  return readDiagrams(pr);
}

/**
 * One pull request's diff hunks, keyed by the path the diff names.
 *
 * THE GLOBAL IS `DIFFS_BY_PR`, AND EACH FILE ADDS ONE ENTRY TO IT. `diffs-pr{N}.js`
 * writes `window.DIFFS_BY_PR[N]`, and the shared reader checks for this pull request's
 * own entry rather than for the object alone.
 */
export function loadDiff(pr: number): Promise<Record<string, string>> {
  return readDiff(pr);
}

/**
 * Every decision record, keyed by the id the pull request names.
 *
 * THE FIFTH READ, AND THE ONE THE DECISION LIST NEEDS. A timeline entry carries the
 * decisions a diff lands as a list of ids alone, so the list can say that a decision
 * exists but not what it decides. The record file is the only place the whole decision
 * lives, and the record Sheet reads it from the same global the shipped shell reads.
 */
export function loadAdrs(): Promise<AdrRecords> {
  return readAdrs();
}

/** One decision record. The Sheet's own subject carries this type. */
export type { AdrRecord, AdrRecords };

/* --------------------------------------------------------------------- diff */

export interface DiffFile {
  path: string;
  adds: number;
  dels: number;
  /** True when the diff carries no hunk, only a binary notice or a mode change. */
  binary: boolean;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  /** The `@@ ... @@` line, verbatim, or "" when the diff holds a header alone. */
  header: string;
  lines: Array<{ kind: "add" | "del" | "context"; text: string }>;
}

/**
 * One diff text, split into the file's hunks and counted.
 *
 * The counts come from the diff's own `+` and `-` lines, so they cannot disagree with
 * what the surface draws under them.
 */
export function diffFile(path: string, text: string): DiffFile {
  const hunks: DiffHunk[] = [];
  let adds = 0;
  let dels = 0;
  let binary = false;
  let current: DiffHunk | null = null;

  for (const line of text.split("\n")) {
    if (line.startsWith("@@")) {
      current = { header: line, lines: [] };
      hunks.push(current);
      continue;
    }
    if (line.startsWith("Binary files ") || line.startsWith("GIT binary patch")) {
      binary = true;
      continue;
    }
    if (line.startsWith("diff --git ") || line.startsWith("index ") || line.startsWith("--- ")) {
      continue;
    }
    if (line.startsWith("+++ ") || line.startsWith("new file") || line.startsWith("deleted file")) {
      continue;
    }
    if (current === null) continue;
    if (line.startsWith("+")) {
      adds += 1;
      current.lines.push({ kind: "add", text: line.slice(1) });
    } else if (line.startsWith("-")) {
      dels += 1;
      current.lines.push({ kind: "del", text: line.slice(1) });
    } else if (line.startsWith(" ")) {
      current.lines.push({ kind: "context", text: line.slice(1) });
    }
  }

  return { path, adds, dels, binary, hunks };
}

/** Every file a diff holds, in the order the diff writes them, largest change first. */
export function diffFiles(diff: Record<string, string>): DiffFile[] {
  return Object.entries(diff)
    .map(([path, text]) => diffFile(path, text))
    .sort((a, b) => b.adds + b.dels - (a.adds + a.dels) || a.path.localeCompare(b.path));
}

/* ------------------------------------------------------------------ lookups */

export function entryOf(story: Story | null, pr: number): StoryEntry | null {
  return story?.timeline?.find((entry) => entry.pr === pr) ?? null;
}

/** Every narrated pull request, in the order the story writes them. */
export function entriesOf(story: Story | null): StoryEntry[] {
  return story?.timeline ?? [];
}
