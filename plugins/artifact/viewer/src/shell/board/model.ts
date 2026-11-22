import type { BoardRows } from "@/data/types/board";

import type { BoardAddress } from "./address";
import { epicColumns, matchedEpics, matchedSlices, sliceColumns } from "./epicBoard";
import { matchedOrphans, noProgramOf, orphanColumns } from "./orphanBoard";
import { programCardOf, programCardsInOrder, programColumns, programRowsOf, type ProgramRows } from "./programBoard";
import { programMatches } from "./search";
import type { BoardColumn, BoardCount, BoardCounts, BoardModel, ProgramCardModel } from "./shape";

function visibleOf(columns: BoardColumn[]): BoardColumn[] {
  return columns.filter((column) => !column.hidden);
}

function shownCards(columns: BoardColumn[]): ProgramCardModel[] {
  return visibleOf(columns).flatMap((column) => column.cards.flatMap((one) => (one.kind === "program" ? [one.card] : [])));
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
  const cards = programCardsInOrder(programs.map(programCardOf), address.order);
  const matched = programs.filter((program) => programMatches(program, address.q));
  const columns = programColumns(cards, new Set(matched.map((program) => program.design.id)), address);
  const counts = countsOf(rows, programs.length, shownCards(columns));
  const { shown, total } = counts.programs;
  const noProgram = noProgramOf(rows, address.q);
  return { address, level: "programs", subject: null, cards: address.cards, columns, counts, shown, total, unjoinedNote: null, noProgram };
}

function pairOf(columns: BoardColumn[], total: number): BoardCount {
  return { shown: visibleOf(columns).reduce((sum, column) => sum + column.count, 0), total };
}

function unjoinedNoteOf(count: number): string | null {
  if (count === 0) return null;
  const subject = count === 1 ? "1 slice joins" : `${count} slices join`;
  return `${subject} no epic. Switch to Slices to see them.`;
}

function epicBoardOf(address: BoardAddress, program: ProgramRows): BoardModel {
  const epics = epicColumns(program, matchedEpics(program, address.q), address);
  const slices = sliceColumns(program, matchedSlices(program, address.q), address);
  const counts = { epics: pairOf(epics, program.epics.length), slices: pairOf(slices, program.slices.length) };
  const onSlices = address.cards === "slices";
  const { shown, total } = onSlices ? counts.slices : counts.epics;
  const unjoinedNote = onSlices ? null : unjoinedNoteOf(program.unjoined.length);
  const columns = onSlices ? slices : epics;
  return { address, level: "epics", subject: program.design.name, cards: address.cards, columns, counts, shown, total, unjoinedNote, noProgram: null };
}

function orphanBoardOf(rows: BoardRows, address: BoardAddress): BoardModel {
  const columns = orphanColumns(rows, matchedOrphans(rows, address.q), address);
  const slices = pairOf(columns, rows.orphanSlices.length);
  const { shown, total } = slices;
  return { address, level: "orphans", subject: "No program", cards: address.cards, columns, counts: { slices }, shown, total, unjoinedNote: null, noProgram: null };
}

export function boardModelOf(rows: BoardRows, address: BoardAddress): BoardModel {
  if (address.level === "orphans") return orphanBoardOf(rows, address);
  const program = address.level === "epics" ? programRowsOf(rows).find((one) => one.design.id === address.program) : undefined;
  if (program !== undefined) return epicBoardOf(address, program);
  return programBoardOf(rows, address.level === "programs" ? address : { ...address, level: "programs", program: null });
}

function noMatchOf(model: BoardModel, q: string): string {
  if (model.level === "orphans") return `No slice that belongs to no program matches “${q}”.`;
  return model.subject === null ? `No program, epic, or slice matches “${q}”.` : `No epic or slice of ${model.subject} matches “${q}”.`;
}

export function noMatchSentenceOf(model: BoardModel): string | null {
  const { q } = model.address;
  if (q === "" || model.total === 0 || model.noProgram !== null || model.columns.some((column) => column.count > 0)) return null;
  return noMatchOf(model, q);
}
