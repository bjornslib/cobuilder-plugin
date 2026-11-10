/** The bundle's four narration level keys, in the order the bundle writes them. */
export const LEVEL_KEYS = [
  "intent",
  "problem_solution",
  "architecture",
  "file_changes",
] as const;

export type LevelKey = (typeof LEVEL_KEYS)[number];

export const LEVEL_TITLE: Record<LevelKey, string> = {
  intent: "Intent",
  problem_solution: "Problem & Solution",
  architecture: "Architecture",
  file_changes: "File changes",
};

/**
 * One narration level of one change, as the account needs it.
 *
 * `art`, `audio`, and `diagram` are null when the bundle holds none for this level. A
 * level may carry a `voice` and no audio file, because a bundle can record the script and
 * lose the file, so the two are separate fields and the surface states them apart.
 */
export interface ChangeLevel {
  /** 1 to 4. The position of the level's key in `LEVEL_KEYS`. */
  number: 1 | 2 | 3 | 4;
  key: LevelKey;
  title: string;
  narration: string;
  voice: string | null;
  art: string | null;
  /** The narration audio URL, or null when this level carries no voice script. */
  audio: string | null;
  diagram: string | null;
}
