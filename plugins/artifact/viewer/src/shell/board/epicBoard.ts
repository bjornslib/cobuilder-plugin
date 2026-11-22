import type { SliceEntity } from "@/data/types";
import type { BoardEpic } from "@/data/types/board";

import type { BoardAddress } from "./address";
import type { ProgramRows } from "./programBoard";
import { emptyReasonOf, epicMatches, sliceMatches, textMatches, type EmptyCause } from "./search";
import type { BoardCard, BoardColumn, EpicCardModel, SliceGroupModel } from "./shape";
import { epicColumnOf, epicStatusWord, sliceColumnOf, STATUS_COLUMNS, type StatusColumn } from "./status";

const NO_EPIC: Omit<SliceGroupModel, "slices"> = { key: "no-epic", label: "No epic", epicId: null };
const EPIC_CAUSE: EmptyCause = { unit: "epic", none: "No epic has this status." };
const SLICE_CAUSE: EmptyCause = { unit: "slice", none: "No slice has this state." };

interface HeldCards {
  cards: BoardCard[];
  count: number;
  before: number;
  cause: EmptyCause;
}

export function epicLabel(epic: BoardEpic): string {
  return epic.title ?? epic.epicId;
}

function slicesOfEpic(program: ProgramRows, slices: SliceEntity[], epicId: string): SliceEntity[] {
  return slices.filter((slice) => program.epicOfSlice.get(slice.id) === epicId);
}

export function epicCardsOf(program: ProgramRows): EpicCardModel[] {
  const slices = [...program.slices].sort((a, b) => a.n - b.n);
  return program.epics.map((epic) => ({ epic, slices: slicesOfEpic(program, slices, epic.id), statusWord: epicStatusWord(epic.status) }));
}

export function matchedEpics(program: ProgramRows, q: string): Set<string> {
  const matches = (card: EpicCardModel) => epicMatches(card.epic, q) || card.slices.some((slice) => textMatches(slice.title, q));
  return new Set(epicCardsOf(program).filter(matches).map((card) => card.epic.id));
}

export function matchedSlices(program: ProgramRows, q: string): Set<string> {
  const labels = new Map(program.epics.map((epic) => [epic.id, [epicLabel(epic), epic.epicId]]));
  const matches = (slice: SliceEntity) => sliceMatches(slice, q, labels.get(program.epicOfSlice.get(slice.id) ?? "") ?? []);
  return new Set(program.slices.filter(matches).map((slice) => slice.id));
}

function statusColumnOf(column: StatusColumn, held: HeldCards, address: BoardAddress): BoardColumn {
  const hidden = address.hide.includes(column.key);
  const emptyReason = emptyReasonOf({ shown: held.count, before: held.before, hidden }, held.cause, address.q);
  return { ...column, kind: "status", count: held.count, hidden, emptyReason, cards: held.cards };
}

export function epicColumns(program: ProgramRows, matched: Set<string>, address: BoardAddress): BoardColumn[] {
  const all = epicCardsOf(program);
  return STATUS_COLUMNS.map((column) => {
    const before = all.filter((card) => epicColumnOf(card.epic.status) === column.key);
    const held = before.filter((card) => matched.has(card.epic.id));
    const cards = held.map((card): BoardCard => ({ kind: "epic", card }));
    return statusColumnOf(column, { cards, count: held.length, before: before.length, cause: EPIC_CAUSE }, address);
  });
}

function groupsOf(program: ProgramRows, slices: SliceEntity[]): SliceGroupModel[] {
  const epics = program.epics.map((epic) => ({
    key: epic.id,
    label: epicLabel(epic),
    epicId: epic.epicId,
    slices: slicesOfEpic(program, slices, epic.id),
  }));
  const unjoined = { ...NO_EPIC, slices: slices.filter((slice) => !program.epicOfSlice.has(slice.id)) };
  return [...epics, unjoined].filter((group) => group.slices.length > 0);
}

/** One group head for each epic with a matching slice, then the group "No epic". */
export function sliceColumns(program: ProgramRows, matched: Set<string>, address: BoardAddress): BoardColumn[] {
  const all = [...program.slices].sort((a, b) => a.n - b.n);
  return STATUS_COLUMNS.map((column) => {
    const before = all.filter((slice) => sliceColumnOf(slice.state) === column.key);
    const held = before.filter((slice) => matched.has(slice.id));
    const cards = groupsOf(program, held).map((group): BoardCard => ({ kind: "slice-group", group }));
    return statusColumnOf(column, { cards, count: held.length, before: before.length, cause: SLICE_CAUSE }, address);
  });
}
