import { describe, expect, it } from "vitest";

import { designRowsOf } from "./bundle";
import type { Joins, RecordIndex } from "./types";

const epicOf = (n: number) => ({ id: `d1/E${n}`, design: "d1", epic_id: `E${n}`, state: "open", pr: null });

const sliceOf = (n: number, state: string) => ({
  id: `d1/${n}`,
  feature: "d1",
  n,
  title: `Slice ${n}`,
  ends_with: "",
  score: null,
  attempts: 0,
  state,
});

const entities = {
  design: [{ id: "d1", name: "d1", outcome: "o", stage: "review" }],
  epic: [1, 2, 3, 4].map(epicOf),
  slice: [sliceOf(1, "completed"), sliceOf(2, "open")],
};

const epicStatus = {
  "d1/E1": "completed",
  "d1/E2": "merged",
  "d1/E3": "open",
  "d1/E4": "superseded",
};

const baseJoins = {
  adr_to_pull_request: {},
  epic_to_pull_request: {},
  epic_status: epicStatus,
  slice_to_epic: { "d1/1": "d1/E1", "d1/2": "d1/E2" },
  slice_to_epic_unresolved: {},
  context_verifies_district: {},
  district_uncovered: [],
  adr_to_context: {},
  adr_to_district: {},
  feature_gates: {},
};

function indexOf(extra: Partial<Joins>): RecordIndex {
  const sources = { git_head: "", trees: {} };
  return { schema_version: "x", sources, entities, joins: { ...baseJoins, ...extra } } as unknown as RecordIndex;
}

const records = [{ ref: "r", number: 43, state: "merged" as const, epics: ["d1/E1"] }];

const trackerJoins = {
  tracker: { adapter: "beads", read: true },
  design_tracker: {
    d1: { stage_source: "tracker", next_ready: "d1/2", pull_requests: records },
  },
} as Partial<Joins>;

function countsDoneEpics() {
  expect(designRowsOf(indexOf({}))[0].done).toBe(1);
}

function fillsTrackerFields() {
  const [row] = designRowsOf(indexOf(trackerJoins));
  expect(row.slicesDone).toBe(1);
  expect(row.slicesTotal).toBe(2);
  expect(row.nextReady?.id).toBe("d1/2");
  expect(row.trackerPullRequests).toEqual(records);
  expect(row.stageSource).toBe("tracker");
  expect(row.trackerRead).toBe(true);
}

function defaultsTrackerFields() {
  const [row] = designRowsOf(indexOf({}));
  expect(row.nextReady).toBeNull();
  expect(row.trackerPullRequests).toEqual([]);
  expect(row.stageSource).toBe("goal");
  expect(row.trackerRead).toBe(false);
}

describe("design rows from the tracker joins", () => {
  it("counts only completed epics as done", countsDoneEpics);

  it("fills the tracker fields from the index", fillsTrackerFields);

  it("defaults the tracker fields for an older index", defaultsTrackerFields);
});
