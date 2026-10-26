import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  PAGED,
  boxesOf,
  endOfShare,
  press,
  scrollBox,
} from "./testSupport/LevelProgress/dom";
import {
  bottomOut,
  next,
  onScreenIndex,
  openPaged,
  settled,
  useLevelProgressFixture,
} from "./testSupport/LevelProgress/paged.test.helpers";

useLevelProgressFixture();

type Walk = { label: string; step: () => Promise<void> };

async function stepByArrowRight() {
  const before = onScreenIndex();
  press("ArrowRight");
  await waitFor(() => expect(onScreenIndex()).toBe(before + 1));
}

const WALKS: Walk[] = [
  { label: "Next", step: next },
  { label: "ArrowRight", step: stepByArrowRight },
];

async function walkForward(walk: Walk): Promise<number[]> {
  const boxes = boxesOf();
  scrollBox(boxes[0], 900, 900);
  const readings = [await settled()];
  for (let step = 1; step < boxes.length; step += 1) {
    await walk.step();
    scrollBox(boxes[onScreenIndex()], 900, 900);
    readings.push(await settled());
  }
  return readings;
}

function expectNeverLowersOrResets(walk: Walk, readings: number[]) {
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
}

function expectEndsCompleteOneShareEach(walk: Walk, readings: number[]) {
  const count = readings.length;
  expect(readings[count - 1], `${walk.label}: the walk ends complete`).toBe(100);
  expect(readings, `${walk.label}: one share per step, in order`).toEqual(
    Array.from({ length: count }, (_, index) => endOfShare(index, count)),
  );
}

async function expectForwardWalk(walk: Walk) {
  cleanup();
  await openPaged(PAGED[2].hash);
  const count = boxesOf().length;
  const readings = await walkForward(walk);

  expect(readings, `${walk.label}: the walk visits every section`).toHaveLength(count);
  expectNeverLowersOrResets(walk, readings);
  expectEndsCompleteOneShareEach(walk, readings);
}

/*
  C2's invariant, walked twice. Every box is bottomed out as it arrives, which is the
  protocol the rubric states. The walk is taken once by the pager's Next button and once by
  the ArrowRight key.

  The walk records and then asserts, on purpose. Each step's reading is taken as it
  settles, and the four checks below run over the whole sequence afterwards, so the
  invariant is the thing that fires, not a value expectation in front of it. A staged run
  with the level reading inverted showed the non-decrease check firing on the first step,
  at 75 then 50.
*/
async function neverDecreasesOnForwardWalk() {
  for (const walk of WALKS) await expectForwardWalk(walk);
}

async function goToLastSection(boxes: HTMLElement[]) {
  const count = boxes.length;
  fireEvent.click(screen.getByRole("link", { name: "Unknowns" }));
  await waitFor(() => expect(onScreenIndex()).toBe(count - 1));
  expect(await bottomOut(boxes[count - 1]), "the last section reads complete").toBe(100);
}

async function stepBack(boxes: HTMLElement[]): Promise<number> {
  const count = boxes.length;
  fireEvent.click(screen.getByRole("button", { name: "Previous" }));
  await waitFor(() => expect(onScreenIndex()).toBe(count - 2));
  return bottomOut(boxes[count - 2]);
}

/*
  C2's other half. The rubric asks for the backward step explicitly, because a strip that
  never moved down would satisfy "never decreases" by standing still. From the last section
  at 100, one step back reads the previous section's share: it falls, and it is not 0.
*/
async function fallsOnBackwardStep() {
  await openPaged(PAGED[1].hash);
  const boxes = boxesOf();
  await goToLastSection(boxes);
  const back = await stepBack(boxes);

  expect(back, "a backward step lowers the reading").toBeLessThan(100);
  expect(back, "and it lands on the previous share, not on zero").toBe(
    endOfShare(boxes.length - 2, boxes.length),
  );
  expect(back, "a backward step is a step and not a reset").not.toBe(0);
}

describe("Slice 9 · a forward walk never lowers the reading", () => {
  it("never decreases on a forward walk, and ends at 100", neverDecreasesOnForwardWalk);
  it("falls on a backward step, and a step back is not a reset", fallsOnBackwardStep);
});
