import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { DESIGNS, INDEX, installAdrs } from "./testSupport/App/fixtures";
import { drawerScope, hrefOf, levelHeading, press, railRows, disabledOf } from "./testSupport/App/queries";
import { renderAt } from "./testSupport/App/render";
import { installJsdomStubs } from "./testSupport/jsdom";

beforeAll(installJsdomStubs);

beforeEach(() => {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  installAdrs();
});

afterEach(cleanup);

/*
  Intent is the first entry, so the walk starts at the second.
  It covers the engineer's case: from Architecture, the next press reaches Epics.
*/
async function movesDownEveryEntry() {
  renderAt("#/cobuilder-viewer/intent");
  await waitFor(() => expect(levelHeading()).toBe("Intent"));
  for (const row of railRows().slice(1).filter((one) => !disabledOf(one))) {
    press("ArrowDown");
    await waitFor(() => expect(window.location.hash).toBe(hrefOf(row)));
  }
}

/* This fixture has no plan directory, so the Plan row is disabled and the walk skips it. */
const UPWARD_WALK = [
  "#/cobuilder-viewer/pull-requests/11/architecture",
  "#/cobuilder-viewer/pull-requests/11/problem-and-solution",
  "#/cobuilder-viewer/pull-requests/11",
  "#/cobuilder-viewer/build/rubrics",
  "#/cobuilder-viewer/build/epics",
  "#/cobuilder-viewer/architecture",
  "#/cobuilder-viewer/problem-and-solution",
  "#/cobuilder-viewer/intent",
];

async function movesUpEveryRow() {
  renderAt("#/cobuilder-viewer/pull-requests/11/file-diffs");
  await waitFor(() => expect(levelHeading()).toBe("Pull request 11"));
  for (const address of UPWARD_WALK) {
    press("ArrowUp");
    await waitFor(() => expect(window.location.hash).toBe(address));
  }
}

/*
  ADR-0034 made the board no rail entry, so the Intent row is first.
  The press clamps there and the address does not move.
*/
async function staysOnFirstRow() {
  renderAt("#/cobuilder-viewer/intent");
  await waitFor(() => expect(levelHeading()).toBe("Intent"));
  press("ArrowUp");
  expect(window.location.hash).toBe("#/cobuilder-viewer/intent");
}

/*
  The bare route's rail holds only the Work entry (no work item, so no groups).
  An arrow press can only name that entry, so the deck stays in front.
*/
async function staysAtTheBoard() {
  renderAt("#/");
  await waitFor(() => expect(drawerScope()).toBeTruthy());
  expect(window.location.hash).toBe("#/");
  press("ArrowUp");
  press("ArrowDown");
  await waitFor(() => expect(drawerScope()).toBeTruthy());
  expect(window.location.hash).toBe("#/");
}

async function staysAtLastRow() {
  renderAt("#/cobuilder-viewer/pull-requests/11/file-diffs");
  await waitFor(() => expect(levelHeading()).toBe("Pull request 11"));
  press("ArrowDown");
  press("ArrowDown");
  await waitFor(() => expect(levelHeading()).toBe("Pull request 11"));
  expect(window.location.hash).toBe("#/cobuilder-viewer/pull-requests/11/file-diffs");
}

function pressInsideEachField() {
  for (const tag of ["input", "textarea", "select"]) {
    const field = document.createElement(tag);
    document.body.appendChild(field);
    fireEvent.keyDown(field, { key: "ArrowDown" });
    fireEvent.keyDown(field, { key: "ArrowUp" });
    field.remove();
  }
}

async function leavesFieldPressAlone() {
  renderAt("#/cobuilder-viewer/intent");
  await waitFor(() => expect(levelHeading()).toBe("Intent"));
  pressInsideEachField();
  await waitFor(() => expect(levelHeading()).toBe("Intent"));
  expect(window.location.hash).toBe("#/cobuilder-viewer/intent");
}

const MODIFIED_PRESSES: Array<Record<string, boolean>> = [
  { altKey: true },
  { ctrlKey: true },
  { metaKey: true },
  { shiftKey: true },
];

async function leavesModifiedPressAlone() {
  renderAt("#/cobuilder-viewer/intent");
  await waitFor(() => expect(levelHeading()).toBe("Intent"));
  /* A modified press is a command, so the rail leaves it to the pager's guard. */
  for (const init of MODIFIED_PRESSES) press("ArrowDown", init);
  await waitFor(() => expect(levelHeading()).toBe("Intent"));
  expect(window.location.hash).toBe("#/cobuilder-viewer/intent");
}

async function stepsPagerOnLeftAndRight() {
  renderAt("#/cobuilder-viewer/architecture");
  await waitFor(() => expect(levelHeading()).toBe("Architecture"));
  const at2 = "#/cobuilder-viewer/architecture";
  press("ArrowRight");
  await waitFor(() => expect(screen.getByText(/Section 2 of \d+/)).toBeTruthy());
  expect(window.location.hash, "ArrowRight steps the pager and no more").toBe(at2);
  press("ArrowLeft");
  await waitFor(() => expect(screen.getByText(/Section 1 of \d+/)).toBeTruthy());
  expect(window.location.hash, "ArrowLeft steps the pager and no more").toBe(at2);
}

async function stepsPagerAfterRailMove() {
  renderAt("#/cobuilder-viewer/intent");
  await waitFor(() => expect(levelHeading()).toBe("Intent"));
  press("ArrowDown");
  await waitFor(() => expect(levelHeading()).toBe("Problem and solution"));
  press("ArrowRight");
  await waitFor(() => expect(screen.getByText(/Section 2 of \d+/)).toBeTruthy());
}

describe("The rail's arrow keys", () => {
  it("moves down every rail entry in render order", movesDownEveryEntry);
  it("moves up every rail row in render order", movesUpEveryRow);
  it("stays on the first row when ArrowUp finds no row above", staysOnFirstRow);
  it("stays at the first entry, which is the board", staysAtTheBoard);
  it("stays at the last row, which is the change's File Diffs", staysAtLastRow);
});

describe("The rail's arrow keys", () => {
  it("leaves a press inside a field alone", leavesFieldPressAlone);
  it("leaves a press with a modifier alone", leavesModifiedPressAlone);
  it("steps the pager on ArrowLeft and ArrowRight, and never moves the rail", stepsPagerOnLeftAndRight);
  it("still steps the pager after a rail move", stepsPagerAfterRailMove);
});
