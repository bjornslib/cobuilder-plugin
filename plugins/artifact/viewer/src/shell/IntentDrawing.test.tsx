/*
  The engineer asked for the container drawing inside the Why panel, so this level renders
  no Diagrams section. Level 1 names the surfaces and their people, which answers what the
  work is and who it is for. Levels 2 and 3 are mechanism and belong to Architecture. A
  record with no drawing level gives the Why panel prose and no gap line. This file has
  its own fixture because `loadDesigns` caches its answer per file, so a record swapped in
  by one case would never be read. It needs three record shapes, one design each.
*/

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import Shell from "./App";
import {
  drawnLevels,
  drawnNamesIn,
  levelsIn,
  panelNamed,
  panelText,
} from "./testSupport/IntentDrawing/helpers";
import { installRecords } from "./testSupport/IntentDrawing/records";
import { installJsdomStubs } from "./testSupport/jsdom";

beforeAll(installJsdomStubs);

beforeEach(installRecords);

afterEach(cleanup);

async function atLevel(workId: string, section: "intent" | "architecture"): Promise<void> {
  window.location.hash = `#/${workId}/${section}`;
  render(<Shell />);
  const title = section === "intent" ? "Intent" : "Architecture";
  await waitFor(() => {
    expect((document.getElementById("work-section-heading")?.textContent ?? "").trim()).toBe(
      title,
    );
  });
}

async function holdsContainerDrawingInWhy() {
  await atLevel("whole-work", "intent");

  expect(drawnNamesIn(panelNamed("Why"))).toEqual(["Open the Container drawing for level 1"]);
}

async function rendersNoDiagramsSection() {
  await atLevel("whole-work", "intent");

  expect(screen.queryByRole("region", { name: "Diagrams" })).toBeNull();
}

async function drawsNoMechanismLevel() {
  await atLevel("whole-work", "intent");

  expect(drawnLevels()).toEqual(["1"]);
}

async function drawsNothingForMechanismsAlone() {
  await atLevel("mechanisms-only", "intent");

  /*
    The drawing is selected by level number, and this record has no level 1.
    Levels 2 and 3 are not this level's, so nothing is drawn.
  */
  expect(drawnNamesIn(panelNamed("Why"))).toEqual([]);
  expect(drawnLevels()).toEqual([]);
}

async function rendersWhyProseWithNoAbsence() {
  await atLevel("no-drawings", "intent");

  const why = panelNamed("Why");
  expect(within(why).getByText("A reader meets no drawing section at all.")).toBeTruthy();
  expect(drawnNamesIn(why)).toEqual([]);
  expect(panelText()).not.toMatch(/no diagram level/i);
  expect(within(why).queryByText(/not present/i)).toBeNull();
}

async function drawsLevelsTwoAndThree() {
  await atLevel("whole-work", "architecture");

  expect(levelsIn(drawnNamesIn(panelNamed("Diagrams")))).toEqual(["2", "3"]);
  expect(drawnLevels()).toEqual(["2", "3"]);
}

describe("The Intent level's drawing", () => {
  it("holds the container drawing inside the Why panel", holdsContainerDrawingInWhy);
  it("renders no Diagrams section of its own", rendersNoDiagramsSection);
  it("draws no mechanism level, even when the record carries one", drawsNoMechanismLevel);
  it("draws nothing when the record carries mechanism levels alone", drawsNothingForMechanismsAlone);
});

describe("The Intent level's drawing", () => {
  it(
    "renders the Why prose with no tile and no absence line when no drawing exists",
    rendersWhyProseWithNoAbsence,
  );
});

describe("The Architecture level's drawing", () => {
  it("draws levels 2 and 3 in its own Diagrams section, and not level 1", drawsLevelsTwoAndThree);
});
