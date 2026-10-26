/**
 * Every rule here is pure, with no DOM, no React, and no join resolution, so the
 * conformance criterion C1 holds and the drawer's own unit tests can run them
 * against rows shaped like the real bundle. The drawer reads the index's joins in
 * `WorkDrawer.tsx`, through `resolvedJoinsOf`, the one sanctioned reader.
 *
 * The exclusion rule is ADR-0034's. A decision record is settled the day it is
 * filed and is read in the Architecture level. A pull request that is not merged is
 * a change in flight, and its design's own card reads it as evidence. Both are held
 * out of the board. The drawer states the rule in its footer with the counts it
 * produced, so it is never silent; this module is the predicate, not the sentence.
 *
 * A lane's `stages` are the design stages it reads, in the bundle's own words. A
 * superseded design keeps a lane, because a lane that hides its members is a tab
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
    blurb: "The tracker holds the stage implemented.",
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

/**
 * A reader types a pull request three ways, "PR 10", "#10", "10", and all three name
 * the same row. So the query drops the kind prefix and reads the number alone, and
 * the kind word never matches by itself, because a needle of "pr" that matched
 * nothing would teach the reader to distrust the field.
 */
function matchKey(raw: string): string {
  return raw
    .trim()
    .replace(/^(pr|pull request)\s*/i, "")
    .replace(/^#/, "");
}

type Design = DesignRow["design"];
type Epic = DesignRow["epics"][number];

function has(text: string | null | undefined, query: string): boolean {
  return (text ?? "").toLowerCase().includes(query);
}

function designHits(design: Design, query: string): boolean {
  return [design.name, design.id, design.stage, design.outcome].some((text) => has(text, query));
}

function epicHits(epic: Epic, query: string): boolean {
  const texts = [epic.id, epic.epic_id, epic.branch];
  return (
    texts.some((text) => has(text, query)) ||
    (epic.pr !== null && String(epic.pr).includes(query))
  );
}

export function matches(row: DesignRow, needle: string): boolean {
  const query = matchKey(needle).toLowerCase();
  if (query.length === 0) return true;
  return (
    designHits(row.design, query) ||
    row.epics.some((epic) => epicHits(epic, query)) ||
    row.pullRequests.some((id) => String(id).includes(query))
  );
}

export function laneRows(lane: Lane, rows: DesignRow[], needle: string): DesignRow[] {
  return rows
    .filter((row) => lane.stages.includes(row.design.stage))
    .filter((row) => matches(row, needle));
}

export function walkedRows(lanes: Lane[], rows: DesignRow[], needle: string): DesignRow[] {
  return lanes.flatMap((lane) => laneRows(lane, rows, needle));
}

interface Highlight {
  before: string;
  hit: string;
  after: string;
}

export function highlight(text: string, needle: string): Highlight | null {
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

/** No row can ever carry the strip's clearing value. */
export const FILTER_ALL = "all";

/**
 * A reader who starts typing has left the lane survey and asked a find. A filter
 * left from a previous question would silently narrow that find, and the reader
 * would trust a wrong count. So the filter resets the moment the search has a
 * needle, whatever it held before.
 */
export function filterForTyping(): string {
  return FILTER_ALL;
}

/**
 * A reader who typed a name and gets one item should not spend a second press
 * reading it. An empty result has nothing to read, and a broad one is still a
 * survey, so neither earns a selection.
 */
export function soleOf(rows: DesignRow[]): DesignRow | null {
  return rows.length === 1 ? rows[0] : null;
}

/**
 * The walk stops at the ends. A chip the strip does not carry falls back to the
 * first chip, so a stale choice from a previous read resolves instead of
 * dead-ending.
 */
export function chipStepped(current: string, step: 1 | -1, chips: string[]): string {
  const at = chips.indexOf(current);
  if (at === -1) return chips[0];
  return chips[Math.min(Math.max(at + step, 0), chips.length - 1)];
}

/** One place, so the walk and the render agree. */
export function filterChipsOf(lanes: Lane[]): string[] {
  return [FILTER_ALL, ...lanes.map((lane) => lane.key)];
}