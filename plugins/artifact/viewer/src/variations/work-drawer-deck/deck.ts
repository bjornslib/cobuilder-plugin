/**
 * Prototype B's board rules: the lanes, the exclusion rule, and the search
 * predicate.
 *
 * THE EXCLUSION RULE IS THE CORRECTION THE FEEDBACK ASKED FOR, and it is the
 * same rule prototype A states: ADRs and unfinished pull requests are not
 * work, so they are held out of the deck. The deck differs from A in one
 * respect — it carries no standalone pull request rows at all. A merged pull
 * request is evidence its design's card reads, and a merged one no design
 * carries is history the Work drawer need not re-litigate. The header states
 * both exclusions with their counts, so the rule is never silent.
 *
 * The lane rule is the approved Work board prototype's. A superseded design
 * keeps a lane here as in A, because a lane that hides its members is a tab
 * and not a lane.
 */

import type { DesignRow } from "@/data/types";

export interface Lane {
  key: string;
  label: string;
  stages: string[];
  blurb: string;
  empty: string;
}

export const LANES: Lane[] = [
  {
    key: "decision",
    label: "Needs a decision",
    stages: ["backlog", "decided"],
    blurb:
      "Not settled. Design mode stopped after stage 1, or a decision is recorded and no approved design has followed.",
    empty: "Nothing waits on a decision.",
  },
  {
    key: "build",
    label: "Ready to build",
    stages: ["approved"],
    blurb: "The design is approved and the build can start.",
    empty: "No approved design is waiting on a build.",
  },
  {
    key: "review",
    label: "In review",
    stages: ["review"],
    blurb: "The design is under review and waits on a reviewer.",
    empty: "Nothing sits at the review stage.",
  },
  {
    key: "shipped",
    label: "Shipped",
    stages: ["implemented"],
    blurb: "Design mode recorded the design as implemented.",
    empty: "Nothing has shipped.",
  },
  {
    key: "superseded",
    label: "Superseded",
    stages: ["superseded"],
    blurb: "A later design closed this one. The record stays as history.",
    empty: "No design was superseded.",
  },
];

export function laneOf(stage: string): Lane | null {
  return LANES.find((lane) => lane.stages.includes(stage)) ?? null;
}

/** True when one design's words carry the needle. Empty needle keeps everything. */
export function matches(row: DesignRow, needle: string): boolean {
  const query = needle.trim().toLowerCase();
  if (query.length === 0) return true;
  const { design, epics } = row;
  return (
    design.name.toLowerCase().includes(query) ||
    design.id.toLowerCase().includes(query) ||
    design.stage.toLowerCase().includes(query) ||
    (design.outcome ?? "").toLowerCase().includes(query) ||
    epics.some(
      (epic) =>
        epic.id.toLowerCase().includes(query) ||
        epic.epic_id.toLowerCase().includes(query) ||
        (epic.branch ?? "").toLowerCase().includes(query) ||
        (epic.pr !== null && String(epic.pr).includes(query)),
    ) ||
    row.pullRequests.some((id) => String(id).includes(query))
  );
}

/** The visible rows of one lane, after the search predicate. */
export function laneRows(lane: Lane, rows: DesignRow[], needle: string): DesignRow[] {
  return rows
    .filter((row) => lane.stages.includes(row.design.stage))
    .filter((row) => matches(row, needle));
}

/** The flat, visible, lane-ordered row list the keyboard walk steps through. */
export function walkedRows(lanes: Lane[], rows: DesignRow[], needle: string): DesignRow[] {
  return lanes.flatMap((lane) => laneRows(lane, rows, needle));
}

/** The first match of the design's name, as three spans around the hit. */
export function highlight(text: string, needle: string): {
  before: string;
  hit: string;
  after: string;
} | null {
  const query = needle.trim();
  if (query.length === 0) return null;
  const at = text.toLowerCase().indexOf(query.toLowerCase());
  if (at === -1) return null;
  return {
    before: text.slice(0, at),
    hit: text.slice(at, at + query.length),
    after: text.slice(at + query.length),
  };
}