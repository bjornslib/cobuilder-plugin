import { describe, expect, it } from "vitest";

import { PROGRAM_BOARD, STAGE_KEYS } from "../testSupport/board/fixtures";
import { boardHash, columnKeysOf, hideToggled, readBoardAddress, type BoardAddress } from "./address";

const STATUS_KEYS = ["planned", "in_progress", "done"];

function readsTheDefaultAddress() {
  expect(readBoardAddress("#/board")).toEqual(PROGRAM_BOARD);
}

function readsNoOtherHash() {
  expect(readBoardAddress("#/board"), "the contrast: the board address itself reads").not.toBeNull();
  expect(readBoardAddress("#/")).toBeNull();
  expect(readBoardAddress("")).toBeNull();
  expect(readBoardAddress("#/beta/intent")).toBeNull();
  expect(readBoardAddress("#/boardroom/intent")).toBeNull();
}

function readsTheLowerBoards() {
  expect(readBoardAddress("#/board?program=beta")).toEqual({ ...PROGRAM_BOARD, level: "epics", program: "beta", hide: [] });
  expect(readBoardAddress("#/board?orphans=1")).toEqual({ ...PROGRAM_BOARD, level: "orphans", hide: [] });
  expect(readBoardAddress("#/board?program=beta&orphans=1")?.level, "program wins over orphans").toBe("epics");
}

function readsEachKnownValue() {
  const address = readBoardAddress("#/board?q=slice%20board&sort=progress&hide=shipped");
  expect(address).toEqual({ ...PROGRAM_BOARD, q: "slice board", order: "progress", hide: ["shipped"] });
  expect(readBoardAddress("#/board?program=beta&cards=slices")?.cards).toBe("slices");
}

function ignoresUnknownKeysAndValues() {
  expect(readBoardAddress("#/board?sort=size&cards=rows&orphans=2&colour=red")).toEqual(PROGRAM_BOARD);
  expect(readBoardAddress("#/board?hide=nope,shipped")?.hide).toEqual(["shipped"]);
}

function writesHideInColumnOrder() {
  expect(readBoardAddress("#/board?hide=superseded,decision")?.hide).toEqual(["decision", "superseded"]);
}

function keepsOneColumnVisible() {
  const all = `#/board?hide=${STAGE_KEYS.join(",")}`;
  expect(readBoardAddress(all)?.hide).toEqual(["decision", "build", "review", "shipped"]);
  const epics = "#/board?program=beta&hide=planned,in_progress,done";
  expect(readBoardAddress(epics)?.hide).toEqual(["planned", "in_progress"]);
}

function namesTheColumnsOfEachLevel() {
  expect(columnKeysOf("programs")).toEqual([...STAGE_KEYS]);
  expect(columnKeysOf("epics")).toEqual(STATUS_KEYS);
  expect(columnKeysOf("orphans")).toEqual(STATUS_KEYS);
}

function writesTheDefaultsAsTheBareAddress() {
  expect(boardHash(PROGRAM_BOARD)).toBe("#/board");
}

function writesKeysInOrderAndOmitsDefaults() {
  const programs: BoardAddress = { ...PROGRAM_BOARD, q: "x", order: "progress", hide: ["shipped"] };
  expect(boardHash(programs)).toBe("#/board?q=x&sort=progress&hide=shipped");
  const epics: BoardAddress = { ...PROGRAM_BOARD, level: "epics", program: "beta", q: "a b", cards: "slices", hide: ["done"] };
  expect(boardHash(epics)).toBe("#/board?program=beta&q=a%20b&cards=slices&hide=done");
  expect(boardHash({ ...PROGRAM_BOARD, level: "orphans", hide: [] })).toBe("#/board?orphans=1");
}

function roundTrips(address: BoardAddress) {
  expect(readBoardAddress(boardHash(address))).toEqual(address);
}

function roundTripsAProgramAPhraseAndASort() {
  roundTrips({ ...PROGRAM_BOARD, level: "epics", program: "beta", hide: [] });
  roundTrips({ ...PROGRAM_BOARD, q: "slice board" });
  expect(boardHash({ ...PROGRAM_BOARD, q: "slice board" })).toContain("q=slice%20board");
  roundTrips({ ...PROGRAM_BOARD, order: "open" });
}

function roundTripsAnEmptyHideOnTheProgramBoard() {
  const shown: BoardAddress = { ...PROGRAM_BOARD, hide: [] };
  expect(boardHash(shown), "an empty hide differs from the default, so the address keeps it").not.toBe("#/board");
  roundTrips(shown);
}

function togglesAColumnInColumnOrder() {
  expect(hideToggled(PROGRAM_BOARD, "superseded").hide).toEqual([]);
  expect(hideToggled(PROGRAM_BOARD, "decision").hide).toEqual(["decision", "superseded"]);
}

function refusesToHideTheLastVisibleColumn() {
  const fourHidden: BoardAddress = { ...PROGRAM_BOARD, hide: ["decision", "build", "review", "shipped"] };
  expect(hideToggled(fourHidden, "shipped").hide, "another column still toggles").toEqual(["decision", "build", "review"]);
  expect(hideToggled(fourHidden, "superseded").hide).toEqual(["decision", "build", "review", "shipped"]);
}

describe("the board address, read from a hash", () => {
  it("reads #/board as the program board with Superseded hidden", readsTheDefaultAddress);
  it("returns null for every other hash", readsNoOtherHash);
  it("reads the epic board and the No program board, and program wins", readsTheLowerBoards);
  it("reads the search, the sort, the hide list, and the card grain", readsEachKnownValue);
  it("ignores an unknown key or value, so the default holds", ignoresUnknownKeysAndValues);
  it("keeps the hide list in column order", writesHideInColumnOrder);
  it("drops the last key of a hide list that names every column", keepsOneColumnVisible);
  it("names the column keys of each level", namesTheColumnsOfEachLevel);
});

describe("the board address, written and toggled", () => {
  it("writes the default program board as #/board", writesTheDefaultsAsTheBareAddress);
  it("writes the keys in order, omits defaults, and writes a space as %20", writesKeysInOrderAndOmitsDefaults);
  it("round-trips a program, a phrase with a space, and a sort", roundTripsAProgramAPhraseAndASort);
  it("round-trips a program board that shows every column", roundTripsAnEmptyHideOnTheProgramBoard);
  it("toggles a column into and out of the hide list in column order", togglesAColumnInColumnOrder);
  it("refuses to hide the last visible column", refusesToHideTheLastVisibleColumn);
});
