import type { DesignIntent, DesignRecord, NarrativeBeat } from "@/data/bundle";
import type { WorkItem } from "@/data/works";
import type { LevelKey } from "./sections";

export interface LevelState {
  key: LevelKey;
  /** True when the work fills the level. False turns the rail item disabled. */
  available: boolean;
  /** The records the level could not read. Empty when the level is available. */
  missing: string[];
}

/** Which beats belong in which column of the Problem and solution panel. */
export const PROBLEM_KINDS = ["problem", "constraint"] as const;
export const SOLUTION_KINDS = ["decision", "risk"] as const;

export function splitBeats(beats: NarrativeBeat[] | undefined) {
  const list = beats ?? [];
  return {
    problem: list.filter((beat) => (PROBLEM_KINDS as readonly string[]).includes(beat.kind)),
    solution: list.filter((beat) => (SOLUTION_KINDS as readonly string[]).includes(beat.kind)),
    other: list.filter(
      (beat) =>
        !(PROBLEM_KINDS as readonly string[]).includes(beat.kind) &&
        !(SOLUTION_KINDS as readonly string[]).includes(beat.kind),
    ),
  };
}

function hasItems(list: unknown[] | undefined): boolean {
  return (list ?? []).length > 0;
}

export function problemSolutionFields(record: DesignRecord | undefined): unknown[] {
  const intent: DesignIntent = record?.intent ?? {};
  return [
    intent.problem,
    intent.approach,
    hasItems(intent.risks),
    hasItems(intent.unknowns),
    hasItems(intent.alternatives),
    hasItems(record?.narrative?.problem_solution?.beats),
    record?.assessment?.verdict,
  ];
}

export function architectureLists(work: WorkItem): unknown[][] {
  return [work.linkedAdrs, work.diagramLevels, work.districts, work.boundaryRules];
}

function intentLevel(record: DesignRecord | undefined): LevelState {
  const available = record !== undefined;
  return { key: "intent", available, missing: available ? [] : ["designs.js"] };
}

const RECORD_FILES = {
  intent: "intent.json",
  narrative: "narrative.json",
  assessment: "assessment.json",
} as const;

function problemSolutionLevel(record: DesignRecord | undefined): LevelState {
  const available = problemSolutionFields(record).some(Boolean);
  const names = Object.keys(RECORD_FILES) as (keyof typeof RECORD_FILES)[];
  const absent = names.filter((name) => !record?.[name]).map((name) => RECORD_FILES[name]);
  return { key: "problem-and-solution", available, missing: available ? [] : absent };
}

const ARCHITECTURE_GAPS = [
  "no linked decision in goal.adrs[]",
  "no diagram level",
  "no district named by a linked decision",
];

function architectureLevel(work: WorkItem): LevelState {
  const available = architectureLists(work).some((list) => list.length > 0);
  return {
    key: "architecture",
    available,
    missing: available ? [] : [...ARCHITECTURE_GAPS],
  };
}

/**
 * Which levels this work fills, and what each one could not read.
 *
 * Intent reads the goal record, so it is available whenever the record file loaded.
 * Its contract columns carry their own absences, and `abort_if` is empty in much of
 * the corpus. Problem and solution needs one of five authored fields. Architecture
 * needs one linked decision, one diagram, or one named district.
 */
export function levelsOf(work: WorkItem): Record<LevelKey, LevelState> {
  return {
    intent: intentLevel(work.record),
    "problem-and-solution": problemSolutionLevel(work.record),
    architecture: architectureLevel(work),
  };
}
