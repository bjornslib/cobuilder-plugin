import type { DesignRecord, DesignRecords, PlanEpicRow } from "@/data/bundle";
import type { AdrEntity, DesignEntity, EpicEntity, RecordIndex } from "@/data/types";

import { EMPTY_ENTITIES, EMPTY_JOINS } from "../emptyIndex";
import { SPARSE, type SparseDesign } from "./corpus";

/** The record body `data/designs.js` carries for a sparse design: the goal and nothing else. */
export function recordOf(design: SparseDesign): DesignRecord {
  return { goal: design.goal };
}

/**
 * One decision the fixture's index carries, so the `ADRS` global holds an entry to read.
 *
 * `src/data/bundle.ts` reads that global through a guard that looks at the first value's
 * `title`, so an empty map reads as a file that assigned nothing and the loader then asks
 * the dev server for one. No sparse design's goal names this id, so it adds no linked
 * decision to any work item.
 */
const STANDIN_ADR: AdrEntity = {
  id: "ADR-0001",
  title: "A decision this fixture carries and no design names",
  state: "accepted",
};

/** The decisions one sparse design's goal names, as the index would project them. */
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
 * The record index every sparse design resolves against, and nothing else.
 *
 * THE INDEX CARRIES NO DIAGRAM, NO DISTRICT, NO CONTEXT, AND NO BOUNDARY RULE. A sparse
 * design's authored directory holds no `diagrams` key, and no district or context record
 * names it, so the fixture mirrors that. Architecture is therefore backed by a linked
 * decision alone, which is the arm `interaction-design.md` states for these designs.
 *
 * ONE BUNDLE HOLDS EVERY SPARSE DESIGN, THE WAY A REAL BUNDLE DOES. `loadDesigns` caches
 * its promise in module state, so a fixture that published one design at a time would hand
 * the second case the first case's records. The globals below are set once, and every case
 * reads the same bundle through the route it names.
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

/** Every sparse design's record body, keyed by the id the index carries. */
export const DESIGNS: DesignRecords = Object.fromEntries(
  SPARSE.map((design) => [design.id, recordOf(design)]),
);

/** Every decision the fixture names, as the `ADRS` global holds them. */
const ADRS: Record<string, AdrEntity> = Object.fromEntries(
  [STANDIN_ADR, ...SPARSE.flatMap(adrsOf)].map((adr) => [adr.id, adr]),
);

export function installBundleGlobals(): void {
  /* Hand the shell the whole bundle in memory, the way a published file inlines it. */
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  /* The decision global is declared by no module, so this line reads it through a cast. */
  (window as unknown as Record<string, unknown>).ADRS = ADRS;
}
