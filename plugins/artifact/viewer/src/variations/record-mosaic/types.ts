/**
 * The shape of `data/designs.js` (`window.DESIGNS`), and the record model that
 * variation C derives from it.
 *
 * Every field is written from the real file at
 * `.cobuilder-architect/self/data/designs.js`, and every field is optional. The
 * corpus writes each record by hand, so no two designs carry the same key set.
 * `plugin-split`'s intent holds `doubts` and no `risks`, and `review-flight-deck`
 * authors its narrative under `levels` instead of at the top level. A reader that
 * demands one key set would drop real content, so this model admits the shapes the
 * corpus actually uses and the readiness rules in `records.ts` name what is absent.
 *
 * `Readiness` is the mosaic's central idea: a record kind is `present`, `partial`,
 * or `absent`, and a tile always says which. An absent record gets a styled tile
 * that names what is missing, never a blank box and never a hidden tile.
 */

/** One epic as `goal.json` writes it. `state` here is the unrefined placeholder. */
export interface GoalEpic {
  id: string;
  slug?: string;
  branch?: string | null;
  pr?: number | null;
  state?: string;
  outcome?: string;
  note?: string | null;
}

/** Design mode's stage-0 and stage-1 grounding, as `goal.json` records it. */
export interface MinWork {
  derived_from?: string;
  alternatives_explored?: number;
  boundary_rules_checked?: boolean;
  challenge_stage_run?: boolean;
  note?: string;
}

export interface DesignRound {
  n?: number;
  changed?: boolean;
  feedback_class?: string;
  note?: string;
}

export interface GoalRecord {
  name?: string;
  title?: string;
  created?: string;
  outcome?: string;
  done_when?: string[];
  abort_if?: string[];
  min_work?: MinWork | null;
  limits?: { warn_after_rounds?: number; cutoff_rounds?: number } | null;
  epics?: GoalEpic[];
  stage?: string;
  supersedes?: string[] | null;
  superseded_by?: string | null;
  adr?: string | null;
  adrs?: string[] | null;
  rounds?: DesignRound[];
}

export interface RejectedOption {
  option?: string;
  rejected_because?: string;
}

export interface IntentRecord {
  problem?: string;
  approach?: string;
  alternatives?: RejectedOption[];
  authorship?: string;
  captured?: string;
  design_name?: string;
  out_of_scope?: string[];
  reviewer_focus?: string[];
  risks?: string[];
  source?: string;
  testing?: string;
  unknowns?: string[];
  why_now?: string;
  doubts?: string[];
  design?: string;
}

export interface NarrativeBeat {
  kind?: string;
  text?: string;
}

export interface NarrativeLevel {
  tagline?: string;
  narration?: string;
  problem?: string;
  solution?: string;
  beats?: NarrativeBeat[];
  alternatives?: RejectedOption[];
}

/** `review-flight-deck` wraps its three levels under `levels`, so both are read. */
export interface NarrativeRecord extends NarrativeLevel {
  levels?: {
    landscape?: NarrativeLevel;
    problem_solution?: NarrativeLevel;
    architecture?: NarrativeLevel;
  };
  design_name?: string;
}

export interface AssessmentFinding {
  kind?: string;
  id?: string;
  severity?: string;
  title?: string;
  detail?: string;
}

export interface AssessmentRecord {
  verdict?: string;
  findings?: AssessmentFinding[];
  summary?: string;
  risk_tier?: string;
  stage?: string;
  regret_risk?: string;
  constraint_introduced?: string;
  boundary_checks?: unknown[];
  drift?: unknown[];
  captured?: string;
  assessed?: string;
}

/** One design's directory, as `designs.js` projects it. Every part is optional. */
export interface DesignRecords {
  goal?: GoalRecord;
  intent?: IntentRecord;
  narrative?: NarrativeRecord;
  assessment?: AssessmentRecord;
  /** Mermaid source per level, keyed `"1"`, `"2"`, and `"3"`. */
  diagrams?: Record<string, string>;
  pr_draft?: string;
}

/** Every design the corpus holds, keyed by design id. */
export type DesignRecordMap = Record<string, DesignRecords>;

/** The six authored record files a design directory can hold. */
export type RecordKind =
  | "goal"
  | "intent"
  | "narrative"
  | "assessment"
  | "pr-draft"
  | "diagrams";

export const RECORD_KINDS: RecordKind[] = [
  "goal",
  "intent",
  "narrative",
  "assessment",
  "pr-draft",
  "diagrams",
];

export type Readiness = "present" | "partial" | "absent";

export interface Verdict {
  state: Readiness;
  /** The parts the record is missing. Empty unless the state is `partial`. */
  missing: string[];
  /** One plain line: what the tile shows, or why it is empty. */
  note: string;
}

/** The ten tiles of the mosaic, in the order the grid places them. */
export type TileKind =
  | "goal"
  | "intent"
  | "narrative"
  | "assessment"
  | "pr-draft"
  | "decisions"
  | "diagrams"
  | "epics"
  | "slices"
  | "pull-requests";

export const TILE_KINDS: TileKind[] = [
  "goal",
  "intent",
  "narrative",
  "assessment",
  "pr-draft",
  "decisions",
  "diagrams",
  "epics",
  "slices",
  "pull-requests",
];

/**
 * Every state value an epic badge must render: the four the index refines today,
 * plus the wider vocabulary this variation is built to display. The UI accepts the
 * wider set so a future index can carry it without a code change. The legend marks
 * which values the corpus holds today, so nothing is faked.
 */
export const EPIC_STATES_REAL = ["merged", "open", "unstarted", "no-pull-request"];
export const EPIC_STATES_INTENDED = [
  "planned",
  "in-progress",
  "blocked",
  "in-review",
  "merged",
  "superseded",
];

export const SLICE_STATES_REAL = ["completed"];
export const SLICE_STATES_INTENDED = [
  "planned",
  "red",
  "green",
  "validated",
  "completed",
  "failed",
  "skipped",
];

/** The score a slice must clear, from `implement`'s VALIDATE step. */
export const SCORE_THRESHOLD = 0.9;
