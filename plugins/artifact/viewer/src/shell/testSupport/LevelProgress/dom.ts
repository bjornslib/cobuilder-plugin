import { fireEvent, screen } from "@testing-library/react";

import { DESIGN } from "../Pager/fixtures";

export const PANE_ID = "work-scroll-pane";
export const STRIP_NAME = "Sections of this level";
export const READING_NAME = "Reading progress";

export type PagedLevel = { label: string; hash: string; count: number };

/**
 * The counts differ on purpose, so the step arithmetic is read against more than one
 * denominator. The fixed levels page four boxes each. Build's seven fixture epics chunk into
 * two sections of six.
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
 * The paged level's column, read from the strip by sibling order. The DOM order is not the
 * paint order, so a class name would read a different element after a tidy-up.
 *
 * The stage is the strip's next sibling, and its one child is the track. `LevelProgress`
 * follows the stage, but tests read the bar by its role, because the role is what a reader
 * hears.
 */
export function trackOf(): HTMLElement {
  return (strip().nextElementSibling as HTMLElement).firstElementChild as HTMLElement;
}

export function boxesOf(): HTMLElement[] {
  return Array.from(trackOf().children) as HTMLElement[];
}

export function endOfShare(index: number, count: number): number {
  return Math.round((100 * (index + 1)) / count);
}

const declare = (box: HTMLElement, name: string, descriptor: PropertyDescriptor) =>
  Object.defineProperty(box, name, { configurable: true, ...descriptor });

/**
 * jsdom computes no layout, so `scrollHeight`, `clientHeight` and `scrollTop` all read zero
 * and `scrollTop` cannot be assigned. Own properties shadow jsdom's accessors on this one
 * element, the only way a DOM without a layout engine can hold a scroll position.
 */
export function withRange(box: HTMLElement, range: number, at: number): void {
  const height = 100;
  declare(box, "scrollHeight", { value: height + range });
  declare(box, "clientHeight", { value: height });
  declare(box, "scrollTop", { get: () => at, set: () => undefined });
}

/**
 * jsdom never raises `scroll` for an assignment to `scrollTop`, so the event is dispatched
 * here. The listener is exercised, and the browser's own dispatch is not.
 */
export function scrollBox(box: HTMLElement, range: number, at: number): void {
  withRange(box, range, at);
  fireEvent.scroll(box);
}

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
