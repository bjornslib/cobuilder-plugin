import type { DesignEntity, SliceEntity } from "./core";

/** One epic as a card reads it. Status and lifecycle stay two fields. */
export interface BoardEpic {
  /** The design-scoped id, as in `kanban-board/E1`. */
  id: string;
  /** The bare id, as in `E1`. */
  epicId: string;
  design: string;
  title: string | null;
  branch: string | null;
  pr: number | null;
  /** `joins.epic_status` when it answers, else the entity's own `state`. */
  status: string;
  /** The tracker lifecycle: `open`, `closed`, or null when the tracker holds no record. */
  lifecycle: string | null;
}

/** The flat rows of one index. The shell groups them. */
export interface BoardRows {
  programs: DesignEntity[];
  epics: BoardEpic[];
  slices: SliceEntity[];
  /** The epic of each slice, from the index's own join. */
  epicOfSlice: Map<string, string>;
  /** Slices whose plan slug names no design. */
  orphanSlices: SliceEntity[];
  /** The next ready slice of each design, or null. */
  nextReady: Map<string, SliceEntity | null>;
  /** The build time, or null for an index built before the field existed. */
  builtAt: string | null;
}
