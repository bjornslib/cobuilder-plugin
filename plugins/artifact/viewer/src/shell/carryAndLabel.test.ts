import { describe, expect, it } from "vitest";
import * as model from "./model";

const carriedSectionIndex = (model as any).carriedSectionIndex as (
  names: string[],
  carried: string | null,
) => number;
const readInLabel = (model as any).readInLabel as (
  from: "program" | "change",
  pr: number | null,
) => string | null;

describe("carriedSectionIndex", () => {
  const names = ["Context", "Decision", "Result"];

  it("returns the index of an exact match", () => {
    expect(carriedSectionIndex(names, "Decision")).toBe(1);
  });
  it("ignores case and surrounding space", () => {
    expect(carriedSectionIndex(names, "  rEsUlT ")).toBe(2);
  });
  it("falls back to 0 when no name matches", () => {
    expect(carriedSectionIndex(names, "Nothing")).toBe(0);
  });
  it("gives 0 for a null carried name", () => {
    expect(carriedSectionIndex(names, null)).toBe(0);
  });
  it("gives 0 for an empty list", () => {
    expect(carriedSectionIndex([], "Decision")).toBe(0);
  });
  it("returns the first of a duplicated name", () => {
    expect(carriedSectionIndex(["A", "B", "B"], "B")).toBe(1);
  });
});

describe("readInLabel", () => {
  it("names the PR from the program account", () => {
    expect(readInLabel("program", 12)).toBe("Read in PR 12 ›");
  });
  it("gives null from the program account with no PR", () => {
    expect(readInLabel("program", null)).toBeNull();
  });
  it("names the work item from the change account and ignores pr", () => {
    expect(readInLabel("change", 12)).toBe("Read in the work item ›");
    expect(readInLabel("change", null)).toBe("Read in the work item ›");
  });
});
