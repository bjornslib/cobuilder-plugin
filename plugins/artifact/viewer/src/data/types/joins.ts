import type { DesignEntity, EpicEntity, EpicState, SliceEntity } from "./core";
import type { Entities } from "./entities";

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
  /**
   * The portable route of the gate's authored view link, such as
   * `#/review-link/build/plan/product`. The link lives on its own `view:`
   * line under the gate line in 00-status.md, and the index projects its
   * route fragment here, so the machine-specific absolute URL never travels.
   * No surface renders it yet: the plan row already opens the same page.
   */
  view?: string;
}

/** One pull request record that the tracker holds. */
export interface TrackerPullRequest {
  ref: string;
  number: number | null;
  state: "open" | "merged";
  epics: string[];
}

/** What the tracker holds for one design. */
export interface DesignTracker {
  stage_source: "tracker" | "goal";
  next_ready: string | null;
  pull_requests: TrackerPullRequest[];
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
  tracker?: { adapter: string; read: boolean };
  design_tracker?: Record<string, DesignTracker>;
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
  /** Epics whose joined status is completed. */
  done: number;
  /** Slices of this design whose state is completed. */
  slicesDone: number;
  slicesTotal: number;
  /** The first ready slice that the tracker names, or null. */
  nextReady: SliceEntity | null;
  /** The pull request records that the tracker holds for this design. */
  trackerPullRequests: TrackerPullRequest[];
  stageSource: "tracker" | "goal";
  /** True when the index build read the tracker. */
  trackerRead: boolean;
  /** Pull requests this design's epics point at, deduplicated and sorted. */
  pullRequests: number[];
}
