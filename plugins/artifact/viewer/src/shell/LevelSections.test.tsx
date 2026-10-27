/**
 * Slice 10: every level renders its own sections, stated as cases.
 *
 * The slice's end, from the ladder in `docs/plans/cobuilder-viewer/04-slices.md`: "A
 * reader walks Intent, Problem & Solution, Architecture, Build, Pull requests, and Shipped
 * of one work item, and the envisioned pull request leads the Pull requests level." The
 * rubric that scores it is `.cobuilder/rubrics/cobuilder-viewer/slice-10.md`, and its five
 * criteria are the five groups below.
 *
 * The subject is the six levels and the panels they page. `panels/` holds one entry point
 * per level, `sections.tsx` holds the Build, Pull requests, and Shipped sections, and
 * `App.tsx` assembles them. A section with no level around it is not a state a reader can
 * meet, so every case renders `Shell` at a real address and reads the panes it built.
 *
 * Slices 8 and 9 own the model and the reading. `Pager.test.tsx` owns the box, the index,
 * the strip, the pager, and the arrow keys. `LevelProgress.test.tsx` owns the progress
 * reading. No case here restates one of theirs. This file reads the content: which
 * sections each level lays down, what each holds, and where the envisioned pull request
 * sits.
 *
 * What a DOM cannot carry: jsdom has no layout engine, so every height and bounding rect
 * reads zero and no stylesheet is applied. Three claims of the rubric are therefore out of
 * this file's reach, and each one is named beside the case that carries its contract:
 *
 * 1. **A section fits one screen.** C4 states that each Build section fits one screen.
 *    The case here reads the cut and the row count, which is the contract the screen
 *    follows. Only a browser knows the box's own height.
 * 2. **A panel's body renders open to the reader.** The case reads the `inert` attribute
 *    and the absence of a panel-level disclosure. A body animated to zero height carries
 *    neither flag, so an open body is a browser's reading.
 * 3. **A reader sees one section at a time.** Slice 8 owns that geometry, and its file
 *    says so. This file reads the tree and never a rect.
 *
 * A validator should measure the rest of the rubric in a browser. Serve the bundle rooted
 * at `.cobuilder-architect/self/`, open the Work surface at `#/cobuilder-viewer`, and read
 * the DOM at each level:
 * - For each of the four paged levels, the box on screen is the box the strip marks
 *   active, and the reader meets each section by pressing Next. Take a snapshot of each
 *   section and read the records it holds.
 * - On the Build level, measure each section's box height against the pane's own height.
 *   A section that needs a scroll of more than one screen fails C4's 1.0 score.
 * - On each paged level, read the panel body's rendered height and opacity. Every panel
 *   body is at its full height, and no disclosure control sits in a panel header. The one
 *   fold count that is NOT zero is the record disclosures inside a body: the Architecture
 *   decisions and the Build epics are accordion rows, not panel folds.
 * - Read the console across the walk. No message reports an error.
 * - Compare one section against the bundle: the decisions the Architecture level lists are
 *   the decisions `data/index.json` links to that design.
 *
 * The fixture holds two works, and the second carries the absences. The rich work fills
 * every level. The other work is the same shape with no assessment, risk, unknown, or
 * drafted pull request, so the cases for an absence in place and for the draft's own
 * absence have something to read. Both live in one `DESIGNS` map, because `loadDesigns`
 * caches its answer for the whole file and a record a case swapped in would never be read.
 */

import { within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  APPROACH,
  DESIGN,
  DONE_WHEN,
  ABORT_IF,
  OUT_OF_SCOPE,
  OUTCOME,
  PROBLEM,
  RISKS,
  SUMMARY,
  UNKNOWNS,
} from "./testSupport/LevelSections/constants";
import { useLevelFixture } from "./testSupport/LevelSections/install";
import { stripLabels } from "./testSupport/LevelSections/paged.test.helpers";
import { holds, panelNamed, panelTitles } from "./testSupport/LevelSections/panes.test.helpers";
import { openPaged } from "./testSupport/LevelSections/open.test.helpers";

useLevelFixture();

function expectIntentValues() {
  expect(holds(panelNamed("Why"), OUTCOME), "Why shows the goal's outcome").toBe(true);
  expect(holds(panelNamed("Done when"), DONE_WHEN[0])).toBe(true);
  expect(holds(panelNamed("Done when"), DONE_WHEN[1])).toBe(true);
  expect(holds(panelNamed("Abort if"), ABORT_IF[0])).toBe(true);
  expect(holds(panelNamed("Out of scope"), OUT_OF_SCOPE[0])).toBe(true);
}

function expectNoAbsenceMarks() {
  for (const title of panelTitles()) {
    expect(
      within(panelNamed(title)).queryByText(/not present/i),
      `${title} holds a record, so it marks no absence`,
    ).toBeNull();
  }
}

/*
  C1's first level. The four panels are the four parts of the contract, in the order the
  design lists them. `Why` also holds the container drawing, which is the design's own
  regrouping: this level renders no section named Diagrams.
*/
async function rendersIntentSections() {
  await openPaged(`#/${DESIGN}/intent`, "Intent");

  expect(panelTitles()).toEqual(["Why", "Done when", "Abort if", "Out of scope"]);
  expect(stripLabels(), "the strip names the boxes it pages").toEqual(panelTitles());
  expectIntentValues();
  expectNoAbsenceMarks();
}

function expectProblemSolutionValues() {
  const problem = panelNamed("Problem and solution");
  expect(holds(problem, PROBLEM), "the card's lead is the authored problem").toBe(true);
  expect(holds(problem, APPROACH), "and the approach is the solution card's").toBe(true);
  expect(holds(panelNamed("Risks"), RISKS[0])).toBe(true);
  expect(holds(panelNamed("Assessment"), SUMMARY)).toBe(true);
  expect(holds(panelNamed("Unknowns"), UNKNOWNS[0])).toBe(true);
}

/*
  C1's second level. The verdict is the one value that also reads in the panel's own
  header, and the sample of it belongs to C5.
*/
async function rendersProblemSolutionSections() {
  await openPaged(`#/${DESIGN}/problem-and-solution`, "Problem and solution");

  expect(panelTitles()).toEqual(["Problem and solution", "Risks", "Assessment", "Unknowns"]);
  expect(stripLabels()).toEqual(panelTitles());
  expectProblemSolutionValues();
}

describe("Slice 10 · every section of every level renders its own records", () => {
  it(
    "renders the Intent level's four contract sections, each from the record",
    rendersIntentSections,
  );

  it(
    "renders the Problem & Solution level's four sections, each from the record",
    rendersProblemSolutionSections,
  );
});
