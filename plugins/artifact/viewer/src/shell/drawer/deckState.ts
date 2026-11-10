import { useEffect, useMemo, useRef, useState } from "react";

import type { DesignRow } from "@/data/types";

import { FILTER_ALL, laneOf, soleOf } from "../workDeck";

export interface Selection {
  id: string;
  auto: boolean;
}

/*
 * A reduced reader folds with no height animation, like every other animated
 * thing the house draws. The state filter selects whole lanes; `all` clears it.
 *
 * A folded lane collapses to its header line only: its rows stay in the walk
 * and the counts, and the lane holding the current row refuses the fold.
 *
 * An explicit selection is a row the reader chose; an automatic one mirrors a
 * result set of exactly one. A dismissed automatic read is remembered while
 * the same sole result holds, because a Close or a second press is a decision
 * the deck does not undo. A changed needle starts a new read.
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

/* Bail on the same value: it keeps this effect from re-rendering forever,
   because setState with a new object is a change even when no field changed. */
function nextSelection(was: Selection | null, sole: DesignRow, walk: DesignRow[]): Selection | null {
  if (was !== null && was.id === sole.design.id && was.auto) return was;
  if (was === null || was.auto || !walk.some((row) => row.design.id === was.id)) {
    return { id: sole.design.id, auto: true };
  }
  return was;
}

/*
 * A sole result mirrors itself into the deck with no second press. A set that
 * broadens past one drops the automatic read, because it was never the
 * reader's own and a highlight without its pane is a lie. An explicit one
 * stays only while its row is visible.
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
 * The walk never lands on a row the board cannot show, so the fold cannot
 * hold the selected row: it opens the moment the walk steps onto it.
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
 * The drawer resets when it closes, so the next open is the whole deck. The
 * guard keeps the reset from firing on the first mount while it is open.
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
