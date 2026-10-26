import { cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DESIGN, OUTCOME, RULE, SUMMARY, VERDICT } from "./testSupport/LevelSections/constants";
import { RICH } from "./testSupport/LevelSections/designRecords";
import { useLevelFixture } from "./testSupport/LevelSections/install";
import { openPaged } from "./testSupport/LevelSections/open.test.helpers";
import { holds, panelNamed } from "./testSupport/LevelSections/panes.test.helpers";

useLevelFixture();

const CHANGED_OUTCOME = "A record the bundle holds, after it moved.";

function regionOf(decisions: HTMLElement, row: HTMLElement): HTMLElement {
  const region = decisions.querySelector(`#${row.getAttribute("aria-controls")}`) as HTMLElement;
  expect(region, "the row controls its own body").toBeTruthy();
  return region;
}

async function expectDecisionRuleOnPress() {
  const decisions = panelNamed("Architecture Decisions");
  const row = within(decisions).getByRole("button", { name: /^ADR-0028/ });
  const region = regionOf(decisions, row);
  expect(region.hasAttribute("inert"), "the body starts closed").toBe(true);

  fireEvent.click(row);
  await waitFor(() => expect(region.hasAttribute("inert")).toBe(false));
  expect(region.textContent, "the decision record's own rule").toContain(RULE);
}

function expectVerdictAndSummary() {
  const assessment = panelNamed("Assessment");
  expect(within(assessment).getByText(VERDICT), "the assessment record's verdict").toBeTruthy();
  expect(holds(assessment, SUMMARY)).toBe(true);
}

/*
  C5's three samples, one per record file the rubric names: a contract outcome from
  `designs.js`, a decision rule from `adrs.js`, and an assessment verdict from
  `designs.js`. The rule is the one value the index's own `adr` entity does not carry,
  so it can only come from the decision's record body. It sits inside a body the
  accordion closed on arrival, and the case presses the row and reads the region, so a
  rule that rendered without the record fails on the press.
*/
async function showsThreeSampledValues() {
  await openPaged(`#/${DESIGN}/intent`, "Intent");
  expect(holds(panelNamed("Why"), OUTCOME), "the goal record's outcome").toBe(true);

  cleanup();
  await openPaged(`#/${DESIGN}/architecture`, "Architecture");
  await expectDecisionRuleOnPress();

  cleanup();
  await openPaged(`#/${DESIGN}/problem-and-solution`, "Problem and solution");
  expectVerdictAndSummary();
}

function setOutcome(outcome: string | undefined) {
  const goal = RICH.goal;
  if (goal) goal.outcome = outcome;
}

function expectOutcomeMoved() {
  expect(
    holds(panelNamed("Why"), CHANGED_OUTCOME),
    "the panel shows the value the record now holds",
  ).toBe(true);
  expect(holds(panelNamed("Why"), OUTCOME), "and no longer the value it held before").toBe(false);
}

async function showChangedOutcome() {
  setOutcome(CHANGED_OUTCOME);
  await openPaged(`#/${DESIGN}/intent`, "Intent");
  expectOutcomeMoved();
}

/*
  C5's rule against a fixture that never moves. The panel reads the record the bundle
  hands it, so a value changed in that record reaches the panel on the next render. A
  panel that held the value as a constant, or one that had cached it, keeps the old
  words and fails the second assertion. The record is put back in the same case, so no
  other case reads the changed value.
*/
async function followsChangedRecord() {
  await openPaged(`#/${DESIGN}/intent`, "Intent");
  expect(holds(panelNamed("Why"), OUTCOME)).toBe(true);

  cleanup();
  const original = RICH.goal?.outcome;
  try {
    await showChangedOutcome();
  } finally {
    setOutcome(original);
  }
}

describe("Slice 10 · a panel's own records come from the bundle", () => {
  it(
    "shows three sampled values, each read from the record file the bundle writes",
    showsThreeSampledValues,
  );

  it("follows the record when the bundle's value changes", followsChangedRecord);
});
