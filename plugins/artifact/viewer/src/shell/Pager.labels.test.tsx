import { cleanup, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PAGED, open, setupPagerHooks, type PagedLevel } from "./testSupport/Pager/page";
import {
  HEADING_ID,
  boxH2s,
  boxHeadings,
  boxesOf,
  hasStrip,
  pagerCount,
  stripLinks,
} from "./testSupport/Pager/queries";

setupPagerHooks();

function expectLabelsMatch(level: PagedLevel, labels: string[]) {
  expect(labels, `${level.label}: the strip names the boxes' own panels`).toEqual(boxHeadings());
  expect(
    labels,
    `${level.label}: the labels are the words the boxes' headings carry`,
  ).toEqual(boxH2s());
}

function expectCountsMatch(level: PagedLevel, labels: string[]) {
  expect(labels, `${level.label}: one label per box`).toHaveLength(boxesOf().length);
  expect(pagerCount(), `${level.label}: the count is the box count`).toBe(
    boxesOf().length,
  );
  expect(pagerCount(), `${level.label}: the count is the strip's own length`).toBe(
    labels.length,
  );
}

async function checkLevelLabels(level: PagedLevel) {
  cleanup();
  await open(level.hash);
  await waitFor(() => expect(hasStrip()).toBe(true));

  const labels = stripLinks().map((link) => (link.textContent ?? "").trim());
  expectLabelsMatch(level, labels);
  expectCountsMatch(level, labels);
}

/*
  `useJumpTargets` reads the strip's list from the panels the boxes rendered, so the labels
  and the headings are one fact stated twice. A strip that held a list of its own, the
  shape C3 scores zero, fails on the first level whose headings it did not match.
*/
async function namesStripWithOwnHeadings() {
  for (const level of PAGED) {
    await checkLevelLabels(level);
  }
}

/*
  This case separates a read list from a written one. One panel of the second box renames
  its heading in the DOM, as a record change looks from the pane's side. A strip built from
  a constant, or from anything but the pane, keeps the old label and fails.
*/
function renameSecondBox() {
  const box = boxesOf()[1];
  const panel = box.querySelector("[data-shell-panel]") as HTMLElement;
  const heading = box.querySelector("h2") as HTMLElement;
  expect(stripLinks()[1].textContent).toBe("Done when");

  panel.setAttribute("data-shell-panel", "Renamed part");
  /* Replacing the text node is the child-list mutation `useJumpTargets` observes. */
  heading.textContent = "Renamed part";
}

function expectRenamedLink() {
  expect(stripLinks()[1].textContent, "the strip's link took the new words").toBe("Renamed part");
}

function expectOtherLinksUnmoved() {
  expect(stripLinks(), "and the strip keeps its four links").toHaveLength(4);
  expect(
    stripLinks().map((link) => (link.textContent ?? "").trim()),
    "and no other link moved",
  ).toEqual(["Why", "Renamed part", "Abort if", "Out of scope"]);
}

async function followsRenamedSection() {
  await open(PAGED[0].hash);
  await waitFor(() => expect(hasStrip()).toBe(true));
  await waitFor(() => expect(document.activeElement?.id).toBe(HEADING_ID));

  renameSecondBox();

  await waitFor(expectRenamedLink);
  expectOtherLinksUnmoved();
}

describe("Slice 8 · the strip's labels come from the sections themselves", () => {
  it("names the strip with the boxes' own headings, in order, and counts the same boxes", namesStripWithOwnHeadings);
  it("follows a section that renames itself, because the strip holds no list of its own", followsRenamedSection);
});
