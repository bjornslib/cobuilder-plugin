/**
 * Two state vocabularies meet here. They must not be confused.
 *
 * THE REAL ONE is what `data/index.json` carries today. The epic entity holds
 * `planned`, `open`, `completed`, or `merged`. The `joins.epic_status` join refines
 * that to `unstarted`, `no-pull-request`, `unknown`, or the pull request's own
 * `open`, `merged`, or `closed` state. Every slice in this corpus is `completed`.
 *
 * THE INTENDED ONE is the wider vocabulary the Work board is meant to grow into:
 * `planned → in-progress → blocked → in-review → merged` for epics, and
 * `planned → red → green → validated → completed` plus `failed` and `skipped` for
 * slices. No record carries it yet. This file therefore keeps the mapping in one
 * place, and every surface that draws it marks it as a prototype state.
 *
 * A step this file cannot map returns `null`. That draws no marker at all, which is
 * the honest answer for a state the prototype has no rule for.
 */

export interface VocabStep {
  key: string;
  label: string;
  gloss: string;
}

export interface StateMapping {
  /** A key in the matching vocabulary, or null when no rule maps this state. */
  step: string | null;
  /** Why the mapping lands where it does. Shown in the marker's tooltip. */
  rule: string;
}

export const EPIC_VOCABULARY: VocabStep[] = [
  {
    key: "planned",
    label: "planned",
    gloss: "The epic is recorded and no branch exists yet.",
  },
  {
    key: "in-progress",
    label: "in progress",
    gloss: "A branch exists and work is under way.",
  },
  {
    key: "blocked",
    label: "blocked",
    gloss: "Work stopped on something outside the epic.",
  },
  {
    key: "in-review",
    label: "in review",
    gloss: "A pull request is open and waits on a reviewer.",
  },
  {
    key: "merged",
    label: "merged",
    gloss: "The pull request merged. The epic is done.",
  },
  {
    key: "superseded",
    label: "superseded",
    gloss: "The epic was dropped. A later design or epic replaced it.",
  },
];

/**
 * The epic state map. The left column is every state the index can carry today.
 *
 * `source` says which field supplies the state, because the join is the refined
 * value and the entity field is the placeholder. A surface that shows the raw state
 * names the field it read.
 */
export const EPIC_STATE_MAP: Record<string, StateMapping> = {
  planned: {
    step: "planned",
    rule: "The goal records this epic and no branch is set. Work has not started.",
  },
  unstarted: {
    step: "planned",
    rule: "joins.epic_status reads unstarted. The epic carries no branch, so no pull request can exist.",
  },
  "no-pull-request": {
    step: "in-progress",
    rule: "joins.epic_status reads no-pull-request. A branch exists and gh found no pull request for it, so the work is under way and unreviewed.",
  },
  open: {
    step: "in-review",
    rule: "joins.epic_status returns the pull request's own state. An open pull request is in review.",
  },
  merged: {
    step: "merged",
    rule: "joins.epic_status returns the pull request's own state. The pull request merged.",
  },
  completed: {
    step: "merged",
    rule: "The goal records this epic as completed. The index resolves no pull request for it, so the merge itself is not in this corpus.",
  },
  closed: {
    step: "superseded",
    rule: "joins.epic_status returns the pull request's own state. The pull request closed without merging, so the epic was dropped.",
  },
  unknown: {
    step: null,
    rule: "joins.epic_status reads unknown. gh could not answer for this branch, so this prototype places no marker rather than guess.",
  },
};

export const SLICE_VOCABULARY: VocabStep[] = [
  {
    key: "planned",
    label: "planned",
    gloss: "The slice is named. No rubric exists yet.",
  },
  {
    key: "red",
    label: "red",
    gloss: "A failing check states what the slice must do.",
  },
  {
    key: "green",
    label: "green",
    gloss: "The smallest change that passes the check is in.",
  },
  {
    key: "validated",
    label: "validated",
    gloss: "An independent validator scored the work against the blind rubric.",
  },
  {
    key: "completed",
    label: "completed",
    gloss: "The slice is accepted and its score is recorded.",
  },
  {
    key: "failed",
    label: "failed",
    gloss: "The slice did not reach its threshold after the allowed attempts.",
  },
  {
    key: "skipped",
    label: "skipped",
    gloss: "The slice was dropped from the plan before it was built.",
  },
];

export const SLICE_STATE_MAP: Record<string, StateMapping> = {
  planned: { step: "planned", rule: "The slice table records this slice as planned." },
  red: { step: "red", rule: "The slice table records this slice as red." },
  green: { step: "green", rule: "The slice table records this slice as green." },
  validated: {
    step: "validated",
    rule: "The slice table records this slice as validated.",
  },
  completed: {
    step: "completed",
    rule: "The slice table records this slice as completed, with its score and attempt count.",
  },
  failed: {
    step: "failed",
    rule: "The slice table records this slice as failed.",
  },
  skipped: {
    step: "skipped",
    rule: "The slice table records this slice as skipped.",
  },
};

/**
 * A score below this reads as a slice that needed more than one attempt. The
 * threshold is the one the slice loop already uses, and an accepted slice can sit
 * just above it.
 */
export const PASS_THRESHOLD = 0.9;

export function epicMapping(state: string): StateMapping | null {
  return EPIC_STATE_MAP[state] ?? null;
}

export function sliceMapping(state: string): StateMapping | null {
  return SLICE_STATE_MAP[state] ?? null;
}

/**
 * True when the state is one the vocabulary describes but the corpus does not
 * carry. The legend uses this to separate "the plan" from "the record".
 */
export function isIntendedOnly(state: string): boolean {
  return !(state in EPIC_STATE_MAP) && !(state in SLICE_STATE_MAP);
}
