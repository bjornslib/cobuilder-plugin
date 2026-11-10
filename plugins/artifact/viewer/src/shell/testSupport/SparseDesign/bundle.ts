import type { DesignRecord, DesignRecords, PlanEpicRow } from "@/data/bundle";
import type { AdrEntity, DesignEntity, EpicEntity, RecordIndex } from "@/data/types";

import { EMPTY_ENTITIES, EMPTY_JOINS } from "../emptyIndex";
import { SPARSE, type SparseDesign } from "./corpus";

export function recordOf(design: SparseDesign): DesignRecord {
  return { goal: design.goal };
}

/**
 * `src/data/bundle.ts` reads the `ADRS` global through a guard on the first value's
 * `title`. An empty map looks like a file that assigned nothing, so the loader then asks
 * the dev server for one. No sparse design names this id, so it links to no work item.
 */
const STANDIN_ADR: AdrEntity = {
  id: "ADR-0001",
  title: "A decision this fixture carries and no design names",
  state: "accepted",
};

function adrsOf(design: SparseDesign): AdrEntity[] {
  return (design.goal.adrs ?? []).map((id) => ({ id, title: `Decision ${id}`, state: "accepted" }));
}

function designEntity(design: SparseDesign): DesignEntity {
  return {
    id: design.id,
    name: design.goal.name ?? design.id,
    outcome: design.goal.outcome ?? "",
    stage: design.goal.stage ?? "backlog",
  };
}

function epicsOf(design: SparseDesign): EpicEntity[] {
  return (design.goal.epics ?? []).map((row: PlanEpicRow) => ({
    id: `${design.id}/${row.id}`,
    design: design.id,
    epic_id: row.id,
    branch: row.branch,
    pr: row.pr,
    state: row.state,
    note: row.note ?? null,
  }));
}

/**
 * The record index every sparse design resolves against.
 *
 * It carries no diagram, district, context, or boundary rule. A sparse design's directory
 * holds no `diagrams` key, and no record names it. Architecture is then backed by a linked
 * decision alone, the arm `interaction-design.md` states for these designs.
 *
 * One bundle holds every sparse design, as a real bundle does. `loadDesigns` caches its
 * promise in module state, so a fixture that published one design at a time would hand
 * the second case the first case's records.
 */
export const INDEX: RecordIndex = {
  schema_version: "1.3",
  sources: { git_head: "0123456789abcdef", trees: {} },
  entities: {
    ...EMPTY_ENTITIES,
    adr: [STANDIN_ADR, ...SPARSE.flatMap(adrsOf)],
    design: SPARSE.map(designEntity),
    epic: SPARSE.flatMap(epicsOf),
  },
  joins: EMPTY_JOINS,
};

export const DESIGNS: DesignRecords = Object.fromEntries(
  SPARSE.map((design) => [design.id, recordOf(design)]),
);

const ADRS: Record<string, AdrEntity> = Object.fromEntries(
  [STANDIN_ADR, ...SPARSE.flatMap(adrsOf)].map((adr) => [adr.id, adr]),
);

export function installBundleGlobals(): void {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  /* No module declares the `ADRS` global, so a cast reaches it. */
  (window as unknown as Record<string, unknown>).ADRS = ADRS;
}
