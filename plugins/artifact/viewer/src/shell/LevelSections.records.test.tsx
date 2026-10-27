import { cleanup } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { DesignRecord } from "@/data/bundle";

import { buildWorkItems } from "./model";
import {
  ALTERNATIVE_OPTION,
  BOUNDARY_TARGET,
  DESIGN,
  OTHER,
} from "./testSupport/LevelSections/constants";
import { DESIGNS, RICH } from "./testSupport/LevelSections/designRecords";
import { useLevelFixture } from "./testSupport/LevelSections/install";
import { openLevel, openPaged } from "./testSupport/LevelSections/open.test.helpers";
import { stripLabels } from "./testSupport/LevelSections/paged.test.helpers";
import {
  drawnLevels,
  holds,
  pane,
  panelNamed,
  panelTitles,
  rowIds,
} from "./testSupport/LevelSections/panes.test.helpers";
import { INDEX } from "./testSupport/LevelSections/recordIndex";
import { required } from "./testSupport/LevelSections/required";
import { workOf } from "./testSupport/LevelSections/work.test.helpers";

useLevelFixture();

const DESIGN_ADRS = ["ADR-0028", "ADR-0029"];
const INDEX_ADRS = ["ADR-0028", "ADR-0029", "ADR-0030"];
const BEAT_CASES = [[], [{ kind: "mystery", text: "A beat of an unknown kind." }]];

type Beats = NonNullable<NonNullable<DesignRecord["narrative"]>["problem_solution"]>["beats"];

async function cardsTextWithBeats(beats: Beats): Promise<string> {
  cleanup();
  const solution = RICH.narrative?.problem_solution;
  if (solution) solution.beats = beats;
  await openPaged(`#/${DESIGN}/problem-and-solution`, "Problem and solution");
  return panelNamed("Problem and solution").textContent ?? "";
}

function expectNoGapSentences(text: string) {
  expect(text, "no missing-beat sentence").not.toMatch(/No beat of kind/);
  expect(text, "no unknown-kind sentence").not.toMatch(/carry a kind outside/);
  expect(text, "no unknown-kind sentence").not.toMatch(/carries? a kind outside/);
}

/*
  The build reports a missing record part (record_gap_warnings in build_index.py). The
  viewer states none. A record with no beats, and a record with a beat of an unknown kind,
  both leave the cards free of gap sentences.
*/
async function statesNoRecordGap() {
  const original = RICH.narrative?.problem_solution?.beats;
  try {
    for (const beats of BEAT_CASES) expectNoGapSentences(await cardsTextWithBeats(beats));
  } finally {
    const solution = RICH.narrative?.problem_solution;
    if (solution) solution.beats = original;
  }
}

function expectArchitectureValues() {
  expect(
    drawnLevels(panelNamed("Diagrams")),
    "the mechanism levels, and not the container drawing",
  ).toEqual(["2", "3"]);
  expect(rowIds(panelNamed("Architecture Decisions"))).toEqual(DESIGN_ADRS);
  expect(holds(panelNamed("Boundaries"), BOUNDARY_TARGET)).toBe(true);
  expect(holds(panelNamed("Districts and alternatives considered"), ALTERNATIVE_OPTION)).toBe(true);
}

/*
  C1's third level. The level draws the mechanism drawings, so its Diagrams panel holds
  levels 2 and 3 and never the container drawing, which belongs to Intent. The Boundaries
  panel reads the rules of the contexts a linked decision lands in.
*/
async function rendersArchitectureSections() {
  await openPaged(`#/${DESIGN}/architecture`, "Architecture");

  expect(panelTitles()).toEqual([
    "Diagrams",
    "Architecture Decisions",
    "Boundaries",
    "Districts and alternatives considered",
  ]);
  expect(stripLabels()).toEqual(panelTitles());
  expectArchitectureValues();
}

function expectIndexLinks() {
  const work = workOf(DESIGN);
  expect(
    work.linkedAdrs.map((adr) => adr.id),
    "the index links these two decisions to this design",
  ).toEqual(DESIGN_ADRS);
  expect(
    INDEX.entities.adr.map((adr) => adr.id),
    "and the index holds three",
  ).toEqual(INDEX_ADRS);
}

/*
  The other work's decision is read first, so that a panel which listed every decision in
  the bundle fires here and not on the order check below it.
*/
function expectOtherDecisionAbsent() {
  expect(pane().textContent, "the other work's decision is not this work's").not.toContain(
    "Another work's decision",
  );
  expect(rowIds(panelNamed("Architecture Decisions"))).toEqual(DESIGN_ADRS);
}

/*
  C1's second piece of evidence, the one that compares a section against the bundle.
  `work.linkedAdrs` resolves `goal.adrs[]` through the index's `adr` entities. The other
  work names a third decision, so a panel that listed every decision in the bundle, or
  carried a list of its own, fails on one half of this case or the other.
*/
async function listsOnlyThisWorksDecisions() {
  expectIndexLinks();

  await openPaged(`#/${DESIGN}/architecture`, "Architecture");
  expectOtherDecisionAbsent();

  cleanup();
  await openLevel(`#/${OTHER}/architecture`, "Architecture");
  expect(rowIds(panelNamed("Architecture Decisions")), "and the other work lists its own").toEqual([
    "ADR-0030",
  ]);
}

function linksEpicDecisionToItsWork() {
  const records = structuredClone(DESIGNS);
  const goal = required(records[DESIGN].goal, "the design goal");
  goal.adrs = [];
  goal.epics = [{ ...required(goal.epics, "the goal epics")[0], adr: "ADR-0029" }];
  const work = buildWorkItems(INDEX, records).get(DESIGN);
  expect(work?.linkedAdrs.map((adr) => adr.id)).toEqual(["ADR-0029"]);
}

describe("Slice 10 · every section of every level renders its own records", () => {
  it("states no record gap on the Problem and solution cards", statesNoRecordGap);

  it(
    "renders the Architecture level's four sections, each from the record",
    rendersArchitectureSections,
  );
});

describe("Slice 10 · every section of every level renders its own records", () => {
  it(
    "lists exactly the decisions the index links to this design, and no other work's",
    listsOnlyThisWorksDecisions,
  );
});

describe("A decision named on an epic", () => {
  it("links to the work that owns the epic", linksEpicDecisionToItsWork);
});
