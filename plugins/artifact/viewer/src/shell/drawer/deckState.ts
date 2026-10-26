import { useEffect, useMemo, useRef, useState } from "react";

import type { DesignRow } from "@/data/types";

import { FILTER_ALL, laneOf, soleOf } from "../workDeck";

export interface Selection {
  id: string;
  auto: boolean;
}

/*
 * The deck's own reduce answer: a reduced reader folds with no height
 * animation, like every other animated thing the house draws.
 *
 * The state filter selects whole lanes; `all` is the value that clears it.
 *
 * THE FOLD, PER LANE KEY. A folded lane collapses to its header line — a
 * display choice only. Its rows stay in the walk and in the counts, and
 * the lane holding the current row refuses the fold.
 *
 * THE SELECTION AND ITS TWO SOURCES. An explicit selection is a row the
 * reader chose; an automatic one is the mirror of a result set of exactly
 * one. A dismissed automatic read is remembered for as long as the same
 * sole result holds — a Close or a second press is a decision the deck does
 * not undo — and a changed needle starts a new read.
 */
export function useDeckState() {
  const [needle, setNeedle] = useState("");
  const [laneFilter, setLaneFilter] = useState<string>(FILTER_ALL);
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  const [selection, setSelection] = useState<Selection | null>(null);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  return { needle, setNeedle, laneFilter, setLaneFilter, folded, setFolded, selection, setSelection, dismissed, setDismissed };
}

export type DeckState = ReturnType<typeof useDeckState>;

function isStale(selection: Selection | null, walk: DesignRow[]): boolean {
  return selection !== null && (selection.auto || !walk.some((row) => row.design.id === selection.id));
}

/* The auto of this very sole is already in: bailing on the same
   value is what keeps this effect from re-rendering forever,
   because setState with a new object is a change even when no
   field changed. */
function nextSelection(was: Selection | null, sole: DesignRow, walk: DesignRow[]): Selection | null {
  if (was !== null && was.id === sole.design.id && was.auto) return was;
  if (was === null || was.auto || !walk.some((row) => row.design.id === was.id)) {
    return { id: sole.design.id, auto: true };
  }
  return was;
}

/*
 * THE SELECTION FOLLOWS THE RESULT SET. A sole result mirrors itself into
 * the deck with no second press; a set that broadens past one takes the
 * automatic read away entirely, because an automatic selection was never
 * the reader's own and a highlight without its pane is a lie; an explicit
 * one stays only while its row is visible.
 */
function useSelectionFollow(walk: DesignRow[], state: DeckState): void {
  const { selection, setSelection, dismissed } = state;
  const sole = useMemo(() => soleOf(walk), [walk]);
  useEffect(() => {
    if (sole !== null) {
      if (!dismissed.has(sole.design.id)) setSelection((was) => nextSelection(was, sole, walk));
    } else if (isStale(selection, walk)) {
      setSelection(null);
    }
  }, [sole, walk, selection, dismissed, setSelection]);
}

/*
 * THE LANE HOLDING THE CURRENT ROW OPENS. The walk never lands on a row
 * the board cannot show, so the fold cannot hold the row the selection
 * is on: it opens the moment the walk steps onto it. Same rule, enforced
 * from the selection side.
 */
function useFoldOpens(rows: DesignRow[], { selection, folded, setFolded }: DeckState): void {
  useEffect(() => {
    if (selection === null) return;
    const stage = rows.find((row) => row.design.id === selection.id)?.design.stage;
    const lane = stage ? laneOf(stage) : null;
    if (lane && folded[lane.key]) setFolded((was) => ({ ...was, [lane.key]: false }));
  }, [selection, rows, folded, setFolded]);
}

function resetDeck(state: DeckState): void {
  state.setDismissed(new Set());
  state.setNeedle("");
  state.setLaneFilter(FILTER_ALL);
  state.setFolded({});
  state.setSelection(null);
}

/*
 * THE DRAWER RESETS WHEN IT CLOSES, so the next open is the whole deck: the
 * needle, the filter, the fold, the selection, and the dismissed sole all
 * come back to their first state. The guard keeps the reset from firing on
 * the drawer's first mount while it is still open.
 */
function useResetOnClose(open: boolean, state: DeckState): void {
  const wasOpen = useRef(open);
  useEffect(() => {
    if (wasOpen.current && !open) resetDeck(state);
    wasOpen.current = open;
  }, [open, state]);
}

interface EffectsInput {
  rows: DesignRow[];
  open: boolean;
  walk: DesignRow[];
}

export function useDeckEffects({ rows, open, walk }: EffectsInput, state: DeckState): void {
  useSelectionFollow(walk, state);
  useFoldOpens(rows, state);
  useResetOnClose(open, state);
}
