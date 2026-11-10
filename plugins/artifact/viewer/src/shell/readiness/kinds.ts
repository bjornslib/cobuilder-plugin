export type RecordKind =
  | "goal"
  | "intent"
  | "narrative"
  | "assessment"
  | "pr-draft"
  | "diagrams";

/** In the order a reader reads the records and a row paints them. */
export const RECORD_KINDS: RecordKind[] = [
  "goal",
  "intent",
  "narrative",
  "assessment",
  "pr-draft",
  "diagrams",
];

/** One name for one thing, used by the row and the key. */
export const RECORD_LABEL: Record<RecordKind, string> = {
  goal: "goal",
  intent: "intent",
  narrative: "narrative",
  assessment: "assessment",
  "pr-draft": "pr-draft",
  diagrams: "diagrams",
};

export type Readiness = "present" | "partial" | "absent";

export interface Verdict {
  state: Readiness;
  /** The parts the record is missing. Empty unless the state is `partial`. */
  missing: string[];
}

export type RecordVerdicts = Record<RecordKind, Verdict>;
