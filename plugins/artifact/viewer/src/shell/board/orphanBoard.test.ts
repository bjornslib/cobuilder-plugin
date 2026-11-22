import { describe, expect, it } from "vitest";

import type { BoardRows } from "@/data/types/board";

import { PROGRAM_BOARD } from "../testSupport/board/fixtures";
import { NO_ORPHAN_ROWS, ORPHAN_ROWS } from "../testSupport/board/orphans";
import { readBoardAddress, type BoardAddress } from "./address";
import { boardModelOf } from "./model";
import type { BoardColumn, BoardModel } from "./shape";

type OrphanColumns = (rows: BoardRows, matched: Set<string>, address: BoardAddress) => BoardColumn[];

const MODULE = import.meta.glob<Record<string, unknown>>("./orphanBoard.ts", { eager: true });
const ORPHANS = readBoardAddress("#/board?orphans=1") as BoardAddress;
const ALL_ORPHANS = new Set(ORPHAN_ROWS.orphanSlices.map((slice) => slice.id));

function orphanColumns(): OrphanColumns {
  const exported = MODULE["./orphanBoard.ts"]?.orphanColumns;
  expect(typeof exported, "orphanBoard.ts exports orphanColumns").toBe("function");
  return exported as OrphanColumns;
}

function groupsIn(columns: BoardColumn[], key: string): Record<string, { label: string; epicId: string | null; slices: string[] }> {
  const cards = columns.find((column) => column.key === key)?.cards ?? [];
  const groups = cards.flatMap((card) => (card.kind === "slice-group" ? [card.group] : []));
  return Object.fromEntries(groups.map((group) => [group.key, { label: group.label, epicId: group.epicId, slices: group.slices.map((one) => one.id) }]));
}

function noProgramOf(model: BoardModel): unknown {
  return "noProgram" in model ? model.noProgram : undefined;
}

function groupsTheOrphansByPlanSlug() {
  const columns = orphanColumns()(ORPHAN_ROWS, ALL_ORPHANS, ORPHANS);
  expect(columns.map((column) => column.key)).toEqual(["planned", "in_progress", "done"]);
  expect(groupsIn(columns, "planned")).toEqual({ "lost-plan": { label: "lost-plan", epicId: null, slices: ["lost-plan/1"] } });
  expect(groupsIn(columns, "done")).toEqual({
    "lost-plan": { label: "lost-plan", epicId: null, slices: ["lost-plan/2"] },
    "spare-plan": { label: "spare-plan", epicId: null, slices: ["spare-plan/2", "spare-plan/3"] },
  });
}

function mapsEachStateToItsColumn() {
  const columns = orphanColumns()(ORPHAN_ROWS, ALL_ORPHANS, ORPHANS);
  const progress = groupsIn(columns, "in_progress");
  expect(progress["spare-plan"]?.slices).toEqual(["spare-plan/1"]);
  expect(progress["odd-plan"]?.slices, "an unknown state goes to In progress").toEqual(["odd-plan/1"]);
  expect(columns.map((column) => column.count), "skipped and escalated are done").toEqual([1, 2, 3]);
  expect(columns.every((column) => column.kind === "status" && !column.hidden && column.emptyReason === null)).toBe(true);
}

function narrowsTheColumnsToTheMatchedSlices() {
  const address = { ...ORPHANS, q: "spare" };
  const columns = orphanColumns()(ORPHAN_ROWS, new Set(["spare-plan/1"]), address);
  expect(columns.map((column) => column.count)).toEqual([0, 1, 0]);
  expect(Object.keys(groupsIn(columns, "in_progress"))).toEqual(["spare-plan"]);
  expect(columns[0]?.emptyReason).toBe("No slice matches “spare”.");
}

function countsTheOrphansAndThePlansOnTheCard() {
  const model = boardModelOf(ORPHAN_ROWS, PROGRAM_BOARD);
  expect(noProgramOf(model)).toEqual({ count: 6, plans: 3, href: "#/board?orphans=1" });
  expect(model.counts.programs?.total, "the card never counts as a program").toBe(ORPHAN_ROWS.programs.length);
}

function dropsTheCardWithNoOrphan() {
  expect(noProgramOf(boardModelOf(ORPHAN_ROWS, PROGRAM_BOARD)), "the card with orphans").toMatchObject({ count: 6 });
  expect(noProgramOf(boardModelOf(NO_ORPHAN_ROWS, PROGRAM_BOARD)), "no orphan slice").toBeNull();
  expect(noProgramOf(boardModelOf(ORPHAN_ROWS, { ...PROGRAM_BOARD, q: "no-such-text" })), "the search hides each orphan").toBeNull();
}

function drawsTheNoProgramBoardModel() {
  const model = boardModelOf(ORPHAN_ROWS, ORPHANS);
  expect([model.level, model.subject]).toEqual(["orphans", "No program"]);
  expect(model.columns.map((column) => column.key)).toEqual(["planned", "in_progress", "done"]);
  expect(model.counts).toEqual({ slices: { shown: 6, total: 6 } });
  expect([model.shown, model.total]).toEqual([6, 6]);
}

function scopesTheSlicePairToTheBoard() {
  const model = boardModelOf(ORPHAN_ROWS, { ...ORPHANS, q: "spare", hide: ["done"] });
  expect(model.level).toBe("orphans");
  expect(model.counts.slices, "the hidden Done column leaves the shown count").toEqual({ shown: 1, total: 6 });
  expect(model.shown).toBe(model.columns.filter((column) => !column.hidden).reduce((sum, column) => sum + column.count, 0));
}

describe("the No program board", () => {
  it("groups the orphan slices under one head for each plan slug", groupsTheOrphansByPlanSlug);
  it("maps each slice state to its status column", mapsEachStateToItsColumn);
  it("narrows the columns to the matched slices and states why a column is empty", narrowsTheColumnsToTheMatchedSlices);
  it("counts the orphan slices and their plans on the No program card", countsTheOrphansAndThePlansOnTheCard);
  it("drops the No program card when no orphan slice exists or matches", dropsTheCardWithNoOrphan);
  it("draws the No program board model with only the slice pair", drawsTheNoProgramBoardModel);
  it("scopes the slice pair to the No program board", scopesTheSlicePairToTheBoard);
});
