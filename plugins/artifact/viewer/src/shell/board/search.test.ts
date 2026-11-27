import { describe, expect, it } from "vitest";

import type { SliceEntity } from "@/data/types";
import type { BoardEpic } from "@/data/types/board";

import { BOARD_ROWS, EPIC_BOARD, EPIC_BOARD_ROWS, PROGRAM_BOARD } from "../testSupport/board/fixtures";
import type { BoardAddress } from "./address";
import { boardModelOf } from "./model";
import { programRowsOf, type ProgramRows } from "./programBoard";
import type { BoardCard, BoardColumn, BoardModel } from "./shape";

type ProgramMatches = (program: ProgramRows, needle: string) => boolean;
type EpicMatches = (epic: BoardEpic, needle: string) => boolean;
type SliceMatches = (slice: SliceEntity, needle: string, labels: readonly string[]) => boolean;

const SEARCH = import.meta.glob<Record<string, unknown>>("./search.ts", { eager: true });

function exported<T>(name: string): T {
  const predicate = SEARCH["./search.ts"]?.[name];
  expect(typeof predicate, `search.ts exports ${name}`).toBe("function");
  return predicate as T;
}

function program(id: string): ProgramRows {
  return programRowsOf(EPIC_BOARD_ROWS).find((one) => one.design.id === id) as ProgramRows;
}

function epic(id: string): BoardEpic {
  return EPIC_BOARD_ROWS.epics.find((one) => one.id === id) as BoardEpic;
}

function slice(id: string): SliceEntity {
  return EPIC_BOARD_ROWS.slices.find((one) => one.id === id) as SliceEntity;
}

function matchesAProgramOnItsName() {
  const matches = exported<ProgramMatches>("programMatches");
  expect([matches(program("beta"), "beta"), matches(program("beta"), "BETA"), matches(program("gamma"), "beta")]).toEqual([true, true, false]);
}

function matchesAProgramOnAnEpicTitle() {
  const matches = exported<ProgramMatches>("programMatches");
  expect([matches(program("beta"), "drawer"), matches(program("gamma"), "drawer")]).toEqual([true, false]);
}

function matchesAProgramOnASliceTitle() {
  const matches = exported<ProgramMatches>("programMatches");
  expect([matches(program("beta"), "beta/5"), matches(program("gamma"), "beta/5")]).toEqual([true, false]);
}

function matchesEveryRecordOnAnEmptyNeedle() {
  expect(exported<ProgramMatches>("programMatches")(program("gamma"), "")).toBe(true);
  expect(exported<EpicMatches>("epicMatches")(epic("beta/E3"), "")).toBe(true);
  expect(exported<SliceMatches>("sliceMatches")(slice("beta/4"), "", [])).toBe(true);
}

function matchesAnEpicOnItsTitle() {
  const matches = exported<EpicMatches>("epicMatches");
  expect([matches(epic("beta/E2"), "drawer"), matches(epic("beta/E2"), "WIRE"), matches(epic("beta/E3"), "drawer")]).toEqual([true, true, false]);
}

function matchesAnEpicOnItsEpicId() {
  const matches = exported<EpicMatches>("epicMatches");
  expect([matches(epic("beta/E2"), "E2"), matches(epic("beta/E3"), "E2"), matches(epic("gamma/E1"), "e1")]).toEqual([true, false, true]);
}

function matchesASliceOnItsTitle() {
  const matches = exported<SliceMatches>("sliceMatches");
  expect([matches(slice("beta/4"), "beta/4", []), matches(slice("beta/5"), "beta/4", [])]).toEqual([true, false]);
}

function matchesASliceOnItsEpicLabels() {
  const matches = exported<SliceMatches>("sliceMatches");
  const labels = ["Wire the drawer", "E2"];
  expect([matches(slice("beta/4"), "drawer", labels), matches(slice("beta/4"), "e2", labels), matches(slice("beta/4"), "drawer", [])]).toEqual([true, true, false]);
}

function matchesASliceOnItsPlanSlug() {
  const matches = exported<SliceMatches>("sliceMatches");
  const retitled = { ...slice("lost-plan/1"), title: "Draw the rail" };
  expect([matches(retitled, "lost-plan", []), matches(retitled, "found-plan", [])]).toEqual([true, false]);
}

function idOf(card: BoardCard): string[] {
  if (card.kind === "program") return [card.card.program.design.id];
  return card.kind === "epic" ? [card.card.epic.id] : card.group.slices.map((one) => one.id);
}

function shownIds(model: BoardModel): string[] {
  return model.columns.filter((column) => !column.hidden).flatMap((column) => column.cards.flatMap(idOf));
}

function columnOf(model: BoardModel, key: string): BoardColumn | undefined {
  return model.columns.find((column) => column.key === key);
}

function modelAt(address: BoardAddress, q: string, rows = EPIC_BOARD_ROWS): BoardModel {
  return boardModelOf(rows, { ...address, q });
}

function narrowsTheProgramBoard() {
  const model = modelAt(PROGRAM_BOARD, "beta", BOARD_ROWS);
  expect(shownIds(model)).toEqual(["beta"]);
  expect([model.shown, model.total], "the total does not fall with the search").toEqual([1, 6]);
  expect(model.counts.programs).toEqual({ shown: 1, total: 6 });
  expect(shownIds(modelAt(PROGRAM_BOARD, "drawer")), "a program matches through an epic title").toEqual(["beta"]);
}

function keepsTheRailCountOfItsOwnColumn() {
  const model = modelAt(PROGRAM_BOARD, "old-two", BOARD_ROWS);
  expect([columnOf(model, "superseded")?.hidden, columnOf(model, "superseded")?.count]).toEqual([true, 1]);
  expect([model.shown, model.total]).toEqual([0, 6]);
}

function statesTheSearchReasonOnTheProgramBoard() {
  const model = modelAt(PROGRAM_BOARD, "beta", BOARD_ROWS);
  expect(columnOf(model, "decision")?.emptyReason).toBe("No program matches “beta”.");
  expect([columnOf(model, "decision")?.count, columnOf(model, "build")?.emptyReason]).toEqual([0, null]);
}

function narrowsTheEpicBoard() {
  const model = modelAt(EPIC_BOARD, "polish");
  expect(shownIds(model)).toEqual(["beta/E3"]);
  expect(model.counts.epics).toEqual({ shown: 1, total: 4 });
  expect(columnOf(model, "in_progress")?.emptyReason).toBe("No epic matches “polish”.");
  expect(shownIds(modelAt(EPIC_BOARD, "beta/6")), "an epic matches through a slice title").toEqual(["beta/E3"]);
}

function keepsTheNoRecordReasonUnderTheSearch() {
  const model = modelAt({ ...EPIC_BOARD, program: "gamma" }, "polish");
  expect(shownIds(model)).toEqual([]);
  expect(columnOf(model, "planned")?.emptyReason).toBe("No epic matches “polish”.");
  expect(columnOf(model, "done")?.emptyReason, "a column that held no record keeps its own reason").toBe("No epic has this status.");
}

function narrowsTheSlicesGrain() {
  const model = modelAt({ ...EPIC_BOARD, cards: "slices" }, "beta/7");
  expect(shownIds(model)).toEqual(["beta/7"]);
  expect(model.counts.slices).toEqual({ shown: 1, total: 8 });
  expect(columnOf(model, "done")?.emptyReason).toBe("No slice matches “beta/7”.");
  expect(shownIds(modelAt({ ...EPIC_BOARD, cards: "slices" }, "drawer")), "a slice matches through its epic title").toEqual(["beta/4", "beta/5"]);
}

describe("the search predicates", () => {
  it("matches a program on its name, in any letter case", matchesAProgramOnItsName);
  it("matches a program on the title of one of its epics", matchesAProgramOnAnEpicTitle);
  it("matches a program on the title of one of its slices", matchesAProgramOnASliceTitle);
  it("matches every record on an empty needle", matchesEveryRecordOnAnEmptyNeedle);
  it("matches an epic on its title", matchesAnEpicOnItsTitle);
  it("matches an epic on its epic id, with or without a title", matchesAnEpicOnItsEpicId);
  it("matches a slice on its title", matchesASliceOnItsTitle);
  it("matches a slice on the title or id of its epic", matchesASliceOnItsEpicLabels);
  it("matches a slice on its plan slug", matchesASliceOnItsPlanSlug);
});

describe("the search on the board model", () => {
  it("narrows the program board, and the total does not fall", narrowsTheProgramBoard);
  it("keeps the count of a hidden rail's own column after the search", keepsTheRailCountOfItsOwnColumn);
  it("states the search reason in a column that the search empties", statesTheSearchReasonOnTheProgramBoard);
  it("narrows the epic board, and an epic matches through a slice title", narrowsTheEpicBoard);
  it("keeps the no-record reason in a column that held no record", keepsTheNoRecordReasonUnderTheSearch);
  it("narrows the slices grain, and a slice matches through its epic title", narrowsTheSlicesGrain);
});
