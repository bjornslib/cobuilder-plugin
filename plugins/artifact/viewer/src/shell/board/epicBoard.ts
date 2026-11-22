import type { SliceEntity } from "@/data/types";
import type { BoardEpic } from "@/data/types/board";

import type { BoardAddress } from "./address";
import type { ProgramRows } from "./programBoard";
import type { BoardCard, BoardColumn, EpicCardModel, SliceGroupModel } from "./shape";
import { epicColumnOf, epicStatusWord, sliceColumnOf, STATUS_COLUMNS, type StatusColumn } from "./status";

const NO_EPIC: Omit<SliceGroupModel, "slices"> = { key: "no-epic", label: "No epic", epicId: null };

interface HeldCards {
  cards: BoardCard[];
  count: number;
  empty: string;
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

function statusColumnOf(column: StatusColumn, held: HeldCards, address: BoardAddress): BoardColumn {
  const hidden = address.hide.includes(column.key);
  return {
    ...column,
    kind: "status",
    count: held.count,
    hidden,
    emptyReason: hidden || held.count > 0 ? null : held.empty,
    cards: held.cards,
  };
}

export function epicColumns(program: ProgramRows, matched: Set<string>, address: BoardAddress): BoardColumn[] {
  const cards = epicCardsOf(program).filter((card) => matched.has(card.epic.id));
  return STATUS_COLUMNS.map((column) => {
    const held = cards.filter((card) => epicColumnOf(card.epic.status) === column.key);
    const boardCards = held.map((card): BoardCard => ({ kind: "epic", card }));
    return statusColumnOf(column, { cards: boardCards, count: held.length, empty: "No epic has this status." }, address);
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
  const slices = program.slices.filter((slice) => matched.has(slice.id)).sort((a, b) => a.n - b.n);
  return STATUS_COLUMNS.map((column) => {
    const held = slices.filter((slice) => sliceColumnOf(slice.state) === column.key);
    const cards = groupsOf(program, held).map((group): BoardCard => ({ kind: "slice-group", group }));
    return statusColumnOf(column, { cards, count: held.length, empty: "No slice has this state." }, address);
  });
}
