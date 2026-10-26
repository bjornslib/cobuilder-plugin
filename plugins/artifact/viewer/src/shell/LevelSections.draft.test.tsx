import { within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  DESIGN,
  DRAFT_FLAT,
  DRAFT_TITLE,
  OTHER,
  OTHER_PR_TITLE,
  PR_TITLE,
  WORK_PR_TITLE,
} from "./testSupport/LevelSections/constants";
import { useLevelFixture } from "./testSupport/LevelSections/install";
import { openLevel } from "./testSupport/LevelSections/open.test.helpers";
import {
  holds,
  pane,
  panelNamed,
  panels,
  panelTitles,
} from "./testSupport/LevelSections/panes.test.helpers";

useLevelFixture();

function expectDraftLeads() {
  const titles = panelTitles();
  expect(titles.indexOf(DRAFT_TITLE), "the draft leads the level").toBe(0);
  expect(titles.indexOf(WORK_PR_TITLE), "and the real pull requests come after it").toBeGreaterThan(
    titles.indexOf(DRAFT_TITLE),
  );
}

function expectDraftAndRealPullRequest() {
  expect(
    panelNamed(DRAFT_TITLE).textContent,
    "the panel holds the design's own draft text",
  ).toContain(DRAFT_FLAT);
  expect(
    holds(panelNamed(WORK_PR_TITLE), PR_TITLE),
    "and the real pull request is a real one",
  ).toBe(true);
}

/*
  C2's rule. The draft panel is the level's first panel, and the work's real pull
  requests come after it. The case reads the index of each in the pane's document
  order, so a draft moved below the real ones fails here even though the level still
  holds all three panels.
*/
async function readsFirstAboveRealPullRequests() {
  await openLevel(`#/${DESIGN}/pull-requests`, "Pull requests");

  expectDraftLeads();
  expectDraftAndRealPullRequest();
}

function expectHeadingShape(heading: HTMLElement) {
  expect(heading.textContent, "the heading claims no pull request number").not.toMatch(/^PR \d+/);
  expect(heading.textContent, "the heading says this work will open it").toContain("will open");
  expect(heading.textContent, "and the heading is the one this level leads with").toBe(DRAFT_TITLE);
}

function expectLeadLine(draft: HTMLElement) {
  const lead = draft.querySelector("p.italic");
  expect(lead, "the panel carries a lead line").not.toBeNull();
  expect(lead?.textContent?.length ?? 0, "the lead line is not empty").toBeGreaterThan(0);
}

/*
  C2's second piece of evidence. The heading is the design's own words and the lead
  states what a draft is.

  THE PANEL IS READ BY ITS POSITION, AND NOT BY ITS OWN TITLE. The claim is that the
  first block's heading says what it is, and a lookup by the words being tested would
  make the test pass on whatever the heading happened to say. So the heading is read
  from the level's first panel, and the shape is asserted before the wording: a heading
  of `PR 3`, or any heading that claimed the pull request exists, fires the first
  assertion below rather than the last.
*/
async function namesItselfADraft() {
  await openLevel(`#/${DESIGN}/pull-requests`, "Pull requests");
  const draft = panels()[0];

  expectHeadingShape(within(draft).getByRole("heading", { level: 2 }));
  expectLeadLine(draft);
}

/*
  C2's third piece of evidence, and the negative half. The other work carries a real
  pull request and no draft, so its level fills and its first block is the real one. A
  draft panel that rendered unconditionally, with empty content, fails the first
  assertion here.
*/
async function rendersNoDraftBlock() {
  await openLevel(`#/${OTHER}/pull-requests`, "Pull requests");

  const titles = panelTitles();
  expect(titles, "no draft block renders").not.toContain(DRAFT_TITLE);
  expect(titles[0], "the real pull requests lead instead").toBe(WORK_PR_TITLE);
  expect(holds(panelNamed(WORK_PR_TITLE), OTHER_PR_TITLE)).toBe(true);
  expect(
    pane().querySelectorAll(`[aria-label="${DRAFT_TITLE}"]`).length,
    "and no draft panel exists at all",
  ).toBe(0);
}

describe("Slice 10 · the envisioned pull request leads its level", () => {
  it(
    "reads first on the Pull requests level, above every real pull request",
    readsFirstAboveRealPullRequests,
  );

  it("names itself a draft rather than a pull request that exists", namesItselfADraft);
});

describe("Slice 10 · the envisioned pull request leads its level", () => {
  it("renders no draft block for a work whose design wrote none", rendersNoDraftBlock);
});
