import type { DesignRow, PullRequest } from "@/data/types";

/**
 * The two kinds of row the board lists.
 *
 * A design row reads one design directory. A pull request row reads one pull request the
 * index holds that no design's own epics point at. The two are the board's whole
 * vocabulary, so every row states one of exactly two words.
 */
export type RowKind = "design" | "pull-request";

/** The two kinds, in the order the kind control lists them. */
export const ROW_KINDS: RowKind[] = ["design", "pull-request"];

/** The word a row states for its kind. `PR` names the kind and never a status. */
export const ROW_KIND_LABEL: Record<RowKind, string> = {
  design: "Design",
  "pull-request": "PR",
};

/** One board row, whether it carries a design or a pull request of its own. */
export type BoardSource =
  | { kind: "design"; row: DesignRow }
  | { kind: "pull-request"; row: PullRequest };

/**
 * The status one row states: a design's stage, or a pull request's own state.
 *
 * One rule reads both kinds, so one status tab selects a design and a pull request by the
 * same predicate. The index writes `open` and `merged` for a pull request, and those two
 * words join the six design stages in the strip's vocabulary.
 */
export function boardStatus(source: BoardSource): string {
  return source.kind === "design" ? source.row.design.stage : source.row.state;
}

/**
 * Every status the board's rows record, deduplicated, in reading order.
 *
 * A status no row carries earns no tab, so the strip never offers a filter that would
 * empty the board. The order follows the rows, so the strip reads in the order the list
 * below it does.
 */
export function statusTabs(sources: BoardSource[]): string[] {
  const statuses: string[] = [];
  for (const source of sources) {
    const status = boardStatus(source);
    if (!statuses.includes(status)) statuses.push(status);
  }
  return statuses;
}

/** The predicate behind one status tab. `All` is the caller's own predicate. */
export function matchesStatus(source: BoardSource, status: string): boolean {
  return boardStatus(source) === status;
}

/** The predicate behind one kind tab. */
export function matchesKind(source: BoardSource, kind: RowKind): boolean {
  return source.kind === kind;
}
