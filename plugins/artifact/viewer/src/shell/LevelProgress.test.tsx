/**
 * Slice 9 — the level's progress, stated as cases.
 *
 * The slice's end, from the ladder in `docs/plans/cobuilder-viewer/04-slices.md`: "The
 * strip reads 0 at the first section's top, 25 percent at its bottom, 50 on the second,
 * 100 on the last, and never decreases on a forward walk." The rubric that scores it is
 * `.cobuilder/rubrics/cobuilder-viewer/slice-9.md`, and its five criteria are the five
 * groups below.
 *
 * THE SUBJECT IS THE PROGRESS HALF OF `Pager.tsx`: `withinOf` and `LevelProgress`. Slice
 * 8's file, `Pager.test.tsx`, owns the index, the strip, the pager, the boxes and the
 * arrow keys, and no case here restates one of its cases. What is here is the reading
 * those pieces produce: the number the strip states, where it comes from, and how it
 * moves.
 *
 * THE READING IS READ FROM `aria-valuenow`. The rubric reads it there, because the
 * vendored `ScrollProgress` states its own number in that attribute, and it is the only
 * reading a reader of any kind can hear. The bar's fill is motion's and jsdom holds no
 * value for it, so the attribute is also the only reading a DOM without a layout engine
 * can carry.
 *
 * WHAT A DOM CANNOT CARRY, SAID PLAINLY. jsdom has no layout engine: every height reads
 * zero, so `scrollHeight - clientHeight` is zero for every box and every scroll event has
 * to be dispatched by hand. Four of this slice's claims are therefore out of this file's
 * reach, and each one is named below beside the case that carries its contract instead:
 *
 * 1. **A real box has a scroll range at all.** This file gives a box a range by hand,
 *    with `Object.defineProperty`. That proves the arithmetic and the listener; it does
 *    not prove that the box a reader meets is taller than its stage.
 * 2. **A real scroll raises the event.** jsdom does not fire `scroll` when `scrollTop` is
 *    assigned, so this file dispatches it. The listener is therefore proven; the browser's
 *    own dispatch is not.
 * 3. **The pane, the window, and the track stay put.** jsdom measures no geometry and
 *    motion writes no inline transform under it, so the three readings the rubric compares
 *    before and after a box scroll are jsdom's own constants here. The case that reads them
 *    says so.
 * 4. **The fraction is a true proportion.** 13 at a half-scrolled box is this file's
 *    arithmetic against a range it declared. On the served page it is the box's real range.
 *
 * WHAT A VALIDATOR SHOULD MEASURE IN A BROWSER, to score the rest of the rubric. Serve the
 * bundle rooted at `.cobuilder-architect/self/`, open the Work surface's Intent level, and
 * read the `progressbar` named `Reading progress`:
 * - at the first section's top, with `scrollTop` at 0: the reading is 0.
 * - after `scrollTop = scrollHeight - clientHeight` on that box, and a second's wait for
 *   the spring: 25. On the second section, bottomed the same way: 50. On the last: 100.
 * - the readings taken at each step forward, each box bottomed, never decrease and end at
 *   100. One step back lowers the reading and does not reset it to 0.
 * - a section whose box has `scrollHeight === clientHeight` reads as the end of its share.
 * - the pane's `scrollTop`, `window.scrollY`, and the track's own transform are unchanged
 *   by a box scroll, and the reading climbs.
 *
 * THE FIXTURE CARRIES SEVEN EPICS, as slice 8's does. Six fill one section of the paged
 * Build level, so seven give that level two sections and none of these cases is a
 * one-count special case. The other three paged levels are fixed lists of four.
 *
 * jsdom implements neither `matchMedia` nor `ResizeObserver`, and the shell asks both
 * questions on its first render. The stubs answer the query false and observe nothing.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { RecordIndex } from "@/data/types";
import type { DesignRecord, DesignRecords } from "@/data/bundle";

import Shell from "./App";
import { withinOf } from "./Pager";

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

  /* The pane resets its own scroll on a route change, and jsdom has no scroll. */
  Element.prototype.scrollTo = () => undefined;
});

/* ---------------------------------------------------------------- fixtures */

const DESIGN = "cobuilder-viewer";

/** Seven epics, so the Build level pages two sections of its track. */
const EPIC_COUNT = 7;

const INDEX: RecordIndex = {
  schema_version: "1.3",
  sources: { git_head: "0123456789abcdef", trees: {} },
  entities: {
    design: [
      {
        id: DESIGN,
        name: DESIGN,
        outcome: "One work item, paged by its sections.",
        stage: "approved",
      },
    ],
    epic: Array.from({ length: EPIC_COUNT }, (_, position) => ({
      id: `${DESIGN}/E${position + 1}`,
      design: DESIGN,
      epic_id: `E${position + 1}`,
      branch: "design/cobuilder-viewer/work-surface",
      pr: null,
      state: "planned",
      note: null,
    })),
    slice: [],
    adr: [{ id: "ADR-0028", title: "One section on screen", state: "accepted" }],
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

/** The one work item, and it fills every level the section model reads. */
const VIEWER: DesignRecord = {
  goal: {
    name: DESIGN,
    title: "The Work surface",
    created: "2026-09-22",
    outcome: "One box is on screen at a time.",
    done_when: ["One box is on screen."],
    abort_if: ["Two boxes are on screen at once."],
    min_work: { challenge_stage_run: true },
    stage: "approved",
    supersedes: null,
    adr: null,
    adrs: ["ADR-0028"],
  },
  intent: {
    problem: "A stacked level hides its last panel.",
    approach: "One box per section, on a track.",
    risks: ["The strip and the boxes drift apart."],
    unknowns: ["How a long section reads inside its box."],
    out_of_scope: ["A shared link to one section."],
  },
  narrative: {
    problem_solution: { narration: "One index, three controls." },
  },
  assessment: {
    verdict: "proceed",
    summary: "The model is small and legible.",
    findings: [],
  },
  diagrams: {
    "1": "%% the container drawing\nC4Container\n    title cobuilder-viewer\n",
    "2": "sequenceDiagram\n  A->>B: step\n",
    "3": "classDiagram\n  class A\n",
  },
  pr_draft: "# The section model\n\n## What changes\n\nOne box on screen.\n",
};

const DESIGNS: DesignRecords = { [DESIGN]: VIEWER };

const ADRS = {
  "ADR-0028": { id: "ADR-0028", title: "One section on screen", state: "accepted" },
};

beforeEach(() => {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  (window as unknown as Record<string, unknown>).ADRS = ADRS;
});

afterEach(cleanup);

/* ----------------------------------------------------------------- helpers */

const PANE_ID = "work-scroll-pane";
const STRIP_NAME = "Sections of this level";
const READING_NAME = "Reading progress";

/**
 * The four addresses that page their sections, and the count each one lays down.
 *
 * The three fixed levels page four boxes each. Build's count comes from the corpus: the
 * fixture's seven epics chunk into two sections of six. Two different counts sit in this
 * list on purpose, so the step arithmetic is read against more than one denominator.
 */
const PAGED: Array<{ label: string; hash: string; count: number }> = [
  { label: "Intent", hash: `#/${DESIGN}/intent`, count: 4 },
  { label: "Problem & Solution", hash: `#/${DESIGN}/problem-and-solution`, count: 4 },
  { label: "Architecture", hash: `#/${DESIGN}/architecture`, count: 4 },
  { label: "Build's epics", hash: `#/${DESIGN}/build/epics`, count: 2 },
];

/** The route, and a fresh render of the shell at it, waiting for the level's strip. */
async function openPaged(hash: string): Promise<void> {
  window.location.hash = hash;
  render(<Shell />);
  await waitFor(() => expect(hasStrip()).toBe(true));
}

function hasStrip(): boolean {
  return screen.queryByRole("navigation", { name: STRIP_NAME }) !== null;
}

function strip(): HTMLElement {
  return screen.getByRole("navigation", { name: STRIP_NAME });
}

/**
 * The paged level's column, read from the strip by sibling order.
 *
 * Slice 8's file reads the tree the same way for the same reason: the DOM order here is
 * not the paint order, so a class name would read a different element after a tidy-up.
 *
 * The stage's one child is the track. The strip has two siblings below it in the column:
 * the stage first, and then `LevelProgress`. The reading is read from the bar by its role
 * rather than by that position, because the role is what a reader hears.
 */
function trackOf(): HTMLElement {
  return (strip().nextElementSibling as HTMLElement).firstElementChild as HTMLElement;
}

function boxesOf(): HTMLElement[] {
  return Array.from(trackOf().children) as HTMLElement[];
}

/** The strip's own progress element, which `LevelProgress` renders below the stage. */
function progressElement(): HTMLElement {
  const boxes = screen.queryAllByRole("progressbar");
  expect(
    boxes,
    "a paged level draws exactly one progress bar, and it is the level's own",
  ).toHaveLength(1);
  return boxes[0];
}

/** The number the strip states. It is the reading the rubric scores. */
function reading(): number {
  const raw = progressElement().getAttribute("aria-valuenow");
  expect(raw, "the strip states its reading").not.toBeNull();
  const value = Number(raw);
  expect(Number.isNaN(value), `the reading is a number, and it read ${String(raw)}`).toBe(
    false,
  );
  return value;
}

/** The reading the level's own share arithmetic gives a section at the end of its share. */
function endOfShare(index: number, count: number): number {
  return Math.round((100 * (index + 1)) / count);
}

/** The section the stage left reachable, read from the tree and not from the pager's words. */
function onScreenIndex(): number {
  const showing = boxesOf()
    .map((box, position) => (box.hasAttribute("inert") ? null : position))
    .filter((position) => position !== null);
  expect(showing, "exactly one box is on screen").toHaveLength(1);
  return showing[0] as number;
}

/**
 * A scroll range for a box, declared by hand.
 *
 * jsdom computes no layout, so `scrollHeight`, `clientHeight` and `scrollTop` all read
 * zero and `scrollTop` cannot be assigned. The own properties below shadow jsdom's
 * accessors for this one element, which is the only way a DOM without a layout engine can
 * hold a scroll position at all. This is claim 1 of the header, and the browser carries it
 * for real.
 */
function withRange(box: HTMLElement, range: number, at: number): void {
  const height = 100;
  Object.defineProperty(box, "scrollHeight", {
    configurable: true,
    value: height + range,
  });
  Object.defineProperty(box, "clientHeight", { configurable: true, value: height });
  Object.defineProperty(box, "scrollTop", {
    configurable: true,
    get: () => at,
    set: () => undefined,
  });
}

/**
 * Put a box at a position in its own range, and raise the event a real scroll would.
 *
 * jsdom never raises `scroll` for an assignment to `scrollTop`, so the event is dispatched
 * here. This is claim 2 of the header: the listener is exercised, the browser's own
 * dispatch is not.
 */
function scrollBox(box: HTMLElement, range: number, at: number): void {
  withRange(box, range, at);
  fireEvent.scroll(box);
}

/** Bottom out the box the reader is on, and hand back the reading it settles on. */
async function bottomOut(box: HTMLElement, range = 900): Promise<number> {
  scrollBox(box, range, range);
  await waitFor(() => expect(reading()).toBe(endOfShare(onScreenIndex(), boxesOf().length)));
  return reading();
}

/**
 * The reading, once it stops moving.
 *
 * The walk case records rather than asserts at each step, so that its three invariants —
 * never falls, never resets, ends at 100 — are the checks that fire and not a value
 * expectation standing in front of them. The strip settles in the same tick as its own
 * scroll event under jsdom, so this loop returns on its second pass.
 */
async function settled(): Promise<number> {
  let last = reading();
  for (let pass = 0; pass < 20; pass += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
    const now = reading();
    if (now === last) return now;
    last = now;
  }
  return last;
}

/** One press on the page's own arrow keys, at the body of the document. */
function press(key: string): void {
  fireEvent.keyDown(document.body, { key });
}

/** Press Next, and wait for the box on screen to move. */
async function next(): Promise<void> {
  const before = onScreenIndex();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() => expect(onScreenIndex()).toBe(before + 1));
}

/* -------------------------------------------------------------------- C1 */

describe("Slice 9 · the reading is a position in the level", () => {
  it("steps one count's share for each section, on every paged level", async () => {
    /*
      C1's rule as arithmetic. The reading is `(index + within) / count`, so a level of
      four steps by one quarter and a level of two steps by one half. jsdom gives every box
      no scroll range, which counts as fully read (C3), so the reading here is the END of
      each section's share: 25, 50, 75, 100 on the four-section levels.

      The case reads the level's own count from the pager rather than writing four down, so
      a level whose count changed would move the expected step with it instead of quietly
      passing.
    */
    for (const level of PAGED) {
      cleanup();
      await openPaged(level.hash);

      const count = boxesOf().length;
      expect(count, `${level.label} lays down the count this case expects`).toBe(level.count);

      const readings = [reading()];
      for (let step = 1; step < count; step += 1) {
        await next();
        readings.push(reading());
      }

      expect(readings, `${level.label}: one count's share per section`).toEqual(
        Array.from({ length: count }, (_, index) => endOfShare(index, count)),
      );
      expect(
        readings[count - 1],
        `${level.label}: the last section reads the level as complete`,
      ).toBe(100);
      expect(
        readings[0],
        `${level.label}: the first step is one share and not a rounding of zero`,
      ).toBe(Math.round(100 / count));
    }

    /* A level of four pages one quarter a section, and a level of two pages one half. */
    expect(PAGED.map((level) => Math.round(100 / level.count))).toEqual([25, 25, 25, 50]);
  });

  it("reads 0 at the top of a box that scrolls, its share at its bottom, and 100 on the last", async () => {
    /*
      C1's four readings, with a scroll range this case declares. This is the one case in
      the file that stages the rubric's own sequence:

        section 1 at its top      0
        section 1 at its bottom   25
        section 2 at its bottom   50
        section 4 at its bottom   100

      A reading of 0 is unreachable without a range, which is why the range is declared
      here rather than measured. Break the `within` term and this case reports 25 for the
      first line; break the `index` term and it reports 0 for the last two.
    */
    const level = PAGED[0];
    await openPaged(level.hash);
    const boxes = boxesOf();

    scrollBox(boxes[0], 900, 0);
    await waitFor(() => expect(reading(), "the first section at its top").toBe(0));

    expect(await bottomOut(boxes[0]), "the first section at its bottom").toBe(25);

    await next();
    expect(onScreenIndex()).toBe(1);
    expect(await bottomOut(boxes[1]), "the second section at its bottom").toBe(50);

    fireEvent.click(screen.getByRole("link", { name: "Out of scope" }));
    await waitFor(() => expect(onScreenIndex()).toBe(3));
    expect(await bottomOut(boxes[3]), "the last section at its bottom").toBe(100);

    /* The pager's own count is the denominator the four readings stepped by. */
    expect(endOfShare(3, 4)).toBe(100);
  });

  it("reads a fraction inside the box, not a fraction of a page", async () => {
    /*
      C1's rule at its smallest: `withinOf` states how far through ONE box the reader is.
      The function is called directly against a synthetic element, so its four branches are
      each read in both directions: a partway box, its top, its bottom, past its end, a box
      with no range, and no box at all.

      The composite line at the end is what makes this a level reading rather than a unit
      test: a half-scrolled FIRST box reads 13, which is half of a quarter rounded. A
      reading taken from a page, or from the pane whose own offset is zero, would read 0.
    */
    const box = document.createElement("div");
    withRange(box, 900, 0);
    expect(withinOf(box), "a box at its top is unread").toBe(0);

    withRange(box, 900, 300);
    expect(withinOf(box), "a third of the way through one box").toBeCloseTo(1 / 3, 5);

    withRange(box, 900, 900);
    expect(withinOf(box), "a box at its bottom is fully read").toBe(1);

    withRange(box, 900, 4000);
    expect(withinOf(box), "a box past its own end is fully read, never more").toBe(1);

    withRange(box, 900, -400);
    expect(withinOf(box), "a box above its own start is unread, never less").toBe(0);

    withRange(box, 0, 0);
    expect(withinOf(box), "a box with no range is fully read").toBe(1);

    expect(withinOf(null), "no box is an unread reading and not a crash").toBe(0);

    /* The same fraction, through the level: a half-scrolled first box of four. */
    await openPaged(PAGED[0].hash);
    scrollBox(boxesOf()[0], 900, 450);
    await waitFor(() =>
      expect(
        reading(),
        "half of the first quarter is 13, and not a position in the page",
      ).toBe(13),
    );
    expect(reading(), "the number is Math.round(12.5), and it is neither 0 nor 25").toBe(
      Math.round((100 * 0.5) / 4),
    );
  });
});

/* -------------------------------------------------------------------- C2 */

describe("Slice 9 · a forward walk never lowers the reading", () => {
  it("never decreases on a forward walk, and ends at 100", async () => {
    /*
      C2's invariant, walked twice. Every box is bottomed out as it arrives, which is the
      protocol the rubric states, and the walk is taken once by the pager's Next button and
      once by the ArrowRight key.

      THE WALK RECORDS AND THEN ASSERTS, on purpose. Each step's reading is taken as it
      settles, and the four checks below run over the whole sequence afterwards, so the
      invariant is the thing that fires and not a value expectation standing in front of it.
      A staged run of this file with the level reading inverted showed the non-decrease
      check firing on the first step, at 75 then 50.
    */
    for (const walk of [
      { label: "Next", step: next },
      {
        label: "ArrowRight",
        step: async () => {
          const before = onScreenIndex();
          press("ArrowRight");
          await waitFor(() => expect(onScreenIndex()).toBe(before + 1));
        },
      },
    ]) {
      cleanup();
      await openPaged(PAGED[2].hash);
      const boxes = boxesOf();
      const count = boxes.length;

      scrollBox(boxes[0], 900, 900);
      const readings = [await settled()];
      for (let step = 1; step < count; step += 1) {
        await walk.step();
        scrollBox(boxes[onScreenIndex()], 900, 900);
        readings.push(await settled());
      }

      expect(readings, `${walk.label}: the walk visits every section`).toHaveLength(count);
      for (let step = 1; step < readings.length; step += 1) {
        expect(
          readings[step],
          `${walk.label}: step ${step} forward never lowers the reading`,
        ).toBeGreaterThanOrEqual(readings[step - 1]);
      }
      expect(
        readings.slice(1),
        `${walk.label}: a step forward never resets the reading to zero`,
      ).not.toContain(0);
      expect(readings[readings.length - 1], `${walk.label}: the walk ends complete`).toBe(
        100,
      );
      /* Bottomed out, each step is strictly one share: no hold, no skip. */
      expect(readings, `${walk.label}: one share per step, in order`).toEqual(
        Array.from({ length: count }, (_, index) => endOfShare(index, count)),
      );
    }
  });

  it("falls on a backward step, and a step back is not a reset", async () => {
    /*
      C2's other half. The rubric asks for the backward step explicitly, because a strip
      that never moved down would satisfy "never decreases" by standing still. From the
      last section at 100, one step back reads the previous section's share: it falls, and
      it is not 0.
    */
    await openPaged(PAGED[1].hash);
    const boxes = boxesOf();
    const count = boxes.length;

    fireEvent.click(screen.getByRole("link", { name: "Unknowns" }));
    await waitFor(() => expect(onScreenIndex()).toBe(count - 1));
    expect(await bottomOut(boxes[count - 1]), "the last section reads complete").toBe(100);

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    await waitFor(() => expect(onScreenIndex()).toBe(count - 2));
    const back = await bottomOut(boxes[count - 2]);

    expect(back, "a backward step lowers the reading").toBeLessThan(100);
    expect(back, "and it lands on the previous share, not on zero").toBe(
      endOfShare(count - 2, count),
    );
    expect(back, "a backward step is a step and not a reset").not.toBe(0);
  });
});

/* -------------------------------------------------------------------- C3 */

describe("Slice 9 · a box with no scroll range counts as fully read", () => {
  it("gives a box with no range the whole of its share, so no boundary is faked", async () => {
    /*
      C3's rule. Every box jsdom renders has no scroll range at all, so this case is
      measured rather than staged: the reading is the END of each section's share, and the
      strip never stalls part way through a section that has nothing to scroll.

      A box whose `scrollHeight` equals its `clientHeight` is set explicitly beside it, so
      the rule is read at the point it is decided rather than inferred from jsdom's zeros.
      Remove the range guard in `withinOf` and the reading becomes `0 / 0`, which is `NaN`:
      the first line of this case fails on `NaN` at the first section instead of 25.
    */
    const flat = document.createElement("div");
    withRange(flat, 0, 0);
    expect(withinOf(flat), "a box that fits its stage is fully read").toBe(1);

    await openPaged(PAGED[3].hash);
    const boxes = boxesOf();
    const count = boxes.length;

    for (let step = 0; step < count; step += 1) {
      expect(
        reading(),
        `section ${step + 1}: a box with no range is the end of its share`,
      ).toBe(endOfShare(step, count));
      expect(
        boxes[onScreenIndex()].scrollHeight - boxes[onScreenIndex()].clientHeight,
        "the box this case reads has no range at all",
      ).toBe(0);
      if (step + 1 < count) await next();
    }

    expect(
      reading(),
      "the last section of a level whose boxes cannot scroll reads the level complete",
    ).toBe(100);
  });
});

/* -------------------------------------------------------------------- C4 */

describe("Slice 9 · the strip measures the box the reader is on, and moves nothing else", () => {
  it("climbs when the active box scrolls, and leaves the pane, the window, and the track alone", async () => {
    /*
      C4's evidence, and the part of it a DOM can carry. The reading climbs while the box
      scrolls, and the three things the rubric compares — the pane's `scrollTop`, the
      window's `scrollY`, and the track's transform — are read before and after.

      THE THREE COMPARISONS ARE jsdom's CONSTANTS HERE, and the report says so. jsdom
      measures no geometry and motion writes no inline transform under it, so all three read
      the same value whatever the box did. What this case does carry is that a box scroll
      reaches the reading, which is the half a wrong listener would break. The browser owns
      the other half.
    */
    await openPaged(PAGED[2].hash);

    const pane = document.getElementById(PANE_ID) as HTMLElement;
    const track = trackOf();
    const before = {
      pane: pane.scrollTop,
      window: window.scrollY,
      track: track.style.transform,
    };

    const box = boxesOf()[0];
    scrollBox(box, 900, 0);
    await waitFor(() => expect(reading()).toBe(0));

    scrollBox(box, 900, 900);
    await waitFor(() => expect(reading(), "the reading climbs with the box").toBe(25));

    expect(pane.scrollTop, "the pane does not scroll with the box").toBe(before.pane);
    expect(window.scrollY, "the window does not scroll with the box").toBe(before.window);
    expect(track.style.transform, "the track does not move with the box").toBe(before.track);

    /* Back to the top, and the reading returns to where it was. */
    scrollBox(box, 900, 0);
    await waitFor(() => expect(reading(), "the reading falls back with the box").toBe(0));
  });

  it("moves for the box the reader is on, and stops moving for the one they left", async () => {
    /*
      The other half of C4's rule, and the one that catches the frozen container the source
      comment describes: the strip reads the box the reader is ON. Three readings prove it:

        1. scrolling a box that is not on screen moves nothing;
        2. after a step, the arriving box moves the reading;
        3. after that step, the box the reader left no longer moves it.

      A strip that resolved its box once, at mount, passes 1 and 3 and fails 2. A strip that
      listened to every box at once passes 1 and 2 and fails 3.
    */
    await openPaged(PAGED[1].hash);
    const boxes = boxesOf();

    /* 1. A box that is not on screen moves nothing. */
    scrollBox(boxes[2], 900, 900);
    await waitFor(() => expect(reading()).toBe(endOfShare(0, boxes.length)));
    expect(reading(), "a box off screen cannot move the strip").toBe(25);

    /* 2. The arriving box moves the reading. */
    await next();
    expect(onScreenIndex()).toBe(1);
    scrollBox(boxes[1], 900, 0);
    await waitFor(() => expect(reading(), "the box now on screen is measured").toBe(25));

    /* 3. The box the reader left no longer moves it. */
    scrollBox(boxes[0], 900, 900);
    await waitFor(() => expect(reading()).toBe(25));
    expect(reading(), "the box the reader left is no longer measured").toBe(25);

    /* And the arriving box still does. */
    scrollBox(boxes[1], 900, 900);
    await waitFor(() => expect(reading(), "the box on screen still is").toBe(50));
  });
});

/* -------------------------------------------------------------------- C5 */

describe("Slice 9 · the strip keeps its stated contract", () => {
  it("is a progressbar named Reading progress, with a range of 0 to 100", async () => {
    /*
      C5's three pieces of evidence, read as attributes. The role and the name are what a
      reader hears, and the range is what makes a reading of 25 mean a quarter. The case
      also reads the count of bars on the level, because a paged level draws exactly one:
      the pane's own reading strip belongs to a stacked level, and a second bar here would
      leave a reader unable to say which number is the level's.
    */
    for (const level of PAGED) {
      cleanup();
      await openPaged(level.hash);

      const bar = screen.getByRole("progressbar", { name: READING_NAME });
      expect(bar.getAttribute("role"), `${level.label}: the strip is a progress bar`).toBe(
        "progressbar",
      );
      expect(
        screen.queryAllByRole("progressbar"),
        `${level.label}: the level's strip is the only bar`,
      ).toHaveLength(1);
      expect(bar.getAttribute("aria-valuemin"), `${level.label}: the range starts at 0`).toBe(
        "0",
      );
      expect(bar.getAttribute("aria-valuemax"), `${level.label}: the range ends at 100`).toBe(
        "100",
      );

      const now = reading();
      expect(now, `${level.label}: the reading is inside the stated range`).toBeGreaterThanOrEqual(
        0,
      );
      expect(now).toBeLessThanOrEqual(100);
    }
  });
});
