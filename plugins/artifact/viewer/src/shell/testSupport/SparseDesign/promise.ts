import type { DesignRecord } from "@/data/bundle";

import type { RailRow } from "../../model";
import { INDEX } from "./bundle";
import type { SparseDesign } from "./corpus";

const BACKING_RECORDS: Record<string, string> = {
  intent: "intent.json",
  narrative: "narrative.json",
  assessment: "assessment.json",
};

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
  /* Intent reads the record file, which carries the goal. */
  return { available: record.goal !== undefined, absent: ["designs.js"] };
}

function problemKeep(_design: SparseDesign, record: DesignRecord): Keep {
  const absent = absentRecords(record);
  return { available: absent.length === 0, absent };
}

function architectureKeep(design: SparseDesign): Keep {
  /* The index has no diagram, district, or context here, so `goal.adrs[]` is the whole rule. */
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
  /* The index holds the plan documents a work carries, so an entry that names this design is its plan. */
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

export function promised(row: RailRow, design: SparseDesign, record: DesignRecord): Keep {
  /* The File Diffs row is disabled when no pull request is carried. The no-change test
     asserts the reason, so no words are promised here. */
  if (row.label === "File Diffs") return { available: false, absent: [] };

  const rule: Rule | undefined = RULES[row.key.replace(/^program-/, "")];
  if (rule === undefined) throw unpromisedRow(row);
  return rule(design, record);
}
