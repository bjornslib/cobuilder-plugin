import type { BoardRows } from "@/data/types/board";

import type { BoardAddress } from "./address";
import { programCardOf, programColumns, programRowsOf } from "./programBoard";
import type { BoardColumn, BoardCounts, BoardModel, ProgramCardModel } from "./shape";

function shownCards(columns: BoardColumn[]): ProgramCardModel[] {
  return columns
    .filter((column) => !column.hidden)
    .flatMap((column) => column.cards.map((one) => one.card));
}

function countsOf(rows: BoardRows, total: number, shown: ProgramCardModel[]): Required<BoardCounts> {
  return {
    programs: { shown: shown.length, total },
    epics: { shown: shown.reduce((sum, card) => sum + card.program.epics.length, 0), total: rows.epics.length },
    slices: { shown: shown.reduce((sum, card) => sum + card.program.slices.length, 0), total: rows.slices.length },
  };
}

function programBoardOf(rows: BoardRows, address: BoardAddress): BoardModel {
  const programs = programRowsOf(rows);
  const cards = programs.map(programCardOf).sort((a, b) => a.program.design.name.localeCompare(b.program.design.name));
  const columns = programColumns(cards, new Set(programs.map((program) => program.design.id)), address);
  const counts = countsOf(rows, programs.length, shownCards(columns));
  const { shown, total } = counts.programs;
  return { address, level: "programs", subject: null, cards: address.cards, columns, counts, shown, total };
}

export function boardModelOf(rows: BoardRows, address: BoardAddress): BoardModel {
  return programBoardOf(rows, address.level === "programs" ? address : { ...address, level: "programs", program: null });
}
