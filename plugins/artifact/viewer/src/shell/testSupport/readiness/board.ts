import type { DesignRow, PullRequest } from "@/data/types";

import { ROW_BASE } from "../designRow";

/** One board row, whether it carries a design or a pull request of its own. */
export type Source =
  | { kind: "design"; row: DesignRow }
  | { kind: "pull-request"; row: PullRequest };

export type PullRequestSource = Extract<Source, { kind: "pull-request" }>;

/**
 * The board's own row rules, as slice 18 fixes them.
 *
 * The shape is declared here and the module is read through it, so this file fixes the
 * contract before the code exists and keeps the contract after. A rule that is missing
 * fails the assertion that names it rather than throwing somewhere later in a case.
 */
export interface BoardRules {
  ROW_KINDS: string[];
  ROW_KIND_LABEL: Record<string, string>;
  boardStatus: (source: Source) => string;
  statusTabs: (sources: Source[]) => string[];
  matchesStatus: (source: Source, status: string) => boolean;
  matchesKind: (source: Source, kind: string) => boolean;
  prAloneSources: (rows: DesignRow[], pullRequests: PullRequest[]) => Source[];
}

export function designRowOf(stage: string, pullRequests: number[] = []): DesignRow {
  return {
    design: { id: `d-${stage}`, name: `d-${stage}`, outcome: "An outcome.", stage },
    ...ROW_BASE,
    pullRequests,
  };
}

export function pullRequestOf(id: number, state: string): PullRequest {
  return { id, title: `Pull request ${id}`, state, commit: null, date: null };
}

export function designSource(stage: string, pullRequests: number[] = []): Source {
  return { kind: "design", row: designRowOf(stage, pullRequests) };
}

export function prSource(id: number, state: string): Source {
  return { kind: "pull-request", row: pullRequestOf(id, state) };
}

/** The PR-alone ids a set of sources carries, in the order the set lists them. */
export function prIdsOf(sources: Source[]): number[] {
  return sources
    .filter((source) => source.kind === "pull-request")
    .map((source) => source.row.id);
}

export const MIXED_SOURCES: Source[] = [
  designSource("approved"),
  designSource("backlog"),
  prSource(17, "open"),
  prSource(1, "merged"),
];

export const TAB_SOURCES: Source[] = [
  designSource("approved"),
  designSource("backlog"),
  prSource(17, "open"),
  prSource(22, "open"),
  prSource(1, "merged"),
];

export const ALONE_PULL_REQUESTS: PullRequest[] = [
  pullRequestOf(11, "merged"),
  pullRequestOf(12, "merged"),
  pullRequestOf(17, "open"),
  pullRequestOf(22, "open"),
];
