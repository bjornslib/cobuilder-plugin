import { fireEvent, screen, within } from "@testing-library/react";

export function at(hash: string): void {
  window.location.hash = hash;
}

/* The shell behind the open drawer is `aria-hidden` (the modal's rule), so every deck read uses this scope. */
export function drawerScope(): HTMLElement {
  return screen.getByRole("dialog", { name: "WORK" });
}

export function workItemName(): string {
  return (document.getElementById("work-item-name")?.textContent ?? "").trim();
}

export function levelHeading(): string {
  return (document.getElementById("work-section-heading")?.textContent ?? "").trim();
}

export function rail(): HTMLElement {
  return screen.getByRole("navigation", { name: "Work sections" });
}

export function railRows(): HTMLElement[] {
  return within(rail()).getAllByRole("link");
}

/* A disabled row writes its label inside a longer sentence. */
export function labelOf(row: HTMLElement): string {
  return (row.getAttribute("aria-label") ?? "").replace(/,? is disabled.*$/, "").trim();
}

export function hrefOf(row: HTMLElement): string {
  return row.getAttribute("href") ?? "";
}

/* A level is disabled, not gated, so its row stays in the rail with `#` and is never a step. */
export function disabledOf(row: HTMLElement): boolean {
  return row.getAttribute("aria-disabled") === "true";
}

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
