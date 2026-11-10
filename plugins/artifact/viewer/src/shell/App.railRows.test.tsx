import { cleanup, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { DESIGNS, INDEX, installAdrs } from "./testSupport/App/fixtures";
import { disabledOf, hrefOf, labelOf, levelHeading, rail, railRows } from "./testSupport/App/queries";
import { nameOf, railSource, type RailStep } from "./testSupport/App/rail";
import { renderAt } from "./testSupport/App/render";
import { installJsdomStubs } from "./testSupport/jsdom";
import { railGroups } from "./model";

beforeAll(installJsdomStubs);

beforeEach(() => {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  installAdrs();
});

afterEach(cleanup);

const TEN_LABELS = [
  "Intent, the work item, 6 records",
  "Problem & Solution, the work item, 5 of 7 fields",
  "Architecture, the work item, 3 records",
  "Plan, the work item",
  "Epics, the work item, 1 epics",
  "Rubrics, the work item, none",
  "Intent, the pull request",
  "Problem & Solution, the pull request",
  "Architecture, the pull request",
  "File Diffs, the pull request",
];

const TEN_HREFS = [
  "#/cobuilder-viewer/intent",
  "#/cobuilder-viewer/problem-and-solution",
  "#/cobuilder-viewer/architecture",
  "#",
  "#/cobuilder-viewer/build/epics",
  "#/cobuilder-viewer/build/rubrics",
  "#/cobuilder-viewer/pull-requests/11",
  "#/cobuilder-viewer/pull-requests/11/problem-and-solution",
  "#/cobuilder-viewer/pull-requests/11/architecture",
  "#/cobuilder-viewer/pull-requests/11/file-diffs",
];

async function rendersTenRows() {
  renderAt("#/cobuilder-viewer/intent");
  await waitFor(() => expect(levelHeading()).toBe("Intent"));
  expect(railRows().map(labelOf)).toEqual(TEN_LABELS);
  expect(railRows().map(hrefOf)).toEqual(TEN_HREFS);
}

async function groupsRail() {
  renderAt("#/cobuilder-viewer/intent");
  await waitFor(() => expect(levelHeading()).toBe("Intent"));
  const labels = within(rail())
    .getAllByRole("button", { expanded: true })
    .map((button) => (button.textContent ?? "").trim());
  expect(labels).toEqual(["Levels", "Also", "Pull request 11"]);
}

function railEntries(): RailStep[] {
  return railGroups(railSource("cobuilder-viewer")).flatMap(
    (group: { entries: RailStep[] }) => group.entries,
  );
}

/*
  A second copy of the row order once lost every row below Architecture, so the rail
  and the walk read one list (ADR-0034 removed the board row). `entries` holds the rows
  a press can reach, so the rendered side drops the disabled ones.
*/
async function holdsOneRowList() {
  renderAt("#/cobuilder-viewer/intent");
  await waitFor(() => expect(levelHeading()).toBe("Intent"));
  const entries = railEntries();
  const reachable = railRows().filter((row) => !disabledOf(row));
  expect(entries.map(nameOf)).toEqual(reachable.map(labelOf));
  expect(entries.map((entry) => entry.href)).toEqual(reachable.map(hrefOf));
  expect(entries.map((entry) => entry.available)).toEqual(
    reachable.map((row) => !disabledOf(row)),
  );
}

/*
  Every row is a step. The first cut of the traversal moved between the three level rows
  only, so a reader could not reach Epics from Architecture. The rail and the traversal
  read the one `railGroups` list, so they cannot drift. A disabled row keeps `href="#"`,
  and a step onto it would open the board, so the traversal skips it. A field owns its
  caret keys and a modifier names a command, so the pager's key handler guards both.
*/
describe("The rail's arrow keys", () => {
  it("renders the ten rows in the rail's own order: Levels, Also, then Review", rendersTenRows);
  it("groups the rail as Levels, Also, and the pull request", groupsRail);
  it("holds one row list, and the rail renders it whole", holdsOneRowList);
});
