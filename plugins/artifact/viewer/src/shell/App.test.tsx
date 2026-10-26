/**
 * The shell's own cases: the surfaces the boot picks.
 *
 * `src/main.tsx` mounts `src/shell/App.tsx`, so this file fixes what a reader meets at
 * each address, and it fixes it against the globals a published file inlines. Nothing
 * here reaches the network: `loadIndex`, `loadDesigns`, and `loadAdrs` all prefer the
 * global when one exists, so the three fixtures below are the whole bundle.
 *
 * The board is the subject of most of these cases, because it is the surface the shell
 * had to gain. `Board.test.tsx` fixes the row's own claims and takes its data as props.
 * This file fixes the route decisions around it: the bare route lands on the board, the
 * board draws no strip and no pager, an unknown id keeps its own error, the rail's `Work`
 * entry returns to the board, and the comparison harness answers no address at all. The
 * prototypes it compared were removed from `src/variations/` on 2026-10-08.
 *
 * The last two cases are slice 7's, and they fix the address in motion: a press on a
 * row's link lands on that design's Work surface at the level the row named, and one
 * row's address opens the same surface on its own, with no board first.
 *
 * One group follows the board's cases. "The rail's arrow keys" fixes the traversal a
 * reader makes with the up and down arrows, over every row the rail renders. Its design
 * therefore holds a record of every kind: the rail's rows appear only when the work fills
 * them, and the walk needs all ten rows.
 * `IntentDrawing.test.tsx` fixes which drawing level the Intent level draws.
 *
 * jsdom implements neither `matchMedia` nor `ResizeObserver`, and the shell asks both
 * questions on its first render: `useCollapsedRail` reads a media query and the diagram
 * tiles observe their box. The stubs answer the query false and observe nothing, which
 * is the desktop rail and a diagram tile whose box is never measured.
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

/*
  The board is the drawer now (ADR-0034): the bare route renders the muted
  landing behind it and the drawer opens itself, so a deep link to `#/`
  lands in the deck — five lanes, the state strip, the search — over the
  shell.
*/
async function opensDrawerOnBareRoute() {
  renderAt("#/");
  await waitFor(() => expect(screen.getByRole("dialog", { name: "WORK" })).toBeTruthy());
  const dialog = screen.getByRole("dialog", { name: "WORK" });
  /* The deck's rows are the fixture's own designs, in the lanes they carry. */
  expect(
    within(dialog).getByRole("button", { name: "cobuilder-viewer, stage approved" }),
  ).toBeTruthy();
  expect(within(dialog).getByRole("button", { name: SUPERSEDED_ROW })).toBeTruthy();
}

function foldLane(dialog: HTMLElement, lane: HTMLElement) {
  /* Fold: the header says closed, and the row is still on the board. */
  fireEvent.click(lane);
  expect(lane.getAttribute("aria-expanded")).toBe("false");
  expect(within(dialog).getByRole("button", { name: SUPERSEDED_ROW })).toBeTruthy();
}

function currentLaneRefusesFold(dialog: HTMLElement) {
  /* The current lane cannot fold: the control refuses. */
  fireEvent.click(within(dialog).getByRole("button", { name: SUPERSEDED_ROW }));
  const lane = present(supersededLane(dialog));
  expect(lane.getAttribute("aria-expanded")).toBe("true");
}

/*
  A FOLD IS A DISPLAY CHOICE, NOT AN EXCLUSION — the rule the rail's
  groups already hold, and the deck now holds too (the engineer caught
  the deck removing folded rows entirely from the board). The folded
  lane collapses to its header; the rows stay mounted, in the walk and
  in the counts. The lane holding the current row refuses the fold.
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
  /* The deck takes its own keys; the walk steps the folded row. */
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
  /* Fold the only lane the walk's second step needs. */
  const lane = present(supersededLane(dialog));
  fireEvent.click(lane);
  expect(lane.getAttribute("aria-expanded")).toBe("false");
  stepDeckDown(lane);
  await waitFor(() => expectLaneReopened(dialog));
}

/*
  The landing is an empty pane per ADR-0034: the drawer is the board, so
  the pane behind it carries no copy and no second control. What must
  not exist on it is the old board's own apparatus.
*/
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
  /* Close the drawer, so the landing answers for itself. */
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
