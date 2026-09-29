/**
 * The rules the day-deck drawer states on screen, run pure.
 *
 * The drawer narrates four rules the review comments fixed, and each one is
 * pure beside the data layer's readers, so a slice loop can run them against
 * rows shaped like the real bundle and the drawer cannot disagree with its
 * own tests:
 *
 *   - `filterForTyping` — typing resets the filter to All.
 *   - `matches` — the search predicate over the words a row carries.
 *   - `soleOf` — a result set of exactly one reads itself.
 *   - `chipStepped` — the arrows step the filter strip, stopping at the ends.
 *
 * The rows below are shaped like the real bundle's rows: a design with an
 * id, a name, a stage, an outcome, epics with ids and branches, and the
 * pull requests the data layer resolved for it. No join is resolved here;
 * the C1 criterion forbids that outside `src/data`, and these rules read
 * none.
 */

import { describe, expect, it } from "vitest";

import type { DesignRow } from "@/data/types";

import {
  FILTER_ALL,
  chipStepped,
  filterForTyping,
  laneRows,
  matches,
  soleOf,
} from "./deck";
import { LANES } from "./deck";

const row = (id: string, stage: string, outcome = "", pullRequests: number[] = []): DesignRow => ({
  design: { id, name: id, outcome, stage },
  epics: [],
  slices: [],
  done: 0,
  pullRequests,
});

const DECK: DesignRow[] = [
  row("gate-doc-surfacing", "decided", "Gate documents are readable from the viewer's Builds view."),
  row("interaction-design-gate", "decided", "A session writes an interaction design before implementation starts."),
  row("gate-state-resolution", "approved", "A gate line reads as approved, as not applicable, or as open."),
  row("cobuilder-viewer", "review", "A reader opens the bundle on three goal-shaped surfaces."),
  row("book-index-tiering", "review", "book-index.md offers nano, mini, and full tiers, judgment-gated."),
  row("plugin-split", "implemented", "A user installs one stage without the other three.", [11]),
];

describe("filterForTyping", () => {
  it("resets any filter choice to All the moment the search has a needle", () => {
    expect(filterForTyping()).toBe(FILTER_ALL);
  });
});

describe("matches", () => {
  const needle = (s: string) => DECK.filter((r) => matches(r, s));

  it("refines by name and id", () => {
    expect(needle("plugin-split").map((r) => r.design.id)).toEqual(["plugin-split"]);
  });

  it("refines by a word of the outcome", () => {
    expect(needle("goal-shaped")).toEqual([DECK[3]]);
  });

  it("refines by stage", () => {
    expect(needle("implemented").map((r) => r.design.id)).toEqual(["plugin-split"]);
  });

  it("refines by a pull request number the row carries, in the three shapes a reader types", () => {
    expect(needle("11")).toEqual([DECK[5]]);
    expect(needle("#11")).toEqual([DECK[5]]);
    expect(needle("PR 11")).toEqual([DECK[5]]);
  });

  it("keeps everything under an empty needle", () => {
    expect(needle("")).toEqual(DECK);
  });

  it("keeps nothing under a needle no row carries", () => {
    expect(needle("xyzzy")).toEqual([]);
  });
});

describe("soleOf", () => {
  it("reads itself when the result set is exactly one", () => {
    expect(soleOf(DECK.filter((r) => r.design.id === "plugin-split"))).toBe(DECK[5]);
  });

  it("earns no selection from many or none", () => {
    expect(soleOf(DECK)).toBeNull();
    expect(soleOf([])).toBeNull();
  });
});

describe("chipStepped", () => {
  const CHIPS = [FILTER_ALL, ...LANES.map((lane) => lane.key)];

  it("steps forward through the lanes' vocabulary", () => {
    expect(chipStepped(FILTER_ALL, 1, CHIPS)).toBe(CHIPS[1]);
  });

  it("steps backward, and stops at both ends", () => {
    expect(chipStepped(FILTER_ALL, -1, CHIPS)).toBe(FILTER_ALL);
    expect(chipStepped(CHIPS[CHIPS.length - 1], 1, CHIPS)).toBe(CHIPS[CHIPS.length - 1]);
  });

  it("resolves a stale choice instead of dead-ending", () => {
    expect(chipStepped("no-such-chip", 1, CHIPS)).toBe(CHIPS[0]);
  });
});

describe("laneRows", () => {
  it("keeps one lane's rows under the search, in lane order", () => {
    const review = LANES.find((lane) => lane.key === "review")!;
    expect(laneRows(review, DECK, "gate").map((r) => r.design.id)).toEqual([
      "book-index-tiering",
    ]);
    const decision = LANES.find((lane) => lane.key === "decision")!;
    expect(laneRows(decision, DECK, "gate").map((r) => r.design.id)).toEqual([
      "gate-doc-surfacing",
      "interaction-design-gate",
    ]);
  });
});