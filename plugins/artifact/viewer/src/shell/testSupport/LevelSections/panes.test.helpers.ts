import { within } from "@testing-library/react";
import { expect } from "vitest";

const PANE_ID = "work-scroll-pane";
const HEADING_ID = "work-section-heading";

/** The level heading's own words. It is the one `h1` the level keeps. */
export function levelTitle(): string {
  return (document.getElementById(HEADING_ID)?.textContent ?? "").trim();
}

/** The scroll pane, which holds every panel the level on screen rendered. */
export function pane(): HTMLElement {
  return document.getElementById(PANE_ID) as HTMLElement;
}

/** Every panel of the level on screen, in document order. */
export function panels(): HTMLElement[] {
  return Array.from(pane().querySelectorAll<HTMLElement>("[data-shell-panel]"));
}

/** The heading each panel carries. `Panel` is the one writer of the attribute. */
export function panelTitles(): string[] {
  return panels().map((panel) => panel.getAttribute("data-shell-panel") ?? "");
}

/** One panel by the heading it carries. A level that dropped it fails here. */
export function panelNamed(title: string): HTMLElement {
  const found = panels().find((panel) => panel.getAttribute("data-shell-panel") === title);
  expect(found, `the level renders a panel named ${title}`).toBeTruthy();
  return found as HTMLElement;
}

/** True when the panel's own text holds this value. */
export function holds(panel: HTMLElement, value: string): boolean {
  return within(panel).queryAllByText(value, { exact: true }).length > 0;
}

/** The panel's own body, which is the element after its header. */
export function panelBody(panel: HTMLElement): HTMLElement {
  const body = panel.children[1] as HTMLElement;
  expect(body, "the panel carries a body element").toBeTruthy();
  return body;
}

/** The disclosure rows inside a panel's body: one per record the panel lists. */
export function rowsIn(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>("button[aria-expanded]"));
}

/**
 * The record an accordion row names, read from the row's own text.
 *
 * A row's title holds the record's id and then its title, in two spans that sit side by
 * side with no space between them, so the id is read by its own form: an epic id is `E`
 * and its number, and a decision id is `ADR-` and its number. Both panels that carry rows
 * write one of the two.
 */
function rowId(row: HTMLElement): string {
  const found = /^(E\d+|ADR-\d+)/.exec((row.textContent ?? "").trim());
  expect(found, "the row names the record it discloses").not.toBeNull();
  return (found as RegExpExecArray)[1];
}

/** The record ids a panel's rows name, in the order the panel lists them. */
export function rowIds(panel: HTMLElement): string[] {
  return rowsIn(panel).map(rowId);
}

/** The diagram levels a panel draws, read from the tiles' own accessible names. */
export function drawnLevels(panel: HTMLElement): string[] {
  return within(panel)
    .queryAllByRole("button", { name: /drawing for level \d+/ })
    .map((tile) => /level (\d+)/.exec(tile.getAttribute("aria-label") ?? "")?.[1] ?? "");
}
