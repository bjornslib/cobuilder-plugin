import { describe, expect, it } from "vitest";

import { splitGateState } from "./gateState";

const LONG_NOTE =
  "APPROVED 2026-10-17 (delegated: the engineer asked for the whole program design and will review it at hand-over)";

function splitsParentheticalNote() {
  expect(splitGateState(LONG_NOTE)).toEqual({ short: "APPROVED 2026-10-17", full: LONG_NOTE });
}

function splitsPlainStatusWords() {
  expect(splitGateState("pending")).toEqual({ short: "pending", full: "pending" });
  expect(splitGateState("in progress")).toEqual({ short: "in progress", full: "in progress" });
}

function splitsTrimmedText() {
  expect(splitGateState("  APPROVED 2026-10-17 (delegated)  ")).toEqual({
    short: "APPROVED 2026-10-17",
    full: "APPROVED 2026-10-17 (delegated)",
  });
}

describe("splitGateState", () => {
  it(
    "keeps the status and date short and moves a parenthetical note to full",
    splitsParentheticalNote,
  );

  it("leaves a plain status word unchanged", splitsPlainStatusWords);
});

describe("splitGateState", () => {
  it("returns the same text for both forms when no note exists", () => {
    expect(splitGateState("APPROVED 2026-10-17")).toEqual({
      short: "APPROVED 2026-10-17",
      full: "APPROVED 2026-10-17",
    });
  });

  it("returns empty text for empty input", () => {
    expect(splitGateState("")).toEqual({ short: "", full: "" });
  });
});

describe("splitGateState", () => {
  it("cuts at a dash note and keeps the status word and date", () => {
    expect(splitGateState("APPROVED 2026-10-17 — by the engineer")).toEqual({
      short: "APPROVED 2026-10-17",
      full: "APPROVED 2026-10-17 — by the engineer",
    });
  });

  it("trims surrounding space from both forms", splitsTrimmedText);
});

describe("splitGateState", () => {
  it("keeps only the status word when a note follows it", () => {
    expect(splitGateState('n/a (no UI) — Screens: "no UI"')).toEqual({
      short: "n/a",
      full: 'n/a (no UI) — Screens: "no UI"',
    });
  });
});
