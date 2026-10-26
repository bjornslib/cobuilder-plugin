/** One narrative beat. `kind` names the beat's own job: background, intuition, boundary. */
export interface StoryBeat {
  kind?: string;
  text?: string;
}

export interface StoryDiffGroup {
  title?: string;
  note?: string;
  files?: string[];
}

export interface StoryLevel {
  narration?: string;
  /** Present exactly when the bundle holds narration audio for this level. */
  voice?: string;
  /** The gap the change closes. The second level authors it beside its narration. */
  problem?: string;
  solution?: string;
  beats?: StoryBeat[];
  /** The fourth level's own grouping of the files the diff touches. */
  groups?: StoryDiffGroup[];
}

export interface StoryIntentAlternative {
  option?: string;
  rejected_because?: string;
}

/**
 * The author's own statement, captured by Generate mode before the code existed.
 * `source` is `inferred` when no author statement survives and the block is a reading of
 * the diff. The surface states that in place rather than passing it off as authorship.
 */
export interface StoryIntent {
  captured?: string;
  source?: string;
  authorship?: string;
  problem?: string;
  why_now?: string;
  approach?: string;
  alternatives?: StoryIntentAlternative[];
  out_of_scope?: string[];
  risks?: string[];
  /**
   * A single string in every entry this bundle carries, and a list by the shape of its
   * four siblings. No document says which, so the reader accepts both.
   */
  testing?: string[] | string;
  reviewer_focus?: string[];
  unknowns?: string[];
}

export interface StoryAssessmentAnswer {
  answer?: string;
  verdict?: string;
  constraint_introduced?: string;
  evidence?: string;
  duplicates?: unknown[];
}

export interface StoryAssessmentFinding {
  kind?: string;
  id?: string;
  severity?: string;
  title?: string;
  claim?: string;
  detail?: string;
}

export interface StoryBoundaryCheck {
  rule?: string;
  source?: string;
  result?: string;
  evidence?: string;
}

/**
 * `stage` is `design` for an assessment written before the code existed, and
 * `retrospective` for one written after the merge, whose findings are observations.
 */
export interface StoryAssessment {
  stage?: string;
  generated?: string;
  verdict?: string;
  risk_tier?: string;
  summary?: string;
  sensible?: StoryAssessmentAnswer;
  maintainability?: StoryAssessmentAnswer;
  pattern?: StoryAssessmentAnswer;
  findings?: StoryAssessmentFinding[];
  boundary_checks?: StoryBoundaryCheck[];
  regret_risk?: string;
  drift?: StoryAssessmentFinding[];
}

/**
 * The levels are keyed by name, not by number: `intent`, `problem_solution`,
 * `architecture`, and `file_changes`. A level's number is the position of its key in that
 * order, and no field carries it.
 *
 * A pull request with no narration carries no `levels` key at all. An empty object would
 * state a level record that is not there, and a reader that finds the key cannot tell the
 * two apart. `extract_story.py` writes a stub entry without the key, and `?? {}` below
 * reads an older entry that carries it.
 */
export interface StoryEntry {
  pr: number;
  date?: string;
  title?: string;
  tagline?: string;
  depth?: string;
  size?: { files?: number; adds?: number; dels?: number };
  touched?: Record<string, number>;
  adrs?: string[];
  /** `merged`, or `open` for a pull request that has not merged. */
  status?: string;
  commit?: string;
  levels?: Record<string, StoryLevel>;
  /** The two blocks Generate mode and the assessment write onto the entry. */
  intent?: StoryIntent;
  assessment?: StoryAssessment;
}

export interface Story {
  meta?: { repo?: string; generated?: string; schema_version?: string; levels?: string[] };
  timeline?: StoryEntry[];
}
