/**
 * The fixtures reach `DesignRecord` through `unknown` on purpose. This file fixes what
 * the rule reads, not how the record type spells its optionality.
 */

import { describe, expect, it } from "vitest";

import { RECORD_KINDS, RECORD_LABEL, presentCount, recordVerdicts } from "./readiness";
import {
  EVERY_RECORD,
  GOAL,
  NARRATIVE_WITHOUT_ARCHITECTURE,
  NESTED_NARRATIVE,
  PARTIAL_RECORD,
  withGoal,
} from "./testSupport/readiness/records";

function expectLabelsDistinct() {
  const labels = RECORD_KINDS.map((kind) => RECORD_LABEL[kind]);
  expect(labels.every((label) => typeof label === "string" && label.length > 0)).toBe(true);
  expect(new Set(labels).size).toBe(RECORD_KINDS.length);
}

function namesSixKinds() {
  expect(RECORD_KINDS).toEqual(["goal", "intent", "narrative", "assessment", "pr-draft", "diagrams"]);
  expectLabelsDistinct();
}

function readsEveryRecordPresent() {
  const verdicts = recordVerdicts(EVERY_RECORD);

  for (const kind of RECORD_KINDS) {
    expect(verdicts[kind].state, RECORD_LABEL[kind]).toBe("present");
    expect(verdicts[kind].missing, RECORD_LABEL[kind]).toEqual([]);
  }
  expect(presentCount(verdicts)).toBe(6);
}

function readsUncarriedDesignAbsent() {
  const verdicts = recordVerdicts(undefined);

  for (const kind of RECORD_KINDS) {
    expect(verdicts[kind].state, RECORD_LABEL[kind]).toBe("absent");
  }
  expect(presentCount(verdicts)).toBe(0);
}

function countsPartialAsHeld() {
  const verdicts = recordVerdicts(PARTIAL_RECORD);

  expect(verdicts.intent.state).toBe("partial");
  expect(verdicts.narrative.state).toBe("partial");
  expect(verdicts.assessment.state).toBe("absent");
  expect(presentCount(verdicts)).toBe(3);
}

function namesStagesTwoToSeven() {
  const verdicts = recordVerdicts(
    withGoal({ goal: { ...GOAL, min_work: { challenge_stage_run: false } } }),
  );

  expect(verdicts.goal.state).toBe("partial");
  expect(verdicts.goal.missing).toHaveLength(1);
  expect(verdicts.goal.missing.join(" ")).toMatch(/stages 2 to 7/);
  expect(verdicts.intent.state).toBe("absent");
  expect(presentCount(verdicts)).toBe(1);
}

function namesGoalEmptyFields() {
  const verdicts = recordVerdicts(
    withGoal({ goal: { ...GOAL, outcome: "   ", done_when: [] } }),
  );

  expect(verdicts.goal.state).toBe("partial");
  expect(verdicts.goal.missing).toContain("outcome");
  expect(verdicts.goal.missing).toContain("done_when");
}

function namesIntentEmptyFields() {
  const verdicts = recordVerdicts(
    withGoal({ intent: { problem: "A problem.", approach: "  ", risks: [], unknowns: [] } }),
  );

  expect(verdicts.intent.state).toBe("partial");
  expect(verdicts.intent.missing).toContain("approach");
  expect(verdicts.intent.missing).toContain("risks");
  expect(verdicts.intent.missing).toContain("unknowns");
}

function readsNestedNarrativeAsPresent() {
  const verdicts = recordVerdicts(NESTED_NARRATIVE);

  expect(verdicts.narrative.state).toBe("present");
  expect(verdicts.narrative.missing).toEqual([]);
}

function namesNarrativeLevelWithoutNarration() {
  const verdicts = recordVerdicts(NARRATIVE_WITHOUT_ARCHITECTURE);

  expect(verdicts.narrative.state).toBe("partial");
  expect(verdicts.narrative.missing.join(" ")).toMatch(/architecture/i);
}

function namesAssessmentEmptyFields() {
  const verdicts = recordVerdicts(
    withGoal({ assessment: { verdict: "proceed", summary: "", findings: [] } }),
  );

  expect(verdicts.assessment.state).toBe("partial");
  expect(verdicts.assessment.missing).toContain("summary");
  expect(verdicts.assessment.missing).toContain("findings");
}

function namesDraftWithNoSection() {
  const verdicts = recordVerdicts(withGoal({ pr_draft: "A draft with no heading." }));

  expect(verdicts["pr-draft"].state).toBe("partial");
  expect(verdicts["pr-draft"].missing.join(" ")).toMatch(/sections/i);
}

function namesMissingDiagramLevels() {
  const verdicts = recordVerdicts(
    withGoal({ diagrams: { "1": "C4Container\n", "2": "sequenceDiagram\n" } }),
  );

  expect(verdicts.diagrams.state).toBe("partial");
  expect(verdicts.diagrams.missing.join(" ")).toMatch(/level 3/);
}

describe("readiness", () => {
  it("names the six record kinds in reading order", namesSixKinds);
  it("reads a design holding every record as present on all six", readsEveryRecordPresent);
  it("reads a design designs.js does not carry as absent on all six", readsUncarriedDesignAbsent);
  it("counts a partial record as held and an absent one as not held", countsPartialAsHeld);
  it(
    "names design mode's stages 2 to 7 as the goal's missing part on a backlog design",
    namesStagesTwoToSeven,
  );
  it("names the goal's empty fields when the goal omits them", namesGoalEmptyFields);
});

describe("readiness", () => {
  it("names the intent's empty fields", namesIntentEmptyFields);
  it("reads a narrative whose three levels sit under levels as present", readsNestedNarrativeAsPresent);
  it("names the narrative level that carries no narration", namesNarrativeLevelWithoutNarration);
  it("names the assessment's empty fields", namesAssessmentEmptyFields);
  it("names a draft with no section as partial", namesDraftWithNoSection);
  it("names the diagram levels the record does not carry", namesMissingDiagramLevels);
});
