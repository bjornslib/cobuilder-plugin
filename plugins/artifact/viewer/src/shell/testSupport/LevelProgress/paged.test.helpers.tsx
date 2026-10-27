import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, expect } from "vitest";

import Shell from "../../App";
import { boxesOf, endOfShare, hasStrip, scrollBox } from "./dom";
import { installJsdomStubs } from "../jsdom";
import { installFixtures } from "../Pager/fixtures";

export function useLevelProgressFixture(): void {
  beforeAll(installJsdomStubs);
  beforeEach(installFixtures);
  afterEach(cleanup);
}

export async function openPaged(hash: string): Promise<void> {
  window.location.hash = hash;
  render(<Shell />);
  await waitFor(() => expect(hasStrip()).toBe(true));
}

function progressElement(): HTMLElement {
  const boxes = screen.queryAllByRole("progressbar");
  expect(
    boxes,
    "a paged level draws exactly one progress bar, and it is the level's own",
  ).toHaveLength(1);
  return boxes[0];
}

export function reading(): number {
  const raw = progressElement().getAttribute("aria-valuenow");
  expect(raw, "the strip states its reading").not.toBeNull();
  const value = Number(raw);
  expect(Number.isNaN(value), `the reading is a number, and it read ${String(raw)}`).toBe(
    false,
  );
  return value;
}

/** Read from the tree, not from the pager's words. */
export function onScreenIndex(): number {
  const showing = boxesOf()
    .map((box, position) => (box.hasAttribute("inert") ? null : position))
    .filter((position) => position !== null);
  expect(showing, "exactly one box is on screen").toHaveLength(1);
  return showing[0] as number;
}

export async function bottomOut(box: HTMLElement, range = 900): Promise<number> {
  scrollBox(box, range, range);
  await waitFor(() => expect(reading()).toBe(endOfShare(onScreenIndex(), boxesOf().length)));
  return reading();
}

/**
 * The walk case records rather than asserts at each step, so its three invariants (never
 * falls, never resets, ends at 100) are the checks that fire. Under jsdom the strip settles
 * in the same tick as its scroll event, so this loop returns on its second pass.
 */
export async function settled(): Promise<number> {
  let last = reading();
  for (let pass = 0; pass < 20; pass += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
    const now = reading();
    if (now === last) return now;
    last = now;
  }
  return last;
}

export async function next(): Promise<void> {
  const before = onScreenIndex();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() => expect(onScreenIndex()).toBe(before + 1));
}
