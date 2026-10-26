import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  ADR_PROBLEM,
  DESIGN,
  OPEN_DECISION,
  OPEN_EPIC_DESIGN,
  OPEN_RULE,
} from "./testSupport/Sheet/names";
import {
  control,
  escapeClosesSheet,
  installBrowserStubs,
  installBundle,
  levelTitle,
  openArchitecture,
  openDecision,
  openLevel,
  press,
} from "./testSupport/Sheet/page";

beforeAll(installBrowserStubs);

beforeEach(installBundle);

afterEach(cleanup);

/*
 * The sheet is a modal surface with one close control. A pointer reader closes it the
 * same way a keyboard reader does, and the record goes with it.
 */
async function closesOnCloseControl() {
  await openDecision();

  fireEvent.click(screen.getByRole("button", { name: "Close" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.queryByText(ADR_PROBLEM)).toBeNull();
}

const OPENERS = [
  { hash: `#/${DESIGN}/architecture`, level: "Architecture", label: OPEN_DECISION },
  { hash: `#/${DESIGN}/architecture`, level: "Architecture", label: OPEN_RULE },
  { hash: `#/${DESIGN}/build`, level: "Build", label: OPEN_EPIC_DESIGN },
];

function focusOpener(label: string): HTMLButtonElement {
  /* The reader has tabbed to the control, so it holds focus before the press. */
  const opener = control(label);
  opener.focus();
  expect(document.activeElement, `${label} holds focus before the press`).toBe(opener);
  return opener;
}

function expectFocusHome(opener: HTMLElement, label: string) {
  expect(
    document.activeElement,
    `${label} holds focus again once the record closes`,
  ).toBe(opener);
  expect(document.activeElement, "focus is not left on the body").not.toBe(document.body);
  expect(screen.queryByRole("dialog")).toBeNull();
}

async function openAndCloseFrom({ hash, level, label }: (typeof OPENERS)[number]) {
  await openLevel(hash, level);
  const opener = focusOpener(label);
  fireEvent.click(opener);
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeNull());
  await escapeClosesSheet();
  expectFocusHome(opener, label);
  /* The next record opens from its own control, on a level of its own. */
  cleanup();
}

/*
 * Focus comes home when the record closes. The Sheet is modal, so opening a record takes
 * focus into it, and a keyboard reader who closes the record must land on the control
 * they opened it from — in the list they were reading — rather than on the body. The
 * three record kinds share one close path, so all three are read here rather than one of
 * them standing for the rest.
 */
async function returnsFocusToOpener() {
  for (const opener of OPENERS) {
    await openAndCloseFrom(opener);
  }
}

/*
 * The sheet is a modal surface. Escape closes it, and the reader is left where they were
 * in the work rather than on a stale record.
 */
async function closesOnEscape() {
  await openArchitecture();
  const pane = document.getElementById("work-scroll-pane") as HTMLElement;
  await press(OPEN_DECISION);

  await escapeClosesSheet();

  expect(document.getElementById("work-scroll-pane")).toBe(pane);
  expect(levelTitle()).toBe("Architecture");
  expect(screen.queryByText(ADR_PROBLEM)).toBeNull();
}

describe("the record closes", () => {
  it("closes on its own Close control", closesOnCloseControl);
  it("returns focus to the control the record was opened from", returnsFocusToOpener);
  it("closes on Escape and leaves the level where it was", closesOnEscape);
});
