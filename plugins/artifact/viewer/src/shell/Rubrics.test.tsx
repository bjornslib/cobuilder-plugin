/**
 * review-link slice 3 — the rubrics page at `#/<work>/build/rubrics`.
 *
 * The page keeps the gate-steps panel and gains the rubric reading surface: one row per
 * slice, in slice order. A row with a rubric is a button that opens the whole document in
 * the Sheet, the same way an epic's technical solution design opens. A slice with no
 * rubric keeps its row and states the absence in place, and it is not a button, so a
 * press cannot open an empty Sheet.
 *
 * THE CONTRACT THESE CASES READ. The prose is not pinned. A row that opens a rubric
 * carries `aria-label="Open the acceptance rubric for slice <n>"`. An absent rubric's
 * row carries `data-testid="rubric-empty"`. The Sheet is the dialog the shell opens over
 * the pane, found by role, the way `Sheet.test.tsx` finds it. The page is reached
 * through `Shell`, at a real address, so a missing page fails on an assertion and not on
 * an import.
 *
 * The fixture holds one work, `review-link`, with three slices. Slices 1 and 2 carry
 * rubrics. Slice 3 carries none, so the absent case reads on the same page as the two
 * present ones.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import Shell from "./App";
import {
  OTHER_RUBRIC_BODY,
  RUBRIC_BODIES,
  RUBRIC_TITLES,
  SLICE_TITLES,
  WORK,
  installRecords,
} from "./testSupport/Rubrics/fixtures";
import { installJsdomStubs } from "./testSupport/jsdom";

beforeAll(() => {
  installJsdomStubs();
  Element.prototype.scrollIntoView = () => undefined;
});

beforeEach(installRecords);

afterEach(cleanup);

/** The button that opens one slice's rubric, by the label the row carries. */
function rubricRow(n: number): HTMLElement {
  return screen.getByRole("button", { name: `Open the acceptance rubric for slice ${n}` });
}

/** The row that states a slice's absent rubric. */
function absentRow(): HTMLElement {
  const found = screen.queryByTestId("rubric-empty");
  expect(found, "the page renders one absent-rubric row").toBeTruthy();
  return found as HTMLElement;
}

/** The record sheet, which is the dialog the shell opens over the pane. */
async function openSheet(): Promise<HTMLElement> {
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeNull());
  return screen.getByRole("dialog");
}

async function openPage(hash: string): Promise<void> {
  window.location.hash = hash;
  render(<Shell />);
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Rubrics" })).toBeTruthy(),
  );
}

function expectGateRecordKept() {
  /* The gate-steps panel keeps its own rows, unchanged. */
  expect(screen.getByText("The slice plan is approved")).toBeTruthy();
  expect(screen.getByText("The technical solution design is approved")).toBeTruthy();
}

function expectRubricRowsAndAbsence() {
  /* Two rows open a rubric; the third slice states its absence in place. */
  expect(rubricRow(1).textContent).toContain(SLICE_TITLES[0]);
  expect(rubricRow(2).textContent).toContain(SLICE_TITLES[1]);
  expect(absentRow().textContent).toContain("No rubric document exists for slice 3");
  expect(
    within(absentRow()).queryByRole("button"),
    "an absent rubric is not a button, so a press opens no empty sheet",
  ).toBeNull();
}

function expectSliceOrder() {
  /*
   * The rows read in slice order: 1, 2, then the absent 3. jsdom has no layout
   * engine, so the order is read from the document, not from any position.
   */
  const first = rubricRow(1);
  const second = rubricRow(2);
  const third = absentRow();
  expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(second.compareDocumentPosition(third) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

async function rendersRowPerSlice() {
  await openPage(`#/${WORK}/build/rubrics`);

  expectGateRecordKept();
  expectRubricRowsAndAbsence();
  expectSliceOrder();
}

async function keepsOtherPlansOff() {
  await openPage(`#/${WORK}/build/rubrics`);

  expect(screen.queryByText(OTHER_RUBRIC_BODY)).toBeNull();
  expect(screen.queryByRole("button", { name: /slice 9/ })).toBeNull();
}

function expectSheetHoldsSliceOne(sheet: HTMLElement) {
  expect(within(sheet).getAllByText(RUBRIC_TITLES[0]).length).toBeGreaterThan(0);
  expect(within(sheet).getByText(RUBRIC_BODIES[0])).toBeTruthy();
  expect(within(sheet).getByText("slice 1")).toBeTruthy();
  /* The sheet holds one rubric, and the page's other rubric stays off it. */
  expect(within(sheet).queryByText(RUBRIC_BODIES[1])).toBeNull();
}

async function opensRubricInSheet() {
  await openPage(`#/${WORK}/build/rubrics`);

  fireEvent.click(rubricRow(1));
  const sheet = await openSheet();

  expectSheetHoldsSliceOne(sheet);

  fireEvent.click(within(sheet).getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

async function opensSheetAtTailRoute() {
  window.location.hash = `#/${WORK}/build/rubrics/2`;
  render(<Shell />);

  const sheet = await openSheet();
  expect(within(sheet).getAllByText(RUBRIC_TITLES[1]).length).toBeGreaterThan(0);
  expect(within(sheet).getByText(RUBRIC_BODIES[1])).toBeTruthy();
}

async function namesRubricsInRailRow() {
  await openPage(`#/${WORK}/build/rubrics`);

  const row = document.querySelector(`a[href="#/${WORK}/build/rubrics"]`);
  expect(row, "the rail links to the rubrics page").toBeTruthy();
  expect(`${row?.getAttribute("aria-label") ?? ""} ${row?.textContent ?? ""}`).toContain(
    "2 rubrics",
  );
}

describe("the rubrics page", () => {
  it("renders one row per slice, in slice order, beside the gate record", rendersRowPerSlice);
  it("keeps another plan's rubrics off this page", keepsOtherPlansOff);
  it("opens the rubric in the Sheet when a row is pressed", opensRubricInSheet);
  it("opens the named rubric's Sheet at a slice tail route", opensSheetAtTailRoute);
  it("names the rubric documents in the rail row", namesRubricsInRailRow);
});
