import type { AdrRecords } from "@/data/adrs";
import type { StoryEntry } from "@/data/bundle";
import type { ResolvedJoins } from "@/data/joins";
import type { Theme } from "@/shell/DiagramTiles";
import type { SheetSubject } from "@/shell/Sheet";

import type { ArtMode } from "./Frame";
import type { ChangeLevel, LevelKey } from "./levels";

/**
 * The change's four rows, in the order the reader walks them. The order is the bundle's
 * own level order, so the row a reader is on and the level they are reading are the same
 * position. Three of the four names also stand in the program's Levels group.
 */
export type ChangeKey = "intent" | "problem-and-solution" | "architecture" | "file-diffs";

export const CHANGE_KEYS: readonly ChangeKey[] = [
  "intent",
  "problem-and-solution",
  "architecture",
  "file-diffs",
];

/**
 * The bundle's own narration level key behind each of the change's four rows. Two rows
 * read a key spelled differently from the row's word, so one table holds the whole
 * mapping and no row spells a key for itself.
 */
export const CHANGE_LEVEL_KEY: Record<ChangeKey, LevelKey> = {
  "intent": "intent",
  "problem-and-solution": "problem_solution",
  "architecture": "architecture",
  "file-diffs": "file_changes",
};

/** The four rows' own names. The fourth stands in this account alone. */
export const CHANGE_LABEL: Record<ChangeKey, string> = {
  intent: "Intent",
  "problem-and-solution": "Problem & Solution",
  architecture: "Architecture",
  "file-diffs": "File Diffs",
};

export interface ChangeBodyProps {
  entry: StoryEntry | null;
  levels: ChangeLevel[];
  /** The diff text, keyed by path. */
  diff: Record<string, string> | null;
  /** Why the diff is absent, or null when the bundle holds one. */
  diffMessage: string | null;
  theme: Theme;
  artMode: ArtMode;
  onArtMode: (mode: ArtMode) => void;
  failedArt: string | null;
  onArtFailed: (url: string) => void;
  /** The diff path the reader selected, or null for the largest file. */
  diffFile: string | null;
  onDiffFile: (path: string) => void;
  /**
   * The index's joins, resolved once by the shell, or null when the index did not load.
   * The decisions this change landed come from here and never from the entry's own `adrs`
   * list, so the account and the index cannot disagree about that set.
   */
  joins: ResolvedJoins | null;
  adrs: AdrRecords;
  openSheet: (subject: SheetSubject) => void;
}
