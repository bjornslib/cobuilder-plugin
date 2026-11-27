import { describe, expect, it } from "vitest";

import { BOARD_INDEX } from "@/shell/testSupport/board/fixtures";

import { boardRowsOf } from "./board";

const ids = (records: { id: string }[]) => records.map((record) => record.id);

function givesTheFlatRows() {
  const rows = boardRowsOf(BOARD_INDEX);
  expect(ids(rows.programs)).toEqual(["alpha", "beta", "gamma", "delta", "old-one", "old-two"]);
  expect(ids(rows.epics)).toEqual(["beta/E1", "beta/E2", "beta/E3", "beta/E4", "gamma/E1", "delta/E1", "old-one/E1"]);
  expect(rows.slices).toHaveLength(10);
}

function shapesEachEpic() {
  const beta = boardRowsOf(BOARD_INDEX).epics.find((epic) => epic.id === "beta/E2");
  expect(beta).toMatchObject({ id: "beta/E2", epicId: "E2", design: "beta", branch: "feat/beta-E2" });
}

function readsTheJoinedEpicStatus() {
  const status = new Map(boardRowsOf(BOARD_INDEX).epics.map((epic) => [epic.id, epic.status]));
  expect(status.get("beta/E1"), "the join's word, not the entity's lifecycle").toBe("completed");
  expect(status.get("beta/E3")).toBe("planned");
  expect(status.get("beta/E4")).toBe("no-pull-request");
  expect(status.get("delta/E1")).toBe("merged");
  expect(status.get("gamma/E1"), "no join entry, so the entity's own state answers").toBe("planned");
}

function carriesTheEpicOfEachSlice() {
  const { epicOfSlice } = boardRowsOf(BOARD_INDEX);
  expect(epicOfSlice.get("beta/4")).toBe("beta/E2");
  expect(epicOfSlice.get("gamma-plan/1")).toBe("gamma/E1");
  expect(epicOfSlice.has("alpha/1")).toBe(false);
}

function readsTheNextReadySliceOfEachDesign() {
  const { nextReady } = boardRowsOf(BOARD_INDEX);
  expect(nextReady.get("beta")?.id).toBe("beta/4");
  expect(nextReady.get("gamma")?.id).toBe("gamma-plan/1");
  expect(nextReady.get("delta")).toBeNull();
}

function filtersTheOrphanSlices() {
  const orphans = ids(boardRowsOf(BOARD_INDEX).orphanSlices);
  expect(orphans).toEqual(["lost-plan/1", "lost-plan/2"]);
  expect(orphans, "a slice with no epic whose plan slug names a design is not an orphan").not.toContain("alpha/1");
  expect(orphans, "a slice that joins an epic belongs to that program").not.toContain("gamma-plan/1");
}

describe("boardRowsOf", () => {
  it("gives the program, epic, and slice rows of one index", givesTheFlatRows);
  it("gives each epic its bare id, its design, and its branch", shapesEachEpic);
  it("resolves each epic's status through the join, else the entity's state", readsTheJoinedEpicStatus);
  it("carries the epic of each slice from the index's own join", carriesTheEpicOfEachSlice);
  it("gives each design its own next ready slice, or null", readsTheNextReadySliceOfEachDesign);
  it("keeps only the slices whose plan slug names no design as orphans", filtersTheOrphanSlices);
});
