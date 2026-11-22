import type { BoardEpic, BoardRows } from "@/data/types/board";
import type { DesignEntity, SliceEntity } from "@/data/types";

import { LANES, laneOf, type Lane } from "../workDeck";
import type { BoardAddress, ProgramOrder } from "./address";
import { emptyReasonOf } from "./search";
import type { BoardColumn, ProgramCardModel } from "./shape";
import { epicColumnOf, isDoneSlice, type StatusColumnKey } from "./status";

const PROGRAM_CAUSE = { unit: "program", none: "No program is in this stage." };
const RANK: Record<ProgramOrder, (card: ProgramCardModel) => number> = {
  name: () => 0,
  open: ({ counts }) => counts.planned + counts.inProgress,
  progress: ({ counts, program }) => (program.epics.length === 0 ? 0 : counts.done / program.epics.length),
};

export interface ProgramRows {
  design: DesignEntity;
  epics: BoardEpic[];
  /** Every slice of the program, including the slices that join no epic. */
  slices: SliceEntity[];
  /** The slices of this program that join no epic. Their cards open in place. */
  unjoined: SliceEntity[];
  /** The epic of each slice that joins one, from the index's own join. */
  epicOfSlice: Map<string, string>;
  nextReady: SliceEntity | null;
}

function ownerOf(slice: SliceEntity, rows: BoardRows, designOfEpic: Map<string, string>): string | undefined {
  const epicId = rows.epicOfSlice.get(slice.id);
  return epicId === undefined ? slice.feature : designOfEpic.get(epicId);
}

function programRowOf(design: DesignEntity, rows: BoardRows, designOfEpic: Map<string, string>): ProgramRows {
  const slices = rows.slices.filter((slice) => ownerOf(slice, rows, designOfEpic) === design.id);
  return {
    design,
    epics: rows.epics.filter((epic) => epic.design === design.id),
    slices,
    unjoined: slices.filter((slice) => !rows.epicOfSlice.has(slice.id)),
    epicOfSlice: rows.epicOfSlice,
    nextReady: rows.nextReady.get(design.id) ?? null,
  };
}

/** Assigns each slice by its epic, then by its plan slug, so no slice joins two programs. */
export function programRowsOf(rows: BoardRows): ProgramRows[] {
  const designOfEpic = new Map(rows.epics.map((epic) => [epic.id, epic.design]));
  return rows.programs.map((design) => programRowOf(design, rows, designOfEpic));
}

function sliceFooterOf({ slices, nextReady }: ProgramRows): ProgramCardModel["slices"] {
  const done = slices.filter((slice) => isDoneSlice(slice.state)).length;
  return { total: slices.length, done, nextReadyN: nextReady?.n ?? null };
}

export function programCardOf(program: ProgramRows): ProgramCardModel {
  const columns = program.epics.map((epic) => epicColumnOf(epic.status));
  const count = (key: StatusColumnKey) => columns.filter((one) => one === key).length;
  return {
    program,
    counts: { planned: count("planned"), inProgress: count("in_progress"), done: count("done") },
    slices: sliceFooterOf(program),
  };
}

function laneKeyOf(card: ProgramCardModel): string {
  return laneOf(card.program.design.stage)?.key ?? LANES[0].key;
}

export function programCardsInOrder(cards: ProgramCardModel[], order: ProgramOrder): ProgramCardModel[] {
  const rank = RANK[order];
  return [...cards].sort((a, b) => rank(b) - rank(a) || a.program.design.name.localeCompare(b.program.design.name));
}

function stageColumnOf(lane: Lane, { held, before }: { held: ProgramCardModel[]; before: number }, address: BoardAddress): BoardColumn {
  const hidden = address.hide.includes(lane.key);
  return {
    key: lane.key, label: lane.label, kind: "stage", shape: null,
    count: held.length,
    hidden,
    emptyReason: emptyReasonOf({ shown: held.length, before, hidden }, PROGRAM_CAUSE, address.q),
    cards: held.map((card) => ({ kind: "program", card })),
  };
}

export function programColumns(cards: ProgramCardModel[], matched: Set<string>, address: BoardAddress): BoardColumn[] {
  return LANES.map((lane) => {
    const before = cards.filter((card) => laneKeyOf(card) === lane.key);
    const held = before.filter((card) => matched.has(card.program.design.id));
    return stageColumnOf(lane, { held, before: before.length }, address);
  });
}
