import type { Entities, Joins, RecordIndex } from "../types";
import { BUNDLE_DATA_URL, missingIndexMessage } from "./readers";

function isRecordIndex(value: unknown): value is RecordIndex {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<RecordIndex>;
  return (
    typeof candidate.schema_version === "string" &&
    typeof candidate.entities === "object" &&
    candidate.entities !== null &&
    typeof candidate.joins === "object" &&
    candidate.joins !== null
  );
}

/**
 * Read the record index, from the inlined global when a published file provided
 * one, and from the served bundle otherwise.
 *
 * The fetch below is the served path: it reaches outside the built file for a
 * sibling. A published Artifact inlines `window.INDEX` as a literal instead, so the
 * served path is the code `export_artifact.py` deletes at that point. The marker
 * pair that names it lives in `src/index.html`'s seam block, because no `.ts` module
 * here can carry a `//` comment through the build.
 */
export async function loadIndex(): Promise<RecordIndex> {
  if (isRecordIndex(window.INDEX)) {
    return window.INDEX;
  }
  const response = await fetchIndex();
  const parsed: unknown = await response.json();
  if (!isRecordIndex(parsed)) {
    throw new Error(`${BUNDLE_DATA_URL}index.json is not a record index.`);
  }
  return parsed;
}

async function fetchIndex(): Promise<Response> {
  const response = await fetch(`${BUNDLE_DATA_URL}index.json`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(missingIndexMessage(response.status));
  return response;
}

function emptyEntities(): Entities {
  return {
    adr: [], design: [], epic: [], context: [], district: [], boundary_rule: [],
    pull_request: [], slice: [], publication: [], product_doc: [], architecture_doc: [],
    program_design: [], epic_design: [], interaction_design: [], rubric: [],
  };
}

export function entitiesOf(index: RecordIndex): Entities {
  return index.entities ?? emptyEntities();
}

export function joinsOf(index: RecordIndex): Joins {
  return index.joins;
}

/**
 * How many slices the index could not join to an epic.
 *
 * The index carries the unresolved ones as a map keyed by slice id, and the shell shows
 * the count. The key is named here rather than in the shell, so one module knows the
 * shape of the index and no surface does.
 */
export function unresolvedSliceCount(index: RecordIndex): number {
  return Object.keys(joinsOf(index).slice_to_epic_unresolved).length;
}
