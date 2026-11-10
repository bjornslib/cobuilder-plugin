import { waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { withinOf } from "./Pager";
import {
  PAGED,
  boxesOf,
  endOfShare,
  scrollBox,
  withRange,
} from "./testSupport/LevelProgress/dom";
import {
  next,
  onScreenIndex,
  openPaged,
  reading,
  useLevelProgressFixture,
} from "./testSupport/LevelProgress/paged.test.helpers";

useLevelProgressFixture();

function expectWithinThroughBox() {
  const box = document.createElement("div");
  withRange(box, 900, 0);
  expect(withinOf(box), "a box at its top is unread").toBe(0);
  withRange(box, 900, 300);
  expect(withinOf(box), "a third of the way through one box").toBeCloseTo(1 / 3, 5);
  withRange(box, 900, 900);
  expect(withinOf(box), "a box at its bottom is fully read").toBe(1);
}

function expectWithinBeyondBox() {
  const box = document.createElement("div");
  withRange(box, 900, 4000);
  expect(withinOf(box), "a box past its own end is fully read, never more").toBe(1);
  withRange(box, 900, -400);
  expect(withinOf(box), "a box above its own start is unread, never less").toBe(0);
  withRange(box, 0, 0);
  expect(withinOf(box), "a box with no range is fully read").toBe(1);
  expect(withinOf(null), "no box is an unread reading and not a crash").toBe(0);
}

async function expectHalfOfFirstQuarter() {
  await openPaged(PAGED[0].hash);
  scrollBox(boxesOf()[0], 900, 450);
  await waitFor(() =>
    expect(reading(), "half of the first quarter is 13, and not a position in the page").toBe(13),
  );
  expect(reading(), "the number is Math.round(12.5), and it is neither 0 nor 25").toBe(
    Math.round((100 * 0.5) / 4),
  );
}

/*
  C1's rule at its smallest: `withinOf` states how far through ONE box the reader is. The
  function is called directly against a synthetic element, so each branch is read in both
  directions: a partway box, its top, its bottom, past its end, a box with no range, and no
  box at all.

  The composite line at the end makes this a level reading and not a unit test: a
  half-scrolled FIRST box reads 13, which is half of a quarter rounded. A reading taken
  from a page, or from the pane whose own offset is zero, would read 0.
*/
async function readsFractionInsideBox() {
  expectWithinThroughBox();
  expectWithinBeyondBox();

  await expectHalfOfFirstQuarter();
}

function expectFlatBoxFullyRead() {
  const flat = document.createElement("div");
  withRange(flat, 0, 0);
  expect(withinOf(flat), "a box that fits its stage is fully read").toBe(1);
}

async function expectBoxReadsEndOfItsShare(boxes: HTMLElement[], step: number) {
  const count = boxes.length;
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

/*
  C3's rule. Every box jsdom renders has no scroll range at all, so this case is measured
  and not staged: the reading is the END of each section's share, and the strip never
  stalls part way through a section that has nothing to scroll.

  A box whose `scrollHeight` equals its `clientHeight` is set explicitly beside it, so the
  rule is read where it is decided, not inferred from jsdom's zeros. Remove the range guard
  in `withinOf` and the reading becomes `0 / 0`, which is `NaN`: the first line of this case
  fails on `NaN` at the first section instead of 25.
*/
async function givesBoxWithNoRangeItsWholeShare() {
  expectFlatBoxFullyRead();
  await openPaged(PAGED[3].hash);
  const boxes = boxesOf();
  for (let step = 0; step < boxes.length; step += 1) await expectBoxReadsEndOfItsShare(boxes, step);
  expect(
    reading(),
    "the last section of a level whose boxes cannot scroll reads the level complete",
  ).toBe(100);
}

describe("Slice 9 · the reading is a position in the level", () => {
  it("reads a fraction inside the box, not a fraction of a page", readsFractionInsideBox);
});

describe("Slice 9 · a box with no scroll range counts as fully read", () => {
  it(
    "gives a box with no range the whole of its share, so no boundary is faked",
    givesBoxWithNoRangeItsWholeShare,
  );
});
