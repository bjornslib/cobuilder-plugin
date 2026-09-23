/**
 * The readiness rule, on its own.
 *
 * `recordVerdicts` turns one design's authored records into a verdict per record kind.
 * `presentCount` counts how many of the six records exist. Both are pure, so this file
 * needs no DOM, no bundle, and no runner setup beyond Vitest itself.
 *
 * Every fixture is written the way `data/designs.js` writes a record. The fixtures reach
 * `DesignRecord` through `unknown` on purpose: this file fixes what the rule reads, not
 * how the record type spells its optionality.
 */

import { describe, expect, it } from "vitest";

import {
  RECORD_KINDS,
  RECORD_LABEL,
  presentCount,
  recordVerdicts,
  type DesignRecord,
} from "./readiness";

/* ------------------------------------------------------------------ fixtures */

function record(parts: Record<string, unknown>): DesignRecord {
  return parts as unknown as DesignRecord;
}

/** A whole goal, so a fixture can vary one record and leave the other five whole. */
const GOAL = {
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
function withGoal(parts: Record<string, unknown> = {}): DesignRecord {
  return record({ goal: GOAL, ...parts });
}

/** A whole record of every kind, as the richest design in the bundle writes one. */
const EVERY_RECORD = withGoal({
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

/* -------------------------------------------------------------------- tests */

describe("readiness", () => {
  it("names the six record kinds in reading order", () => {
    expect(RECORD_KINDS).toEqual([
      "goal",
      "intent",
      "narrative",
      "assessment",
      "pr-draft",
      "diagrams",
    ]);

    const labels = RECORD_KINDS.map((kind) => RECORD_LABEL[kind]);
    expect(labels.every((label) => typeof label === "string" && label.length > 0)).toBe(
      true,
    );
    expect(new Set(labels).size).toBe(RECORD_KINDS.length);
  });

  it("reads a design holding every record as present on all six", () => {
    const verdicts = recordVerdicts(EVERY_RECORD);

    for (const kind of RECORD_KINDS) {
      expect(verdicts[kind].state, RECORD_LABEL[kind]).toBe("present");
      expect(verdicts[kind].missing, RECORD_LABEL[kind]).toEqual([]);
    }
    expect(presentCount(verdicts)).toBe(6);
  });

  it("reads a design designs.js does not carry as absent on all six", () => {
    const verdicts = recordVerdicts(undefined);

    for (const kind of RECORD_KINDS) {
      expect(verdicts[kind].state, RECORD_LABEL[kind]).toBe("absent");
    }
    expect(presentCount(verdicts)).toBe(0);
  });

  it("counts a partial record as held and an absent one as not held", () => {
    const verdicts = recordVerdicts(
      withGoal({
        intent: { problem: "A problem.", approach: "An approach.", risks: [], unknowns: [] },
        narrative: { landscape: { narration: "Only the landscape." } },
      }),
    );

    expect(verdicts.intent.state).toBe("partial");
    expect(verdicts.narrative.state).toBe("partial");
    expect(verdicts.assessment.state).toBe("absent");
    expect(presentCount(verdicts)).toBe(3);
  });

  it("names design mode's stages 2 to 7 as the goal's missing part on a backlog design", () => {
    const verdicts = recordVerdicts(
      withGoal({ goal: { ...GOAL, min_work: { challenge_stage_run: false } } }),
    );

    expect(verdicts.goal.state).toBe("partial");
    expect(verdicts.goal.missing).toHaveLength(1);
    expect(verdicts.goal.missing.join(" ")).toMatch(/stages 2 to 7/);
    expect(verdicts.intent.state).toBe("absent");
    expect(presentCount(verdicts)).toBe(1);
  });

  it("names the goal's empty fields when the goal omits them", () => {
    const verdicts = recordVerdicts(
      withGoal({ goal: { ...GOAL, outcome: "   ", done_when: [] } }),
    );

    expect(verdicts.goal.state).toBe("partial");
    expect(verdicts.goal.missing).toContain("outcome");
    expect(verdicts.goal.missing).toContain("done_when");
  });

  it("names the intent's empty fields", () => {
    const verdicts = recordVerdicts(
      withGoal({ intent: { problem: "A problem.", approach: "  ", risks: [], unknowns: [] } }),
    );

    expect(verdicts.intent.state).toBe("partial");
    expect(verdicts.intent.missing).toContain("approach");
    expect(verdicts.intent.missing).toContain("risks");
    expect(verdicts.intent.missing).toContain("unknowns");
  });

  it("reads a narrative whose three levels sit under levels as present", () => {
    const verdicts = recordVerdicts(
      withGoal({
        narrative: {
          levels: {
            landscape: { narration: "The landscape." },
            problem_solution: { narration: "The problem and the solution." },
            architecture: { narration: "The architecture." },
          },
        },
      }),
    );

    expect(verdicts.narrative.state).toBe("present");
    expect(verdicts.narrative.missing).toEqual([]);
  });

  it("names the narrative level that carries no narration", () => {
    const verdicts = recordVerdicts(
      withGoal({
        narrative: {
          landscape: { narration: "The landscape." },
          problem_solution: { narration: "The problem and the solution." },
        },
      }),
    );

    expect(verdicts.narrative.state).toBe("partial");
    expect(verdicts.narrative.missing.join(" ")).toMatch(/architecture/i);
  });

  it("names the assessment's empty fields", () => {
    const verdicts = recordVerdicts(
      withGoal({ assessment: { verdict: "proceed", summary: "", findings: [] } }),
    );

    expect(verdicts.assessment.state).toBe("partial");
    expect(verdicts.assessment.missing).toContain("summary");
    expect(verdicts.assessment.missing).toContain("findings");
  });

  it("names a draft with no section as partial", () => {
    const verdicts = recordVerdicts(withGoal({ pr_draft: "A draft with no heading." }));

    expect(verdicts["pr-draft"].state).toBe("partial");
    expect(verdicts["pr-draft"].missing.join(" ")).toMatch(/sections/i);
  });

  it("names the diagram levels the record does not carry", () => {
    const verdicts = recordVerdicts(
      withGoal({ diagrams: { "1": "C4Container\n", "2": "sequenceDiagram\n" } }),
    );

    expect(verdicts.diagrams.state).toBe("partial");
    expect(verdicts.diagrams.missing.join(" ")).toMatch(/level 3/);
  });
});
