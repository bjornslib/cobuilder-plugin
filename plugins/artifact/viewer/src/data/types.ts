/**
 * The shape of `.cobuilder-architect/<bundle>/data/index.json`.
 *
 * Written by hand from the file that `shared/build_index.py` produces, schema 1.3,
 * and narrowed to the entities a Work board reads. Every field below is present in
 * the real corpus. Nothing here is invented, and nothing here is optional-by-guess:
 * a field is `| null` only where the corpus holds a null.
 *
 * `epic_status` and `epic_to_pull_request` are joins, not entity fields. They live
 * under `joins` and they are the only correct source for an epic's state and its
 * pull request, because `build_index.py` refines them from the pull-request list.
 * The `epic.state` field on the entity is the unrefined placeholder.
 */

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
  | "merged";

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

export interface ContextEntity {
  id: string;
  name: string;
  path: string;
  verifies: string[];
}

export interface DistrictEntity {
  id: string;
  label: string;
  paths: string[];
}

export interface BoundaryRuleEntity {
  id: string;
  context: string;
  kind: string;
  detail: Record<string, unknown>;
}

export interface PublicationEntity {
  id: string;
  pull_request: number;
  artifact_url: string;
  published_at: string;
}

export interface ProgramDesignEntity {
  id: string;
  feature_slug: string;
  gate: number;
  title: string;
  body_md: string;
}

export interface EpicDesignEntity {
  id: string;
  epic_id: string;
  feature_slug: string;
  title: string;
  body_md: string;
}

/**
 * One plan's Gate 2b interaction design.
 *
 * The index projects `docs/plans/<slug>/interaction-design.md` into this entity. The
 * shell reads one field from it, and it is not the body: `feature_slug` is the only
 * evidence the index carries that a plan directory exists at all for a work whose plan
 * holds no gate record and no epic design.
 */
export interface InteractionDesignEntity {
  feature_slug: string;
  gate: string;
  title: string;
  state: string;
  source_path: string;
  body_md: string;
}

export interface Entities {
  adr: AdrEntity[];
  design: DesignEntity[];
  epic: EpicEntity[];
  context: ContextEntity[];
  district: DistrictEntity[];
  boundary_rule: BoundaryRuleEntity[];
  pull_request: PullRequest[];
  slice: SliceEntity[];
  publication: PublicationEntity[];
  program_design: ProgramDesignEntity[];
  epic_design: EpicDesignEntity[];
  interaction_design: InteractionDesignEntity[];
}

export interface AdrToPullRequest {
  pr: number;
  via: string;
  path: string[];
}

export interface GateStep {
  n: string;
  name: string;
  state: string;
  doc?: string;
  doc_kind?: string;
}

export interface Joins {
  adr_to_pull_request: Record<string, AdrToPullRequest>;
  epic_to_pull_request: Record<string, number>;
  epic_status: Record<string, EpicState | string>;
  slice_to_epic: Record<string, string>;
  slice_to_epic_unresolved: Record<string, string>;
  context_verifies_district: Record<string, string[]>;
  district_uncovered: string[];
  adr_to_context: Record<string, string>;
  adr_to_district: Record<string, string>;
  feature_gates: Record<string, GateStep[]>;
}

export interface RecordIndex {
  schema_version: string;
  sources: {
    git_head: string;
    trees: Record<string, string>;
  };
  entities: Entities;
  joins: Joins;
}

/** One design with its joined epics and slices, resolved once. */
export interface DesignRow {
  design: DesignEntity;
  epics: EpicEntity[];
  slices: SliceEntity[];
  /** Epics whose joined status is completed or merged. */
  done: number;
  /** Pull requests this design's epics point at, deduplicated and sorted. */
  pullRequests: number[];
}
