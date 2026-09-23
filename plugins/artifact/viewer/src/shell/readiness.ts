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
 */

import type { DesignRecord, DesignRecords } from "@/data/bundle";

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
  { key: "landscape", label: "Landscape" },
  { key: "problem_solution", label: "Problem and solution" },
  { key: "architecture", label: "Architecture" },
];

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
  const level = source[key];
  if (typeof level !== "object" || level === null) return null;
  return level as { narration?: string };
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
