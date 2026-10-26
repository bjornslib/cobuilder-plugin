import type { DesignRecord } from "../../readiness";

function record(parts: Record<string, unknown>): DesignRecord {
  return parts as unknown as DesignRecord;
}

/** A whole goal, so a fixture can vary one record and leave the other five whole. */
export const GOAL = {
  name: "cobuilder-viewer",
  title: "The Work board",
  created: "2026-09-22",
  outcome: "A reader arrives on the board and surveys every design.",
  done_when: ["Every design reads as a row."],
  min_work: { challenge_stage_run: true },
  stage: "approved",
  supersedes: null,
  adr: null,
  adrs: ["ADR-0028"],
};

/** The goal above, plus the records a fixture chooses to add. */
export function withGoal(parts: Record<string, unknown> = {}): DesignRecord {
  return record({ goal: GOAL, ...parts });
}

/** A whole record of every kind, as the richest design in the bundle writes one. */
export const EVERY_RECORD = withGoal({
  intent: {
    problem: "An open pull request is no entity in the index.",
    approach: "Add the entity and refine the join.",
    risks: ["The placeholder reads as a real state."],
    unknowns: ["How many epics point at an open pull request."],
  },
  narrative: {
    landscape: { narration: "The index reads merged history." },
    problem_solution: { narration: "The open set is absent." },
    architecture: { narration: "One derived index resolves the open set." },
  },
  assessment: {
    verdict: "proceed",
    summary: "The gap is recorded and scoped.",
    findings: [
      { kind: "drift", title: "The placeholder is not a state.", detail: "Refine it." },
    ],
  },
  pr_draft: "# The open set\n\n## What changes\n\nOne entity.\n\n## Why now\n\nA gap.\n",
  diagrams: {
    "1": "C4Container\n",
    "2": "sequenceDiagram\n",
    "3": "classDiagram\n",
  },
});

export const PARTIAL_RECORD = withGoal({
  intent: { problem: "A problem.", approach: "An approach.", risks: [], unknowns: [] },
  narrative: { landscape: { narration: "Only the landscape." } },
});

export const NESTED_NARRATIVE = withGoal({
  narrative: {
    levels: {
      landscape: { narration: "The landscape." },
      problem_solution: { narration: "The problem and the solution." },
      architecture: { narration: "The architecture." },
    },
  },
});

export const NARRATIVE_WITHOUT_ARCHITECTURE = withGoal({
  narrative: {
    landscape: { narration: "The landscape." },
    problem_solution: { narration: "The problem and the solution." },
  },
});
