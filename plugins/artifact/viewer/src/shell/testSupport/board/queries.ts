import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { expect } from "vitest";

import { renderAt } from "../App/render";

export async function openBoardAt(hash: string): Promise<void> {
  renderAt(hash);
  await waitFor(() => expect(screen.queryAllByRole("region", { name: /^\D+ \d+$/ }).length, "the board draws a column").toBeGreaterThan(0));
}

export async function found<T>(read: () => T | null, what: string): Promise<T> {
  return waitFor(() => {
    const value = read();
    expect(value, what).not.toBeNull();
    return value as T;
  });
}

export function boardColumn(label: string): HTMLElement | null {
  return screen.queryByRole("region", { name: new RegExp(`^${label}\\b`) });
}

export function columnText(label: string): string {
  return boardColumn(label)?.textContent ?? "";
}

export function programsIn(label: string): string[] {
  const region = boardColumn(label);
  const targets = region === null ? [] : within(region).queryAllByRole("link", { name: /^Open the epic board of / });
  return targets.map((link) => (link.getAttribute("aria-label") ?? link.textContent ?? "").replace(/^Open the epic board of /, ""));
}

export function shownPair(unit: RegExp): string {
  const counts = screen.queryByLabelText("Shown counts");
  const term = Array.from(counts?.querySelectorAll("dt") ?? []).find((dt) => unit.test(dt.textContent ?? ""));
  return (term?.nextElementSibling?.textContent ?? "").trim();
}

export function findField(): HTMLInputElement | null {
  return screen.queryByLabelText<HTMLInputElement>(/^find$/i);
}

export function orderSelect(): HTMLSelectElement | null {
  return screen.queryByRole<HTMLSelectElement>("combobox", { name: /^order$/i });
}

export async function typeInFind(texts: string[]): Promise<HTMLInputElement> {
  const field = await found(findField, "the Find field");
  field.focus();
  for (const text of texts) fireEvent.change(field, { target: { value: text } });
  return field;
}

export async function pushesOneEntry(act: () => void, hash: string): Promise<void> {
  const before = window.history.length;
  act();
  await waitFor(() => expect(window.location.hash).toBe(hash));
  expect(window.history.length, "the change pushes one history entry").toBe(before + 1);
}

export function visibleColumnLabels(): string[] {
  return Array.from(document.querySelectorAll('h3[id^="board-column-"]')).map((head) => head.textContent ?? "");
}
