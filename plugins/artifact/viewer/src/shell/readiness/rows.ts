import type { DesignRow, PullRequest } from "@/data/types";

/**
 * A pull request row reads one pull request the index holds that no design's own
 * epics point at. The two kinds are the board's whole vocabulary, so every row
 * states one of exactly two words.
 */
export type RowKind = "design" | "pull-request";

export const ROW_KINDS: RowKind[] = ["design", "pull-request"];

/** `PR` names the kind and never a status. */
export const ROW_KIND_LABEL: Record<RowKind, string> = {
  design: "Design",
  "pull-request": "PR",
};

export type BoardSource =
  | { kind: "design"; row: DesignRow }
  | { kind: "pull-request"; row: PullRequest };

/*
 * One rule reads both kinds, so one status tab selects a design and a pull request
 * by the same predicate. The index writes `open` and `merged` for a pull request,
 * and those two words join the six design stages in the strip's vocabulary.
 */
export function boardStatus(source: BoardSource): string {
  return source.kind === "design" ? source.row.design.stage : source.row.state;
}

/*
 * A status no row carries earns no tab, so the strip never offers a filter that
 * would empty the board. The order follows the rows, so the strip reads in the
 * order the list below it does.
 */
export function statusTabs(sources: BoardSource[]): string[] {
  const statuses: string[] = [];
  for (const source of sources) {
    const status = boardStatus(source);
    if (!statuses.includes(status)) statuses.push(status);
  }
  return statuses;
}

/** `All` is the caller's own predicate. */
export function matchesStatus(source: BoardSource, status: string): boolean {
  return boardStatus(source) === status;
}

export function matchesKind(source: BoardSource, kind: RowKind): boolean {
  return source.kind === kind;
}
