import { within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { epicGroups, type WorkItem } from "./model";
import {
  DESIGN,
  EPIC_COUNT,
  EPICS_PER_SECTION,
  GATE_STEPS,
  RUN_TITLES,
} from "./testSupport/LevelSections/constants";
import { useLevelFixture } from "./testSupport/LevelSections/install";
import { openLevel, openPaged } from "./testSupport/LevelSections/open.test.helpers";
import { pagerText, panelOf, stripLabels } from "./testSupport/LevelSections/paged.test.helpers";
import {
  holds,
  panelNamed,
  panelTitles,
  rowIds,
  rowsIn,
} from "./testSupport/LevelSections/panes.test.helpers";
import { EPIC_ROWS } from "./testSupport/LevelSections/recordIndex";
import { workOf } from "./testSupport/LevelSections/work.test.helpers";

useLevelFixture();

const MIDDLE_RUN = ["E7", "E8", "E9", "E10", "E11", "E12"];
const EPIC_IDS = Array.from({ length: EPIC_COUNT }, (_, position) => `E${position + 1}`);

function expectRunPanels(boxes: HTMLElement[]) {
  boxes.forEach((box, position) => {
    const panel = panelOf(box);
    expect(panel.getAttribute("data-shell-panel")).toBe(RUN_TITLES[position]);
    expect(rowsIn(panel)).toHaveLength(EPICS_PER_SECTION);
  });
}

function expectMiddleRun(box: HTMLElement) {
  expect(rowIds(panelOf(box)), "the middle run holds its own epics").toEqual(MIDDLE_RUN);
  expect(
    holds(panelOf(box), EPIC_ROWS[7].outcome),
    "a run's row shows the plan record's own outcome",
  ).toBe(true);
}

/*
  C1's fourth level. Its sections come from the corpus, not from a fixed list. The second
  run's rows are read one by one, so a panel that repeated the first run fails here and
  does not pass on the count.
*/
async function rendersEpicRuns() {
  const boxes = await openPaged(`#/${DESIGN}/build/epics`, "Build");

  expect(boxes).toHaveLength(RUN_TITLES.length);
  expect(stripLabels()).toEqual(RUN_TITLES);
  expect(pagerText()).toBe("Section 1 of 3");
  expectRunPanels(boxes);
  expectMiddleRun(boxes[1]);
}

function expectGateRows(panel: HTMLElement) {
  const rows = Array.from(panel.querySelectorAll("li"));
  expect(rows.map((row) => (row.textContent ?? "").trim())).toEqual(
    GATE_STEPS.map((step) => `${step.n}${step.name}${step.state}`),
  );
}

/*
  C1's fourth level, second sub-view. The Rubrics entry is a sub-view of Build, not a
  section of the track, so it stacks in the pane's own scroll and carries one panel. Its
  rows are the steps `joins.feature_gates` holds for this work's plan slug.
*/
async function rendersRubricsSubView() {
  await openLevel(`#/${DESIGN}/build/rubrics`, "Build");

  expect(panelTitles()).toEqual(["Rubrics"]);
  const panel = panelNamed("Rubrics");
  expect(
    within(panel).queryByText(/not present/i),
    "the index holds a gate record, so the panel marks no absence",
  ).toBeNull();
  expectGateRows(panel);
}

function epicIdsOf(work: WorkItem): string[] {
  return work.epics.map((epic) => epic.epic_id);
}

/*
  C4's rule as the derivation. The epics arrive in delivery order from the index, and this
  asserts that the fixture's order is the one the design assumes: E1 through E18.
*/
function cutsEpicsIntoRuns() {
  const work = workOf(DESIGN);
  const groups = epicGroups(work);

  expect(work.epics.map((epic) => epic.epic_id)).toEqual(EPIC_IDS);
  expect(groups.map((group) => group.length)).toEqual([6, 6, 6]);
  expect(groups.length, "eighteen epics are not one section").toBeGreaterThan(1);
  expect(
    groups.flat().map((epic) => epic.epic_id),
    "the runs together hold every epic, in order",
  ).toEqual(epicIdsOf(work));
}

function expectEachEpicOnce(seen: string[], work: WorkItem) {
  expect(seen, "every epic the design carries appears once").toEqual(epicIdsOf(work));
  expect(new Set(seen).size, "and none appears twice").toBe(seen.length);
  expect(seen, "and all eighteen are read").toHaveLength(EPIC_COUNT);
}

/*
  The union is read as a list and as a set, so an epic that appeared twice fails the second
  check and a run that dropped one fails the first.
*/
async function rendersOneSectionPerRun() {
  const boxes = await openPaged(`#/${DESIGN}/build/epics`, "Build");
  const work = workOf(DESIGN);
  const runs = boxes.map((box) => rowIds(panelOf(box)));

  expect(boxes, "one section per run").toHaveLength(epicGroups(work).length);
  expect(runs).toEqual(epicGroups(work).map((group) => group.map((epic) => epic.epic_id)));
  expectEachEpicOnce(runs.flat(), work);
}

async function givesEachSectionARange() {
  await openPaged(`#/${DESIGN}/build/epics`, "Build");

  expect(stripLabels()).toEqual(RUN_TITLES);
  expect(pagerText()).toBe("Section 1 of 3");
}

describe("Slice 10 · every section of every level renders its own records", () => {
  it("renders the Build level's epic runs, one run per section", rendersEpicRuns);

  it(
    "renders the Build level's Rubrics sub-view with the gate steps the index holds",
    rendersRubricsSubView,
  );
});

describe("Slice 10 · the Build level pages its epics in runs", () => {
  it("cuts the work's epics into runs of six, in delivery order", cutsEpicsIntoRuns);

  it(
    "renders one section per run, and the runs together hold every epic once",
    rendersOneSectionPerRun,
  );
});

describe("Slice 10 · the Build level pages its epics in runs", () => {
  it(
    "gives each section a range of its own, so the strip says which epics are in the box",
    givesEachSectionARange,
  );
});
