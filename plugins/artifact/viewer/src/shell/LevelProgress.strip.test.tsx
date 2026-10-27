import { cleanup, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  PAGED,
  READING_NAME,
  boxesOf,
  endOfShare,
  offsetsOfPaneWindowTrack,
  scrollBox,
  type PagedLevel,
} from "./testSupport/LevelProgress/dom";
import {
  next,
  onScreenIndex,
  openPaged,
  reading,
  useLevelProgressFixture,
} from "./testSupport/LevelProgress/paged.test.helpers";

useLevelProgressFixture();

function expectUnmoved(before: ReturnType<typeof offsetsOfPaneWindowTrack>) {
  expect(before.pane.scrollTop, "the pane does not scroll with the box").toBe(before.scrollTop);
  expect(window.scrollY, "the window does not scroll with the box").toBe(before.scrollY);
  expect(before.track.style.transform, "the track does not move with the box").toBe(
    before.transform,
  );
}

async function climbWithBox(box: HTMLElement) {
  scrollBox(box, 900, 0);
  await waitFor(() => expect(reading()).toBe(0));
  scrollBox(box, 900, 900);
  await waitFor(() => expect(reading(), "the reading climbs with the box").toBe(25));
}

/*
  C4's evidence, the part a DOM can carry. The reading climbs while the box scrolls. The
  pane's `scrollTop`, the window's `scrollY`, and the track's transform are read before and
  after.

  Those three comparisons are jsdom's constants here, and the report says so. jsdom
  measures no geometry and motion writes no inline transform under it, so all three read the
  same whatever the box did. The case carries that a box scroll reaches the reading, the
  half a wrong listener would break. The browser owns the other half.
*/
async function climbsWhenActiveBoxScrolls() {
  await openPaged(PAGED[2].hash);
  const before = offsetsOfPaneWindowTrack();
  const box = boxesOf()[0];
  await climbWithBox(box);
  expectUnmoved(before);

  scrollBox(box, 900, 0);
  await waitFor(() => expect(reading(), "the reading falls back with the box").toBe(0));
}

async function expectOffScreenBoxMovesNothing(boxes: HTMLElement[]) {
  scrollBox(boxes[2], 900, 900);
  await waitFor(() => expect(reading()).toBe(endOfShare(0, boxes.length)));
  expect(reading(), "a box off screen cannot move the strip").toBe(25);
}

async function expectArrivingBoxMovesReading(boxes: HTMLElement[]) {
  await next();
  expect(onScreenIndex()).toBe(1);
  scrollBox(boxes[1], 900, 0);
  await waitFor(() => expect(reading(), "the box now on screen is measured").toBe(25));
}

async function expectLeftBoxMovesNothing(boxes: HTMLElement[]) {
  scrollBox(boxes[0], 900, 900);
  await waitFor(() => expect(reading()).toBe(25));
  expect(reading(), "the box the reader left is no longer measured").toBe(25);

  scrollBox(boxes[1], 900, 900);
  await waitFor(() => expect(reading(), "the box on screen still is").toBe(50));
}

/*
  The other half of C4's rule. It catches the frozen container the source comment
  describes: the strip reads the box the reader is ON. Three readings prove it:

    1. scrolling a box that is not on screen moves nothing;
    2. after a step, the arriving box moves the reading;
    3. after that step, the box the reader left no longer moves it.

  A strip that resolved its box once, at mount, passes 1 and 3 and fails 2. A strip that
  listened to every box at once passes 1 and 2 and fails 3.
*/
async function movesForBoxReaderIsOn() {
  await openPaged(PAGED[1].hash);
  const boxes = boxesOf();

  await expectOffScreenBoxMovesNothing(boxes);
  await expectArrivingBoxMovesReading(boxes);
  await expectLeftBoxMovesNothing(boxes);
}

function expectBarAttributes(level: PagedLevel, bar: HTMLElement) {
  expect(bar.getAttribute("role"), `${level.label}: the strip is a progress bar`).toBe(
    "progressbar",
  );
  expect(
    screen.queryAllByRole("progressbar"),
    `${level.label}: the level's strip is the only bar`,
  ).toHaveLength(1);
  expect(bar.getAttribute("aria-valuemin"), `${level.label}: the range starts at 0`).toBe("0");
  expect(bar.getAttribute("aria-valuemax"), `${level.label}: the range ends at 100`).toBe("100");
}

async function expectContractOf(level: PagedLevel) {
  cleanup();
  await openPaged(level.hash);

  expectBarAttributes(level, screen.getByRole("progressbar", { name: READING_NAME }));

  const now = reading();
  expect(now, `${level.label}: the reading is inside the stated range`).toBeGreaterThanOrEqual(0);
  expect(now).toBeLessThanOrEqual(100);
}

/*
  C5's evidence, read as attributes: the role, the name and the range. The case also counts
  the bars on the level, because a paged level draws exactly one. The pane's own reading
  strip belongs to a stacked level, and a second bar here would leave a reader unable to say
  which number is the level's.
*/
async function statesItsContract() {
  for (const level of PAGED) await expectContractOf(level);
}

describe("Slice 9 · the strip measures the box the reader is on, and moves nothing else", () => {
  it(
    "climbs when the active box scrolls, and leaves the pane, the window, and the track alone",
    climbsWhenActiveBoxScrolls,
  );
  it(
    "moves for the box the reader is on, and stops moving for the one they left",
    movesForBoxReaderIsOn,
  );
});

describe("Slice 9 · the strip keeps its stated contract", () => {
  it("is a progressbar named Reading progress, with a range of 0 to 100", statesItsContract);
});
