import { cleanup, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";

import { installAdrs } from "./testSupport/App/fixtures";
import { DESIGNS } from "./testSupport/LevelSections/designRecords";
import { openPaged, openLevel } from "./testSupport/LevelSections/open.test.helpers";
import { pagerText } from "./testSupport/LevelSections/paged.test.helpers";
import { pane } from "./testSupport/LevelSections/panes.test.helpers";
import { installJsdomStubs } from "./testSupport/jsdom";
import { MARK_EPIC_HASH, MARK_HASH, MARK_INDEX, MARK_ROW_ID, MARK_SLICE_ID, MARK_TITLES } from "./testSupport/sliceMark/fixtures";

type SliceRowId = (epicId: string, sliceId: string) => string;

const ANCHOR = import.meta.glob<Record<string, unknown>>("./sections/sliceAnchor.ts", { eager: true });
const OPEN_VIEW = { section: "Section 2 of 3", epic: "true", slices: ["false", "true", "false"], marked: "true", chips: 1 };

beforeAll(installJsdomStubs);

beforeEach(() => {
  window.INDEX = MARK_INDEX;
  window.DESIGNS = DESIGNS;
  installAdrs();
});

afterEach(cleanup);

function expandedOf(match: (text: string) => boolean): string | null {
  const headers = Array.from(pane().querySelectorAll<HTMLElement>("button[aria-expanded]"));
  return headers.find((button) => match((button.textContent ?? "").trim()))?.getAttribute("aria-expanded") ?? null;
}

function markedRows(): string[] {
  const current = Array.from(pane().querySelectorAll<HTMLElement>('[aria-current="true"]'));
  return current.filter((element) => within(element).queryAllByText("Marked").length > 0).map((element) => element.id);
}

function readView() {
  const row = document.getElementById(MARK_ROW_ID);
  return {
    section: pagerText(),
    epic: expandedOf((text) => /^E8(?!\d)/.test(text)),
    slices: MARK_TITLES.map((title) => expandedOf((text) => text.includes(title))),
    marked: row?.getAttribute("aria-current") ?? null,
    chips: row === null ? 0 : within(row).queryAllByText("Marked").length,
  };
}

async function opensTheEpicAndTheSlice() {
  await openPaged(MARK_HASH, "Build");
  await waitFor(() => expect(readView().slices, "slice 2 opens, and its siblings stay closed").toEqual(OPEN_VIEW.slices));
  expect(readView().section, "the pager shows the section of E8").toBe(OPEN_VIEW.section);
  expect(readView().epic, "the epic of the address opens").toBe("true");
}

async function marksTheSliceRow() {
  await openPaged(MARK_HASH, "Build");
  await waitFor(() => expect(markedRows(), "one row carries the mark").toEqual([MARK_ROW_ID]));
  const row = document.getElementById(MARK_ROW_ID) as HTMLElement;
  expect(row.textContent ?? "", "the marked row is the row of slice 2").toContain(MARK_TITLES[1]);
}

function anchorBuilder(): SliceRowId {
  const builder = Object.values(ANCHOR)[0]?.sliceRowId;
  expect(typeof builder, "sections/sliceAnchor.ts exports sliceRowId").toBe("function");
  return builder as SliceRowId;
}

async function usesTheAnchorId() {
  const sliceRowId = anchorBuilder();
  expect(sliceRowId("E1", "w/3"), "a slash in the slice id reads as a hyphen").toBe("slice-E1-w-3");
  await openPaged(MARK_HASH, "Build");
  await waitFor(() => expect(document.getElementById(sliceRowId("E8", MARK_SLICE_ID))?.getAttribute("aria-current")).toBe("true"));
}

function resetOrders(spy: MockInstance<Element["scrollTo"]>): number[] {
  const resets = spy.mock.contexts.map((context, at) => (context === pane() ? spy.mock.invocationCallOrder[at] : 0));
  return resets.filter((order) => order > 0);
}

async function scrollsTheRowAfterTheReset() {
  const reset = vi.spyOn(Element.prototype, "scrollTo");
  const scroll = vi.fn();
  Element.prototype.scrollIntoView = scroll;
  await openPaged(MARK_HASH, "Build");
  await waitFor(() => expect(scroll.mock.contexts, "the marked row scrolls into view").toContain(document.getElementById(MARK_ROW_ID)));
  const rowOrder = scroll.mock.invocationCallOrder[scroll.mock.contexts.indexOf(document.getElementById(MARK_ROW_ID))];
  expect(resetOrders(reset).every((order) => order < rowOrder), "no pane reset follows the row scroll").toBe(true);
  reset.mockRestore();
}

async function givesTheSameViewOnReload() {
  await openPaged(MARK_HASH, "Build");
  await waitFor(() => expect(readView(), "the first render").toEqual(OPEN_VIEW));
  cleanup();
  await openLevel(MARK_HASH, "Build");
  await waitFor(() => expect(readView(), "a second render at the same address").toEqual(OPEN_VIEW));
}

async function marksNothingAtTheEpicAddress() {
  await openPaged(MARK_HASH, "Build");
  await waitFor(() => expect(markedRows(), "the slice address marks its row").toEqual([MARK_ROW_ID]));
  cleanup();
  await openPaged(MARK_EPIC_HASH, "Build");
  expect(markedRows(), "the epic address marks no row").toEqual([]);
  expect(readView().slices, "the epic address opens no slice").toEqual(["false", "false", "false"]);
}

describe("the marked slice row on the epic page", () => {
  it("opens the epic on its own section and opens slice n", opensTheEpicAndTheSlice);
  it("marks the row of slice n with aria-current and a Marked chip", marksTheSliceRow);
  it("gives the marked row the id that sliceRowId builds", usesTheAnchorId);
  it("scrolls the marked row into view after the pane reset", scrollsTheRowAfterTheReset);
  it("gives the same view on a second render at the same address", givesTheSameViewOnReload);
  it("marks no row at the epic address without a fifth segment", marksNothingAtTheEpicAddress);
});
