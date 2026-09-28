/**
 * The six authored records a design directory can hold, and how complete each one is.
 *
 * Every panel in this shell states absence and never presence. The board is the one
 * surface that has to state completeness, because its job is to let a reader compare one
 * work item against another before opening either. So this module carries a three-state
 * readiness — `present`, `partial`, `absent` — and the board is its only reader.
 *
 * The record shapes come from `@/data/bundle`, which owns the reader for every bundle
 * sibling. This module reads fields, so it re-exports the shapes it reads them through:
 * a reader who follows the rule finds the record beside it, and one declaration serves
 * both files.
 *
 * A verdict carries the state and the parts that are absent. It carries no prose
 * sentence: the board renders the two fields it has, and a third field that no surface
 * reads would be a field nobody maintains.
 *
 * One place derives a verdict, and every row renders one. So no two rows can disagree
 * about one record.
 *
 * THE BOARD'S ROW RULES LIVE HERE TOO. The board lists two kinds of row: a design, and a
 * pull request that belongs to no design. Which rows it lists, which status a row states,
 * and which rows a tab keeps are all pure, so they need no DOM and they sit beside the
 * readiness rule. The module keeps its name, because the readiness rule stays its largest
 * part.
 */

import type { DesignRecord, DesignRecords } from "@/data/bundle";
import type { DesignRow, PullRequest } from "@/data/types";

export type { DesignRecord, DesignRecords };

export type RecordKind =
  | "goal"
  | "intent"
  | "narrative"
  | "assessment"
  | "pr-draft"
  | "diagrams";

/** The six records, in the order a reader reads them and a row paints them. */
export const RECORD_KINDS: RecordKind[] = [
  "goal",
  "intent",
  "narrative",
  "assessment",
  "pr-draft",
  "diagrams",
];

/** The short name of each record. One name for one thing, used by the row and the key. */
export const RECORD_LABEL: Record<RecordKind, string> = {
  goal: "goal",
  intent: "intent",
  narrative: "narrative",
  assessment: "assessment",
  "pr-draft": "pr-draft",
  diagrams: "diagrams",
};

export type Readiness = "present" | "partial" | "absent";

export interface Verdict {
  state: Readiness;
  /** The parts the record is missing. Empty unless the state is `partial`. */
  missing: string[];
}

export type RecordVerdicts = Record<RecordKind, Verdict>;

/* ------------------------------------------------------------------ helpers */

function verdictOf(state: Readiness, missing: string[] = []): Verdict {
  return { state, missing };
}

function hasText(value: string | undefined | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasItems(value: unknown[] | undefined | null): boolean {
  return Array.isArray(value) && value.length > 0;
}

/** The three narrative levels, in reading order. */
const NARRATIVE_LEVELS: Array<{ key: string; label: string }> = [
  { key: "intent", label: "Intent" },
  { key: "problem_solution", label: "Problem and solution" },
  { key: "architecture", label: "Architecture" },
];

/**
 * The key this shell's first level carried before ADR-0029 renamed it.
 *
 * A design record authored before the rename holds its narration under the key the level
 * used to have, and `designs.js` is a projection of records authored over months. So the
 * reader asks for the level's current key first and for this one second, and a design
 * narrated before the rename still reads as narrated rather than as an empty level.
 *
 * Nothing writes this key. The level list above carries the one name the shell asks for
 * and shows, and this table is a read of an older record and not a second name for the
 * level. A future session that drops the read is free to, once no bundle in service
 * predates the rename.
 */
const PRE_RENAME_LEVEL_KEY: Record<string, string> = { intent: "landscape" };

/**
 * One narrative level, whatever shape the record wrote it in.
 *
 * `review-flight-deck` wraps its three levels under `levels` instead of authoring them at
 * the top level. Both shapes are read, because a rule that saw only the flat one reported
 * that design's three levels missing while the text sat one key away.
 */
function narrativeLevel(
  record: DesignRecord,
  key: string,
): { narration?: string } | null {
  const narrative = record.narrative;
  if (!narrative) return null;
  const source = (narrative.levels ?? narrative) as Record<string, unknown>;
  const previous = PRE_RENAME_LEVEL_KEY[key];
  const names = previous === undefined ? [key] : [key, previous];
  for (const name of names) {
    const level = source[name];
    if (typeof level === "object" && level !== null) {
      return level as { narration?: string };
    }
  }
  return null;
}

/** Every `##` section of a draft, as a table of contents. */
function draftSections(markdown: string): string[] {
  return markdown
    .split("\n")
    .filter((row) => /^##\s+\S/.test(row))
    .map((row) => row.replace(/^##\s+/, "").trim());
}

/* --------------------------------------------------------------- the records */

/**
 * The goal, and the one rule that reads `min_work`.
 *
 * A goal that records `challenge_stage_run` false is a backlog entry. Design mode stopped
 * after stage 1, so the record is whole in its own terms and the design is not. The rule
 * names that, because a reader comparing two rows has to see the difference.
 */
function goalVerdict(goal: DesignRecord["goal"]): Verdict {
  if (!goal) return verdictOf("absent");
  const missing: string[] = [];
  if (!hasText(goal.outcome)) missing.push("outcome");
  if (!hasItems(goal.done_when)) missing.push("done_when");
  if (goal.min_work?.challenge_stage_run === false) {
    missing.push("design mode's stages 2 to 7");
  }
  return verdictOf(missing.length === 0 ? "present" : "partial", missing);
}

function intentVerdict(record: DesignRecord): Verdict {
  const intent = record.intent;
  if (!intent) return verdictOf("absent");
  const missing: string[] = [];
  if (!hasText(intent.problem)) missing.push("problem");
  if (!hasText(intent.approach)) missing.push("approach");
  if (!hasItems(intent.risks)) missing.push("risks");
  if (!hasItems(intent.unknowns)) missing.push("unknowns");
  return verdictOf(missing.length === 0 ? "present" : "partial", missing);
}

function narrativeVerdict(record: DesignRecord): Verdict {
  if (!record.narrative) return verdictOf("absent");
  const missing = NARRATIVE_LEVELS.filter(
    (level) => !hasText(narrativeLevel(record, level.key)?.narration),
  ).map((level) => level.label);
  return verdictOf(missing.length === 0 ? "present" : "partial", missing);
}

function assessmentVerdict(record: DesignRecord): Verdict {
  const assessment = record.assessment;
  if (!assessment) return verdictOf("absent");
  const missing: string[] = [];
  if (!hasText(assessment.verdict)) missing.push("verdict");
  if (!hasText(assessment.summary)) missing.push("summary");
  if (!hasItems(assessment.findings)) missing.push("findings");
  return verdictOf(missing.length === 0 ? "present" : "partial", missing);
}

function draftVerdict(record: DesignRecord): Verdict {
  const draft = record.pr_draft;
  if (!hasText(draft)) return verdictOf("absent");
  if (draftSections(draft).length === 0) return verdictOf("partial", ["sections"]);
  return verdictOf("present");
}

function diagramVerdict(record: DesignRecord): Verdict {
  const diagrams = record.diagrams;
  if (!diagrams || Object.keys(diagrams).length === 0) return verdictOf("absent");
  const missing = ["1", "2", "3"]
    .filter((level) => !hasText(diagrams[level]))
    .map((level) => `level ${level}`);
  return verdictOf(missing.length === 0 ? "present" : "partial", missing);
}

/** All six kinds absent at once, for a design `designs.js` does not carry. */
const NOTHING_RECORDED: RecordVerdicts = {
  goal: verdictOf("absent"),
  intent: verdictOf("absent"),
  narrative: verdictOf("absent"),
  assessment: verdictOf("absent"),
  "pr-draft": verdictOf("absent"),
  diagrams: verdictOf("absent"),
};

/**
 * A verdict per authored record kind, for one design.
 *
 * A design `designs.js` does not carry reads absent on all six kinds rather than
 * throwing, so a work item the record file missed still gets a row.
 */
export function recordVerdicts(record: DesignRecord | undefined): RecordVerdicts {
  if (!record) return NOTHING_RECORDED;
  return {
    goal: goalVerdict(record.goal),
    intent: intentVerdict(record),
    narrative: narrativeVerdict(record),
    assessment: assessmentVerdict(record),
    "pr-draft": draftVerdict(record),
    diagrams: diagramVerdict(record),
  };
}

/** How many of the six records exist, in full or in part. */
export function presentCount(verdicts: RecordVerdicts): number {
  return RECORD_KINDS.filter((kind) => verdicts[kind].state !== "absent").length;
}

/* ------------------------------------------------------------- the board's rows */

/**
 * The two kinds of row the board lists.
 *
 * A design row reads one design directory. A pull request row reads one pull request the
 * index holds that no design's own epics point at. The two are the board's whole
 * vocabulary, so every row states one of exactly two words.
 */
export type RowKind = "design" | "pull-request";

/** The two kinds, in the order the kind control lists them. */
export const ROW_KINDS: RowKind[] = ["design", "pull-request"];

/** The word a row states for its kind. `PR` names the kind and never a status. */
export const ROW_KIND_LABEL: Record<RowKind, string> = {
  design: "Design",
  "pull-request": "PR",
};

/** One board row, whether it carries a design or a pull request of its own. */
export type BoardSource =
  | { kind: "design"; row: DesignRow }
  | { kind: "pull-request"; row: PullRequest };

/**
 * The status one row states: a design's stage, or a pull request's own state.
 *
 * One rule reads both kinds, so one status tab selects a design and a pull request by the
 * same predicate. The index writes `open` and `merged` for a pull request, and those two
 * words join the six design stages in the strip's vocabulary.
 */
export function boardStatus(source: BoardSource): string {
  return source.kind === "design" ? source.row.design.stage : source.row.state;
}

/**
 * Every status the board's rows record, deduplicated, in reading order.
 *
 * A status no row carries earns no tab, so the strip never offers a filter that would
 * empty the board. The order follows the rows, so the strip reads in the order the list
 * below it does.
 */
export function statusTabs(sources: BoardSource[]): string[] {
  const statuses: string[] = [];
  for (const source of sources) {
    const status = boardStatus(source);
    if (!statuses.includes(status)) statuses.push(status);
  }
  return statuses;
}

/** The predicate behind one status tab. `All` is the caller's own predicate. */
export function matchesStatus(source: BoardSource, status: string): boolean {
  return boardStatus(source) === status;
}

/** The predicate behind one kind tab. */
export function matchesKind(source: BoardSource, kind: RowKind): boolean {
  return source.kind === kind;
}

/**
 * Every pull request the index holds that no design's epics point at, one source each.
 *
 * THE SUBTRACTION RUNS AGAINST THE ROWS. `DesignRow.pullRequests` is the set the data
 * layer resolves from `joins.epic_to_pull_request` and the epic's own `pr` field, so a
 * rule that reads the index's pull request entities alone would list a design's own pull
 * request twice: once inside that design's row and once beside it. The list is sorted by
 * id, so two runs of one index read in one order.
 */
export function prAloneSources(
  rows: DesignRow[],
  pullRequests: PullRequest[],
): BoardSource[] {
  const carried = new Set<number>();
  for (const row of rows) {
    for (const id of row.pullRequests) carried.add(id);
  }
  return pullRequests
    .slice()
    .sort((a, b) => a.id - b.id)
    .filter((pull) => !carried.has(pull.id))
    .map((pull) => ({ kind: "pull-request" as const, row: pull }));
}
