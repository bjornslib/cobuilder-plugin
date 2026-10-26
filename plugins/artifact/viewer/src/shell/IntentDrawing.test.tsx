/**
 * Where the Intent level's drawing sits, and which drawing level each level draws.
 *
 * THE CONTAINER DRAWING SITS INSIDE THE WHY PANEL. It used to be a section of its own on
 * this level, beside the four parts of the contract. The engineer asked for it inside
 * Why, so the Why panel holds the outcome and the drawing, and this level renders no
 * section named Diagrams.
 *
 * LEVEL 1 IS THE CONTAINER DRAWING AND IT BELONGS TO THIS LEVEL. It names the surfaces
 * and the people who use them, which answers what the work is and who it is for. The
 * levels after it are mechanism, and they belong to the Architecture level, which keeps
 * its own Diagrams section for them.
 *
 * A DRAWING THE DESIGN NEVER AUTHORED IS NOT AN ABSENCE. A record with no drawing level
 * gives the Why panel its prose and nothing else. It does not state a gap the reader did
 * not ask about.
 *
 * THIS FILE IS BESIDE `App.test.tsx` BECAUSE OF ITS RECORDS, NOT BECAUSE OF ITS ROUTE.
 * `App.test.tsx` fixes the surfaces the boot picks, and its fixture holds two designs
 * because the board's own case fixes the row set. The cases below need three record
 * shapes, and `loadDesigns` caches its answer for the whole file, so a record one case
 * swaps in would never be read. The three shapes therefore live in this file's own
 * fixture, one design each.
 *
 * jsdom implements neither `matchMedia` nor `ResizeObserver`. The shell asks both
 * questions on its first render: `useCollapsedRail` reads a media query and a diagram
 * tile observes its box. The stubs answer the query false and observe nothing.
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

/** One level of one work item, settled before a case reads it. */
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

  /* The record carries levels 1, 2, and 3. The level draws the first one and stops. */
  expect(drawnLevels()).toEqual(["1"]);
}

async function drawsNothingForMechanismsAlone() {
  await atLevel("mechanisms-only", "intent");

  /*
    The drawing is selected by the level number, and this record carries no level 1.
    Levels 2 and 3 are not this level's, so the Why panel draws nothing and the level
    draws nothing.
  */
  expect(drawnNamesIn(panelNamed("Why"))).toEqual([]);
  expect(drawnLevels()).toEqual([]);
}

async function rendersWhyProseWithNoAbsence() {
  await atLevel("no-drawings", "intent");

  const why = panelNamed("Why");
  /* The panel keeps its prose, so the record is read and only the drawing is missing. */
  expect(within(why).getByText("A reader meets no drawing section at all.")).toBeTruthy();
  expect(drawnNamesIn(why)).toEqual([]);
  /* No panel of this level states the drawing's absence, and none marks one. */
  expect(panelText()).not.toMatch(/no diagram level/i);
  expect(within(why).queryByText(/not present/i)).toBeNull();
}

async function drawsLevelsTwoAndThree() {
  await atLevel("whole-work", "architecture");

  /*
    Level 1 is the container drawing and belongs to the Intent level. Levels 2 and 3
    are mechanism and belong here, so the container drawing stops at the level below.
  */
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
