import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { installAdrs } from "../testSupport/App/fixtures";
import { press } from "../testSupport/App/queries";
import { BOARD_DESIGNS, EPIC_BOARD_INDEX } from "../testSupport/board/fixtures";
import { BY_NAME, BY_OPEN_WORK, BY_PROGRESS, installOrderIndex } from "../testSupport/board/order";
import {
  boardColumn, columnText, findField, found, openBoardAt, orderSelect, programsIn, pushesOneEntry, shownPair, typeInFind, visibleColumnLabels,
} from "../testSupport/board/queries";
import { installJsdomStubs } from "../testSupport/jsdom";

const RESTORED = "#/board?q=l&sort=progress&hide=shipped,superseded";
const RESTORED_RAILS = ["Show Shipped, 0 programs", "Show Superseded, 0 programs"];
const RESTORED_VIEW = { find: "l", order: "progress", build: ["able", "charlie"], rails: [true, true] };
const STAGE_LABELS = ["Needs a decision", "Ready to build", "In review", "Shipped"];

beforeAll(installJsdomStubs);

beforeEach(() => {
  window.INDEX = EPIC_BOARD_INDEX;
  window.DESIGNS = BOARD_DESIGNS;
  installAdrs();
});

afterEach(cleanup);

function readView() {
  return {
    find: findField()?.value ?? null,
    order: orderSelect()?.value ?? null,
    build: programsIn("Ready to build"),
    rails: RESTORED_RAILS.map((name) => screen.queryByRole("button", { name }) !== null),
  };
}

async function replacesTheAddressOnEachKeyPress() {
  await openBoardAt("#/board");
  const before = window.history.length;
  const field = await typeInFind(["b", "be", "beta"]);
  await waitFor(() => expect(window.location.hash).toBe("#/board?q=beta"));
  expect(window.history.length, "a key press adds no history entry").toBe(before);
  expect(document.activeElement, "the focus stays in the field").toBe(field);
}

async function narrowsTheProgramBoard() {
  await openBoardAt("#/board");
  await typeInFind(["beta"]);
  await waitFor(() => expect(programsIn("Needs a decision")).toEqual([]));
  expect(programsIn("Ready to build")).toEqual(["beta"]);
  expect(shownPair(/programs/i), "the header total does not fall with the search").toBe("1 of 6");
}

async function narrowsTheEpicBoard() {
  await openBoardAt("#/board?program=beta");
  await typeInFind(["polish"]);
  await waitFor(() => expect(window.location.hash).toBe("#/board?program=beta&q=polish"));
  await waitFor(() => expect(columnText("In progress")).toContain("No epic matches “polish”."));
  expect(columnText("Planned")).toContain("Polish the board");
  expect(shownPair(/epics/i), "the header total does not fall with the search").toBe("1 of 4");
}

async function statesTheSearchReason() {
  await openBoardAt("#/board?q=beta");
  await waitFor(() => expect(columnText("Needs a decision")).toContain("No program matches “beta”."));
  expect(columnText("Shipped")).toContain("No program matches “beta”.");
  expect(programsIn("Ready to build")).toEqual(["beta"]);
}

async function keepsTheNoRecordReason() {
  installOrderIndex();
  await openBoardAt("#/board?q=baker");
  await waitFor(() => expect(programsIn("Ready to build")).toEqual(["baker"]));
  expect(columnText("Needs a decision"), "the column held no record before the search").toContain("No program is in this stage.");
}

async function statesTheBoardSentenceAndClearsIt() {
  await openBoardAt("#/board?q=zzz");
  await found(() => screen.queryByText("No program, epic, or slice matches “zzz”."), "the board sentence");
  expect(boardColumn("Ready to build"), "the columns stay").not.toBeNull();
  fireEvent.click(await found(() => screen.queryByRole("button", { name: "Clear the search" }), "the Clear the search button"));
  await waitFor(() => expect(window.location.hash).toBe("#/board"));
  await waitFor(() => expect(programsIn("Ready to build")).toEqual(["beta"]));
}

async function namesTheProgramInTheEpicBoardSentence() {
  await openBoardAt("#/board?program=beta&q=zzz");
  await found(() => screen.queryByText("No epic or slice of beta matches “zzz”."), "the epic board sentence");
}

async function chooseOrder(value: string, hash: string): Promise<void> {
  const select = await found(orderSelect, "the Order select");
  await pushesOneEntry(() => fireEvent.change(select, { target: { value } }), hash);
}

async function ordersTheProgramCards() {
  installOrderIndex();
  await openBoardAt("#/board");
  expect(programsIn("Ready to build")).toEqual(BY_NAME);
  await chooseOrder("open", "#/board?sort=open");
  await waitFor(() => expect(programsIn("Ready to build")).toEqual(BY_OPEN_WORK));
  await chooseOrder("progress", "#/board?sort=progress");
  await waitFor(() => expect(programsIn("Ready to build")).toEqual(BY_PROGRESS));
  expect(visibleColumnLabels(), "the columns never reorder").toEqual(STAGE_LABELS);
}

async function gatesOrderToTheProgramBoard() {
  await openBoardAt("#/board");
  const select = await found(orderSelect, "the Order select");
  expect(within(select).getAllByRole("option").map((option) => option.textContent)).toEqual(["Name", "Most open work", "Progress"]);
  cleanup();
  await openBoardAt("#/board?program=beta");
  expect(findField(), "Find shows on the epic board").not.toBeNull();
  expect(orderSelect(), "no Order on the epic board").toBeNull();
}

async function hidesAColumnAndTheRailReturnsIt() {
  await openBoardAt("#/board");
  const hide = await found(() => screen.queryByRole("button", { name: "Hide Shipped" }), "the Hide button of Shipped");
  expect(hide.textContent, "the visible word").toBe("Hide");
  await pushesOneEntry(() => fireEvent.click(hide), "#/board?hide=shipped,superseded");
  await waitFor(() => expect(boardColumn("Shipped")).toBeNull());
  expect(shownPair(/programs/i)).toBe("3 of 6");
  const rail = await found(() => screen.queryByRole("button", { name: "Show Shipped, 1 program" }), "the Shipped rail");
  await pushesOneEntry(() => fireEvent.click(rail), "#/board");
  await waitFor(() => expect(programsIn("Shipped")).toEqual(["delta"]));
}

async function disablesHideOnTheLastVisibleColumn() {
  await openBoardAt("#/board?program=beta&hide=planned,in_progress");
  const hide = await found(() => screen.queryByRole<HTMLButtonElement>("button", { name: "Hide Done" }), "the Hide button of Done");
  expect(hide.disabled, "the last visible column refuses").toBe(true);
}

async function keepsTheRailCountAfterTheSearch() {
  await openBoardAt("#/board?q=old-two");
  await found(() => screen.queryByRole("button", { name: "Show Superseded, 1 program" }), "the rail counts its own column after the search");
}

async function restoresTheBoardFromTheAddress() {
  installOrderIndex();
  await openBoardAt(RESTORED);
  expect(readView()).toEqual(RESTORED_VIEW);
  cleanup();
  await openBoardAt(RESTORED);
  expect(readView(), "a second render of the same hash restores the board").toEqual(RESTORED_VIEW);
}

async function focusesFindOnSlash() {
  await openBoardAt("#/board");
  const field = await found(findField, "the Find field");
  press("/");
  expect(document.activeElement).toBe(field);
}

async function leavesSlashToTheOpenDrawer() {
  await openBoardAt("#/board");
  const field = await found(findField, "the Find field");
  fireEvent.click(screen.getByRole("button", { name: "Work board" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "WORK" })).not.toBeNull());
  press("/");
  expect(document.activeElement).not.toBe(field);
}

describe("Find", () => {
  it("replaces the address on each key press, adds no history entry, and keeps the focus", replacesTheAddressOnEachKeyPress);
  it("narrows the program board, and the header total does not fall", narrowsTheProgramBoard);
  it("narrows the epic board, and the header total does not fall", narrowsTheEpicBoard);
  it("moves the focus into Find on the / key", focusesFindOnSlash);
  it("leaves the / key to the open Work drawer", leavesSlashToTheOpenDrawer);
});

describe("the empty reasons", () => {
  it("states the search reason in each column that the search empties", statesTheSearchReason);
  it("keeps the no-record reason in a column that held no record", keepsTheNoRecordReason);
  it("states one board sentence when the search empties every column, and clears it", statesTheBoardSentenceAndClearsIt);
  it("names the program in the epic board sentence", namesTheProgramInTheEpicBoardSentence);
});

describe("Order", () => {
  it("orders the program cards by name, open work, and progress, each with one history entry", ordersTheProgramCards);
  it("offers the three orders on the program board only", gatesOrderToTheProgramBoard);
});

describe("Hide", () => {
  it("turns a column into a rail with its count, and the rail returns it, each with one history entry", hidesAColumnAndTheRailReturnsIt);
  it("disables Hide on the last visible column", disablesHideOnTheLastVisibleColumn);
  it("keeps the rail count of its own column after the search", keepsTheRailCountAfterTheSearch);
});

describe("the reload", () => {
  it("restores the search, the order, and the hidden columns from the address", restoresTheBoardFromTheAddress);
});
