/**
 * The gate state split, on its own.
 *
 * `splitGateState` reads one gate state and returns the short pill text and the full
 * tooltip text. The short text keeps the status word and the date. A note in
 * parentheses or after a dash moves to the full text only.
 */

import { describe, expect, it } from "vitest";

import { splitGateState } from "./gateState";

describe("splitGateState", () => {
  it("keeps the status and date short and moves a parenthetical note to full", () => {
    const text =
      "APPROVED 2026-10-17 (delegated: the engineer asked for the whole program design and will review it at hand-over)";

    expect(splitGateState(text)).toEqual({
      short: "APPROVED 2026-10-17",
      full: text,
    });
  });

  it("returns the same text for both forms when no note exists", () => {
    expect(splitGateState("APPROVED 2026-10-17")).toEqual({
      short: "APPROVED 2026-10-17",
      full: "APPROVED 2026-10-17",
    });
  });

  it("cuts at a dash note and keeps the status word and date", () => {
    expect(splitGateState("APPROVED 2026-10-17 — by the engineer")).toEqual({
      short: "APPROVED 2026-10-17",
      full: "APPROVED 2026-10-17 — by the engineer",
    });
  });

  it("keeps only the status word when a note follows it", () => {
    expect(splitGateState('n/a (no UI) — Screens: "no UI"')).toEqual({
      short: "n/a",
      full: 'n/a (no UI) — Screens: "no UI"',
    });
  });

  it("leaves a plain status word unchanged", () => {
    expect(splitGateState("pending")).toEqual({ short: "pending", full: "pending" });
    expect(splitGateState("in progress")).toEqual({
      short: "in progress",
      full: "in progress",
    });
  });

  it("returns empty text for empty input", () => {
    expect(splitGateState("")).toEqual({ short: "", full: "" });
  });

  it("trims surrounding space from both forms", () => {
    expect(splitGateState("  APPROVED 2026-10-17 (delegated)  ")).toEqual({
      short: "APPROVED 2026-10-17",
      full: "APPROVED 2026-10-17 (delegated)",
    });
  });
});
