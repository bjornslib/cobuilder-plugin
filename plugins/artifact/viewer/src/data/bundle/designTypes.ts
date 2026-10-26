/* ------------------------------------------------------------------- designs */

/**
 * One design's authored records, as `data/designs.js` writes them.
 *
 * The index carries a design entity, and it carries no record body. These six fields are
 * the record bodies. Two surfaces read them: the Work board's readiness rule, and every
 * panel of the shell. Every field below is present in the real corpus, read across the
 * fifteen designs of `self/data/designs.js`.
 *
 * A record file is derived, so both readers treat every field as possibly absent. That is
 * why a field is optional even where the corpus always writes it: a type that promised a
 * value would hide the absence the panel exists to state.
 *
 * This is the one declaration of each shape. A surface that reads a field here re-exports
 * these types rather than restating them, so a renamed field fails the build in one place.
 */

/** One row of `goal.epics[]`. The index carries no epic outcome, so this is its source. */
export interface PlanEpicRow {
  id: string;
  slug?: string;
  branch: string | null;
  pr: number | null;
  state: string;
  outcome?: string;
  note?: string | null;
  /** The decision this epic carries, by ADR id. */
  adr?: string | null;
}

/** Design mode's stage-0 and stage-1 grounding, as `goal.json` records it. */
export interface MinWork {
  derived_from?: string;
  alternatives_explored?: number;
  boundary_rules_checked?: boolean;
  /** False on a backlog entry. Design mode stopped after stage 1. */
  challenge_stage_run?: boolean;
  note?: string;
}

export interface DesignGoal {
  name?: string;
  title?: string;
  created?: string;
  outcome?: string;
  done_when?: string[];
  abort_if?: string[];
  min_work?: MinWork | null;
  /** The planned epics. The Build level reads each row's outcome, and nothing else. */
  epics?: PlanEpicRow[];
  stage?: string;
  supersedes?: string[] | null;
  /** Present when a later design closed this one. The authority for "superseded by". */
  superseded_by?: string;
  superseded_note?: string;
  adr?: string | null;
  adrs?: string[];
}

/** One rejected option, with the reason the design gives. */
export interface DesignAlternative {
  option: string;
  rejected_because: string;
}

export interface DesignIntent {
  problem?: string;
  approach?: string;
  alternatives?: DesignAlternative[];
  authorship?: string;
  captured?: string;
  out_of_scope?: string[];
  reviewer_focus?: string[];
  risks?: string[];
  unknowns?: string[];
  why_now?: string;
}

/** One assessment finding. The board counts findings, and a panel reads the prose. */
export interface AssessmentFinding {
  kind?: string;
  id?: string;
  /** The prose of the finding. Some records write `text`, and others `title` and `detail`. */
  text?: string;
  title?: string;
  detail?: string;
  severity?: string;
}

export interface DesignAssessment {
  verdict?: string;
  findings?: AssessmentFinding[];
  constraint_introduced?: string;
  regret_risk?: string;
  risk_tier?: string;
  /** `design` for an assessment written before the code, `retrospective` for one after. */
  stage?: string;
  summary?: string;
}

/** One narrative beat. `kind` is `problem`, `constraint`, `decision`, or `risk`. */
export interface NarrativeBeat {
  kind: string;
  text: string;
}

/** One narrative level: the tagline and the narration a reader hears or reads. */
export interface NarrativeLevel {
  tagline?: string;
  narration?: string;
  beats?: NarrativeBeat[];
}

export interface DesignNarrative {
  intent?: NarrativeLevel;
  /**
   * The problem and solution level. It also carries the split prose directly, because
   * some records author the statement there and some author the beats beside it.
   */
  problem_solution?: NarrativeLevel & { problem?: string; solution?: string };
  architecture?: NarrativeLevel;
  /**
   * The same three levels, when a record wraps them under this key instead of authoring
   * them at the top level. `review-flight-deck` writes this shape, so a rule that read
   * only the flat one reported its three levels missing while the text sat one key away.
   */
  levels?: {
    intent?: NarrativeLevel;
    problem_solution?: NarrativeLevel;
    architecture?: NarrativeLevel;
  };
  /**
   * A LEVEL KEY THIS BUILD DOES NOT NAME IS TOLERATED, AND THE TOLERANCE IS THE POINT.
   *
   * ADR-0029 renamed the first level's key, and a record written before that rename carries
   * the key the level used to have. Such a record is still a record this reader must
   * compile against and read: `narrativeVerdict` in `src/shell/readiness.ts` asks for the
   * current key first and for the older one second, so a design narrated before the rename
   * still reads as narrated instead of crashing a reader on the way in.
   *
   * So this index signature is not a hole in the type. It states that one key of this
   * record is not this build's to name, and every named key above keeps its own type.
   */
  [unreadLevel: string]: unknown;
}

/** One design's six records. The corpus always writes `goal`, and the other five vary. */
export interface DesignRecord {
  goal?: DesignGoal;
  intent?: DesignIntent;
  assessment?: DesignAssessment;
  narrative?: DesignNarrative;
  /** Drawing source, keyed by level: `"1"`, `"2"`, `"3"` as mermaid source, plus
   *  the named `"runtime"` slot as authored inline SVG (ADR-0036). */
  diagrams?: Record<string, string>;
  pr_draft?: string;
  /** Authored markdown, from the design's `contracts.md` (ADR-0036). Absence is silence, not an error. */
  contracts?: string;
}

/** Every design, keyed by the id the index's design entity carries. */
export type DesignRecords = Record<string, DesignRecord>;
