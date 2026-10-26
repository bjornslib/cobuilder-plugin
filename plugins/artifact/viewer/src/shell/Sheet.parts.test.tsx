import { cleanup, fireEvent } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { OPEN_DECISION, OPEN_RULE, RULE_TARGET } from "./testSupport/Sheet/names";
import {
  escapeClosesSheet,
  firstJumpLink,
  headingOf,
  installBrowserStubs,
  installBundle,
  jumpLabels,
  jumpRow,
  openArchitecture,
  openDecision,
  press,
  sheet,
  sheetScroll,
} from "./testSupport/Sheet/page";

beforeAll(installBrowserStubs);

beforeEach(installBundle);

afterEach(cleanup);

const DECISION_PARTS = [
  "Problem",
  "Decision",
  "The rule this decision enforces",
  "Forces",
  "Full record",
  "History",
];

/*
 * C2 — the row names the record's own parts. The record decides the list, so a record
 * with different parts gets its own row with no list to keep in step.
 */
async function listsOneLinkPerPart() {
  await openDecision();

  expect(jumpLabels()).toEqual(DECISION_PARTS);
}

/*
 * C2 — a part link carries the heading's own id, so the link and the heading cannot
 * drift. The heading the link names is in the record's own box.
 */
function expectRenderedHeading(id: string) {
  expect(id).not.toBe("");
  expect(document.getElementById(id)).not.toBeNull();
}

async function pointsAtRenderedHeadings() {
  await openDecision();

  const row = jumpRow() as HTMLElement;
  const targets = Array.from(row.querySelectorAll("a")).map((link) =>
    link.getAttribute("href")?.replace(/^#/, "") ?? "",
  );
  expect(targets.length).toBeGreaterThan(0);
  for (const id of targets) expectRenderedHeading(id);
}

function stateRects(scroll: HTMLElement, heading: HTMLElement) {
  /* jsdom states no rect, so the two the jump reads are stated here. */
  scroll.getBoundingClientRect = () => ({ top: 100 }) as DOMRect;
  heading.getBoundingClientRect = () => ({ top: 460 }) as DOMRect;
}

function expectSmoothScroll(scroll: HTMLElement) {
  const calls = vi.mocked(Element.prototype.scrollTo).mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  expect(calls[calls.length - 1][0]).toEqual(
    expect.objectContaining({ top: scroll.scrollTop + 360, behavior: "smooth" }),
  );
}

/*
 * C2 — the press scrolls the record's own box, and not the document. The pane does not
 * move, and a hash write would move the document instead.
 */
async function scrollsRecordBox() {
  await openDecision();

  const first = firstJumpLink();
  const scroll = sheetScroll();
  stateRects(scroll, headingOf(first));
  const before = window.location.hash;
  fireEvent.click(first);

  expectSmoothScroll(scroll);
  expect(window.location.hash).toBe(before);
}

/*
 * C2 — the heading keeps focus, so a keyboard reader lands where the pointer did. The
 * heading takes a tabindex of -1 so it can hold focus at all.
 */
async function movesFocusToHeading() {
  await openDecision();

  const first = firstJumpLink();
  const heading = headingOf(first);

  fireEvent.click(first);

  expect(heading.getAttribute("tabindex")).toBe("-1");
  expect(document.activeElement).toBe(heading);
}

/*
 * C2 — the row re-reads when another record opens. The scroll container arrives with the
 * portal and the reader is a callback ref, so a row that only ever read the first record
 * would leave the second record with a stale list or none at all.
 */
async function readsPartsAgain() {
  await openDecision();
  expect(jumpLabels().length).toBeGreaterThan(0);

  await escapeClosesSheet();

  await press(OPEN_DECISION);
  expect(jumpLabels()).toEqual(DECISION_PARTS);
}

/*
 * C2 — a record with no anchored part carries no link row. The boundary rule's own body
 * is one rule, one reason, and a field map, and no part of it takes a link.
 */
async function carriesNoLinkRow() {
  await openArchitecture();
  await press(OPEN_RULE);

  expect(jumpRow()).toBeNull();
  expect(sheet().textContent).toContain(RULE_TARGET);
}

describe("the part links", () => {
  it("lists one link per part of the record, in document order", listsOneLinkPerPart);
  it("points each link at a heading the record rendered", pointsAtRenderedHeadings);
  it("scrolls the record's own box to the heading", scrollsRecordBox);
  it("moves focus to the heading it scrolled to", movesFocusToHeading);
  it("reads the parts again when a record opens a second time", readsPartsAgain);
  it("carries no link row for a record with no part of its own", carriesNoLinkRow);
});
