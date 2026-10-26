import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach } from "vitest";

import { installJsdomStubs } from "../jsdom";
import { installBundleGlobals } from "./bundle";

/*
 * jsdom has no `matchMedia` or `ResizeObserver`, and the shell uses both on its first
 * render: `useCollapsedRail` and the diagram tiles. The stubs answer false and observe nothing.
 */
export function useSparseFixture(): void {
  beforeAll(installJsdomStubs);
  afterEach(cleanup);
  beforeEach(installBundleGlobals);
}
