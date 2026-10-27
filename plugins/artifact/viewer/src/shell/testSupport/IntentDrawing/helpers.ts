import { screen, within } from "@testing-library/react";

export function panelNamed(title: string): HTMLElement {
  return screen.getByRole("region", { name: title });
}

/*
  A panel is a named `section`, so a region query collects the level's own panels. The rail
  stays out: a disabled level row states its absent records in the rail's words, and one
  of those words is a drawing level.
*/
export function panelText(): string {
  return screen
    .getAllByRole("region")
    .map((panel) => panel.textContent ?? "")
    .join("\n");
}

export function drawnNamesIn(panel: HTMLElement): string[] {
  return within(panel)
    .queryAllByRole("button", { name: /drawing for level \d+/ })
    .map((tile) => tile.getAttribute("aria-label") ?? "");
}

export function levelsIn(names: string[]): string[] {
  return names.map((name) => name.replace(/^.*for level /, ""));
}

export function drawnLevels(): string[] {
  return levelsIn(
    screen
      .queryAllByRole("button", { name: /drawing for level \d+/ })
      .map((tile) => tile.getAttribute("aria-label") ?? ""),
  );
}
