/**
 * The rail's row list: each level once, then the "Also" group (slice 3).
 *
 * `railGroups` returns three groups. "Levels" holds Intent, Problem & Solution, and
 * Architecture of the work. "Also" holds Plan, Epics, and Rubrics. "Review" holds the pull
 * request's three levels and File Diffs. `rowsOf` flattens them in reading order.
 */

import { describe, expect, it } from "vitest";

import { changeHref, programHref, railGroups, rowsOf, type RailRow } from "./model";
import {
  GATES,
  LEVEL_LABELS,
  SHARED,
  groupOf,
  source,
  withoutPlan,
} from "./testSupport/rail/fixtures";

const labelsOf = (rows: RailRow[] | undefined) => rows?.map((row) => row.label);
const accountsOf = (rows: RailRow[] | undefined) => rows?.map((row) => row.account);

function rowsOfShellLabels(groups: ReturnType<typeof railGroups>): string[] {
  return rowsOf(groups).map((row) => row.label);
}

function holdsThreeLevelRows() {
  const levels = groupOf("levels");
  expect(levels?.account).toBe("program");
  expect(labelsOf(levels?.rows)).toEqual(LEVEL_LABELS);
  expect(accountsOf(levels?.rows)).toEqual(["program", "program", "program"]);
  expect(levels?.rows.map((row) => row.href)).toEqual(
    SHARED.map((key) => programHref("demo", key)),
  );
  expect(levels?.rows.map((row) => row.shared)).toEqual([...SHARED]);
}

function holdsPlanEpicsRubrics() {
  const also = groupOf("also");
  expect(labelsOf(also?.rows)).toEqual(["Plan", "Epics", "Rubrics"]);
  expect(accountsOf(also?.rows)).toEqual(["program", "program", "program"]);
  expect(also?.rows.map((row) => row.shared)).toEqual([null, null, null]);
}

function keepsDisabledRules() {
  const also = groupOf("also", { ...withoutPlan(), gates: { ...GATES, build: false } });
  const byLabel = (label: string) => also?.rows.find((row) => row.label === label);
  expect(byLabel("Plan")?.available).toBe(false);
  expect(byLabel("Epics")?.available).toBe(false);
  expect(byLabel("Rubrics")?.available).toBe(true);
}

function holdsLevelsThenFileDiffs() {
  const review = groupOf("review");
  expect(review?.account).toBe("change");
  expect(labelsOf(review?.rows)).toEqual([...LEVEL_LABELS, "File Diffs"]);
  expect(accountsOf(review?.rows)).toEqual(["change", "change", "change", "change"]);
  expect(review?.rows.map((row) => row.href).slice(0, 3)).toEqual(
    SHARED.map((key) => changeHref("demo", 7, key)),
  );
  expect(review?.rows.every((row) => row.available)).toBe(true);
}

function expectDisabledDiffsRow(diffs: RailRow | undefined) {
  expect(diffs?.available).toBe(false);
  expect(diffs?.href).toBe("#");
  expect(diffs?.account).toBe("change");
  expect(Array.isArray(diffs?.absent) && (diffs?.absent?.length ?? 0) > 0).toBe(true);
}

function holdsDisabledFileDiffs() {
  const groups = railGroups(source({ changePr: null }));
  const review = groups.find((group) => group.key === "review");
  expect(review?.label).toBe("Pull request");
  expect(labelsOf(review?.rows)).toEqual(["File Diffs"]);
  expectDisabledDiffsRow(review?.rows[0]);
  /* The row is not a step, and the walk skips it. */
  expect(review?.entries).toEqual([]);
  expect(rowsOfShellLabels(groups)).not.toContain("File Diffs");
}

function readsInWalkOrder() {
  const rows = rowsOf(railGroups(source()));
  expect(rows.map((row) => row.label)).toEqual([
    ...LEVEL_LABELS,
    "Plan",
    "Epics",
    "Rubrics",
    ...LEVEL_LABELS,
    "File Diffs",
  ]);
}

function dropsAbsentRecordRow() {
  const rows = rowsOf(railGroups(withoutPlan()));
  expect(rows.map((row) => row.label)).not.toContain("Plan");
  expect(rows.map((row) => row.label)).toContain("Epics");
}

describe("railGroups: the three groups", () => {
  it("returns no group when no work is open", () => {
    expect(railGroups(source({ work: null }))).toEqual([]);
  });

  it("returns the Levels, Also, then Review group", () => {
    const groups = railGroups(source());
    expect(groups.map((group) => group.key)).toEqual(["levels", "also", "review"]);
    expect(groups.map((group) => group.label)).toEqual(["Levels", "Also", "Pull request 7"]);
  });
});

describe("railGroups: the Levels group", () => {
  it("holds the three level rows of the work", holdsThreeLevelRows);
});

describe("railGroups: the Also group", () => {
  it("holds Plan, Epics, and Rubrics of the work", holdsPlanEpicsRubrics);
  it("keeps the disabled rules of Plan and Epics", keepsDisabledRules);
});

describe("railGroups: the Review group", () => {
  it("holds the pull request's three levels, then File Diffs", holdsLevelsThenFileDiffs);
  it("holds a disabled File Diffs row when no change exists", holdsDisabledFileDiffs);
});

describe("rowsOf: the walk order", () => {
  it("reads the levels, the Also rows, then the Review rows", readsInWalkOrder);
  it("drops a row whose record is absent", dropsAbsentRecordRow);
});
