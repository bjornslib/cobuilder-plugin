import type { Theme } from "../DiagramTiles";
import type { SwitcherDesign, SwitcherEpic } from "../model";

export interface TopBarProps {
  workId: string | null;
  workName: string | null;
  stage: string | null;
  supersededBy: string | null;
  /** The first branch the work item's epics carry, or null. Null draws nothing. */
  branch: string | null;
  /** Every distinct branch, in order. More than one adds a "+N" mark and a full title. */
  branches: string[];
  /** The designs this work item supersedes. An empty list draws nothing. */
  supersedes: string[];
  ready: boolean;
  /**
   * True while the route names no work item, which is the board and a workless change.
   *
   * A stage belongs to a work item, so neither route carries a stage badge, and neither
   * has a work item selected in the switcher. A workless pull request is such a route: its
   * change account renders, and no work item is selected behind it. The loading and failed
   * states keep the unknown badge, because "the index has not resolved" is true in both.
   */
  board: boolean;
  designs: SwitcherDesign[];
  epics: SwitcherEpic[];
  onChooseWork: (id: string) => void;
  onChooseEpic: (design: string, epicId: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
  /** Open the Work board's drawer, per ADR-0034: the shell's own Work icon. */
  onOpenWork: () => void;
  /** The id of the scroll pane, so the skip link and the switcher can reach it. */
  paneId: string;
  nameId: string;
}
