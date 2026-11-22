import type { SliceEntity } from "@/data/types";
import type { BoardEpic } from "@/data/types/board";

import type { BoardAddress, BoardLevel, CardGrain } from "./address";
import type { ProgramRows } from "./programBoard";
import type { StatusShape } from "./status";

export interface BoardCount {
  shown: number;
  total: number;
}
export interface BoardCounts {
  programs?: BoardCount;
  epics?: BoardCount;
  slices?: BoardCount;
}

export interface ProgramCardModel {
  program: ProgramRows;
  counts: { planned: number; inProgress: number; done: number };
  slices: { total: number; done: number; nextReadyN: number | null };
}

export interface NoProgramModel {
  count: number;
  plans: number;
  href: string;
}

export interface EpicCardModel {
  epic: BoardEpic;
  /** The epic's slices, ordered by slice number. */
  slices: SliceEntity[];
  statusWord: string;
}

export interface SliceGroupModel {
  /** A stable head id: the epic id, or `no-epic`. */
  key: string;
  /** The head text: the epic label, or "No epic". */
  label: string;
  /** The bare epic id of the group's page. Null for "No epic". */
  epicId: string | null;
  slices: SliceEntity[];
}

export type BoardCard =
  | { kind: "program"; card: ProgramCardModel }
  | { kind: "epic"; card: EpicCardModel }
  | { kind: "slice-group"; group: SliceGroupModel };

export interface BoardColumn {
  key: string;
  label: string;
  kind: "stage" | "status";
  shape: StatusShape | null;
  count: number;
  hidden: boolean;
  /** `null` on a hidden column, and on a column that holds a card. */
  emptyReason: string | null;
  cards: BoardCard[];
}

export interface BoardModel {
  /** The address the model drew. */
  address: BoardAddress;
  level: BoardLevel;
  /** The `h2` on the lower boards: the program name. Null on the program board. */
  subject: string | null;
  cards: CardGrain;
  columns: BoardColumn[];
  counts: BoardCounts;
  /** The records the visible columns show. */
  shown: number;
  /** The records the board holds before the search, hidden columns included. */
  total: number;
  /** The line under the columns on the epics grain, when slices join no epic. */
  unjoinedNote: string | null;
  noProgram: NoProgramModel | null;
}
