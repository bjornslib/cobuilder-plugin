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

import type { DesignRecord } from "@/data/bundle";
import type { DesignRow, PullRequest } from "@/data/types";

import { RECORD_KINDS, type RecordVerdicts, type Verdict } from "./readiness/kinds";
import type { BoardSource } from "./readiness/rows";
import {
  assessmentVerdict,
  diagramVerdict,
  draftVerdict,
  goalVerdict,
  hasText,
  intentVerdict,
  narrativeLevel,
  verdictOf,
} from "./readiness/verdicts";

export type { DesignRecord, DesignRecords } from "@/data/bundle";
export type { Readiness, RecordKind, RecordVerdicts, Verdict } from "./readiness/kinds";
export { RECORD_KINDS, RECORD_LABEL } from "./readiness/kinds";
export { narrativeLevel } from "./readiness/verdicts";
export type { BoardSource, RowKind } from "./readiness/rows";
export {
  ROW_KIND_LABEL,
  ROW_KINDS,
  boardStatus,
  matchesKind,
  matchesStatus,
  statusTabs,
} from "./readiness/rows";

/** The three narrative levels, in reading order. */
const NARRATIVE_LEVELS: Array<{ key: string; label: string }> = [
  { key: "intent", label: "Intent" },
  { key: "problem_solution", label: "Problem and solution" },
  { key: "architecture", label: "Architecture" },
];

function narrativeVerdict(record: DesignRecord): Verdict {
  if (!record.narrative) return verdictOf("absent");
  const missing = NARRATIVE_LEVELS.filter(
    (level) => !hasText(narrativeLevel(record, level.key)?.narration),
  ).map((level) => level.label);
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

function carriedIds(rows: DesignRow[]): Set<number> {
  return new Set(rows.flatMap((row) => row.pullRequests));
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
export function prAloneSources(rows: DesignRow[], pullRequests: PullRequest[]): BoardSource[] {
  const carried = carriedIds(rows);
  return pullRequests
    .slice()
    .sort((a, b) => a.id - b.id)
    .filter((pull) => !carried.has(pull.id))
    .map((pull) => ({ kind: "pull-request" as const, row: pull }));
}
