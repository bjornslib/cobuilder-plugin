/**
 * Prototype A's board rules: the kanban lanes, the exclusion rule, and the
 * search predicate.
 *
 * THE EXCLUSION RULE IS THE CORRECTION THE FEEDBACK ASKED FOR. The Work board
 * lists work, and two things in the record index are not work: a decision
 * record (ADR), which is settled and read in the Architecture level, and a
 * pull request that is still open, which is a change in flight rather than a
 * work item. Both are held out of the board here. The board never hides the
 * rule: the drawer's footer counts what it held out, so a reader who expected
 * a row and finds none can see where it went.
 *
 * A MERGED PULL REQUEST THAT BELONGS TO NO DESIGN IS STILL WORK. It shipped,
 * and the subtraction against `DesignRow.pullRequests` keeps a design's own
 * pull request inside that design's card, so the standalone rows are the ones
 * no design carries. They read in the Shipped lane as small PR cards.
 *
 * The lane rule is the approved Work board prototype's, widened by one lane:
 * a superseded design earns a lane of its own on a kanban, because a lane that
 * hides its members behind an `All` tab is a tab and not a lane.
 */

import type { DesignRow, PullRequest } from "@/data/types";

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

/** One work item: a design row, or a merged pull request no design carries. */
export type WorkSource =
  | { kind: "design"; row: DesignRow }
  | { kind: "pull-request"; row: PullRequest };

/**
 * The rows the board holds, from one resolved index.
 *
 * Every join comes from `DesignRow`, which the data layer already resolved, so
 * the board derives no join a second time.
 */
export function workSourcesOf(
  rows: DesignRow[],
  pullRequests: PullRequest[],
  decisions: number,
): {
  sources: WorkSource[];
  excluded: { decisions: number; openPulls: number };
} {
  const carried = new Set<number>();
  for (const row of rows) {
    for (const id of row.pullRequests) carried.add(id);
  }

  const standalone = pullRequests
    .filter((pull) => pull.state === "merged" && !carried.has(pull.id))
    .sort((a, b) => a.id - b.id)
    .map((pull) => ({ kind: "pull-request" as const, row: pull }));

  const openPulls = pullRequests.filter((pull) => pull.state !== "merged").length;

  return {
    sources: [
      ...rows.map((row) => ({ kind: "design" as const, row })),
      ...standalone,
    ],
    excluded: { decisions, openPulls },
  };
}

/** True when one source's words carry the needle. Empty needle keeps everything. */
export function matches(source: WorkSource, needle: string): boolean {
  const query = needle.trim().toLowerCase();
  if (query.length === 0) return true;

  if (source.kind === "pull-request") {
    const pull = source.row;
    return (
      pull.title.toLowerCase().includes(query) ||
      String(pull.id).includes(query) ||
      `pr ${pull.id}`.includes(query)
    );
  }

  const row = source.row;
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

/** The sources of one lane, after the search predicate. */
export function laneSources(
  lane: Lane,
  sources: WorkSource[],
  needle: string,
): WorkSource[] {
  return sources
    .filter((source) => source.kind === "design" && lane.stages.includes(source.row.design.stage))
    .filter((source) => matches(source, needle));
}

/** The standalone merged pull requests of the Shipped lane, after the search. */
export function shippedPulls(sources: WorkSource[], needle: string): WorkSource[] {
  return sources.filter(
    (source) => source.kind === "pull-request" && matches(source, needle),
  );
}

/** The first match of the design's name, as two spans around the hit. */
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