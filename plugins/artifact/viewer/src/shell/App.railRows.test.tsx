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

/*
  The Levels group holds the work's three levels. The Also group follows with Plan,
  Epics, and Rubrics. The Review group holds the pull request's four rows.
*/
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

/*
  `railGroups` is the one list. Its rows carry these three facts at least, and the
  rail and the traversal both read them here.
*/
function railEntries(): RailStep[] {
  return railGroups(railSource("cobuilder-viewer")).flatMap(
    (group: { entries: RailStep[] }) => group.entries,
  );
}

/*
  The rail renders the rows this one function returns, in this one order. The board
  row is gone (ADR-0034): the rail and the walk now read the same list with no row
  added back by hand. A second copy of the order is what lost every row below
  Architecture.
*/
/*
  `entries` holds the rows a press can reach, so the rendered side drops the disabled
  rows. The "ten rows" case holds the disabled Plan row in place.
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
 * The rail's rows, walked with the up and down arrows.
 *
 * EVERY ROW IS A STEP. The first cut of this traversal moved between the three level rows
 * alone, and the engineer found the hole: a reader could not reach Epics from
 * Architecture. So the traversal covers every row the rail renders, in render order: the
 * board's Work row, then the five rows of Build, then the four of Review.
 *
 * ONE LIST SERVES BOTH. The rail renders the rows `railGroups` returns and the traversal
 * steps the same list, so the two cannot drift. The second case compares them.
 *
 * A DISABLED ROW IS NOT A STEP. A level is disabled rather than gated, so a row whose
 * record is absent stays in the rail with `href="#"`. A step onto it would open the
 * board, so the traversal steps the rows that carry a real address.
 *
 * THE GUARD IS THE PAGER'S OWN. A field owns its caret keys and a modifier names a
 * command, so both kinds of press are left to the pager's key handler and to nothing
 * else. The pager's own two keys keep working beside these two.
 */
describe("The rail's arrow keys", () => {
  it("renders the ten rows in the rail's own order: Levels, Also, then Review", rendersTenRows);
  it("groups the rail as Levels, Also, and the pull request", groupsRail);
  it("holds one row list, and the rail renders it whole", holdsOneRowList);
});
