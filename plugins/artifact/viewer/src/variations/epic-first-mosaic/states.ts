/**
 * The two state vocabularies this board shows, and the values the index carries today.
 *
 * The record index carries one state field per epic and one per slice. Neither field
 * holds the vocabulary the build loop actually uses. An epic reads `planned`, `open`,
 * `completed`, or `merged`, and the refined join reads `unstarted`, `no-pull-request`,
 * `open`, or `merged`. A slice reads `completed` for all 29 rows in this bundle.
 *
 * So this file holds three things, kept apart on purpose:
 *
 *   1. `EPIC_STATES` and `SLICE_STATES` — the intended vocabulary. Nothing in the
 *      index carries these values. Every surface that shows one marks it a prototype
 *      rule, and every pill that shows a real value shows the real value.
 *   2. `EPIC_STATE_MOVE` and `SLICE_STATE_MOVE` — a stated mapping from a real value
 *      to an intended one, with the reason for the move. A surface may show this
 *      beside the real value. It may never show it instead of the real value.
 *   3. `LANES` — the stage rule the approved Work prototype fixed. The index records
 *      no lane, so this is a prototype rule too.
 */

import type { DesignStage } from "@/data/types";

export type Tone = "neutral" | "accent" | "good" | "warn" | "danger";

/** A pill fill, keyed by tone. Reads the house tokens, never a literal colour. */
export const TONE_PILL: Record<Tone, string> = {
  neutral: "border-line bg-surface-2 text-ink-dim",
  accent: "border-primary bg-accent-wash text-accent-deep",
  good: "border-good bg-good-wash text-good",
  warn: "border-warn bg-warn-wash text-warn",
  danger: "border-destructive bg-danger-wash text-destructive",
};

/** A box's left rule, keyed by tone. The problem and solution boxes use this. */
export const TONE_RULE: Record<Tone, string> = {
  neutral: "border-l-line",
  accent: "border-l-primary",
  good: "border-l-good",
  warn: "border-l-warn",
  danger: "border-l-destructive",
};

/** A round dot, keyed by tone. The state rails use this. */
export const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-ink-faint",
  accent: "bg-primary",
  good: "bg-good",
  warn: "bg-warn",
  danger: "bg-destructive",
};

export interface StateDef {
  key: string;
  gloss: string;
  tone: Tone;
}

/**
 * The epic vocabulary the build loop intends. A prototype rule: the index carries
 * none of these values.
 */
export const EPIC_STATES: StateDef[] = [
  {
    key: "planned",
    gloss: "The epic sits in the plan. No branch has started.",
    tone: "neutral",
  },
  {
    key: "in-progress",
    gloss: "A branch or a pull request carries the epic. The work has started.",
    tone: "accent",
  },
  {
    key: "blocked",
    gloss: "The work stopped on a decision, a dependency, or a failed check.",
    tone: "warn",
  },
  {
    key: "in-review",
    gloss: "The work is built and waits on a reviewer.",
    tone: "accent",
  },
  {
    key: "merged",
    gloss: "The epic's pull request merged.",
    tone: "good",
  },
  {
    key: "superseded",
    gloss: "A later design or epic replaced this one. Read it as history.",
    tone: "neutral",
  },
];

/**
 * The slice vocabulary the build loop intends. A prototype rule, for the same reason.
 */
export const SLICE_STATES: StateDef[] = [
  {
    key: "planned",
    gloss: "The slice is written into the plan. No failing contract exists yet.",
    tone: "neutral",
  },
  {
    key: "red",
    gloss: "A failing contract exists and fails for the right reason.",
    tone: "danger",
  },
  {
    key: "green",
    gloss: "The implementation passes that contract.",
    tone: "warn",
  },
  {
    key: "validated",
    gloss: "An independent validator scored the work against a blind rubric.",
    tone: "accent",
  },
  {
    key: "completed",
    gloss: "The slice is accepted and committed.",
    tone: "good",
  },
  {
    key: "failed",
    gloss: "The slice stopped below the score threshold and was not accepted.",
    tone: "danger",
  },
  {
    key: "skipped",
    gloss: "The slice left the plan before it ran.",
    tone: "neutral",
  },
];

export interface StateMove {
  intended: string;
  because: string;
}

/**
 * A stated mapping from a value the index carries today to one in the intended
 * vocabulary. The reason names what the real value means, so a reader can judge the
 * move rather than trust it.
 */
export const EPIC_STATE_MOVE: Record<string, StateMove> = {
  planned: {
    intended: "planned",
    because: "the goal record plans the epic and no branch has started",
  },
  unstarted: {
    intended: "planned",
    because:
      "the join refines a planned epic with no pull request to unstarted",
  },
  "no-pull-request": {
    intended: "planned",
    because:
      "the join refines a planned epic with no pull request to no-pull-request",
  },
  open: {
    intended: "in-progress",
    because:
      "the join refines an epic with an open pull request to open, and a pull request is work in flight",
  },
  "in-progress": {
    intended: "in-progress",
    because: "the value is already in the intended vocabulary",
  },
  completed: {
    intended: "merged",
    because:
      "the goal record marks the epic completed, and a merged pull request is what completed it",
  },
  merged: {
    intended: "merged",
    because: "the join refines an epic whose pull request merged to merged",
  },
  superseded: {
    intended: "superseded",
    because: "a later design or epic closed it",
  },
};

export const SLICE_STATE_MOVE: Record<string, StateMove> = {
  completed: {
    intended: "completed",
    because:
      "the plan records the slice as completed, and the slice loop's own vocabulary ends at completed",
  },
};

export function epicMove(value: string): StateMove | null {
  return EPIC_STATE_MOVE[value] ?? null;
}

export function sliceMove(value: string): StateMove | null {
  return SLICE_STATE_MOVE[value] ?? null;
}

/** An epic's state is done when the join says completed or merged. */
export const DONE_STATES = new Set(["completed", "merged"]);

export interface Lane {
  key: string;
  label: string;
  stages: DesignStage[];
  blurb: string;
}

/**
 * The lane rule is the one the approved Work prototype fixes
 * (`docs/architecture/designs/cobuilder-viewer/prototypes/work-prototype.html`).
 * A superseded design belongs to no lane, and it stays reachable under All.
 */
export const LANES: Lane[] = [
  {
    key: "decision",
    label: "Needs a decision",
    stages: ["backlog", "decided"],
    blurb:
      "The design is not settled. Either design mode stopped after stage 1, or a decision is recorded and no approved design has followed.",
  },
  {
    key: "build",
    label: "Ready to build",
    stages: ["approved"],
    blurb:
      "The design is approved. No epic has left the plan, so the work can start.",
  },
  {
    key: "review",
    label: "In review",
    stages: ["review"],
    blurb:
      "The design reached design mode's review stage and waits on a reviewer.",
  },
  {
    key: "shipped",
    label: "Shipped",
    stages: ["implemented"],
    blurb:
      "Design mode recorded the design as implemented. A shipped design may still carry an epic that a merged pull request holds open in the index.",
  },
];

export function laneRowsOf<T extends { design: { stage: string } }>(
  rows: T[],
  laneKey: string,
): T[] {
  if (laneKey === "all") return rows;
  const lane = LANES.find((entry) => entry.key === laneKey);
  if (!lane) return rows;
  return rows.filter((row) => (lane.stages as string[]).includes(row.design.stage));
}

/** A design's stage colour, for the badge. A stage with no rule reads as itself. */
export const STAGE_TONE: Record<string, Tone> = {
  backlog: "warn",
  decided: "warn",
  approved: "good",
  review: "accent",
  implemented: "good",
  superseded: "neutral",
};

/** What a stage means, in one line. A badge carries this as its tooltip. */
export const STAGE_GLOSS: Record<string, string> = {
  backlog: "Goal only. Design stages 2 to 7 have not run.",
  decided: "The decision is recorded. The build has not started.",
  approved: "Approved for build. No slice has landed yet.",
  review: "The build has landed and the design is under review.",
  implemented: "Shipped. The record still describes the tree.",
  superseded: "Closed by a later design. Read it as history.",
};

/** A verdict's colour, for the assessment pill. */
export const VERDICT_TONE: Record<string, Tone> = {
  proceed: "good",
  concerns: "warn",
  rework: "danger",
};
