/** ADR-0036: the runtime slot sits ahead of the class level, and its key comes from the bundle record only. */
import { describe, expect, it } from "vitest";

import { architectureTileLevels } from "@/data/works";

function runtimeBehindSequence() {
  const record = { diagrams: { "1": "a", "2": "b", "3": "c", runtime: "<svg/>" } };
  expect(architectureTileLevels(record)).toEqual(["1", "2", "runtime", "3"]);
}

function overviewStaysFirst() {
  const record = { diagrams: { "3": "c", "1": "a", runtime: "<svg/>" } };
  expect(architectureTileLevels(record)[0]).toBe("1");
  expect(architectureTileLevels(record)).toContain("runtime");
}

function runtimeAppendedWithoutClassLevel() {
  const record = { diagrams: { "1": "a", runtime: "<svg/>" } };
  expect(architectureTileLevels(record)).toEqual(["1", "runtime"]);
}

function runtimeOmittedWhenKeyAbsent() {
  expect(architectureTileLevels({ diagrams: { "1": "a", "2": "b", "3": "c" } })).toEqual([
    "1",
    "2",
    "3",
  ]);
  expect(architectureTileLevels({})).toEqual([]);
  expect(architectureTileLevels(undefined)).toEqual([]);
}

function narrativeLevelsKeepTheirNumbers() {
  const record = { diagrams: { "1": "a", "2": "b", "3": "c", "4": "d", runtime: "<svg/>" } };
  const levels = architectureTileLevels(record);
  expect(levels).toContain("4");
  expect(levels.indexOf("runtime")).toBeLessThan(levels.indexOf("3"));
}

describe("architectureTileLevels", () => {
  it("orders runtime ahead of the class level and behind the sequence", runtimeBehindSequence);
  it("keeps the overview leading, whatever the runtime slot holds", overviewStaysFirst);
  it("appends runtime when no class level exists", runtimeAppendedWithoutClassLevel);
});

describe("architectureTileLevels", () => {
  it("omits the runtime slot silently when the key is absent", runtimeOmittedWhenKeyAbsent);
  it("never renumbers a narrative level and never invents a fourth number", narrativeLevelsKeepTheirNumbers);
});
