import type { RecordIndex, SliceEntity } from "@/data/types";
import type { BoardRows } from "@/data/types/board";

import { BOARD_INDEX, BOARD_ROWS, EPIC_BOARD_INDEX, SLICES } from "./fixtures";

const orphan = (id: string, state: string): SliceEntity => {
  const [feature, n] = id.split("/");
  return { id, feature, n: Number(n), title: `Slice ${id}`, ends_with: `The end state of ${id}.`, score: null, attempts: 1, state };
};

export const SCORED_ORPHAN: SliceEntity = { ...orphan("spare-plan/1", "in_progress"), score: "0.93", attempts: 2 };

export const EXTRA_ORPHANS: SliceEntity[] = [
  SCORED_ORPHAN,
  orphan("spare-plan/2", "skipped"),
  orphan("spare-plan/3", "escalated"),
  orphan("odd-plan/1", "paused"),
];

const UNRESOLVED = Object.fromEntries(EXTRA_ORPHANS.map((one) => [one.id, "no design for the plan"]));

export const ORPHAN_INDEX: RecordIndex = {
  ...EPIC_BOARD_INDEX,
  entities: { ...EPIC_BOARD_INDEX.entities, slice: [...EPIC_BOARD_INDEX.entities.slice, ...EXTRA_ORPHANS] },
  joins: {
    ...EPIC_BOARD_INDEX.joins,
    slice_to_epic_unresolved: { ...EPIC_BOARD_INDEX.joins.slice_to_epic_unresolved, ...UNRESOLVED },
  },
};

const isLost = (one: SliceEntity) => one.feature === "lost-plan";

export const NO_ORPHAN_INDEX: RecordIndex = {
  ...BOARD_INDEX,
  entities: { ...BOARD_INDEX.entities, slice: BOARD_INDEX.entities.slice.filter((one) => !isLost(one)) },
};

export const ORPHAN_ROWS: BoardRows = {
  ...BOARD_ROWS,
  slices: [...SLICES, ...EXTRA_ORPHANS],
  orphanSlices: [...BOARD_ROWS.orphanSlices, ...EXTRA_ORPHANS],
};

export const NO_ORPHAN_ROWS: BoardRows = {
  ...BOARD_ROWS,
  slices: SLICES.filter((one) => !isLost(one)),
  orphanSlices: [],
};
