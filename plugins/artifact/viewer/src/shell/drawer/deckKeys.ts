import type { KeyboardEvent } from "react";

import { chipStepped } from "../workDeck";
import type { DeckBase } from "./useDeck";

interface KeyContext {
  event: KeyboardEvent;
  onInput: boolean;
  deck: DeckBase;
}

type KeyRule = (context: KeyContext) => boolean;

const VIM_STEPS = new Map<string, 1 | -1>([
  ["j", 1],
  ["k", -1],
]);

function onChipStrip(event: KeyboardEvent): boolean {
  const target = event.target;
  return target instanceof HTMLElement && target.closest("[data-chip-strip]") !== null;
}

/*
 * The filter owns left and right while a chip holds the focus. From any row
 * or lane, left and right mean nothing, so the two walks never steal a key.
 */
function stepChips({ event, deck }: KeyContext): boolean {
  if (!onChipStrip(event) || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return false;
  event.preventDefault();
  const { laneFilter, setLaneFilter } = deck.state;
  setLaneFilter(chipStepped(laneFilter, event.key === "ArrowRight" ? 1 : -1, deck.view.chips));
  return true;
}

function focusSearch({ event, onInput, deck }: KeyContext): boolean {
  if (event.key !== "/" || onInput) return false;
  event.preventDefault();
  deck.searchRef.current?.focus();
  return true;
}

/* The stopPropagation is not housekeeping: the shell's rail walks its own
   rows from a window listener, and an arrow that took a row in the deck must
   not take the rail behind it too. */
function walkArrows({ event, deck }: KeyContext): boolean {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return false;
  event.preventDefault();
  event.stopPropagation();
  deck.actions.moveSelection(event.key === "ArrowDown" ? 1 : -1);
  return true;
}

function walkLetters({ event, onInput, deck }: KeyContext): boolean {
  const step = VIM_STEPS.get(event.key);
  if (step === undefined || onInput) return false;
  event.preventDefault();
  event.stopPropagation();
  deck.actions.moveSelection(step);
  return true;
}

/* From the field, Enter reads the first result tall and again stays tall,
   because a field press that closed what it never opened would read as a
   fault. From the board, Enter toggles the shown row. */
function pressEnter({ event, onInput, deck }: KeyContext): boolean {
  const { walk } = deck.view;
  if (event.key !== "Enter" || walk.length === 0) return false;
  event.preventDefault();
  if (!onInput) deck.actions.toggleDetail(deck.state.selection?.id ?? walk[0].design.id);
  else deck.actions.readFirst(walk[0].design.id);
  return true;
}

const RULES: KeyRule[] = [stepChips, focusSearch, walkArrows, walkLetters, pressEnter];

export function handleKey(event: KeyboardEvent, deck: DeckBase): void {
  const context = { event, onInput: event.target instanceof HTMLInputElement, deck };
  RULES.some((rule) => rule(context));
}
