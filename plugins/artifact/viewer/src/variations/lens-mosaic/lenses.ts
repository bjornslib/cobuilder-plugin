/**
 * The six lenses, and the test for whether each one has a record behind it.
 *
 * A lens is present or absent, and this file decides which. The rule matters
 * because an absent lens must be disabled and state its reason, and a lens that is
 * present but quiet must not be confused with one that never had a record.
 *
 * `build` reads `index.json`, which is always loaded by the time a tile renders.
 * The other five read the authored records under
 * `docs/architecture/designs/<id>/`, which a backlog design does not have.
 */

import type { DesignRow } from "@/data/types";

import { levelsOf, type DesignRecord } from "./records";

export interface LensStatus {
  /** True when the lens has something real to draw. */
  present: boolean;
  /** The file the lens reads, named whether or not it exists. */
  file: string;
  /** What the lens shows, in one line, when it is present. */
  shows: string;
  /** What the missing record means, in one line, when it is absent. */
  missing: string;
}

function recordFile(designId: string, name: string): string {
  return `docs/architecture/designs/${designId}/${name}`;
}

export function intentStatus(record: DesignRecord | null, designId: string): LensStatus {
  const intent = record?.intent;
  const file = recordFile(designId, "intent.json");
  const has =
    Boolean(intent) &&
    Boolean(
      intent?.why_now ||
        intent?.problem ||
        intent?.approach ||
        intent?.reviewer_focus?.length ||
        intent?.unknowns?.length,
    );
  return {
    present: has,
    file,
    shows: "Why the work is happening now, what the reviewer should look at, and what the design still does not know.",
    missing:
      "Design mode's interview has not run for this design. It writes intent.json at stage 3, after the challenge gate.",
  };
}

export function problemStatus(record: DesignRecord | null, designId: string): LensStatus {
  const narrative = levelsOf(record?.narrative);
  const has = Boolean(record?.intent?.problem || narrative?.problem_solution?.problem);
  return {
    present: has,
    file: recordFile(designId, "intent.json"),
    shows: "The problem as the design recorded it, with the narrative's own beats.",
    missing:
      "No problem statement exists for this design. Neither an intent record nor a narrative record holds one.",
  };
}

export function solutionStatus(record: DesignRecord | null, designId: string): LensStatus {
  const narrative = levelsOf(record?.narrative);
  const has = Boolean(
    record?.intent?.approach ||
      narrative?.problem_solution?.solution ||
      narrative?.problem_solution?.alternatives?.length,
  );
  return {
    present: has,
    file: recordFile(designId, "narrative.json"),
    shows: "The approach, the alternatives the design rejected, and the conditions it must meet to finish.",
    missing:
      "No approach exists for this design. Neither an intent record nor a narrative record holds one.",
  };
}

export function architectureStatus(
  record: DesignRecord | null,
  designId: string,
): LensStatus {
  const diagrams = record?.diagrams ?? {};
  const decisions = record?.goal.adrs ?? [];
  const has = Object.keys(diagrams).length > 0 || decisions.length > 0;
  return {
    present: has,
    file: recordFile(designId, "diagrams/"),
    shows: "The Mermaid source for each narration level, and the decisions this design reaches.",
    missing:
      "This design carries no diagram source and reaches no recorded decision, so there is no architecture to draw.",
  };
}

export function buildStatus(row: DesignRow, designId: string): LensStatus {
  return {
    present: row.epics.length > 0,
    file: recordFile(designId, "goal.json"),
    shows: "Every epic the design records, with its slices nested underneath.",
    missing:
      "The index records no epic for this design. An approved design records its epics in goal.json.",
  };
}

export function risksStatus(record: DesignRecord | null, designId: string): LensStatus {
  const assessment = record?.assessment;
  const has = Boolean(assessment?.verdict || assessment?.findings?.length);
  return {
    present: has,
    file: recordFile(designId, "assessment.json"),
    shows: "The verdict, the findings behind it, and what the design costs if it ships as written.",
    missing:
      "No assessment exists for this design. Design mode writes one at stage 7, after the record is complete.",
  };
}

/**
 * A note the design itself carries about why a record is absent. The backlog
 * designs say so in `goal.min_work.note`, and that sentence is better than anything
 * this variation could write.
 */
export function absenceNote(record: DesignRecord | null): string | undefined {
  const note = record?.goal.min_work?.note;
  return typeof note === "string" && note.length > 0 ? note : undefined;
}
