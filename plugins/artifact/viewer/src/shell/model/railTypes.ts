import type { WorkItem } from "@/data/works";
import type { ChangeLevel } from "../change/levels";
import type { AccountId, GroupKey, SharedKey } from "./accounts";
import type { Gates } from "./gates";
import type { LevelState } from "./levels";

/**
 * One row of the rail: what it is called, where it opens, and which account it reads.
 *
 * `account` and `shared` tell the groups apart. The two groups repeat three section
 * names, so a reader who cannot tell the groups apart cannot tell the accounts apart
 * either. The account is a field of the row and not a fact to infer.
 *
 * `href` comes from the account's own builder, so no row invents an address. A row whose
 * record is absent carries `available: false`, its address reads `#`, and `absent` names
 * the records it could not read.
 */
export interface RailRow {
  key: string;
  label: string;
  href: string;
  account: AccountId;
  shared: SharedKey | null;
  /**
   * How much the section holds, as a short string: `6 records`, `7 of 7 fields`,
   * `558 files`. An empty string means the rail has not read this section's records,
   * which is not the same as a section that holds none.
   */
  count: string;
  /** False renders the row disabled, and a disabled row is not a step. */
  available: boolean;
  absent?: string[];
}

export interface RailGroup {
  key: GroupKey;
  label: string;
  account: AccountId;
  rows: RailRow[];
  /**
   * The rows a press can reach, in the same order.
   *
   * A row whose record is absent carries `#`, so a step onto it would send the reader to
   * the board. The walk steps this list rather than `rows`, so the rail and the walk
   * cannot disagree about what a press can reach.
   */
  entries: RailRow[];
}

/**
 * Everything the rail's two groups are built from, and nothing else.
 *
 * This is the whole input to `railGroups`. The rail takes it as its props and the
 * arrow-key traversal takes the same object, so both read one derivation. The change's
 * own records are absent while no change is read, and the rows then state no count
 * rather than a number nobody read.
 */
export interface RailSource {
  work: WorkItem | null;
  gates: Gates | null;
  levels: Record<string, LevelState> | null;
  /**
   * The change the rail addresses: the pull request the route names, or the one this
   * work's own epics carry. Absent when the work carries none, and then the Also group
   * keeps one disabled File Diffs row that states the absence.
   */
  changePr?: number | null;
  changeLevels?: ChangeLevel[];
  diffFiles?: number | null;
  servedAudio?: Record<string, boolean>;
}

export interface RailReading {
  work: WorkItem;
  gates: Gates | null;
  levels: RailSource["levels"];
  changePr: number | null;
  changeLevels: ChangeLevel[];
  diffFiles: number | null;
  servedAudio: Record<string, boolean>;
}
