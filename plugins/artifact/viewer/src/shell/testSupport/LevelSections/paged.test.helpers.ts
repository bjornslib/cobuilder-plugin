import { screen } from "@testing-library/react";
import { expect } from "vitest";

const STRIP_NAME = "Sections of this level";

/** The strip, once the level rendered one. */
function strip(): HTMLElement {
  return screen.getByRole("navigation", { name: STRIP_NAME });
}

export function hasStrip(): boolean {
  return screen.queryByRole("navigation", { name: STRIP_NAME }) !== null;
}

export function stripLabels(): string[] {
  return Array.from(strip().querySelectorAll("a")).map((link) => (link.textContent ?? "").trim());
}

/** The pager's own words. */
export function pagerText(): string {
  return (screen.getByText(/^Section \d+ of \d+$/).textContent ?? "").trim();
}

/**
 * The paged level's column, read from the strip by sibling order.
 *
 * Slice 8's file reads the tree this way for its own reason: the DOM order here is not the
 * paint order, so a class name would read a different element after a tidy-up. The strip's
 * next sibling is the stage, the stage's one child is the track, and the track's children
 * are the boxes.
 */
export function boxesOf(): HTMLElement[] {
  const stage = strip().nextElementSibling as HTMLElement;
  const track = stage.firstElementChild as HTMLElement;
  return Array.from(track.children) as HTMLElement[];
}

/** The one panel a box of a paged level holds. */
export function panelOf(box: HTMLElement): HTMLElement {
  const found = Array.from(box.querySelectorAll<HTMLElement>("[data-shell-panel]"));
  expect(found, "a box of a paged level holds exactly one panel").toHaveLength(1);
  return found[0];
}

/**
 * The panel's own disclosure control, if it carries one.
 *
 * This is the panel-level fold and it is the one C3 scores: `Panel` renders the toggle as
 * a direct child of its own header when the caller passes `collapsible`. A record
 * disclosure inside a body is a different thing — the Architecture level's decisions and
 * the Build level's epics each hold an accordion — and it is not counted here. The report
 * states that reading, because the rubric's own sentence can be read to include them.
 */
export function panelCarriesFold(panel: HTMLElement): boolean {
  const header = panel.children[0] as HTMLElement;
  expect(header.tagName, "the panel's first child is its own header").toBe("HEADER");
  return Array.from(header.children).some(
    (child) => child.tagName === "BUTTON" && child.hasAttribute("aria-expanded"),
  );
}
