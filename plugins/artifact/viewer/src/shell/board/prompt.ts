import type { DesignEntity, SliceEntity } from "@/data/types";
import type { BoardEpic } from "@/data/types/board";

import { isDoneSlice } from "./status";

const DESIGN_STAGES = new Set(["backlog", "decided", "review"]);

export function programPrompt(design: DesignEntity): string | null {
  if (DESIGN_STAGES.has(design.stage)) return `/architect:design ${design.id}`;
  return design.stage === "approved" ? `/implement:start ${design.id}` : null;
}

export function slicesDoneOf(epic: BoardEpic, slices: readonly SliceEntity[]): boolean {
  return epic.lifecycle === "open" && slices.length > 0 && slices.every((slice) => isDoneSlice(slice.state));
}

function mergeCheckOf(epic: BoardEpic, pr: number): string {
  return `Check that pull request ${pr} of ${epic.epicId} merged, then record it with tracker.py set-pull-request-state and close the epic with tracker.py set-epic-state`;
}

function pullRequestPromptOf(epic: BoardEpic): string | null {
  if (epic.pr !== null) return mergeCheckOf(epic, epic.pr);
  return epic.status === "merged" || epic.branch === null ? null : `/pr:generate ${epic.branch}`;
}

export function epicPrompt(epic: BoardEpic, slices: readonly SliceEntity[]): string | null {
  if (epic.lifecycle === "closed") return null;
  if (epic.pr !== null || slicesDoneOf(epic, slices)) return pullRequestPromptOf(epic);
  return `/implement:start ${epic.design} ${epic.epicId}`;
}
