import { describe, expect, it } from "vitest";

import type { BoardRows } from "@/data/types/board";

import { BOARD_ROWS, PROGRAM_BOARD, PROGRAMS, STAGE_KEYS } from "../testSupport/board/fixtures";
import { LANES } from "../workDeck";
import { boardModelOf } from "./model";
import { programCardOf, programColumns, programRowsOf } from "./programBoard";
import type { BoardColumn, ProgramCardModel } from "./shape";

const ALL = new Set(PROGRAMS.map((program) => program.id));
const SHOW_ALL = { ...PROGRAM_BOARD, hide: [] };

function cardsOf(rows: BoardRows): ProgramCardModel[] {
  return programRowsOf(rows).map(programCardOf);
}

function cardNamed(id: string, rows: BoardRows = BOARD_ROWS): ProgramCardModel | undefined {
  return cardsOf(rows).find((card) => card.program.design.id === id);
}

function idsIn(column: BoardColumn | undefined): string[] {
  return (column?.cards ?? []).map((card) => (card.kind === "program" ? card.card.program.design.id : card.kind));
}

function columnNamed(columns: BoardColumn[], key: string): BoardColumn | undefined {
  return columns.find((column) => column.key === key);
}

function groupsEachProgram() {
  const programs = programRowsOf(BOARD_ROWS);
  expect(programs.map((program) => program.design.id)).toEqual(PROGRAMS.map((program) => program.id));
  const beta = programs.find((program) => program.design.id === "beta");
  expect(beta?.epics.map((epic) => epic.id)).toEqual(["beta/E1", "beta/E2", "beta/E3", "beta/E4"]);
  expect(beta?.slices.map((slice) => slice.id)).toEqual(["beta/1", "beta/2", "beta/3", "beta/4", "beta/5", "beta/6"]);
  expect(beta?.nextReady?.id).toBe("beta/4");
  const gamma = programs.find((program) => program.design.id === "gamma");
  expect(gamma?.slices.map((slice) => slice.id), "a slice belongs to the program of its epic first").toEqual(["gamma-plan/1"]);
}

function drawsTheFiveStageColumns() {
  const columns = programColumns(cardsOf(BOARD_ROWS), ALL, SHOW_ALL);
  expect(columns.map((column) => column.key)).toEqual([...STAGE_KEYS]);
  expect(columns.map((column) => column.label)).toEqual(LANES.map((lane) => lane.label));
  expect(columns.every((column) => column.kind === "stage" && column.shape === null)).toBe(true);
}

function placesEachProgramInItsStageColumn() {
  const columns = programColumns(cardsOf(BOARD_ROWS), ALL, SHOW_ALL);
  expect(idsIn(columnNamed(columns, "decision"))).toEqual(["alpha"]);
  expect(idsIn(columnNamed(columns, "build"))).toEqual(["beta"]);
  expect(idsIn(columnNamed(columns, "review"))).toEqual(["gamma"]);
  expect(idsIn(columnNamed(columns, "shipped"))).toEqual(["delta"]);
  expect(idsIn(columnNamed(columns, "superseded"))).toEqual(["old-one", "old-two"]);
  expect(columns.map((column) => column.count)).toEqual([1, 1, 1, 1, 2]);
  expect(columns.flatMap(idsIn).sort(), "each program sits once").toEqual([...ALL].sort());
}

function placesAStageWithNoLaneInTheFirstColumn() {
  const odd = { id: "odd", name: "odd", outcome: "", stage: "drafting" };
  const rows: BoardRows = { ...BOARD_ROWS, programs: [...BOARD_ROWS.programs, odd], nextReady: new Map(BOARD_ROWS.nextReady).set("odd", null) };
  const columns = programColumns(cardsOf(rows), new Set([...ALL, "odd"]), SHOW_ALL);
  expect(idsIn(columnNamed(columns, "decision"))).toEqual(["alpha", "odd"]);
}

function countsEpicsByTheStatusMap() {
  expect(cardNamed("beta")?.counts).toEqual({ planned: 1, inProgress: 2, done: 1 });
  expect(cardNamed("gamma")?.counts).toEqual({ planned: 1, inProgress: 0, done: 0 });
  expect(cardNamed("delta")?.counts).toEqual({ planned: 0, inProgress: 0, done: 1 });
  expect(cardNamed("old-one")?.counts).toEqual({ planned: 0, inProgress: 0, done: 1 });
}

function givesTheSliceFooter() {
  expect(cardNamed("beta")?.slices, "3 of 6 done, next #4").toEqual({ total: 6, done: 3, nextReadyN: 4 });
  expect(cardNamed("gamma")?.slices).toEqual({ total: 1, done: 0, nextReadyN: 1 });
  expect(cardNamed("delta")?.slices).toEqual({ total: 0, done: 0, nextReadyN: null });
}

function countsSkippedAndEscalatedSlicesAsDone() {
  const restated = BOARD_ROWS.slices.map((slice) =>
    slice.id === "beta/5" ? { ...slice, state: "skipped" } : slice.id === "beta/6" ? { ...slice, state: "escalated" } : slice,
  );
  expect(cardNamed("beta", { ...BOARD_ROWS, slices: restated })?.slices.done).toBe(5);
}

function startsWithSupersededHidden() {
  const columns = programColumns(cardsOf(BOARD_ROWS), ALL, PROGRAM_BOARD);
  const superseded = columnNamed(columns, "superseded");
  expect(superseded?.hidden).toBe(true);
  expect(superseded?.count, "a hidden rail keeps its own count").toBe(2);
  expect(superseded?.emptyReason).toBeNull();
  expect(columns.filter((column) => column.hidden).map((column) => column.key)).toEqual(["superseded"]);
}

function dropsTheHiddenCountFromShown() {
  const model = boardModelOf(BOARD_ROWS, PROGRAM_BOARD);
  expect(model.level).toBe("programs");
  expect(model.subject).toBeNull();
  expect(model.columns.map((column) => column.key)).toEqual([...STAGE_KEYS]);
  expect(model.total).toBe(6);
  expect(model.shown, "shown falls by the two superseded programs").toBe(4);
  expect(model.counts.programs).toEqual({ shown: 4, total: 6 });
}

function showsEveryProgramWhenNothingIsHidden() {
  const model = boardModelOf(BOARD_ROWS, SHOW_ALL);
  expect(model.shown).toBe(6);
  expect(model.counts.programs).toEqual({ shown: 6, total: 6 });
  const visible = model.columns.filter((column) => !column.hidden);
  expect(model.shown, "the header count equals the sum of the visible column counts").toBe(
    visible.reduce((sum, column) => sum + column.count, 0),
  );
}

describe("the program board", () => {
  it("groups each program with its epics, its slices, and its next ready slice", groupsEachProgram);
  it("draws the five stage lanes of the drawer, in their order", drawsTheFiveStageColumns);
  it("places each program once, in the column of its stage", placesEachProgramInItsStageColumn);
  it("places a stage that names no lane in the first column", placesAStageWithNoLaneInTheFirstColumn);
  it("counts each program's epics as planned, in progress, and done", countsEpicsByTheStatusMap);
  it("gives the slice footer its total, its done count, and the next ready number", givesTheSliceFooter);
  it("counts skipped and escalated slices as done", countsSkippedAndEscalatedSlicesAsDone);
  it("starts with the Superseded column hidden, and the rail keeps its count", startsWithSupersededHidden);
  it("drops the hidden column's count from shown, and keeps it in total", dropsTheHiddenCountFromShown);
  it("shows every program when no column is hidden", showsEveryProgramWhenNothingIsHidden);
});
