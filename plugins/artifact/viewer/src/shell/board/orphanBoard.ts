import type { SliceEntity } from "@/data/types";
import type { BoardRows } from "@/data/types/board";

import { boardChangeHref, type BoardAddress } from "./address";
import { groupedSliceColumns } from "./epicBoard";
import { sliceMatches } from "./search";
import type { BoardColumn, NoProgramModel, SliceGroupModel } from "./shape";

function plansOf(slices: SliceEntity[]): string[] {
  return [...new Set(slices.map((slice) => slice.feature))];
}

function planGroupsOf(slices: SliceEntity[]): SliceGroupModel[] {
  return plansOf(slices).map((plan) => ({ key: plan, label: plan, epicId: null, slices: slices.filter((slice) => slice.feature === plan) }));
}

function orphansMatching(rows: BoardRows, q: string): SliceEntity[] {
  return rows.orphanSlices.filter((slice) => sliceMatches(slice, q, []));
}

export function matchedOrphans(rows: BoardRows, q: string): Set<string> {
  return new Set(orphansMatching(rows, q).map((slice) => slice.id));
}

export function orphanColumns(rows: BoardRows, matched: Set<string>, address: BoardAddress): BoardColumn[] {
  const all = [...rows.orphanSlices].sort((a, b) => a.feature.localeCompare(b.feature) || a.n - b.n);
  return groupedSliceColumns({ all, groupsOf: planGroupsOf }, matched, address);
}

export function noProgramOf(rows: BoardRows, q: string): NoProgramModel | null {
  const shown = orphansMatching(rows, q);
  if (shown.length === 0) return null;
  return { count: shown.length, plans: plansOf(shown).length, href: boardChangeHref("orphans", null, q) };
}
