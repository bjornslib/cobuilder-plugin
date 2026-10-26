import { render, waitFor } from "@testing-library/react";
import { expect } from "vitest";

import Shell from "../../App";
import { boxesOf, hasStrip } from "./paged.test.helpers";
import { levelTitle } from "./panes.test.helpers";

/** One level of one work item, settled before a case reads it. */
export async function openLevel(hash: string, title: string): Promise<void> {
  window.location.hash = hash;
  render(<Shell />);
  await waitFor(() => expect(levelTitle()).toBe(title));
}

/** One paged level, settled, with its boxes handed back. */
export async function openPaged(hash: string, title: string): Promise<HTMLElement[]> {
  await openLevel(hash, title);
  await waitFor(() => expect(hasStrip()).toBe(true));
  return boxesOf();
}
