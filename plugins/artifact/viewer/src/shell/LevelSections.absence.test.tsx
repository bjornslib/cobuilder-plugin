import { cleanup, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DESIGN, OTHER, PAGED } from "./testSupport/LevelSections/constants";
import { useLevelFixture } from "./testSupport/LevelSections/install";
import { openPaged } from "./testSupport/LevelSections/open.test.helpers";
import {
  panelCarriesFold,
  panelOf,
  stripLabels,
} from "./testSupport/LevelSections/paged.test.helpers";
import { panelBody, panelNamed } from "./testSupport/LevelSections/panes.test.helpers";

useLevelFixture();

function expectAssessmentAbsence(boxes: HTMLElement[]) {
  const assessment = panelNamed("Assessment");
  expect(within(assessment).getByText(/not present/i)).toBeTruthy();
  expect(assessment.textContent, "the panel states the absence in place").toContain(
    "This work carries no assessment record, so the panel shows no verdict.",
  );
  expect(
    boxes.some((box) => box.contains(assessment)),
    "and the panel still sits in a box of its own",
  ).toBe(true);
}

function expectOtherAbsences() {
  expect(within(panelNamed("Risks")).getByText(/not present/i)).toBeTruthy();
  expect(within(panelNamed("Unknowns")).getByText(/not present/i)).toBeTruthy();
  expect(
    within(panelNamed("Problem and solution")).queryByText(/not present/i),
    "the section that holds a record marks no absence",
  ).toBeNull();
}

/*
  C3's first piece of evidence. The other work carries no assessment, no risk, and no
  unknown, so three of the level's four panels state an absence. Each one keeps its own
  box on the track, which is what puts the absence where the record would have read,
  and each one carries the `not present` pill beside that sentence.
*/
async function statesAbsentRecordInPlace() {
  const boxes = await openPaged(`#/${OTHER}/problem-and-solution`, "Problem and solution");

  expect(boxes, "an absent record keeps its own section").toHaveLength(4);
  expect(stripLabels()).toEqual(["Problem and solution", "Risks", "Assessment", "Unknowns"]);
  expectAssessmentAbsence(boxes);
  expectOtherAbsences();
}

/*
  The body is read first and the header second. A staged run of this case shows
  which half fires: `collapsible` alone gives the header a toggle and leaves the
  body open, and `collapsible` with `defaultOpen={false}` closes the body as well.
*/
function expectOpenWithoutFold(level: (typeof PAGED)[number], box: HTMLElement, position: number) {
  const panel = panelOf(box);
  expect(
    panelBody(panel).hasAttribute("inert"),
    `${level.label} section ${position + 1} renders its body open`,
  ).toBe(false);
  expect(
    panelCarriesFold(panel),
    `${level.label} section ${position + 1} carries no panel fold`,
  ).toBe(false);
}

/*
  C3's second piece of evidence, read as the panel contract. `epic-E5-design.md` states
  it: "A paged section carries no fold. Every panel of a paged section renders open, so
  `Panel` receives no `collapsible` prop on these levels." Both halves are read here:
  no panel header holds a disclosure control, and no panel body is inert, which is the
  attribute that hides a closed body from a reader.
*/
async function carriesNoFoldOnPagedLevels() {
  for (const level of PAGED) {
    cleanup();
    const boxes = await openPaged(level.hash, level.title);
    boxes.forEach((box, position) => expectOpenWithoutFold(level, box, position));
  }
}

/*
  C3's second piece of evidence at its strongest, on the one level whose panels disclose
  no record of their own. The four Intent sections hold prose and a list each, so not
  one `aria-expanded` control renders inside any of the four boxes. The other three
  paged levels are not read this way: the Architecture level's decisions and the Build
  level's epics each disclose a record inside a body, and those controls are records
  rather than panel folds. The report states that reading.
*/
async function drawsNoDisclosureControl() {
  const boxes = await openPaged(`#/${DESIGN}/intent`, "Intent");

  const disclosures = boxes.flatMap((box) => Array.from(box.querySelectorAll("[aria-expanded]")));
  expect(disclosures, "no disclosure control renders in the Intent level's boxes").toEqual([]);
}

describe("Slice 10 · an absence reads in place, and no panel is a fold", () => {
  it(
    "states an absent record in place, in the section that would have held it",
    statesAbsentRecordInPlace,
  );

  it("carries no fold on any panel of a paged level", carriesNoFoldOnPagedLevels);
});

describe("Slice 10 · an absence reads in place, and no panel is a fold", () => {
  it(
    "draws no disclosure control at all where no panel holds a record disclosure",
    drawsNoDisclosureControl,
  );
});
