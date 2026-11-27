import { SECTION_LABEL } from "./sections";

/**
 * Which account a group and its rows read.
 *
 * `program` reads the work's own design records. `change` reads the pull request the
 * work's own epics carry. ADR-0029 fixed both ids.
 */
export type AccountId = "program" | "change";

/** The rail's three groups: the work's levels, its other rows, then the pull request. */
export type GroupKey = "levels" | "also" | "review";

/**
 * The three section names both accounts carry.
 *
 * Because the names repeat, a row is matched by its address and never by its name: a
 * name match would light more than one row at once.
 */
export const SHARED_KEYS = ["intent", "problem-and-solution", "architecture"] as const;
export type SharedKey = (typeof SHARED_KEYS)[number];

/** Build's five rows, in the order the rail renders them. One list, read by everything. */
export const PROGRAM_KEYS = [
  "intent",
  "problem-and-solution",
  "architecture",
  "epics",
  "rubrics",
] as const;

/**
 * The Plan row sits after Architecture, the order the gate sequence names: the plan
 * documents approve after the architecture review, before the epics and rubrics. It
 * always shows. For a work with no plan directory, it is disabled with the reason
 * "no plan", so it is kept apart from the list of five.
 */
export const PLAN_KEY = "plan" as const;
export const BUILD_ROW_KEYS = [
  ...PROGRAM_KEYS.slice(0, 3),
  PLAN_KEY,
  ...PROGRAM_KEYS.slice(3),
];
export type ProgramKey = (typeof PROGRAM_KEYS)[number] | typeof PLAN_KEY;

/**
 * One name for one row, so the rail and the section it opens read the same word.
 *
 * The three shared names come from `SECTION_LABEL`. Epics and Rubrics are rows of the
 * Also group and not sections of a level, so their names live only here.
 */
export const PROGRAM_LABEL: Record<ProgramKey, string> = {
  intent: SECTION_LABEL.intent,
  "problem-and-solution": SECTION_LABEL["problem-and-solution"],
  architecture: SECTION_LABEL.architecture,
  epics: "Epics",
  rubrics: "Rubrics",
  plan: "Plan",
};
