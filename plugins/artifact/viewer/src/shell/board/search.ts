import type { SliceEntity } from "@/data/types";
import type { BoardEpic } from "@/data/types/board";

import type { ProgramRows } from "./programBoard";

export interface EmptyCause {
  unit: string;
  none: string;
}

interface EmptyHeld {
  shown: number;
  before: number;
  hidden: boolean;
}

export function textMatches(text: string | null | undefined, needle: string): boolean {
  return (text ?? "").toLowerCase().includes(needle.toLowerCase());
}

export function epicMatches(epic: BoardEpic, needle: string): boolean {
  return textMatches(epic.title, needle) || textMatches(epic.epicId, needle);
}

export function sliceMatches(slice: SliceEntity, needle: string, labels: readonly string[]): boolean {
  return [slice.title, slice.feature, ...labels].some((text) => textMatches(text, needle));
}

export function programMatches(program: ProgramRows, needle: string): boolean {
  if (textMatches(program.design.name, needle)) return true;
  return program.epics.some((epic) => epicMatches(epic, needle)) || program.slices.some((slice) => sliceMatches(slice, needle, []));
}

export function emptyReasonOf(held: EmptyHeld, cause: EmptyCause, q: string): string | null {
  if (held.hidden || held.shown > 0) return null;
  return held.before > 0 ? `No ${cause.unit} matches “${q}”.` : cause.none;
}
