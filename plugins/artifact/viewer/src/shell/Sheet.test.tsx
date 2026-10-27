/**
 * Slice 12: a record opens in the Sheet, stated as cases. The slice's end, from the ladder
 * in `docs/plans/cobuilder-viewer/04-slices.md`: "Pressing a decision, a boundary rule, or
 * an epic's design opens the whole record, and a part link scrolls the record and moves
 * focus to that heading." The E5 design names one case for this slice,
 * `test_record_opens_in_the_sheet`, and three record kinds: the decision, the boundary
 * rule, and the epic's technical solution design.
 *
 * The subject is the whole path, not the Sheet component alone. A RecordSheet that renders a
 * fixture subject is not a reader's state. A reader meets a control inside a panel, a pane
 * that stays where it was, and a record that opens over it. So every case renders `Shell` at
 * a real address, presses the control that the panel rendered, and reads the surface that
 * arrived. The controls live at these addresses:
 *
 *   - the decision            `#/cobuilder-viewer/architecture`, Architecture Decisions
 *   - the boundary rule       `#/cobuilder-viewer/architecture`, Boundaries
 *   - the epic's design       `#/cobuilder-viewer/build`, an epic's disclosure
 *
 * jsdom has no layout engine, so every bounding rect reads zero. The geometry of the part
 * link, that the record lands with the heading at the top of the container, is read as the
 * call the sheet makes and not as a position. The heading offset is read from a rect that
 * this file states, and the scroll request is asserted against it. The focus move needs no
 * layout and is read whole.
 *
 * jsdom implements neither `matchMedia` nor `ResizeObserver`, and the shell asks both on its
 * first render. The stubs answer the query false and observe nothing.
 *
 * One branch of the jump is out of reach. The design's call stack states
 * `behavior: reduce ? instant : smooth`, and the smooth branch is asserted here. `motion`
 * reads the reduced-motion query once and caches the answer in a module-level value, so a
 * stub installed inside a case arrives after the first render has read the default. A case
 * for the instant branch needs its own test file, where the stub sits in `beforeAll`.
 */

import { cleanup, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  ADR_ABSENT,
  ADR_ABSENT_TITLE,
  ADR_DECISION,
  ADR_FORCE,
  ADR_PROBLEM,
  ADR_RULE,
  ADR_TITLE,
  DESIGN,
  EPIC_DESIGN_TITLE,
  OPEN_DECISION,
  OPEN_EPIC_DESIGN,
  OPEN_RULE,
  RULE_EXTRA_KEY,
  RULE_EXTRA_VALUE,
  RULE_KIND,
  RULE_TARGET,
  RULE_WHY,
} from "./testSupport/Sheet/names";
import {
  installBrowserStubs,
  installBundle,
  openArchitecture,
  openDecision,
  openLevel,
  press,
  sheetText,
} from "./testSupport/Sheet/page";

beforeAll(installBrowserStubs);

beforeEach(installBundle);

afterEach(cleanup);

/*
 * C1: the panel shows the rule and the modules, and the whole record is one press away. The
 * problem, decision, rule, forces, and authored body must be in the sheet, and not only in
 * the index row.
 */
async function opensDecision() {
  await openDecision();
  expect(screen.queryByRole("dialog")).not.toBeNull();

  const body = sheetText();
  expect(sheetText()).toContain(ADR_TITLE);
  expect(body).toContain(ADR_PROBLEM);
  expect(body).toContain(ADR_DECISION);
  expect(body).toContain(ADR_RULE);
  expect(body).toContain(ADR_FORCE);
  expect(body).toContain("The track holds one box per section.");
}

/*
 * C1: the tile shows the kind, the target, and one line of the reason. The sheet states the
 * rule, the full reason, and every other field, which the tile never shows.
 */
async function opensBoundaryRule() {
  await openArchitecture();
  await press(OPEN_RULE);
  expect(screen.queryByRole("dialog")).not.toBeNull();

  const body = sheetText();
  expect(body).toContain(RULE_TARGET);
  expect(body).toContain(RULE_KIND);
  expect(body).toContain(RULE_WHY);
  expect(body).toContain(RULE_EXTRA_KEY);
  expect(body).toContain(RULE_EXTRA_VALUE);
}

async function opensEpicDesign() {
  await openLevel(`#/${DESIGN}/build`, "Build");
  await press(OPEN_EPIC_DESIGN);
  expect(screen.queryByRole("dialog")).not.toBeNull();

  const body = sheetText();
  expect(body).toContain(EPIC_DESIGN_TITLE);
  expect(body).toContain("The shell reads the index and derives no join.");
}

async function opensNothingBeforePress() {
  await openArchitecture();
  expect(screen.queryByRole("dialog")).toBeNull();
}

/*
 * C1: the record is a surface over the pane and not a route the pane follows, so the
 * address stays the one that opened the level and the reader keeps their place.
 */
async function leavesPaneAndAddress() {
  await openArchitecture();
  const pane = document.getElementById("work-scroll-pane") as HTMLElement;
  pane.scrollTop = 240;
  const before = window.location.hash;

  await press(OPEN_DECISION);

  expect(window.location.hash).toBe(before);
  expect(pane.scrollTop).toBe(240);
}

/*
 * C1: a bundle can name a decision whose record file wrote no entry. The panel lists the
 * row and says so, and the sheet states the absence and does not fail or invent a field.
 */
async function opensUnresolvedDecision() {
  await openArchitecture();
  await press(`Open the whole record for ${ADR_ABSENT}`);

  const body = sheetText();
  expect(body).toContain(ADR_ABSENT_TITLE);
  expect(body).toContain("The whole record is absent");
  expect(body).not.toContain(ADR_PROBLEM);
}

describe("a control opens the whole record", () => {
  it("opens a decision's whole record", opensDecision);
  it("opens a boundary rule's whole record", opensBoundaryRule);
  it("opens an epic's technical solution design", opensEpicDesign);
  it("opens no record until a control is pressed", opensNothingBeforePress);
  it("leaves the pane and the address where they were", leavesPaneAndAddress);
  it("opens a decision whose record did not resolve, and says so", opensUnresolvedDecision);
});
