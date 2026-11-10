import { render, waitFor } from "@testing-library/react";
import { expect } from "vitest";

import Shell from "../../App";
import { installJsdomStubs } from "../jsdom";
import { DESIGNS, INDEX } from "./fixtures";

export function installBrowserStubs(): void {
  installJsdomStubs();
  Element.prototype.scrollIntoView = () => undefined;
}

export function installFixtures(): void {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  (window as unknown as Record<string, unknown>).ADRS = {};
}

export function blocks(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-plan-block]"));
}

export function blockKinds(): (string | null)[] {
  return blocks().map((b) => b.getAttribute("data-plan-block"));
}

export function blockOf(kind: string): HTMLElement {
  const found = blocks().find((b) => b.getAttribute("data-plan-block") === kind);
  expect(found, `the page renders a ${kind} block`).toBeTruthy();
  return found as HTMLElement;
}

export async function openPlan(hash: string): Promise<void> {
  window.location.hash = hash;
  render(<Shell />);
  await waitFor(() => expect(blocks().length, "the plan page renders its blocks").toBe(3));
}

export function planRow(): HTMLElement | undefined {
  const nav = document.querySelector('nav[aria-label="Work sections"]');
  if (!nav) return undefined;
  return Array.from(nav.querySelectorAll<HTMLElement>('[role="link"], a')).find((row) =>
    /^Plan\b/.test(row.getAttribute("aria-label") ?? (row.textContent ?? "").trim()),
  );
}

export async function openRail(hash: string): Promise<void> {
  window.location.hash = hash;
  render(<Shell />);
  await waitFor(() => expect(planRow(), "the rail holds a Plan row").toBeTruthy());
}
