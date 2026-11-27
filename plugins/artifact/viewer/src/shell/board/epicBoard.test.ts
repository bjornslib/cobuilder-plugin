import { describe, expect, it } from "vitest";

import { EPIC_BOARD, EPIC_BOARD_ROWS } from "../testSupport/board/fixtures";
import { epicCardsOf, epicColumns, sliceColumns } from "./epicBoard";
import { boardModelOf } from "./model";
import { programRowsOf, type ProgramRows } from "./programBoard";
import type { BoardColumn } from "./shape";

const SLICES_GRAIN = { ...EPIC_BOARD, cards: "slices" as const };
const NOTE = "2 slices join no epic. Switch to Slices to see them.";

function programNamed(id: string): ProgramRows {
  return programRowsOf(EPIC_BOARD_ROWS).find((program) => program.design.id === id) as ProgramRows;
}

function allEpicsOf(program: ProgramRows): Set<string> {
  return new Set(program.epics.map((epic) => epic.id));
}

function allSlicesOf(program: ProgramRows): Set<string> {
  return new Set(program.slices.map((slice) => slice.id));
}

function columnNamed(columns: BoardColumn[], key: string): BoardColumn | undefined {
  return columns.find((column) => column.key === key);
}

function epicIdsIn(column: BoardColumn | undefined): string[] {
  return (column?.cards ?? []).map((card) => (card.kind === "epic" ? card.card.epic.id : card.kind));
}

function groupsIn(column: BoardColumn | undefined): { label: string; key: string; epicId: string | null; slices: string[] }[] {
  return (column?.cards ?? [])
    .filter((card) => card.kind === "slice-group")
    .map(({ group }) => ({ label: group.label, key: group.key, epicId: group.epicId, slices: group.slices.map((one) => one.id) }));
}

function marksTheUnjoinedSlices() {
  const beta = programNamed("beta");
  expect(beta.unjoined?.map((slice) => slice.id)).toEqual(["beta/7", "beta/8"]);
  expect(beta.slices.map((slice) => slice.id), "every slice of the program, the unjoined ones included").toHaveLength(8);
  expect(programNamed("gamma").unjoined).toEqual([]);
}

function drawsTheThreeStatusColumns() {
  const columns = epicColumns(programNamed("beta"), allEpicsOf(programNamed("beta")), EPIC_BOARD);
  expect(columns.map((column) => column.key)).toEqual(["planned", "in_progress", "done"]);
  expect(columns.map((column) => column.label)).toEqual(["Planned", "In progress", "Done"]);
  expect(columns.map((column) => column.shape)).toEqual(["circle", "half", "filled"]);
  expect(columns.every((column) => column.kind === "status" && !column.hidden)).toBe(true);
}

function placesEachEpicByItsStatus() {
  const columns = epicColumns(programNamed("beta"), allEpicsOf(programNamed("beta")), EPIC_BOARD);
  expect(epicIdsIn(columnNamed(columns, "planned"))).toEqual(["beta/E3"]);
  expect(epicIdsIn(columnNamed(columns, "in_progress"))).toEqual(["beta/E2", "beta/E4"]);
  expect(epicIdsIn(columnNamed(columns, "done"))).toEqual(["beta/E1"]);
  expect(columns.map((column) => column.count)).toEqual([1, 2, 1]);
  expect(columns.map((column) => column.emptyReason)).toEqual([null, null, null]);
}

function givesEachEpicCardItsWordTitleAndSlices() {
  const cards = new Map(epicCardsOf(programNamed("beta")).map((card) => [card.epic.id, card]));
  expect(cards.get("beta/E4")?.statusWord, "the raw word of the index").toBe("no-pull-request");
  expect(cards.get("beta/E2")?.epic.title).toBe("Wire the drawer");
  expect(cards.get("beta/E2")?.slices.map((slice) => slice.id)).toEqual(["beta/4", "beta/5"]);
  expect(cards.get("beta/E4")?.slices).toEqual([]);
}

function statesWhyAnEpicColumnIsEmpty() {
  const alpha = programNamed("alpha");
  const columns = epicColumns(alpha, allEpicsOf(alpha), { ...EPIC_BOARD, program: "alpha" });
  expect(columns.map((column) => column.count)).toEqual([0, 0, 0]);
  expect(columns.map((column) => column.emptyReason)).toEqual(Array(3).fill("No epic has this status."));
}

function groupsTheSlicesUnderTheirEpic() {
  const columns = sliceColumns(programNamed("beta"), allSlicesOf(programNamed("beta")), SLICES_GRAIN);
  expect(columns.map((column) => column.key)).toEqual(["planned", "in_progress", "done"]);
  const progress = groupsIn(columnNamed(columns, "in_progress"));
  expect(progress.map((group) => [group.label, group.slices])).toEqual([["Wire the drawer", ["beta/5"]]]);
  expect(progress[0]?.epicId, "an epic head links to its epic").not.toBeNull();
  expect(columns.map((column) => column.count), "each column counts its slices").toEqual([3, 1, 4]);
}

function putsTheUnjoinedSlicesUnderNoEpic() {
  const columns = sliceColumns(programNamed("beta"), allSlicesOf(programNamed("beta")), SLICES_GRAIN);
  const planned = groupsIn(columnNamed(columns, "planned"));
  const done = groupsIn(columnNamed(columns, "done"));
  expect(planned.map((group) => group.label), "epic heads first, then No epic").toEqual(["Wire the drawer", "Polish the board", "No epic"]);
  expect(planned.at(-1)).toEqual({ label: "No epic", key: "no-epic", epicId: null, slices: ["beta/7"] });
  expect(done.at(-1)).toEqual({ label: "No epic", key: "no-epic", epicId: null, slices: ["beta/8"] });
  expect(groupsIn(columnNamed(columns, "in_progress")).map((group) => group.label)).not.toContain("No epic");
}

function drawsTheEpicBoardModel() {
  const model = boardModelOf(EPIC_BOARD_ROWS, EPIC_BOARD);
  expect(model.level).toBe("epics");
  expect(model.subject, "the band names the program").toBe("beta");
  expect(model.columns.map((column) => column.key)).toEqual(["planned", "in_progress", "done"]);
  expect(model.counts.epics).toEqual({ shown: 4, total: 4 });
  expect(model.counts.slices?.total, "the slices total counts the unjoined slices").toBe(8);
  expect(model.shown).toBe(model.columns.reduce((sum, column) => sum + column.count, 0));
}

function statesTheUnjoinedCountOnTheEpicsGrain() {
  expect(boardModelOf(EPIC_BOARD_ROWS, EPIC_BOARD).unjoinedNote).toBe(NOTE);
  expect(boardModelOf(EPIC_BOARD_ROWS, { ...EPIC_BOARD, program: "gamma" }).unjoinedNote, "absent at zero").toBeNull();
}

function dropsTheNoteOnTheSlicesGrain() {
  const model = boardModelOf(EPIC_BOARD_ROWS, SLICES_GRAIN);
  expect(model.level).toBe("epics");
  expect(model.cards).toBe("slices");
  expect(model.unjoinedNote).toBeNull();
  expect(model.counts.slices).toEqual({ shown: 8, total: 8 });
  expect(model.shown, "the header count equals the visible column counts").toBe(8);
}

describe("the epic board", () => {
  it("marks the slices of a program that join no epic", marksTheUnjoinedSlices);
  it("draws the three status columns", drawsTheThreeStatusColumns);
  it("places each epic in the column of its status, with the counts", placesEachEpicByItsStatus);
  it("gives each epic card its raw word, its title, and its slices by number", givesEachEpicCardItsWordTitleAndSlices);
  it("states why an epic column is empty", statesWhyAnEpicColumnIsEmpty);
  it("groups the slices under their epic on the slices grain", groupsTheSlicesUnderTheirEpic);
  it("puts the unjoined slices under one No epic head in each of their state columns", putsTheUnjoinedSlicesUnderNoEpic);
  it("draws the epic board model of one program, and the slices total counts the unjoined slices", drawsTheEpicBoardModel);
  it("states the count of unjoined slices on the epics grain", statesTheUnjoinedCountOnTheEpicsGrain);
  it("drops the note on the slices grain", dropsTheNoteOnTheSlicesGrain);
});
