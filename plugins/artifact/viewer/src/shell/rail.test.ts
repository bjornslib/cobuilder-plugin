/**
 * The rail's row list: each level once, then the "Also" group (slice 3).
 *
 * `railGroups` returns three groups. "Levels" holds Intent, Problem & Solution, and
 * Architecture of the work. "Also" holds Plan, Epics, and Rubrics. "Review" holds the pull
 * request's three levels and File Diffs. `rowsOf` flattens them in reading order.
 */

import { describe, expect, it } from "vitest";

import { changeHref, programHref, railGroups, rowsOf } from "./model";
import type { AccountId, RailSource, WorkItem } from "./model";

/** A work item with the fields `railGroups` reads, and nothing else. */
const WORK = {
  id: "demo",
  record: null,
  epics: [],
  planDocs: { product: null, architecture: null, program: null },
  rubrics: [],
  linkedAdrs: [],
  diagramLevels: [],
  districts: [],
  boundaryRules: [],
  hasPlan: true,
} as unknown as WorkItem;

const GATES = {
  build: true,
  pullRequests: true,
  shipped: false,
  rubrics: true,
  gateSteps: null,
};

/** A source whose account and change are the two variables of this file. */
function source(extra: Partial<RailSource> & { account?: AccountId } = {}): RailSource {
  return {
    work: WORK,
    gates: GATES,
    levels: null,
    changePr: 7,
    changeLevels: [],
    diffFiles: null,
    servedAudio: {},
    ...extra,
  } as RailSource;
}

const LEVEL_LABELS = ["Intent", "Problem & Solution", "Architecture"];
const SHARED = ["intent", "problem-and-solution", "architecture"] as const;

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
  it("holds the three level rows of the work", () => {
    const levels = railGroups(source()).find((group) => group.key === "levels");
    expect(levels?.account).toBe("program");
    expect(levels?.rows.map((row) => row.label)).toEqual(LEVEL_LABELS);
    expect(levels?.rows.map((row) => row.account)).toEqual(["program", "program", "program"]);
    expect(levels?.rows.map((row) => row.href)).toEqual(
      SHARED.map((key) => programHref("demo", key)),
    );
    expect(levels?.rows.map((row) => row.shared)).toEqual([...SHARED]);
  });
});

describe("railGroups: the Also group", () => {
  it("holds Plan, Epics, and Rubrics of the work", () => {
    const also = railGroups(source()).find((group) => group.key === "also");
    expect(also?.rows.map((row) => row.label)).toEqual(["Plan", "Epics", "Rubrics"]);
    expect(also?.rows.map((row) => row.account)).toEqual(["program", "program", "program"]);
    expect(also?.rows.map((row) => row.shared)).toEqual([null, null, null]);
  });

  it("keeps the disabled rules of Plan and Epics", () => {
    const groups = railGroups(
      source({ work: { ...WORK, hasPlan: false } as unknown as WorkItem, gates: { ...GATES, build: false } }),
    );
    const also = groups.find((group) => group.key === "also");
    const byLabel = (label: string) => also?.rows.find((row) => row.label === label);
    expect(byLabel("Plan")?.available).toBe(false);
    expect(byLabel("Epics")?.available).toBe(false);
    expect(byLabel("Rubrics")?.available).toBe(true);
  });
});

describe("railGroups: the Review group", () => {
  it("holds the pull request's three levels, then File Diffs", () => {
    const review = railGroups(source()).find((group) => group.key === "review");
    expect(review?.account).toBe("change");
    expect(review?.rows.map((row) => row.label)).toEqual([...LEVEL_LABELS, "File Diffs"]);
    expect(review?.rows.map((row) => row.account)).toEqual(["change", "change", "change", "change"]);
    expect(review?.rows.map((row) => row.href).slice(0, 3)).toEqual(
      SHARED.map((key) => changeHref("demo", 7, key)),
    );
    expect(review?.rows.every((row) => row.available)).toBe(true);
  });

  it("holds a disabled File Diffs row when no change exists", () => {
    const groups = railGroups(source({ changePr: null }));
    const review = groups.find((group) => group.key === "review");
    expect(review?.label).toBe("Pull request");
    expect(review?.rows.map((row) => row.label)).toEqual(["File Diffs"]);
    const diffs = review?.rows[0];
    expect(diffs?.available).toBe(false);
    expect(diffs?.href).toBe("#");
    expect(diffs?.account).toBe("change");
    expect(Array.isArray(diffs?.absent) && (diffs?.absent?.length ?? 0) > 0).toBe(true);
    /* The row is not a step, and the walk skips it. */
    expect(review?.entries).toEqual([]);
    expect(rowsOfShellLabels(groups)).not.toContain("File Diffs");
  });
});

function rowsOfShellLabels(groups: ReturnType<typeof railGroups>): string[] {
  return rowsOf(groups).map((row) => row.label);
}

describe("rowsOf: the walk order", () => {
  it("reads the levels, the Also rows, then the Review rows", () => {
    const rows = rowsOf(railGroups(source()));
    expect(rows.map((row) => row.label)).toEqual([
      "Intent",
      "Problem & Solution",
      "Architecture",
      "Plan",
      "Epics",
      "Rubrics",
      "Intent",
      "Problem & Solution",
      "Architecture",
      "File Diffs",
    ]);
  });

  it("drops a row whose record is absent", () => {
    const rows = rowsOf(
      railGroups(source({ work: { ...WORK, hasPlan: false } as unknown as WorkItem })),
    );
    expect(rows.map((row) => row.label)).not.toContain("Plan");
    expect(rows.map((row) => row.label)).toContain("Epics");
  });
});
