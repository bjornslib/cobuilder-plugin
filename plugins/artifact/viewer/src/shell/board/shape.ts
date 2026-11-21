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

export type BoardCard = { kind: "program"; card: ProgramCardModel };

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
  /** The `h2` on the lower boards. Null on the program board. */
  subject: string | null;
  cards: CardGrain;
  columns: BoardColumn[];
  counts: BoardCounts;
  /** The records the visible columns show. */
  shown: number;
  /** The records the board holds before the search, hidden columns included. */
  total: number;
}
