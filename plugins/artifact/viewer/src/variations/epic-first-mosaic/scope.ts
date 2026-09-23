/**
 * What is selected, and everything the selected scope resolves to.
 *
 * This variation is epic-first: the record index loads once, the board resolves one
 * design at a time, and the lens tiles read whatever the current selection points at.
 * `ScopeData` is that resolution, built once in `index.tsx` and passed down, so no
 * tile asks a join question for itself and two tiles cannot disagree.
 */

import type {
  AdrEntity,
  Entities,
  EpicDesignEntity,
  GateStep,
  Joins,
  ProgramDesignEntity,
  PullRequestEntity,
  RecordIndex,
  SliceEntity,
} from "@/data/types";

import type {
  DesignRecord,
  DesignRecords,
  EpicDetail,
  PlanSlug,
  SlotState,
  SupersedeLink,
} from "./data";

export type Scope =
  | { kind: "design"; designId: string }
  | { kind: "epic"; designId: string; epicId: string }
  | { kind: "slice"; designId: string; sliceId: string };

export function designScope(designId: string): Scope {
  return { kind: "design", designId };
}

export interface SliceRow {
  slice: SliceEntity;
  /** The epic the join resolves this slice to, or null when it resolves to none. */
  epic: EpicDetail | null;
  /** Why the index resolved no epic, when it records a reason. */
  unresolvedReason: string | null;
}

export interface ScopeData {
  scope: Scope;
  index: RecordIndex;
  entities: Entities;
  joins: Joins;
  /** The `designs.js` records, or null when that file did not load. */
  records: DesignRecords | null;
  /** The reason `designs.js` did not load, when it did not. */
  recordsError: string | null;

  designId: string;
  design: Entities["design"][number];
  plan: PlanSlug;
  programDesign: ProgramDesignEntity | null;
  designRecord: DesignRecord | undefined;
  slots: SlotState[];
  supersede: SupersedeLink;
  /** True when the record file loaded and holds all six records. */
  allSlotsPresent: boolean;

  /** Every epic this design owns, resolved. Ordered by epic id. */
  epics: EpicDetail[];
  epicById: Map<string, EpicDetail>;
  doneEpics: number;

  /** Slices resolved to each epic id. */
  slicesByEpic: Map<string, SliceEntity[]>;
  /** Every slice this design owns, through its epics. */
  designSlices: SliceEntity[];
  /** Slices in the whole index that resolve to no epic, with the reason. */
  unresolved: SliceRow[];

  diagrams: Array<{ level: string; source: string; kind: string }>;
  gates: GateStep[];
  adrById: Map<string, AdrEntity>;
  pullRequestById: Map<number, PullRequestEntity>;
  epicDesigns: EpicDesignEntity[];
  pullRequests: PullRequestEntity[];
}

export function detailFor(
  scope: Scope,
  data: ScopeData,
): { epic: EpicDetail | null; slice: SliceRow | null } {
  if (scope.kind === "epic") {
    return { epic: data.epicById.get(scope.epicId) ?? null, slice: null };
  }
  if (scope.kind === "slice") {
    const row =
      data.unresolved.find((candidate) => candidate.slice.id === scope.sliceId) ??
      null;
    if (row) return { epic: row.epic, slice: row };
    for (const epic of data.epics) {
      const slice = (data.slicesByEpic.get(epic.epic.id) ?? []).find(
        (candidate) => candidate.id === scope.sliceId,
      );
      if (slice) return { epic, slice: { slice, epic, unresolvedReason: null } };
    }
  }
  return { epic: null, slice: null };
}

/** The label every tile header carries, so a reader sees what the tiles are about. */
export function scopeLabel(
  scope: Scope,
  detail: { epic: EpicDetail | null; slice: SliceRow | null },
  designName: string,
): string {
  if (scope.kind === "design") return `design · ${designName}`;
  const epicId = detail.epic?.epic.epic_id ?? "?";
  if (scope.kind === "epic") return `epic ${epicId} · ${designName}`;
  const n = detail.slice?.slice.n;
  return `slice #${n === undefined ? "?" : n} · epic ${epicId}`;
}
