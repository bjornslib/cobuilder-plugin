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

/*
  The three pieces of C2's first evidence, read at once. One press on Next moves the box
  the stage leaves reachable, the words the pager states, and the link the strip marks
  active. The case asserts all three rather than the pager's text alone, so a control
  that printed the right number while the track stood still would fail it.
*/
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

/*
  "One index, both directions, and each step exactly one box." Next walks the level to
  its last box, where the control is disabled and a further press moves nothing. Previous
  walks it back to the first, where the same holds. Every step is checked against the box
  on screen, so a step of two fails here as loudly as a step of none.
*/
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
  C2's second evidence. A press on the strip's fourth heading moves three boxes in one
  step, and the case reads it three ways: the box on screen, the pager's words, and the
  link the strip marks. It also reads the address, because the strip's links are
  anchors and a press that let the anchor act would move the document. That is the one
  half of this case a browser would see and jsdom would not, so it is asserted here
  rather than left to the served page.
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
  C2's third evidence. ArrowRight then ArrowLeft each move one box, and the level ends
  where it began. The route is read at each press, so a key that stepped the index by
  writing the hash would fail here rather than pass on the state alone.
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
