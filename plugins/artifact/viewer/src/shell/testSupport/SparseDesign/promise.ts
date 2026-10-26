import type { DesignRecord } from "@/data/bundle";

import type { RailRow } from "../../model";
import { INDEX } from "./bundle";
import type { SparseDesign } from "./corpus";

/** The three records Problem & Solution is backed by, and the file each one lives in. */
const BACKING_RECORDS: Record<string, string> = {
  intent: "intent.json",
  narrative: "narrative.json",
  assessment: "assessment.json",
};

/** The record files one sparse record body does not carry, in the order the rail names them. */
function absentRecords(record: DesignRecord): string[] {
  const body = record as Record<string, unknown>;
  return Object.keys(BACKING_RECORDS)
    .filter((key) => body[key] === undefined)
    .map((key) => BACKING_RECORDS[key]);
}

interface Keep {
  available: boolean;
  absent: string[];
}

type Rule = (design: SparseDesign, record: DesignRecord) => Keep;

function intentKeep(_design: SparseDesign, record: DesignRecord): Keep {
  /* Intent reads the record file, and a sparse design's record file carries its goal. */
  return { available: record.goal !== undefined, absent: ["designs.js"] };
}

function problemKeep(_design: SparseDesign, record: DesignRecord): Keep {
  const absent = absentRecords(record);
  return { available: absent.length === 0, absent };
}

function architectureKeep(design: SparseDesign): Keep {
  /*
   * ARCHITECTURE IS BACKED BY A DECISION THIS DESIGN NAMES. The fixture's index carries
   * no diagram, no district, and no context for the design, so `goal.adrs[]` is the whole
   * of the rule here.
   */
  const named = (design.goal.adrs ?? []).length > 0;
  return {
    available: named,
    absent: named ? [] : ["no linked decision in goal.adrs[]"],
  };
}

function epicsKeep(design: SparseDesign): Keep {
  const planned = (design.goal.epics ?? []).length;
  return {
    available: planned > 0,
    absent: planned > 0 ? [] : ["the work carries no epic"],
  };
}

function planDocuments(): unknown[] {
  return [
    ...INDEX.entities.program_design,
    ...INDEX.entities.epic_design,
    ...INDEX.entities.interaction_design,
    ...INDEX.entities.slice,
  ];
}

function planKeep(design: SparseDesign): Keep {
  /*
   * PLAN IS BACKED BY A PLAN DOCUMENT. The fixture's index holds the plan documents a
   * work carries, so any entry there that names this design is a plan.
   */
  const planned =
    planDocuments().some((doc) => JSON.stringify(doc).includes(design.id)) ||
    Object.keys(INDEX.joins.feature_gates).includes(design.id);
  return { available: planned, absent: planned ? [] : ["no plan"] };
}

const RULES: Record<string, Rule> = {
  intent: intentKeep,
  "problem-and-solution": problemKeep,
  architecture: architectureKeep,
  epics: epicsKeep,
  rubrics: () => ({ available: true, absent: [] }),
  plan: planKeep,
};

function unpromisedRow(row: RailRow): Error {
  /* A row this file has not promised must fail loudly rather than pass by default. */
  return new Error(
    `The shell holds a row this file states no promise for: ${row.key}. ` +
      "State the promise the slice makes for it.",
  );
}

/** What the slice promises one row reads, derived from the authored design alone. */
export function promised(row: RailRow, design: SparseDesign, record: DesignRecord): Keep {
  /* The change's File Diffs row is disabled when no pull request is carried. The reason is
     asserted apart, in the no-change test, so no fixed words are promised here. */
  if (row.label === "File Diffs") return { available: false, absent: [] };

  const rule: Rule | undefined = RULES[row.key.replace(/^program-/, "")];
  if (rule === undefined) throw unpromisedRow(row);
  return rule(design, record);
}
