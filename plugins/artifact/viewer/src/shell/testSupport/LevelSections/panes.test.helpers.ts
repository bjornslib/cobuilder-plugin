import { within } from "@testing-library/react";
import { expect } from "vitest";

const PANE_ID = "work-scroll-pane";
const HEADING_ID = "work-section-heading";

export function levelTitle(): string {
  return (document.getElementById(HEADING_ID)?.textContent ?? "").trim();
}

export function pane(): HTMLElement {
  return document.getElementById(PANE_ID) as HTMLElement;
}

export function panels(): HTMLElement[] {
  return Array.from(pane().querySelectorAll<HTMLElement>("[data-shell-panel]"));
}

export function panelTitles(): string[] {
  return panels().map((panel) => panel.getAttribute("data-shell-panel") ?? "");
}

export function panelNamed(title: string): HTMLElement {
  const found = panels().find((panel) => panel.getAttribute("data-shell-panel") === title);
  expect(found, `the level renders a panel named ${title}`).toBeTruthy();
  return found as HTMLElement;
}

export function holds(panel: HTMLElement, value: string): boolean {
  return within(panel).queryAllByText(value, { exact: true }).length > 0;
}

export function panelBody(panel: HTMLElement): HTMLElement {
  const body = panel.children[1] as HTMLElement;
  expect(body, "the panel carries a body element").toBeTruthy();
  return body;
}

export function rowsIn(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>("button[aria-expanded]"));
}

/**
 * A row's title holds the record id and then its title, in two spans with no space between
 * them, so the id is read by its form: `E` and a number for an epic, `ADR-` and a number
 * for a decision. Both panels that carry rows write one of the two.
 */
function rowId(row: HTMLElement): string {
  const found = /^(E\d+|ADR-\d+)/.exec((row.textContent ?? "").trim());
  expect(found, "the row names the record it discloses").not.toBeNull();
  return (found as RegExpExecArray)[1];
}

export function rowIds(panel: HTMLElement): string[] {
  return rowsIn(panel).map(rowId);
}

export function drawnLevels(panel: HTMLElement): string[] {
  return within(panel)
    .queryAllByRole("button", { name: /drawing for level \d+/ })
    .map((tile) => /level (\d+)/.exec(tile.getAttribute("aria-label") ?? "")?.[1] ?? "");
}
