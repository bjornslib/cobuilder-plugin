/**
 * Where the Intent level's drawing sits, and which drawing level each level draws.
 *
 * THE CONTAINER DRAWING SITS INSIDE THE WHY PANEL. It used to be a section of its own on
 * this level, beside the four parts of the contract. The engineer asked for it inside
 * Why, so the Why panel holds the outcome and the drawing, and this level renders no
 * section named Diagrams.
 *
 * LEVEL 1 IS THE CONTAINER DRAWING AND IT BELONGS TO THIS LEVEL. It names the surfaces
 * and the people who use them, which answers what the work is and who it is for. The
 * levels after it are mechanism, and they belong to the Architecture level, which keeps
 * its own Diagrams section for them.
 *
 * A DRAWING THE DESIGN NEVER AUTHORED IS NOT AN ABSENCE. A record with no drawing level
 * gives the Why panel its prose and nothing else. It does not state a gap the reader did
 * not ask about.
 *
 * THIS FILE IS BESIDE `App.test.tsx` BECAUSE OF ITS RECORDS, NOT BECAUSE OF ITS ROUTE.
 * `App.test.tsx` fixes the surfaces the boot picks, and its fixture holds two designs
 * because the board's own case fixes the row set. The cases below need three record
 * shapes, and `loadDesigns` caches its answer for the whole file, so a record one case
 * swaps in would never be read. The three shapes therefore live in this file's own
 * fixture, one design each.
 *
 * jsdom implements neither `matchMedia` nor `ResizeObserver`. The shell asks both
 * questions on its first render: `useCollapsedRail` reads a media query and a diagram
 * tile observes its box. The stubs answer the query false and observe nothing.
 */

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { DesignRecords } from "@/data/bundle";
import type { RecordIndex } from "@/data/types";

import Shell from "./App";

/* ------------------------------------------------------------------- jsdom */

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;

  class StubResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  window.ResizeObserver = StubResizeObserver as unknown as typeof window.ResizeObserver;

  Element.prototype.scrollTo = () => undefined;
});

/* ---------------------------------------------------------------- fixtures */

/**
 * The three designs the cases read, one record shape each.
 *
 * `whole-work` carries the three levels the corpus writes. `mechanisms-only` carries the
 * two mechanism levels and no container drawing. `no-drawings` carries no diagram level
 * at all, which is the shape a design that stopped at stage 1 has.
 */
const DESIGNS: DesignRecords = {
  "whole-work": {
    goal: {
      name: "whole-work",
      title: "A work with every drawing",
      created: "2026-09-22",
      outcome: "A reader meets the container drawing inside the Why panel.",
      done_when: ["The Why panel holds level 1."],
      min_work: { challenge_stage_run: true },
      stage: "approved",
      supersedes: null,
      adr: null,
      adrs: [],
    },
    diagrams: {
      "1": "%% the container drawing\nC4Container\n    title whole-work\n",
      "2": "sequenceDiagram\n  A->>B: go\n",
      "3": "classDiagram\n  class A\n",
    },
  },
  "mechanisms-only": {
    goal: {
      name: "mechanisms-only",
      title: "A work with its mechanism drawings alone",
      created: "2026-09-22",
      outcome: "A reader meets no container drawing inside the Why panel.",
      done_when: ["The Why panel holds no drawing."],
      min_work: { challenge_stage_run: true },
      stage: "approved",
      supersedes: null,
      adr: null,
      adrs: [],
    },
    diagrams: {
      "2": "sequenceDiagram\n  A->>B: go\n",
      "3": "classDiagram\n  class A\n",
    },
  },
  "no-drawings": {
    goal: {
      name: "no-drawings",
      title: "A work with no drawing level",
      created: "2026-09-22",
      outcome: "A reader meets no drawing section at all.",
      done_when: ["The Why panel states no absence."],
      min_work: { challenge_stage_run: false },
      stage: "backlog",
      supersedes: null,
      adr: null,
      adrs: [],
    },
  },
} satisfies DesignRecords;

const INDEX: RecordIndex = {
  schema_version: "1.3",
  sources: { git_head: "0123456789abcdef", trees: {} },
  entities: {
    design: [
      {
        id: "whole-work",
        name: "whole-work",
        outcome: "A work with every drawing.",
        stage: "approved",
      },
      {
        id: "mechanisms-only",
        name: "mechanisms-only",
        outcome: "A work with its mechanism drawings alone.",
        stage: "approved",
      },
      {
        id: "no-drawings",
        name: "no-drawings",
        outcome: "A work with no drawing level.",
        stage: "backlog",
      },
    ],
    epic: [],
    slice: [],
    adr: [],
    context: [],
    district: [],
    boundary_rule: [],
    pull_request: [],
    publication: [],
    program_design: [],
    epic_design: [],
    interaction_design: [],
  },
  joins: {
    adr_to_pull_request: {},
    epic_to_pull_request: {},
    epic_status: {},
    slice_to_epic: {},
    slice_to_epic_unresolved: {},
    context_verifies_district: {},
    district_uncovered: [],
    adr_to_context: {},
    adr_to_district: {},
    feature_gates: {},
  },
};

beforeEach(() => {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  /*
   * The decision global needs one entry, because `./records` reads the first value's
   * `title` to tell a file that assigned nothing from one that assigned a map. No case
   * here opens a decision record.
   */
  (window as unknown as Record<string, unknown>).ADRS = {
    "ADR-0028": { id: "ADR-0028", title: "One section on screen", state: "accepted" },
  };
});

afterEach(cleanup);

/* ------------------------------------------------------------------- helpers */

/** One level of one work item, settled before a case reads it. */
async function atLevel(workId: string, section: "intent" | "architecture"): Promise<void> {
  window.location.hash = `#/${workId}/${section}`;
  render(<Shell />);
  const title = section === "intent" ? "Intent" : "Architecture";
  await waitFor(() => {
    expect((document.getElementById("work-section-heading")?.textContent ?? "").trim()).toBe(
      title,
    );
  });
}

/** One panel of the level on screen, by the accessible name that panel carries. */
function panelNamed(title: string): HTMLElement {
  return screen.getByRole("region", { name: title });
}

/**
 * The text of every panel the level on screen renders, and of nothing else.
 *
 * A panel is a named `section`, so a region query collects the level's own panels. The
 * rail is a `navigation` and stays out, which matters here: a disabled level row states
 * its absent records in the rail's own words, and one of those words is a drawing level.
 */
function panelText(): string {
  return screen
    .getAllByRole("region")
    .map((panel) => panel.textContent ?? "")
    .join("\n");
}

/** The drawing tiles inside one panel, as the whole accessible name of each. */
function drawnNamesIn(panel: HTMLElement): string[] {
  return within(panel)
    .queryAllByRole("button", { name: /drawing for level \d+/ })
    .map((tile) => tile.getAttribute("aria-label") ?? "");
}

/** The same names, as the level each tile says it draws. */
function levelsIn(names: string[]): string[] {
  return names.map((name) => name.replace(/^.*for level /, ""));
}

/** The level numbers every drawing tile of the level on screen carries, in DOM order. */
function drawnLevels(): string[] {
  return levelsIn(
    screen
      .queryAllByRole("button", { name: /drawing for level \d+/ })
      .map((tile) => tile.getAttribute("aria-label") ?? ""),
  );
}

/* --------------------------------------------------------------------- tests */

describe("The Intent level's drawing", () => {
  it("holds the container drawing inside the Why panel", async () => {
    await atLevel("whole-work", "intent");

    expect(drawnNamesIn(panelNamed("Why"))).toEqual([
      "Open the Container drawing for level 1",
    ]);
  });

  it("renders no Diagrams section of its own", async () => {
    await atLevel("whole-work", "intent");

    expect(screen.queryByRole("region", { name: "Diagrams" })).toBeNull();
  });

  it("draws no mechanism level, even when the record carries one", async () => {
    await atLevel("whole-work", "intent");

    /* The record carries levels 1, 2, and 3. The level draws the first one and stops. */
    expect(drawnLevels()).toEqual(["1"]);
  });

  it("draws nothing when the record carries mechanism levels alone", async () => {
    await atLevel("mechanisms-only", "intent");

    /*
      The drawing is selected by the level number, and this record carries no level 1.
      Levels 2 and 3 are not this level's, so the Why panel draws nothing and the level
      draws nothing.
    */
    expect(drawnNamesIn(panelNamed("Why"))).toEqual([]);
    expect(drawnLevels()).toEqual([]);
  });

  it("renders the Why prose with no tile and no absence line when no drawing exists", async () => {
    await atLevel("no-drawings", "intent");

    const why = panelNamed("Why");
    /* The panel keeps its prose, so the record is read and only the drawing is missing. */
    expect(within(why).getByText("A reader meets no drawing section at all.")).toBeTruthy();
    expect(drawnNamesIn(why)).toEqual([]);
    /* No panel of this level states the drawing's absence, and none marks one. */
    expect(panelText()).not.toMatch(/no diagram level/i);
    expect(within(why).queryByText(/not present/i)).toBeNull();
  });
});

describe("The Architecture level's drawing", () => {
  it("draws levels 2 and 3 in its own Diagrams section, and not level 1", async () => {
    await atLevel("whole-work", "architecture");

    /*
      Level 1 is the container drawing and belongs to the Intent level. Levels 2 and 3
      are mechanism and belong here, so the container drawing stops at the level below.
    */
    expect(levelsIn(drawnNamesIn(panelNamed("Diagrams")))).toEqual(["2", "3"]);
    expect(drawnLevels()).toEqual(["2", "3"]);
  });
});
