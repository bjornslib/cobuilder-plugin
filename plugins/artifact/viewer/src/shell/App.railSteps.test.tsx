import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { DESIGNS, INDEX, installAdrs } from "./testSupport/App/fixtures";
import { disabledOf, hrefOf, labelOf, levelHeading, press, railRows } from "./testSupport/App/queries";
import { renderAt } from "./testSupport/App/render";
import { installJsdomStubs } from "./testSupport/jsdom";

beforeAll(installJsdomStubs);

beforeEach(() => {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  installAdrs();
});

afterEach(cleanup);

/** One rail row, by the label it carries. */
function rowNamed(label: string): HTMLElement {
  const row = railRows().find((candidate) => labelOf(candidate) === label);
  expect(row, `a rail row names ${label}`).toBeTruthy();
  return row as HTMLElement;
}

async function opensAlsoRow() {
  renderAt("#/cobuilder-viewer/intent");
  await waitFor(() => expect(levelHeading()).toBe("Intent"));
  fireEvent.click(rowNamed("File Diffs, the pull request"));
  await waitFor(() =>
    expect(window.location.hash).toBe("#/cobuilder-viewer/pull-requests/11/file-diffs"),
  );
  /* From the change account, a work row opens the program account's row. */
  fireEvent.click(rowNamed("Epics, the work item, 1 epics"));
  await waitFor(() => expect(window.location.hash).toBe("#/cobuilder-viewer/build/epics"));
}

/*
  Epics and Rubrics both name the Build section, so the reader's own row is the row
  they arrived on and not the section they share. A match on the section alone would
  find Epics below Rubrics, and the press would step onto the row the reader is
  already on. The row below Rubrics is the pull request's Intent row.
*/
async function stepsDownFromRubrics() {
  renderAt("#/cobuilder-viewer/build/rubrics");
  await waitFor(() => expect(levelHeading()).toBe("Build"));
  press("ArrowDown");
  await waitFor(() => {
    expect(window.location.hash).toBe(hrefOf(rowNamed("Intent, the pull request")));
  });
}

async function stepsUpFromRubrics() {
  renderAt("#/cobuilder-viewer/build/rubrics");
  await waitFor(() => expect(levelHeading()).toBe("Build"));
  /* The same shared section, in the other direction. The row above Rubrics is Epics. */
  press("ArrowUp");
  await waitFor(() => {
    expect(window.location.hash).toBe(hrefOf(rowNamed("Epics, the work item, 1 epics")));
  });
}

const DISABLED_LABELS = [
  "Problem & Solution, the work item",
  "Architecture, the work item",
  "Plan, the work item",
  "File Diffs, the pull request",
];

/*
  This design holds `goal.json` alone, so two level rows read disabled. It holds no plan
  document either, so the Plan row reads disabled too. It carries no pull request, so
  the File Diffs row reads disabled.
*/
function expectDisabledRows() {
  const disabled = railRows().filter(disabledOf);
  expect(disabled.map(labelOf)).toEqual(DISABLED_LABELS);
  expect(disabled.map(hrefOf)).toEqual(["#", "#", "#", "#"]);
  /* A disabled row names its account, then its reason. */
  for (const row of disabled) {
    expect(row.getAttribute("aria-label") ?? "").toMatch(/, the (work item|pull request)/);
  }
}

/*
  The next row a press can reach is Epics, two rows below. Architecture is not a step:
  its row carries `#`, and a step onto it would open the board.
*/
async function stepsAroundDisabledRows() {
  press("ArrowDown");
  await waitFor(() =>
    expect(window.location.hash).toBe(hrefOf(rowNamed("Epics, the work item, 1 epics"))),
  );
  press("ArrowUp");
  await waitFor(() => {
    expect(window.location.hash).toBe(hrefOf(rowNamed("Intent, the work item, 1 records")));
  });
}

async function skipsDisabledRow() {
  renderAt("#/inflight-record-store/intent");
  await waitFor(() => expect(levelHeading()).toBe("Intent"));
  expectDisabledRows();
  await stepsAroundDisabledRows();
}

describe("The rail's arrow keys", () => {
  it("opens an Also row of the other account when pressed", opensAlsoRow);
  it("steps down from Rubrics to the row below it, because two rows share one section", stepsDownFromRubrics);
  it("steps up from Rubrics to Epics, because two rows share one section", stepsUpFromRubrics);
  it("skips a disabled row, because its row carries no address", skipsDisabledRow);
});
