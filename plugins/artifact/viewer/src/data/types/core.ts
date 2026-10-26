export type DesignStage =
  | "backlog"
  | "decided"
  | "approved"
  | "review"
  | "implemented"
  | "superseded";

export type EpicState =
  | "unstarted"
  | "planned"
  | "open"
  | "completed"
  | "merged"
  | "superseded";

export interface DesignEntity {
  id: string;
  name: string;
  outcome: string;
  stage: DesignStage | string;
}

export interface EpicEntity {
  id: string;
  design: string;
  epic_id: string;
  branch: string | null;
  pr: number | null;
  state: string;
  note: string | null;
  design_doc?: string | null;
}

export interface SliceEntity {
  id: string;
  feature: string;
  n: number;
  title: string;
  ends_with: string;
  score: string | null;
  attempts: number;
  state: string;
}

export interface AdrEntity {
  id: string;
  title: string;
  state: string;
}

/**
 * One pull request, as the index's `pull_request` entity holds it.
 *
 * The index projects each one from an entry of `data/story.json`'s timeline, so `state`
 * is the story entry's own `status`. The corpus writes two of them today: `open` for a
 * pull request that is not merged, and `merged` for one that is. It is typed as a plain
 * string rather than a union of those two, because the value travels from a hand-editable
 * authored file and a union would refuse a status nobody has thought of yet.
 *
 * `commit` is the head commit on an open pull request and the merge commit on a merged
 * one, so its length varies with the state. Both `commit` and `date` are `| null` because
 * `build_index.py` projects them from an authored entry that need not carry either one.
 * Every one of the seventeen entries in the self-bundle's index carries both.
 */
export interface PullRequest {
  id: number;
  title: string;
  state: string;
  commit: string | null;
  date: string | null;
}

/**
 * The brand that keeps an open pull request apart from a merged one, at the type level.
 *
 * ADR-0027 fixes the shape: `OpenPullRequest` extends `PullRequest`, and this module
 * declares each of them once. The extension is an intersection rather than a copy, so a
 * field renamed on `PullRequest` and not on `OpenPullRequest` reaches the type checker as
 * `Exclude<keyof PullRequest, keyof OpenPullRequest>`, which names the field. A copy
 * would compile clean on both sides and drift in silence.
 *
 * THE BRAND IS A SYMBOL, NOT A DATA FIELD. A pull request carries no field the index does
 * not write, so the extension adds nothing a reader could mistake for a record. The
 * multi-pull-request mode that consumes this type defers with E11; the type is declared
 * here so both modes start from one shape.
 */
declare const OPEN_PULL_REQUEST: unique symbol;

export type OpenPullRequest = PullRequest & { readonly [OPEN_PULL_REQUEST]: "open" };
