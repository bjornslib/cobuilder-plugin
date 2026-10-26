import type { DesignRow } from "@/data/types";

import { filterForTyping } from "../workDeck";
import type { DeckState, Selection } from "./deckState";

export type SetSnap = (snapPoint: number) => void;

function stepIndex(walk: DesignRow[], selection: Selection | null, step: 1 | -1): number {
  const at = selection === null ? -1 : walk.findIndex((row) => row.design.id === selection.id);
  return Math.min(Math.max(at + step, 0), walk.length - 1);
}

/* THE SAME ROW AGAIN IS A CLOSE. The dismissed sole is remembered for
   as long as the same sole result holds, and the deck drops back to its
   working height. */
function dismiss(state: DeckState, id: string, setSnap: SetSnap): void {
  state.setDismissed((prev) => new Set(prev).add(id));
  state.setSelection(null);
  setSnap(0.6);
}

function toggleDetail(state: DeckState, id: string, setSnap: SetSnap): void {
  if (state.selection?.id === id) return dismiss(state, id, setSnap);
  state.setSelection({ id, auto: false });
  setSnap(0.95);
}

/* TYPING RESETS THE FILTER — `filterForTyping` is the one place
   the rule lives — and the new needle starts a new read, so the
   dismissed sole of the previous find does not outlive it. */
function typeNeedle(state: DeckState, value: string): void {
  state.setNeedle(value);
  state.setLaneFilter(filterForTyping());
  state.setDismissed(new Set());
}

/* The selection moves through the handler in one word: an empty string is
   no selection. */
function selectId(state: DeckState, id: string): void {
  state.setSelection(id.length > 0 ? { id, auto: false } : null);
}

function moveActions(walk: DesignRow[], state: DeckState) {
  return {
    setSelected: (id: string) => selectId(state, id),
    moveSelection: (step: 1 | -1) => {
      if (walk.length > 0) selectId(state, walk[stepIndex(walk, state.selection, step)].design.id);
    },
    typeNeedle: (value: string) => typeNeedle(state, value),
  };
}

function detailActions(state: DeckState, setSnap: SetSnap) {
  return {
    toggleDetail: (id: string) => toggleDetail(state, id, setSnap),
    readFirst: (id: string) => {
      selectId(state, id);
      setSnap(0.95);
    },
    closeDetail: () => {
      if (state.selection !== null) dismiss(state, state.selection.id, setSnap);
    },
  };
}

export function deckActions(walk: DesignRow[], state: DeckState, setSnap: SetSnap) {
  return { ...moveActions(walk, state), ...detailActions(state, setSnap) };
}

export type DeckActions = ReturnType<typeof deckActions>;
