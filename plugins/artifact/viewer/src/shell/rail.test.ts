/**
 * The rail's row list: each level once, then the "Also" group (slice 3).
 *
 * `railGroups` returns two groups. "Levels" holds Intent, Problem & Solution, and
 * Architecture of the active account. "Also" holds Plan, Epics, Rubrics, and File Diffs,
 * each with its own account. `rowsOf` flattens them in reading order.
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

describe("railGroups: the two groups", () => {
  it("returns no group when no work is open", () => {
    expect(railGroups(source({ work: null }))).toEqual([]);
  });

  it("returns the Levels group, then the Also group", () => {
    const groups = railGroups(source());
    expect(groups.map((group) => group.key)).toEqual(["levels", "also"]);
    expect(groups.map((group) => group.label)).toEqual(["Levels", "Also"]);
  });
});

describe("railGroups: the Levels group", () => {
  it("holds the three level rows of the program account by default", () => {
    const levels = railGroups(source()).find((group) => group.key === "levels");
    expect(levels?.account).toBe("program");
    expect(levels?.rows.map((row) => row.label)).toEqual(LEVEL_LABELS);
    expect(levels?.rows.map((row) => row.account)).toEqual(["program", "program", "program"]);
    expect(levels?.rows.map((row) => row.href)).toEqual(
      SHARED.map((key) => programHref("demo", key)),
    );
    expect(levels?.rows.map((row) => row.shared)).toEqual([...SHARED]);
  });

  it("reads the program account when account is program", () => {
    const levels = railGroups(source({ account: "program" })).find((g) => g.key === "levels");
    expect(levels?.account).toBe("program");
    expect(levels?.rows.map((row) => row.href)).toEqual(
      SHARED.map((key) => programHref("demo", key)),
    );
  });

  it("holds the three level rows of the change account when account is change", () => {
    const levels = railGroups(source({ account: "change" })).find((g) => g.key === "levels");
    expect(levels?.account).toBe("change");
    expect(levels?.rows.map((row) => row.label)).toEqual(LEVEL_LABELS);
    expect(levels?.rows.map((row) => row.account)).toEqual(["change", "change", "change"]);
    expect(levels?.rows.map((row) => row.href)).toEqual(
      SHARED.map((key) => changeHref("demo", 7, key)),
    );
    expect(levels?.rows.map((row) => row.shared)).toEqual([...SHARED]);
  });

  it("falls back to the program account when account is change and no change exists", () => {
    const levels = railGroups(source({ account: "change", changePr: null })).find(
      (g) => g.key === "levels",
    );
    expect(levels?.account).toBe("program");
    expect(levels?.rows.map((row) => row.account)).toEqual(["program", "program", "program"]);
    expect(levels?.rows.map((row) => row.href)).toEqual(
      SHARED.map((key) => programHref("demo", key)),
    );
  });
});

describe("railGroups: the Also group", () => {
  it("holds Plan, Epics, Rubrics, then File Diffs, each with its own account", () => {
    const also = railGroups(source()).find((group) => group.key === "also");
    expect(also?.rows.map((row) => row.label)).toEqual([
      "Plan",
      "Epics",
      "Rubrics",
      "File Diffs",
    ]);
    expect(also?.rows.map((row) => row.account)).toEqual([
      "program",
      "program",
      "program",
      "change",
    ]);
    expect(also?.rows.map((row) => row.shared)).toEqual([null, null, null, null]);
  });

  it("keeps the same Also rows when the active account is change", () => {
    const also = railGroups(source({ account: "change" })).find((group) => group.key === "also");
    expect(also?.rows.map((row) => row.label)).toEqual([
      "Plan",
      "Epics",
      "Rubrics",
      "File Diffs",
    ]);
    expect(also?.rows.map((row) => row.account)).toEqual([
      "program",
      "program",
      "program",
      "change",
    ]);
  });

  it("holds a disabled File Diffs row when no change exists", () => {
    const groups = railGroups(source({ changePr: null }));
    const also = groups.find((group) => group.key === "also");
    expect(also?.rows.map((row) => row.label)).toEqual(["Plan", "Epics", "Rubrics", "File Diffs"]);
    const diffs = also?.rows.find((row) => row.label === "File Diffs");
    expect(diffs?.available).toBe(false);
    expect(diffs?.href).toBe("#");
    expect(diffs?.account).toBe("change");
    expect(diffs?.shared).toBeNull();
    expect(Array.isArray(diffs?.absent) && (diffs?.absent?.length ?? 0) > 0).toBe(true);
    /* The row is not a step, and the walk skips it. */
    expect(also?.entries.map((entry) => entry.label)).not.toContain("File Diffs");
    expect(rowsOfShellLabels(groups)).not.toContain("File Diffs");
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

  it("never returns a build or a review group", () => {
    const keys = railGroups(source()).map((group) => group.key as string);
    expect(keys).not.toContain("build");
    expect(keys).not.toContain("review");
  });
});

function rowsOfShellLabels(groups: ReturnType<typeof railGroups>): string[] {
  return rowsOf(groups).map((row) => row.label);
}

describe("rowsOf: the walk order", () => {
  it("reads the levels, then the Also rows", () => {
    const rows = rowsOf(railGroups(source()));
    expect(rows.map((row) => row.label)).toEqual([
      "Intent",
      "Problem & Solution",
      "Architecture",
      "Plan",
      "Epics",
      "Rubrics",
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
