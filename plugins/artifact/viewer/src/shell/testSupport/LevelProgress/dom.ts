import { fireEvent, screen } from "@testing-library/react";

import { DESIGN } from "../Pager/fixtures";

export const PANE_ID = "work-scroll-pane";
export const STRIP_NAME = "Sections of this level";
export const READING_NAME = "Reading progress";

export type PagedLevel = { label: string; hash: string; count: number };

/**
 * The four addresses that page their sections, and the count each one lays down.
 *
 * The three fixed levels page four boxes each. Build's count comes from the corpus: the
 * fixture's seven epics chunk into two sections of six. Two different counts sit in this
 * list on purpose, so the step arithmetic is read against more than one denominator.
 */
export const PAGED: PagedLevel[] = [
  { label: "Intent", hash: `#/${DESIGN}/intent`, count: 4 },
  { label: "Problem & Solution", hash: `#/${DESIGN}/problem-and-solution`, count: 4 },
  { label: "Architecture", hash: `#/${DESIGN}/architecture`, count: 4 },
  { label: "Build's epics", hash: `#/${DESIGN}/build/epics`, count: 2 },
];

export function hasStrip(): boolean {
  return screen.queryByRole("navigation", { name: STRIP_NAME }) !== null;
}

export function strip(): HTMLElement {
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
export function trackOf(): HTMLElement {
  return (strip().nextElementSibling as HTMLElement).firstElementChild as HTMLElement;
}

export function boxesOf(): HTMLElement[] {
  return Array.from(trackOf().children) as HTMLElement[];
}

/** The reading the level's own share arithmetic gives a section at the end of its share. */
export function endOfShare(index: number, count: number): number {
  return Math.round((100 * (index + 1)) / count);
}

const declare = (box: HTMLElement, name: string, descriptor: PropertyDescriptor) =>
  Object.defineProperty(box, name, { configurable: true, ...descriptor });

/**
 * A scroll range for a box, declared by hand.
 *
 * jsdom computes no layout, so `scrollHeight`, `clientHeight` and `scrollTop` all read
 * zero and `scrollTop` cannot be assigned. The own properties below shadow jsdom's
 * accessors for this one element, which is the only way a DOM without a layout engine can
 * hold a scroll position at all. This is claim 1 of the header, and the browser carries it
 * for real.
 */
export function withRange(box: HTMLElement, range: number, at: number): void {
  const height = 100;
  declare(box, "scrollHeight", { value: height + range });
  declare(box, "clientHeight", { value: height });
  declare(box, "scrollTop", { get: () => at, set: () => undefined });
}

/**
 * Put a box at a position in its own range, and raise the event a real scroll would.
 *
 * jsdom never raises `scroll` for an assignment to `scrollTop`, so the event is dispatched
 * here. This is claim 2 of the header: the listener is exercised, the browser's own
 * dispatch is not.
 */
export function scrollBox(box: HTMLElement, range: number, at: number): void {
  withRange(box, range, at);
  fireEvent.scroll(box);
}

/** One press on the page's own arrow keys, at the body of the document. */
export function press(key: string): void {
  fireEvent.keyDown(document.body, { key });
}

export function offsetsOfPaneWindowTrack() {
  const pane = document.getElementById(PANE_ID) as HTMLElement;
  const track = trackOf();
  return {
    pane,
    track,
    scrollTop: pane.scrollTop,
    scrollY: window.scrollY,
    transform: track.style.transform,
  };
}
