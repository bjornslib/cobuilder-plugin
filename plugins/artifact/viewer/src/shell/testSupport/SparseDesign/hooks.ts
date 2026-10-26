import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach } from "vitest";

import { installJsdomStubs } from "../jsdom";
import { installBundleGlobals } from "./bundle";

/*
 * jsdom implements neither `matchMedia` nor `ResizeObserver`, and the shell asks both
 * questions on its first render: `useCollapsedRail` reads a media query and the diagram
 * tiles observe their box. The stubs answer the query false and observe nothing.
 */
export function useSparseFixture(): void {
  beforeAll(installJsdomStubs);
  afterEach(cleanup);
  beforeEach(installBundleGlobals);
}
