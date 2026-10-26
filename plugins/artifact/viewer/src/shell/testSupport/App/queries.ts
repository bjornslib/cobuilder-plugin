import { fireEvent, screen, within } from "@testing-library/react";

/** The bare route is the board, and every other case names it for itself. */
export function at(hash: string): void {
  window.location.hash = hash;
}

/**
 * The drawer's own scope, found by its title. The deck's rows and its pane
 * live inside the dialog, and while the drawer is open the shell behind it is
 * `aria-hidden` — the modal's own rule — so every read of the deck reads it
 * from within this scope.
 */
export function drawerScope(): HTMLElement {
  return screen.getByRole("dialog", { name: "WORK" });
}

/** The top line of a Work surface names the work item the route carried. */
export function workItemName(): string {
  return (document.getElementById("work-item-name")?.textContent ?? "").trim();
}

/** The level heading of a Work surface. The board carries "Work" in the same element. */
export function levelHeading(): string {
  return (document.getElementById("work-section-heading")?.textContent ?? "").trim();
}

/** The rail, which holds the board entry and every group the work fills. */
export function rail(): HTMLElement {
  return screen.getByRole("navigation", { name: "Work sections" });
}

/** Every rail row, in the order the rail renders it. A disabled row is a row too. */
export function railRows(): HTMLElement[] {
  return within(rail()).getAllByRole("link");
}

/** One rail row's own label. A disabled row writes the label inside a longer sentence. */
export function labelOf(row: HTMLElement): string {
  return (row.getAttribute("aria-label") ?? "").replace(/,? is disabled.*$/, "").trim();
}

/** One rail row's address. A disabled row carries `#` and no route. */
export function hrefOf(row: HTMLElement): string {
  return row.getAttribute("href") ?? "";
}

/**
 * True when a row reads disabled.
 *
 * A level is disabled rather than gated, so an entry whose record is absent stays in the
 * rail. Its row carries `#`, and a press on it does nothing, so it is never a step.
 */
export function disabledOf(row: HTMLElement): boolean {
  return row.getAttribute("aria-disabled") === "true";
}

/** One arrow press, at the reader's own focus: the body of the document. */
export function press(key: string, init: Record<string, boolean> = {}): void {
  fireEvent.keyDown(document.body, { key, ...init });
}

export function sectionTabs(): HTMLElement[] {
  const nav = screen.getByRole("navigation", { name: "Sections of this level" });
  return Array.from(nav.querySelectorAll<HTMLElement>("a"));
}
export function currentSectionTab(): string | null {
  return sectionTabs().find((a) => a.getAttribute("aria-current") === "step")?.textContent ?? null;
}
export function firstSectionTab(): string | null {
  return sectionTabs()[0]?.textContent ?? null;
}

export function supersededLane(dialog: HTMLElement): HTMLElement | undefined {
  return within(dialog)
    .getAllByRole("button", { name: /Superseded/ })
    .find((b) => b.getAttribute("aria-controls") === "lane-superseded-rows");
}
