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
  Intent is the first entry now, so this walks from the second to the last. The
  engineer's own case sits in here: from Architecture, the next press reaches Epics.
*/
async function movesDownEveryEntry() {
  renderAt("#/cobuilder-viewer/intent");
  await waitFor(() => expect(levelHeading()).toBe("Intent"));
  for (const row of railRows().slice(1).filter((one) => !disabledOf(one))) {
    press("ArrowDown");
    await waitFor(() => expect(window.location.hash).toBe(hrefOf(row)));
  }
}

/*
  The walk steps one flat list: Levels, Also, then the pull request's rows. This
  fixture has no plan directory, so the Plan row is disabled and the walk skips it.
*/
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
  The board is not a rail entry since ADR-0034, so the program's Intent
  row is the first one. A walk that reaches it has nowhere above: the
  press clamps, and the address does not move.
*/
async function staysOnFirstRow() {
  renderAt("#/cobuilder-viewer/intent");
  await waitFor(() => expect(levelHeading()).toBe("Intent"));
  press("ArrowUp");
  expect(window.location.hash).toBe("#/cobuilder-viewer/intent");
}

/*
  The bare route's rail holds the Work entry alone — no work item means no
  groups — so an arrow press there can only name the entry it is already
  on, and the deck stays in front.
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
  /* A field owns its own caret keys, so a press inside one is the field's. */
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
  /* A modified press names a command, which is the pager's guard and now this one's. */
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
  /* The two key sets share the window, and neither one takes the other's keys. */
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
