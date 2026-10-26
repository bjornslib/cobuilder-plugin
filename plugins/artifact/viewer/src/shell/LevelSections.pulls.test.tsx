import { cleanup, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  DESIGN,
  DRAFT_TITLE,
  FLIGHTDECK_TITLE,
  PAGED,
  PR_TITLE,
  SHIPPED_STAGE,
  WORK_PR_TITLE,
} from "./testSupport/LevelSections/constants";
import { useLevelFixture } from "./testSupport/LevelSections/install";
import { openLevel } from "./testSupport/LevelSections/open.test.helpers";
import { hasStrip } from "./testSupport/LevelSections/paged.test.helpers";
import { holds, panelNamed, panelTitles } from "./testSupport/LevelSections/panes.test.helpers";

useLevelFixture();

const WALK = [
  ...PAGED,
  { label: "Pull requests", hash: `#/${DESIGN}/pull-requests`, title: "Pull requests" },
  { label: "Shipped", hash: `#/${DESIGN}/shipped`, title: "Shipped" },
];

function expectRealPullRequests() {
  const real = panelNamed(WORK_PR_TITLE);
  expect(holds(real, PR_TITLE), "the work's own pull request").toBe(true);
  expect(
    within(real).queryByText(/not present/i),
    "a work with a pull request marks no absence",
  ).toBeNull();
  expect(holds(panelNamed("FlightDeck"), FLIGHTDECK_TITLE)).toBe(true);
}

/*
  C1's fifth level. The level stacks three panels in the pane's own scroll: the draft,
  this work's own pull requests, and the whole open set. The draft's own order is C2's
  subject and this case reads only that all three are there.
*/
async function rendersPullRequestSections() {
  await openLevel(`#/${DESIGN}/pull-requests`, "Pull requests");

  expect(panelTitles()).toEqual([DRAFT_TITLE, WORK_PR_TITLE, "FlightDeck"]);
  expect(
    hasStrip(),
    "a stacked level draws no strip, because its panels share the pane's scroll",
  ).toBe(false);
  expectRealPullRequests();
}

function expectDeployGapStated(panel: HTMLElement) {
  expect(
    panel.textContent,
    "the section states the deploy gap rather than implying a release",
  ).toContain("No deploy record exists in this corpus.");
}

/*
  C1's sixth level. One panel, and it states the stage the design entity carries, the
  publications the bundle holds for this work's own pull requests, and the deploy
  record the corpus does not have.
*/
async function rendersShippedSection() {
  await openLevel(`#/${DESIGN}/shipped`, "Shipped");

  expect(panelTitles()).toEqual(["Release status"]);
  const panel = panelNamed("Release status");
  expect(within(panel).queryByText(/not present/i)).toBeNull();
  expect(holds(panel, SHIPPED_STAGE), "the stage the index holds").toBe(true);
  expect(holds(panel, "0 publications")).toBe(true);
  expectDeployGapStated(panel);
}

function collector(logged: string[], write: (...args: unknown[]) => void) {
  return (...args: unknown[]) => {
    logged.push(args.map((arg) => String(arg)).join(" "));
    write(...args);
  };
}

async function visitEachLevel() {
  for (const level of WALK) {
    cleanup();
    await openLevel(level.hash, level.title);
  }
}

async function walkAllLevels(logged: string[]) {
  const errors = console.error;
  const warnings = console.warn;
  try {
    console.error = collector(logged, console.error);
    console.warn = collector(logged, console.warn);
    await visitEachLevel();
  } finally {
    console.error = errors;
    console.warn = warnings;
  }
}

/*
  C1's third piece of evidence: "Read the console messages across the walk. None
  reports an error." A DOM carries this one, so it is read here rather than left to the
  browser. The six levels are opened one after the other, and every message React or a
  component writes to the console is collected. React's own warnings count, because a
  duplicate key or a bad prop is a defect the walk would otherwise hide.
*/
async function logsNothingAcrossWalk() {
  const logged: string[] = [];
  await walkAllLevels(logged);

  expect(WALK, "the walk visits all six levels").toHaveLength(6);
  expect(logged, "the walk reports nothing to the console").toEqual([]);
}

describe("Slice 10 · every section of every level renders its own records", () => {
  it(
    "renders the Pull requests level's three sections, and the real pull requests",
    rendersPullRequestSections,
  );

  it(
    "renders the Shipped level's one section, with the stage the index holds",
    rendersShippedSection,
  );
});

describe("Slice 10 · every section of every level renders its own records", () => {
  it("logs no error or warning across the walk of all six levels", logsNothingAcrossWalk);
});
