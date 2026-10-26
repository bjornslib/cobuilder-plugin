/**
 * The Work drawer's rules, run pure.
 *
 * ADR-0034 states four facts the drawer answers on screen — the search owns
 * the result set, a sole result reads itself, the arrows step the strip, and
 * the lanes' vocabulary holds the rows the walk steps through — and the
 * exclusion rule holds the decisions and unmerged pull requests out. Each one
 * is pure beside the data layer's readers, so the drawer cannot disagree with
 * its own tests.
 *
 * The rows here are shaped like the real bundle's rows: a design with an id,
 * a name, a stage, an outcome, epics with ids and branches, and the pull
 * requests the data layer resolved for it. No join is resolved here; C1
 * forbids that outside `src/data`, and these rules read none.
 */

import { describe, expect, it } from "vitest";

import { DECK, idsOf, laneNamed } from "./testSupport/workDeck/fixtures";
import {
  FILTER_ALL,
  LANES,
  chipStepped,
  filterChipsOf,
  filterForTyping,
  highlight,
  laneRows,
  matches,
  soleOf,
  walkedRows,
} from "./workDeck";

const needle = (s: string) => DECK.filter((r) => matches(r, s));
const CHIPS = filterChipsOf(LANES);
const LAST_CHIP = CHIPS[CHIPS.length - 1];

function refinesByPullRequestNumber() {
  expect(needle("11")).toEqual([DECK[5]]);
  expect(needle("#11")).toEqual([DECK[5]]);
  expect(needle("PR 11")).toEqual([DECK[5]]);
}

function keepsOneLanesRows() {
  expect(idsOf(laneRows(laneNamed("review"), DECK, "gate"))).toEqual(["book-index-tiering"]);
  expect(idsOf(laneRows(laneNamed("decision"), DECK, "gate"))).toEqual([
    "gate-doc-surfacing",
    "interaction-design-gate",
  ]);
}

function walksVisibleLanes() {
  const lanes = LANES.filter((lane) => lane.key === "build" || lane.key === "shipped");
  expect(idsOf(walkedRows(lanes, DECK, ""))).toEqual(["gate-state-resolution", "plugin-split"]);
}

function marksTheHit() {
  expect(highlight("plugin-split", "split")).toEqual({
    before: "plugin-",
    hit: "split",
    after: "",
  });
}

describe("filterForTyping", () => {
  it("resets any filter choice to All the moment the search has a needle", () => {
    expect(filterForTyping()).toBe(FILTER_ALL);
  });
});

describe("matches", () => {
  it("refines by name and id", () => expect(idsOf(needle("plugin-split"))).toEqual(["plugin-split"]));
  it("refines by a word of the outcome", () => expect(needle("goal-shaped")).toEqual([DECK[3]]));
  it("refines by stage", () => expect(idsOf(needle("implemented"))).toEqual(["plugin-split"]));
  it(
    "refines by a pull request number the row carries, in the three shapes a reader types",
    refinesByPullRequestNumber,
  );
  it("keeps everything under an empty needle", () => expect(needle("")).toEqual(DECK));
  it("resolves a needle no row carries to nothing", () => expect(needle("xyzzy")).toEqual([]));
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
  it("steps forward through the full vocabulary, All through the lanes", () => {
    expect(CHIPS[0]).toBe(FILTER_ALL);
    expect(chipStepped(FILTER_ALL, 1, CHIPS)).toBe(CHIPS[1]);
  });
});

describe("chipStepped", () => {
  it("steps backward, and stops at both ends", () => {
    expect(chipStepped(FILTER_ALL, -1, CHIPS)).toBe(FILTER_ALL);
    expect(chipStepped(LAST_CHIP, 1, CHIPS)).toBe(LAST_CHIP);
  });

  it("resolves a stale choice instead of dead-ending", () => {
    expect(chipStepped("no-such-chip", 1, CHIPS)).toBe(CHIPS[0]);
  });
});

describe("laneRows and walkedRows", () => {
  it("keeps one lane's rows under the search, in lane order", keepsOneLanesRows);
  it("walks the visible lanes once, then the search, in lane order", walksVisibleLanes);
});

describe("highlight", () => {
  it("marks the hit, the only way the search is visible", marksTheHit);

  it("carries no mark for an empty needle or a miss", () => {
    expect(highlight("plugin-split", "")).toBeNull();
    expect(highlight("plugin-split", "gate")).toBeNull();
  });
});
