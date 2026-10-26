import type { AdrEntity, DesignEntity, EpicEntity, PullRequest, SliceEntity } from "./core";

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
  approved_date?: string | null;
  source_path?: string;
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

/**
 * One slice's blind acceptance rubric.
 *
 * The index projects `.cobuilder/rubrics/<slug>/slice-N.md` into this entity. The id is
 * `<slug>/<n>`, the same string a slice entity carries, so a work joins the two by a
 * plain id lookup and no new join key exists. `body_md` is the whole file text, because
 * the rubric is a single authored document with no fields worth taking apart.
 */
export interface RubricEntity {
  id: string;
  feature_slug: string;
  n: number;
  title: string;
  body_md: string;
  source_path: string;
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
  /** Gate 1 and Gate 2 documents. They carry the program design's field set. */
  product_doc?: ProgramDesignEntity[];
  architecture_doc?: ProgramDesignEntity[];
  program_design: ProgramDesignEntity[];
  epic_design: EpicDesignEntity[];
  interaction_design: InteractionDesignEntity[];
  /**
   * Slice rubrics. Optional like `product_doc`: a bundle built before the kind
   * existed carries no `rubric` key, and it must keep loading.
   */
  rubric?: RubricEntity[];
}
