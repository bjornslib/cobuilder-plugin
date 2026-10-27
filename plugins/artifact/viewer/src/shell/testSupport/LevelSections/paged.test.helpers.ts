import { screen } from "@testing-library/react";
import { expect } from "vitest";

const STRIP_NAME = "Sections of this level";

function strip(): HTMLElement {
  return screen.getByRole("navigation", { name: STRIP_NAME });
}

export function hasStrip(): boolean {
  return screen.queryByRole("navigation", { name: STRIP_NAME }) !== null;
}

export function stripLabels(): string[] {
  return Array.from(strip().querySelectorAll("a")).map((link) => (link.textContent ?? "").trim());
}

export function pagerText(): string {
  return (screen.getByText(/^Section \d+ of \d+$/).textContent ?? "").trim();
}

/**
 * The DOM order is not the paint order, so the boxes are read by sibling order, not by a
 * class name that a tidy-up could move. The strip's next sibling is the stage, the stage's
 * one child is the track, and the track's children are the boxes.
 */
export function boxesOf(): HTMLElement[] {
  const stage = strip().nextElementSibling as HTMLElement;
  const track = stage.firstElementChild as HTMLElement;
  return Array.from(track.children) as HTMLElement[];
}

export function panelOf(box: HTMLElement): HTMLElement {
  const found = Array.from(box.querySelectorAll<HTMLElement>("[data-shell-panel]"));
  expect(found, "a box of a paged level holds exactly one panel").toHaveLength(1);
  return found[0];
}

/**
 * This is the panel-level fold, the one C3 scores: `Panel` renders the toggle as a direct
 * child of its header when the caller passes `collapsible`. A record disclosure inside a body
 * (the Architecture decisions, the Build epics) is a different thing and is not counted. The
 * report states that reading, because the rubric's sentence can be read to include them.
 */
export function panelCarriesFold(panel: HTMLElement): boolean {
  const header = panel.children[0] as HTMLElement;
  expect(header.tagName, "the panel's first child is its own header").toBe("HEADER");
  return Array.from(header.children).some(
    (child) => child.tagName === "BUTTON" && child.hasAttribute("aria-expanded"),
  );
}
