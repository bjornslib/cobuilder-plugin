import { describe, expect, it } from "vitest";

import { epicColumnOf, epicStatusWord, isDoneSlice, sliceColumnOf, STATUS_COLUMNS } from "./status";

const EPIC_MAP: Record<string, string> = {
  unstarted: "planned",
  planned: "planned",
  open: "in_progress",
  "no-pull-request": "in_progress",
  completed: "done",
  merged: "done",
  superseded: "done",
};

const SLICE_MAP: Record<string, string> = {
  planned: "planned",
  in_progress: "in_progress",
  completed: "done",
  skipped: "done",
  escalated: "done",
};

function mapsEachEpicStatus() {
  expect(STATUS_COLUMNS.map((column) => column.key)).toEqual(["planned", "in_progress", "done"]);
  for (const [status, column] of Object.entries(EPIC_MAP)) {
    expect(epicColumnOf(status), `${status} goes to ${column}`).toBe(column);
    expect(epicStatusWord(status), `the card keeps the raw word ${status}`).toBe(status);
  }
}

function mapsEachSliceState() {
  for (const [state, column] of Object.entries(SLICE_MAP)) {
    expect(sliceColumnOf(state), `${state} goes to ${column}`).toBe(column);
    expect(isDoneSlice(state), `${state} is done exactly when it sits in Done`).toBe(column === "done");
  }
}

function sendsAnUnknownValueToInProgress() {
  expect(epicColumnOf("drafting")).toBe("in_progress");
  expect(epicStatusWord("drafting"), "an unknown word stays raw on the card").toBe("drafting");
  expect(sliceColumnOf("paused")).toBe("in_progress");
}

function readsAMissingEpicStatusAsNoStatus() {
  for (const missing of [null, undefined, ""]) {
    expect(epicColumnOf(missing)).toBe("in_progress");
    expect(epicStatusWord(missing), `${String(missing)} reads as no status`).toBe("no status");
  }
}

function sendsAMissingSliceStateToInProgress() {
  for (const missing of [null, undefined, ""]) {
    expect(sliceColumnOf(missing), `${String(missing)} goes to In progress`).toBe("in_progress");
  }
}

describe("the status map", () => {
  it("maps each epic status that the index emits to its column, and keeps the raw word", mapsEachEpicStatus);
  it("maps each slice state to its column", mapsEachSliceState);
  it("sends an unknown epic status or slice state to In progress", sendsAnUnknownValueToInProgress);
  it("reads a missing epic status as the word no status, in In progress", readsAMissingEpicStatusAsNoStatus);
  it("sends a missing slice state to In progress", sendsAMissingSliceStateToInProgress);
});
