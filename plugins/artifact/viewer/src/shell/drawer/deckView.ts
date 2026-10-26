import { useMemo } from "react";

import { entitiesOf } from "@/data/bundle";
import { resolvedJoinsOf, type ResolvedJoins } from "@/data/joins";
import type { DesignRow, RecordIndex } from "@/data/types";

import { FILTER_ALL, LANES, filterChipsOf, walkedRows, type Lane } from "../workDeck";
import type { DeckState, Selection } from "./deckState";

function useVisibleLanes(laneFilter: string): Lane[] {
  return useMemo(
    () => LANES.filter((lane) => laneFilter === FILTER_ALL || laneFilter === lane.key),
    [laneFilter],
  );
}

function selectedRow(rows: DesignRow[], selection: Selection | null): DesignRow | null {
  if (!selection) return null;
  return rows.find((row) => row.design.id === selection.id) ?? null;
}

/* THE WALK READS ONLY WHAT THE FILTER NARROWS. The filter drops whole
   lanes, and the search refines what remains — in that order, once. A fold
   drops neither: a folded lane is not a gap, the same rule the rail holds. */
export function useDeckView(rows: DesignRow[], state: DeckState) {
  const needleText = state.needle.trim().toLowerCase();
  const visibleLanes = useVisibleLanes(state.laneFilter);
  const walk = useMemo(() => walkedRows(visibleLanes, rows, needleText), [visibleLanes, rows, needleText]);
  const chips = useMemo(() => filterChipsOf(LANES), []);
  const selected = selectedRow(rows, state.selection);
  return { needleText, visibleLanes, walk, chips, selected, shown: walk.length };
}

export type DeckView = ReturnType<typeof useDeckView>;

export function filterCountOf(rows: DesignRow[], laneKey: string): number {
  if (laneKey === FILTER_ALL) return rows.length;
  const stages = LANES.find((lane) => lane.key === laneKey)?.stages ?? [];
  return rows.filter((row) => stages.includes(row.design.stage)).length;
}

function trackerNoteOf(joins: ResolvedJoins): string | null {
  if (joins.trackerRead()) return null;
  return joins.trackerAdapter() === "files" ? "Next ready needs a tracker." : "The tracker was not read.";
}

/* THE RULE THE BOARD DOES NOT UNDO, in the footer's own words. */
function heldOutOf(index: RecordIndex) {
  const entities = entitiesOf(index);
  return {
    decisions: entities.adr.length,
    openPulls: entities.pull_request.filter((pull) => pull.state !== "merged").length,
  };
}

/* THE INDEX'S JOINS, RESOLVED ONCE AND HELD. This is the shell's own
   sanction: the join is the data layer's answer, and the drawer never
   resolves one of its own. */
export function useIndexFacts(index: RecordIndex) {
  const heldOut = useMemo(() => heldOutOf(index), [index]);
  const resolvedJoins = useMemo(() => resolvedJoinsOf(index), [index]);
  return { heldOut, resolvedJoins, trackerNote: trackerNoteOf(resolvedJoins) };
}

export type IndexFacts = ReturnType<typeof useIndexFacts>;
