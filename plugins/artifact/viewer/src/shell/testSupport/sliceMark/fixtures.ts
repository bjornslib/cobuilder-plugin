import type { RecordIndex, SliceEntity } from "@/data/types";

import { DESIGN } from "../LevelSections/constants";
import { INDEX } from "../LevelSections/recordIndex";

export const MARK_EPIC = "E8";
export const MARK_EPIC_HASH = `#/${DESIGN}/build/epics/${MARK_EPIC}`;
export const MARK_HASH = `${MARK_EPIC_HASH}/2`;
export const MARK_ROW_ID = `slice-${MARK_EPIC}-${DESIGN}-2`;
export const MARK_SLICE_ID = `${DESIGN}/2`;
export const MARK_TITLES = ["The first slice of E8", "The second slice of E8", "The third slice of E8"];

const slice = (title: string, position: number): SliceEntity => ({
  id: `${DESIGN}/${position + 1}`,
  feature: DESIGN,
  n: position + 1,
  title,
  ends_with: `${title} ends.`,
  score: null,
  attempts: 1,
  state: "planned",
});

export const MARK_SLICES: SliceEntity[] = MARK_TITLES.map(slice);

export const MARK_INDEX: RecordIndex = {
  ...INDEX,
  entities: { ...INDEX.entities, slice: MARK_SLICES },
  joins: {
    ...INDEX.joins,
    slice_to_epic: Object.fromEntries(MARK_SLICES.map((one) => [one.id, `${DESIGN}/${MARK_EPIC}`])),
  },
};
