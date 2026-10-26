import { screen, within } from "@testing-library/react";

/** One panel of the level on screen, by the accessible name that panel carries. */
export function panelNamed(title: string): HTMLElement {
  return screen.getByRole("region", { name: title });
}

/**
 * The text of every panel the level on screen renders, and of nothing else.
 *
 * A panel is a named `section`, so a region query collects the level's own panels. The
 * rail is a `navigation` and stays out, which matters here: a disabled level row states
 * its absent records in the rail's own words, and one of those words is a drawing level.
 */
export function panelText(): string {
  return screen
    .getAllByRole("region")
    .map((panel) => panel.textContent ?? "")
    .join("\n");
}

/** The drawing tiles inside one panel, as the whole accessible name of each. */
export function drawnNamesIn(panel: HTMLElement): string[] {
  return within(panel)
    .queryAllByRole("button", { name: /drawing for level \d+/ })
    .map((tile) => tile.getAttribute("aria-label") ?? "");
}

/** The same names, as the level each tile says it draws. */
export function levelsIn(names: string[]): string[] {
  return names.map((name) => name.replace(/^.*for level /, ""));
}

/** The level numbers every drawing tile of the level on screen carries, in DOM order. */
export function drawnLevels(): string[] {
  return levelsIn(
    screen
      .queryAllByRole("button", { name: /drawing for level \d+/ })
      .map((tile) => tile.getAttribute("aria-label") ?? ""),
  );
}
