import type { DesignRow } from "@/data/types";

export const ROW_BASE: Omit<DesignRow, "design" | "pullRequests"> = {
  epics: [],
  slices: [],
  done: 0,
  slicesDone: 0,
  slicesTotal: 0,
  nextReady: null,
  trackerPullRequests: [],
  stageSource: "goal",
  trackerRead: false,
};
