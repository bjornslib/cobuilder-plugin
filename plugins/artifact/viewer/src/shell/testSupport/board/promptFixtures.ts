import type { EpicEntity, RecordIndex, SliceEntity } from "@/data/types";

import { EPIC_BOARD_INDEX } from "./fixtures";

const epic = (epicId: string, title: string, pr: number | null): EpicEntity => ({
  id: `beta/${epicId}`,
  design: "beta",
  epic_id: epicId,
  branch: `feat/beta-${epicId}`,
  pr,
  state: "open",
  note: null,
  title,
});

const slice = (n: number): SliceEntity => ({
  id: `beta/${n}`,
  feature: "beta",
  n,
  title: `Slice beta/${n}`,
  ends_with: "",
  score: null,
  attempts: 0,
  state: "completed",
});

export const SEALED_EPIC = "Seal the board";
export const WAITING_EPIC = "Await the merge";

export const DONE_EPICS_INDEX: RecordIndex = {
  ...EPIC_BOARD_INDEX,
  entities: {
    ...EPIC_BOARD_INDEX.entities,
    epic: [...EPIC_BOARD_INDEX.entities.epic, epic("E5", SEALED_EPIC, null), epic("E6", WAITING_EPIC, 7)],
    slice: [...EPIC_BOARD_INDEX.entities.slice, slice(9), slice(10)],
  },
  joins: {
    ...EPIC_BOARD_INDEX.joins,
    epic_status: { ...EPIC_BOARD_INDEX.joins.epic_status, "beta/E5": "open", "beta/E6": "open" },
    slice_to_epic: { ...EPIC_BOARD_INDEX.joins.slice_to_epic, "beta/9": "beta/E5", "beta/10": "beta/E6" },
  },
};
