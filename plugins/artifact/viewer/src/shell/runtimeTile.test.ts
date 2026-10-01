/**
 * The named runtime slot's read rules (ADR-0036): tile order, and the
 * `runtime` key's provenance from the bundle record only.
 */
import { describe, expect, it } from "vitest";

import { architectureTileLevels } from "@/data/works";

describe("architectureTileLevels", () => {
  it("orders runtime ahead of the class level and behind the sequence", () => {
    const record = { diagrams: { "1": "a", "2": "b", "3": "c", runtime: "<svg/>" } };
    expect(architectureTileLevels(record)).toEqual(["1", "2", "runtime", "3"]);
  });

  it("keeps the overview leading, whatever the runtime slot holds", () => {
    const record = { diagrams: { "3": "c", "1": "a", runtime: "<svg/>" } };
    expect(architectureTileLevels(record)[0]).toBe("1");
    expect(architectureTileLevels(record)).toContain("runtime");
  });

  it("appends runtime when no class level exists", () => {
    const record = { diagrams: { "1": "a", runtime: "<svg/>" } };
    expect(architectureTileLevels(record)).toEqual(["1", "runtime"]);
  });

  it("omits the runtime slot silently when the key is absent", () => {
    expect(architectureTileLevels({ diagrams: { "1": "a", "2": "b", "3": "c" } })).toEqual([
      "1",
      "2",
      "3",
    ]);
    expect(architectureTileLevels({})).toEqual([]);
    expect(architectureTileLevels(undefined)).toEqual([]);
  });

  it("never renumbers a narrative level and never invents a fourth number", () => {
    const record = { diagrams: { "1": "a", "2": "b", "3": "c", "4": "d", runtime: "<svg/>" } };
    const levels = architectureTileLevels(record);
    expect(levels).toContain("4");
    /* The runtime slot sits ahead of the class level, wherever that level is. */
    expect(levels.indexOf("runtime")).toBeLessThan(levels.indexOf("3"));
  });
});
