import { render, waitFor } from "@testing-library/react";
import { expect } from "vitest";

import Shell from "../../App";
import type { SparseDesign } from "./corpus";

/** The top line of a Work surface. It names the work item the route carried. */
export function workItemName(): string {
  return (document.getElementById("work-item-name")?.textContent ?? "").trim();
}

/** The level heading of a Work surface. */
export function levelHeading(): string {
  return (document.getElementById("work-section-heading")?.textContent ?? "").trim();
}

/** The whole page's words, with every run of space collapsed. */
export function pageText(): string {
  return (document.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Open a sparse design's Work surface and wait for it to settle.
 *
 * The hash is set before the render, because the shell reads its route on the first one.
 */
export async function openAt(design: SparseDesign, section: string): Promise<void> {
  window.location.hash = `#/${design.id}/${section}`;
  render(<Shell />);
  await waitFor(() => {
    expect(workItemName()).toBe(design.id);
  });
}
