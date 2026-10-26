/**
 * Slice 9: the level's progress, stated as cases.
 *
 * The slice's end, from the ladder in `docs/plans/cobuilder-viewer/04-slices.md`: "The
 * strip reads 0 at the first section's top, 25 percent at its bottom, 50 on the second,
 * 100 on the last, and never decreases on a forward walk." The rubric that scores it is
 * `.cobuilder/rubrics/cobuilder-viewer/slice-9.md`, and its five criteria are the five
 * groups below.
 *
 * The subject is the progress half of `Pager.tsx`: `withinOf` and `LevelProgress`.
 * `Pager.test.tsx` owns the index, the strip, the pager, the boxes and the arrow keys, so no
 * case here restates one of its cases.
 *
 * The reading is read from `aria-valuenow`. The vendored `ScrollProgress` states its number
 * there, and it is the only reading a reader of any kind can hear. The bar's fill is
 * motion's and jsdom holds no value for it.
 *
 * What a DOM cannot carry: jsdom has no layout engine, so every height reads zero and every
 * scroll event has to be dispatched by hand. Four claims are therefore out of this file's
 * reach, and each one is named beside the case that carries its contract instead:
 *
 * 1. **A real box has a scroll range at all.** This file gives a box a range by hand, with
 *    `Object.defineProperty`. That proves the arithmetic and the listener, not that the box
 *    a reader meets is taller than its stage.
 * 2. **A real scroll raises the event.** jsdom does not fire `scroll` when `scrollTop` is
 *    assigned, so this file dispatches it. The listener is proven; the browser's own
 *    dispatch is not.
 * 3. **The pane, the window, and the track stay put.** jsdom measures no geometry and
 *    motion writes no inline transform under it, so the three readings the rubric compares
 *    before and after a box scroll are jsdom's own constants here. The case that reads them
 *    says so.
 * 4. **The fraction is a true proportion.** 13 at a half-scrolled box is this file's
 *    arithmetic against a range it declared. On the served page it is the box's real range.
 *
 * A validator should measure the rest of the rubric in a browser. Serve the bundle rooted at
 * `.cobuilder-architect/self/`, open the Work surface's Intent level, and read the
 * `progressbar` named `Reading progress`:
 * - at the first section's top, with `scrollTop` at 0: the reading is 0.
 * - after `scrollTop = scrollHeight - clientHeight` on that box, and a second's wait for
 *   the spring: 25. On the second section, bottomed the same way: 50. On the last: 100.
 * - the readings taken at each step forward, each box bottomed, never decrease and end at
 *   100. One step back lowers the reading and does not reset it to 0.
 * - a section whose box has `scrollHeight === clientHeight` reads as the end of its share.
 * - the pane's `scrollTop`, `window.scrollY`, and the track's own transform are unchanged
 *   by a box scroll, and the reading climbs.
 *
 * The fixture carries seven epics, as slice 8's does. Six fill one section of the paged
 * Build level, so seven give that level two sections and no case here is a one-count
 * special case. The other three paged levels are fixed lists of four.
 */

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  PAGED,
  boxesOf,
  endOfShare,
  scrollBox,
  type PagedLevel,
} from "./testSupport/LevelProgress/dom";
import {
  bottomOut,
  next,
  onScreenIndex,
  openPaged,
  reading,
  useLevelProgressFixture,
} from "./testSupport/LevelProgress/paged.test.helpers";

useLevelProgressFixture();

async function readEachSection(count: number): Promise<number[]> {
  const readings = [reading()];
  for (let step = 1; step < count; step += 1) {
    await next();
    readings.push(reading());
  }
  return readings;
}

function expectOneShareEach(level: PagedLevel, readings: number[]) {
  const count = readings.length;
  expect(readings, `${level.label}: one count's share per section`).toEqual(
    Array.from({ length: count }, (_, index) => endOfShare(index, count)),
  );
}

function expectCompleteWithFirstShare(level: PagedLevel, readings: number[]) {
  const count = readings.length;
  expect(
    readings[count - 1],
    `${level.label}: the last section reads the level as complete`,
  ).toBe(100);
  expect(
    readings[0],
    `${level.label}: the first step is one share and not a rounding of zero`,
  ).toBe(Math.round(100 / count));
}

function expectShares(level: PagedLevel, readings: number[]) {
  expectOneShareEach(level, readings);
  expectCompleteWithFirstShare(level, readings);
}

async function expectLevelStepsByShare(level: PagedLevel) {
  cleanup();
  await openPaged(level.hash);
  const count = boxesOf().length;
  expect(count, `${level.label} lays down the count this case expects`).toBe(level.count);
  expectShares(level, await readEachSection(count));
}

/*
  C1's rule as arithmetic. The reading is `(index + within) / count`, so a level of four
  steps by one quarter and a level of two steps by one half. jsdom gives every box no
  scroll range, which counts as fully read (C3), so the reading here is the END of each
  section's share: 25, 50, 75, 100 on the four-section levels.

  The case reads the level's own count from the pager rather than writing four down, so a
  level whose count changed would move the expected step with it instead of quietly passing.
*/
async function stepsOneShareForEachSection() {
  for (const level of PAGED) await expectLevelStepsByShare(level);

  expect(PAGED.map((level) => Math.round(100 / level.count))).toEqual([25, 25, 25, 50]);
}

async function readFirstSection(boxes: HTMLElement[]) {
  scrollBox(boxes[0], 900, 0);
  await waitFor(() => expect(reading(), "the first section at its top").toBe(0));
  expect(await bottomOut(boxes[0]), "the first section at its bottom").toBe(25);
}

async function readSecondSection(boxes: HTMLElement[]) {
  await next();
  expect(onScreenIndex()).toBe(1);
  expect(await bottomOut(boxes[1]), "the second section at its bottom").toBe(50);
}

async function readLastSection(boxes: HTMLElement[]) {
  fireEvent.click(screen.getByRole("link", { name: "Out of scope" }));
  await waitFor(() => expect(onScreenIndex()).toBe(3));
  expect(await bottomOut(boxes[3]), "the last section at its bottom").toBe(100);
}

/*
  C1's four readings, with a scroll range this case declares. It is the one case in the
  file that stages the rubric's own sequence:

    section 1 at its top      0
    section 1 at its bottom   25
    section 2 at its bottom   50
    section 4 at its bottom   100

  A reading of 0 is unreachable without a range, so the range is declared here rather than
  measured. Break the `within` term and this case reports 25 for the first line. Break the
  `index` term and it reports 0 for the last two.
*/
async function readsZeroAtTopAndShareAtBottom() {
  await openPaged(PAGED[0].hash);
  const boxes = boxesOf();
  await readFirstSection(boxes);
  await readSecondSection(boxes);
  await readLastSection(boxes);

  expect(endOfShare(3, 4)).toBe(100);
}

describe("Slice 9 · the reading is a position in the level", () => {
  it("steps one count's share for each section, on every paged level", stepsOneShareForEachSection);
  it(
    "reads 0 at the top of a box that scrolls, its share at its bottom, and 100 on the last",
    readsZeroAtTopAndShareAtBottom,
  );
});
