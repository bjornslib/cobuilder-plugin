import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, expect } from "vitest";

import Shell from "../../App";
import { installJsdomStubs } from "../jsdom";
import { DESIGN, installFixtures } from "./fixtures";
import { levelTitle } from "./queries";

export function setupPagerHooks(): void {
  beforeAll(installJsdomStubs);
  beforeEach(installFixtures);
  afterEach(cleanup);
}

/** One press on the page's own arrow keys, at the body of the document. */
export function press(key: string, init: Record<string, boolean> = {}): void {
  fireEvent.keyDown(document.body, { key, ...init });
}

/** The route, and a fresh render of the shell at it. */
export async function open(hash: string): Promise<void> {
  window.location.hash = hash;
  render(<Shell />);
  await waitFor(() => expect(levelTitle()).not.toBe(""));
}

/** The four addresses that page their sections, and the count each one lays down. */
export interface PagedLevel {
  label: string;
  hash: string;
  count: number;
}

export const PAGED: PagedLevel[] = [
  { label: "Intent", hash: `#/${DESIGN}/intent`, count: 4 },
  { label: "Problem & Solution", hash: `#/${DESIGN}/problem-and-solution`, count: 4 },
  { label: "Architecture", hash: `#/${DESIGN}/architecture`, count: 4 },
  { label: "Build's epics", hash: `#/${DESIGN}/build/epics`, count: 2 },
];
