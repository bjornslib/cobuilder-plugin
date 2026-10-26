/*
  jsdom implements neither `matchMedia` nor `ResizeObserver`, and the shell asks both on its
  first render. The stubs answer the query false and observe nothing. `loadIndex`,
  `loadDesigns`, and `loadAdrs` prefer the inlined globals, so the three fixtures are the
  whole bundle and nothing reaches the network.
*/

import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { DESIGNS, INDEX, installAdrs } from "./testSupport/App/fixtures";
import { drawerScope, supersededLane } from "./testSupport/App/queries";
import { present } from "./testSupport/App/present";
import { renderAt } from "./testSupport/App/render";
import { installJsdomStubs } from "./testSupport/jsdom";

const SUPERSEDED_ROW = "inflight-record-store, stage superseded";

beforeAll(installJsdomStubs);

beforeEach(() => {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  installAdrs();
});

afterEach(cleanup);

/* ADR-0034: the board is the drawer, so the bare route opens it over a muted landing. */
async function opensDrawerOnBareRoute() {
  renderAt("#/");
  await waitFor(() => expect(screen.getByRole("dialog", { name: "WORK" })).toBeTruthy());
  const dialog = screen.getByRole("dialog", { name: "WORK" });
  expect(
    within(dialog).getByRole("button", { name: "cobuilder-viewer, stage approved" }),
  ).toBeTruthy();
  expect(within(dialog).getByRole("button", { name: SUPERSEDED_ROW })).toBeTruthy();
}

function foldLane(dialog: HTMLElement, lane: HTMLElement) {
  fireEvent.click(lane);
  expect(lane.getAttribute("aria-expanded")).toBe("false");
  expect(within(dialog).getByRole("button", { name: SUPERSEDED_ROW })).toBeTruthy();
}

function currentLaneRefusesFold(dialog: HTMLElement) {
  fireEvent.click(within(dialog).getByRole("button", { name: SUPERSEDED_ROW }));
  const lane = present(supersededLane(dialog));
  expect(lane.getAttribute("aria-expanded")).toBe("true");
}

/*
  A fold is a display choice, not an exclusion. The engineer caught the deck removing
  folded rows from the board. A folded lane keeps its rows mounted, in the walk and in
  the counts, and the lane that holds the current row refuses the fold.
*/
async function foldsLaneAndRemovesNothing() {
  renderAt("#/");
  await waitFor(() => expect(drawerScope()).toBeTruthy());
  const dialog = drawerScope();
  const lane = supersededLane(dialog);
  expect(lane).toBeTruthy();
  foldLane(dialog, present(lane));
  currentLaneRefusesFold(dialog);
}

function stepDeckDown(lane: HTMLElement) {
  /* The deck takes its own keys, so the press goes to its body. */
  const deckBody = lane.closest("div.min-h-0.min-w-0.flex-1") as HTMLElement;
  fireEvent.keyDown(deckBody, { key: "ArrowDown", bubbles: true });
  fireEvent.keyDown(deckBody, { key: "ArrowDown", bubbles: true });
}

function expectLaneReopened(dialog: HTMLElement) {
  const reopened = supersededLane(dialog);
  expect(reopened?.getAttribute("aria-expanded")).toBe("true");
  expect(within(dialog).getByRole("button", { name: SUPERSEDED_ROW })).toBeTruthy();
}

async function walkReopensFoldedLane() {
  renderAt("#/");
  await waitFor(() => expect(drawerScope()).toBeTruthy());
  const dialog = drawerScope();
  const lane = present(supersededLane(dialog));
  fireEvent.click(lane);
  expect(lane.getAttribute("aria-expanded")).toBe("false");
  stepDeckDown(lane);
  await waitFor(() => expectLaneReopened(dialog));
}

/* ADR-0034 made the landing an empty pane: the drawer is the board, so no old board part may remain. */
function expectNoBoardApparatus() {
  expect(screen.queryByRole("heading", { name: "Work" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Open the Work board" })).toBeNull();
  expect(screen.queryByRole("navigation", { name: "Sections of this level" })).toBeNull();
  expect(screen.queryByText(/Section \d+ of \d+/)).toBeNull();
  expect(screen.queryByRole("button", { name: "Previous" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
}

async function landingDrawsNoStripNoPagerNoProgress() {
  renderAt("#/");
  await waitFor(() => expect(screen.getByRole("dialog", { name: "WORK" })).toBeTruthy());
  fireEvent.keyDown(document.body, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "WORK" })).toBeNull());
  expectNoBoardApparatus();
}

async function keepsErrorForUnknownId() {
  renderAt("#/no-such-design/intent");
  await waitFor(() =>
    expect(screen.getByText("The route names an id the bundle lacks")).toBeTruthy(),
  );
  expect(screen.getAllByText(/no-such-design/).length).toBeGreaterThan(0);
  expect(screen.queryByRole("heading", { name: "Work" })).toBeNull();
}

describe("Shell", () => {
  it("opens the Work drawer when the route names no work item", opensDrawerOnBareRoute);
  it("folds a lane, and the fold removes nothing", foldsLaneAndRemovesNothing);
  it("the walk onto a row in a folded lane reopens the lane", walkReopensFoldedLane);
  it("draws no strip, no pager, and no progress strip on the landing", landingDrawsNoStripNoPagerNoProgress);
  it("keeps the error a route that names an id the bundle lacks", keepsErrorForUnknownId);
});
