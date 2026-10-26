import { screen } from "@testing-library/react";
import { expect } from "vitest";

export const PANE_ID = "work-scroll-pane";
export const HEADING_ID = "work-section-heading";
const STRIP_NAME = "Sections of this level";
export const JUMP_BAR_NAME = "Sections on this page";

/** The level heading's own words. It is the one `h1` the level keeps. */
export function levelTitle(): string {
  return (document.getElementById(HEADING_ID)?.textContent ?? "").trim();
}

/** The strip, once the level rendered one. */
export function strip(): HTMLElement {
  return screen.getByRole("navigation", { name: STRIP_NAME });
}

export function stripLinks(): HTMLElement[] {
  return Array.from(strip().querySelectorAll("a")) as HTMLElement[];
}

export function hasStrip(): boolean {
  return screen.queryByRole("navigation", { name: STRIP_NAME }) !== null;
}

/** The pager's own words, or `null` when this level draws no pager. */
export function pagerText(): string | null {
  const found = screen.queryByText(/^Section \d+ of \d+$/);
  return found === null ? null : (found.textContent ?? "").trim();
}

function pagerMatch(): RegExpExecArray | null {
  const text = pagerText();
  return text === null ? null : /^Section (\d+) of (\d+)$/.exec(text);
}

/** The number the pager states, for a level that draws one. */
export function pagerIndex(): number {
  const match = pagerMatch();
  expect(match, `the pager states a section and a count, and it read ${String(pagerText())}`).not.toBeNull();
  return Number((match as RegExpExecArray)[1]);
}

export function pagerCount(): number {
  return Number((pagerMatch() as RegExpExecArray)[2]);
}

/**
 * The paged level's column, read from the strip by sibling order.
 *
 * The prototype's own comment says the DOM order here is not the paint order, so this
 * reads the tree the way the pager builds it and never by a class name: the strip's parent
 * is the column, the strip's next sibling is the stage, the stage's one child is the
 * track, and the track's children are the boxes. A change to any of those four steps
 * fails this helper rather than silently reading a different element.
 */
export function columnOf(): HTMLElement {
  return strip().parentElement as HTMLElement;
}

export function stageOf(): HTMLElement {
  return strip().nextElementSibling as HTMLElement;
}

export function trackOf(): HTMLElement {
  return stageOf().firstElementChild as HTMLElement;
}

export function boxesOf(): HTMLElement[] {
  return Array.from(trackOf().children) as HTMLElement[];
}

/**
 * Which box is on screen, read from the tree and not from the pager's own words.
 *
 * `SectionStage` marks every box but the active one `inert`, so the index is the position
 * of the one box that does not carry the attribute. This is the fact the pager's text only
 * states: a control could print the right number and move nothing.
 */
export function onScreenIndex(): number {
  const inert = boxesOf().map((box) => box.hasAttribute("inert"));
  const showing = inert.map((isInert, position) => (isInert ? null : position)).filter(
    (position) => position !== null,
  );
  expect(showing, "exactly one box is on screen").toHaveLength(1);
  return showing[0] as number;
}

/** The one heading a box rendered, read from the panel the box holds. */
export function boxHeadings(): string[] {
  return boxesOf().map((box) => {
    const panel = box.querySelector("[data-shell-panel]");
    expect(panel, "every box of a paged level holds one panel").not.toBeNull();
    return (panel as HTMLElement).getAttribute("data-shell-panel") ?? "";
  });
}

/** The box's own `<h2>`, which is the heading the panel rendered. */
export function boxH2s(): string[] {
  return boxesOf().map((box) => {
    const heading = box.querySelector("h2");
    expect(heading, "every box of a paged level holds one h2").not.toBeNull();
    return (heading as HTMLElement).textContent ?? "";
  });
}

/** The strip link that reads as the active one. */
export function activeLinkIndex(): number {
  return stripLinks().findIndex((link) => link.getAttribute("aria-current") === "step");
}

/** The element inside the pane that holds this section's content. */
export function contentRootOf(pane: HTMLElement, inside: HTMLElement): HTMLElement {
  const found = Array.from(pane.children).find((child) => child.contains(inside));
  expect(found, "the pane holds one content root for this level").toBeTruthy();
  return found as HTMLElement;
}
