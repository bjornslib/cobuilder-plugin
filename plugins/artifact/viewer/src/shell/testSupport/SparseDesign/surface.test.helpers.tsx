import { render, waitFor } from "@testing-library/react";
import { expect } from "vitest";

import Shell from "../../App";
import type { SparseDesign } from "./corpus";

export function workItemName(): string {
  return (document.getElementById("work-item-name")?.textContent ?? "").trim();
}

export function levelHeading(): string {
  return (document.getElementById("work-section-heading")?.textContent ?? "").trim();
}

export function pageText(): string {
  return (document.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** Set the hash before the render: the shell reads its route on the first render. */
export async function openAt(design: SparseDesign, section: string): Promise<void> {
  window.location.hash = `#/${design.id}/${section}`;
  render(<Shell />);
  await waitFor(() => {
    expect(workItemName()).toBe(design.id);
  });
}
