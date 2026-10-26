import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, vi } from "vitest";

import { installJsdomStubs } from "../jsdom";
import { openLevel } from "../LevelSections/open.test.helpers";
import { ADRS, DESIGNS, INDEX } from "./bundle";
import { DESIGN, OPEN_DECISION } from "./names";

export { openLevel };

export const installBrowserStubs = installJsdomStubs;

export function installBundle(): void {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  (window as unknown as Record<string, unknown>).ADRS = ADRS;
  /* The pane and the sheet both scroll, and jsdom implements neither. */
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
}

const HEADING_ID = "work-section-heading";

export function levelTitle(): string {
  return (document.getElementById(HEADING_ID)?.textContent ?? "").trim();
}

/** One control the level rendered, by the label its own panel gave it. */
export function control(label: string): HTMLButtonElement {
  return screen.getByRole("button", { name: label }) as HTMLButtonElement;
}

/** Press one control, and settle the surface it opens. */
export async function press(label: string): Promise<void> {
  fireEvent.click(control(label));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeNull());
}

export async function openArchitecture(): Promise<void> {
  await openLevel(`#/${DESIGN}/architecture`, "Architecture");
}

export async function openDecision(): Promise<void> {
  await openArchitecture();
  await press(OPEN_DECISION);
}

/** The record sheet, which is the dialog the shell opens over the pane. */
export function sheet(): HTMLElement {
  return screen.getByRole("dialog");
}

export function sheetText(): string {
  return sheet().textContent ?? "";
}

/** The part-link row, or null when the record rendered no link row at all. */
export function jumpRow(): HTMLElement | null {
  return screen.queryByRole("navigation", { name: "Parts of this record" });
}

/** The part links' own labels, in document order. */
export function jumpLabels(): string[] {
  const row = jumpRow();
  if (row === null) return [];
  return Array.from(row.querySelectorAll("a")).map((link) => (link.textContent ?? "").trim());
}

/** The scroll container of the sheet, which is the record's own box. */
export function sheetScroll(): HTMLElement {
  return sheet().querySelector(".overflow-auto") as HTMLElement;
}

export function firstJumpLink(): HTMLAnchorElement {
  return (jumpRow() as HTMLElement).querySelector("a") as HTMLAnchorElement;
}

export function headingOf(link: HTMLAnchorElement): HTMLElement {
  const id = link.getAttribute("href")?.replace(/^#/, "") ?? "";
  return document.getElementById(id) as HTMLElement;
}

export async function escapeClosesSheet(): Promise<void> {
  fireEvent.keyDown(document, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}
