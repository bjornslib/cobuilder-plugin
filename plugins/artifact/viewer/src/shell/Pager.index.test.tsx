import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PAGED, open, press, setupPagerHooks } from "./testSupport/Pager/page";
import {
  activeLinkIndex,
  boxHeadings,
  boxesOf,
  hasStrip,
  onScreenIndex,
  pagerIndex,
  pagerText,
  stripLinks,
} from "./testSupport/Pager/queries";

setupPagerHooks();

function expectAtFirstSection() {
  expect(pagerText()).toBe("Section 1 of 2");
  expect(onScreenIndex()).toBe(0);
  expect(activeLinkIndex()).toBe(0);
}

function expectMovedToSecondSection() {
  expect(onScreenIndex(), "the pager's next box is the one on screen").toBe(1);
  expect(activeLinkIndex(), "the strip marks the same section active").toBe(1);
  expect(
    boxesOf().filter((box) => box.hasAttribute("inert")),
    "the box the reader left is the one now hidden",
  ).toEqual([boxesOf()[0]]);
}

async function movesOneIndexOnNext() {
  await open(PAGED[3].hash);
  await waitFor(() => expect(hasStrip()).toBe(true));
  expectAtFirstSection();

  fireEvent.click(screen.getByRole("button", { name: "Next" }));

  await waitFor(() => expect(pagerText()).toBe("Section 2 of 2"));
  expectMovedToSecondSection();
}

async function walkForward(next: HTMLElement) {
  for (const wanted of [1, 2, 3]) {
    fireEvent.click(next);
    await waitFor(() => expect(onScreenIndex()).toBe(wanted));
    expect(pagerIndex(), "the pager counts the box the stage moved to").toBe(wanted + 1);
  }
}

async function walkBack(previous: HTMLElement) {
  for (const wanted of [2, 1, 0]) {
    fireEvent.click(previous);
    await waitFor(() => expect(onScreenIndex()).toBe(wanted));
    expect(activeLinkIndex(), "the strip follows the walk back").toBe(wanted);
  }
}

function expectDisabled(button: HTMLElement, message: string) {
  expect((button as HTMLButtonElement).disabled, message).toBe(true);
}

async function clampAtEnd(next: HTMLElement) {
  await walkForward(next);
  expectDisabled(next, "the pager states that nothing follows the last box");
  fireEvent.click(next);
  expect(onScreenIndex(), "a press at the end moves nothing").toBe(3);
  expect(pagerText(), "and the pager still reads the last section").toBe("Section 4 of 4");
}

async function walksBackAndClamps() {
  await open(PAGED[1].hash);
  await waitFor(() => expect(hasStrip()).toBe(true));

  const next = screen.getByRole("button", { name: "Next" });
  const previous = screen.getByRole("button", { name: "Previous" });

  expectDisabled(previous, "the pager states that nothing precedes the first box");
  await clampAtEnd(next);
  await walkBack(previous);
  expect(pagerText(), "and the pager reads the first section again").toBe("Section 1 of 4");
}

/*
  A press on the strip's fourth heading moves three boxes in one step. The case also reads
  the address, because the strip's links are anchors, and a press that let the anchor act
  would move the document. A browser would see that half and jsdom would not, so it is
  asserted here.
*/
function expectJumpedToFourth(hash: string) {
  expect(pagerText()).toBe("Section 4 of 4");
  expect(activeLinkIndex(), "the strip moved with the press").toBe(3);
  expect(window.location.hash, "a section press never writes the route").toBe(hash);
}

async function jumpsOnHeadingPress() {
  const hash = PAGED[2].hash;
  await open(hash);
  await waitFor(() => expect(hasStrip()).toBe(true));

  const fourth = stripLinks()[3];
  expect(fourth.textContent, "the fourth link names the fourth box").toBe(boxHeadings()[3]);
  fireEvent.click(fourth);

  await waitFor(() => expect(onScreenIndex()).toBe(3));
  expectJumpedToFourth(hash);
}

async function arrowStepsTo(key: string, wanted: number) {
  press(key);
  await waitFor(() => expect(onScreenIndex()).toBe(wanted));
}

/*
  The route is read at each press, so a key that stepped the index by writing the hash
  would fail here rather than pass on the state alone.
*/
async function stepsForwardThenBack(hash: string) {
  await arrowStepsTo("ArrowRight", 1);
  expect(pagerText()).toBe("Section 2 of 4");
  expect(window.location.hash, "an arrow press never writes the route").toBe(hash);

  await arrowStepsTo("ArrowRight", 2);
  expect(pagerText()).toBe("Section 3 of 4");
  await arrowStepsTo("ArrowLeft", 1);
  expect(pagerText()).toBe("Section 2 of 4");
  expect(activeLinkIndex(), "the strip follows the keys back").toBe(1);
}

async function stepsOneBoxPerArrow() {
  const hash = PAGED[0].hash;
  await open(hash);
  await waitFor(() => expect(hasStrip()).toBe(true));

  await stepsForwardThenBack(hash);

  await arrowStepsTo("ArrowLeft", 0);
  expect(pagerText(), "the level is back where it started").toBe("Section 1 of 4");
  expect(window.location.hash).toBe(hash);
}

describe("Slice 8 · one index drives the strip, the pager, and the arrow keys", () => {
  it("moves one index on Next, and the strip, the pager, and the box agree", movesOneIndexOnNext);
  it("walks back one box per press, and clamps at each end", walksBackAndClamps);
  it("jumps the index when a heading three along is pressed, and writes no address", jumpsOnHeadingPress);
  it("steps one box per arrow press, forward and back, and returns to where it started", stepsOneBoxPerArrow);
});
