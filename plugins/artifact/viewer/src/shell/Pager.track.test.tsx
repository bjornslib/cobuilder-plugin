import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PAGED, open, setupPagerHooks } from "./testSupport/Pager/page";
import { boxesOf, hasStrip, onScreenIndex, pagerIndex, pagerText, stageOf, trackOf } from "./testSupport/Pager/queries";

setupPagerHooks();

function expectBoxClassOnEveryBox(fragment: string, message: string) {
  const present = boxesOf().map((box) => box.className.includes(fragment));
  expect(present, message).toEqual(boxesOf().map(() => true));
}

/*
  The track moves by exactly one box width. The transform is motion's, and jsdom holds no
  value for it, so the case reads the contract the offset comes from: every box is the full
  width of the stage and refuses to shrink, so `-100%` of the track is one step. A box with a
  fixed width, or one that may shrink, breaks that derivation.
*/
function expectTrackIsOneBoxWide() {
  expect(stageOf().children, "the stage holds one child, the track").toHaveLength(1);
  expect(trackOf().children).toHaveLength(boxesOf().length);
  expectBoxClassOnEveryBox("w-full", "every box is the stage's own width");
  expectBoxClassOnEveryBox("shrink-0", "no box shrinks away from that width");
}

function expectStepMovedOneBox() {
  expect(onScreenIndex()).toBe(1);
  expect(pagerIndex()).toBe(2);
  expect(trackOf().children[onScreenIndex()]).toBe(boxesOf()[1]);
}

async function keepsTrackOneBoxWide() {
  await open(PAGED[0].hash);
  await waitFor(() => expect(hasStrip()).toBe(true));

  expectTrackIsOneBoxWide();

  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() => expect(pagerText()).toBe("Section 2 of 4"));
  expectStepMovedOneBox();
}

describe("Slice 8 · one index drives the strip, the pager, and the arrow keys", () => {
  it("keeps the track exactly one box wide, so a percentage step is a box step", keepsTrackOneBoxWide);
});
