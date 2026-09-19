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

export interface PullRequestEntity {
  id: number;
  title: string;
  state: string;
  commit: string | null;
  date: string | null;
}

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
  pull_request: PullRequestEntity[];
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
