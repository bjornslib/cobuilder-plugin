import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach } from "vitest";

import { installJsdomStubs } from "../jsdom";
import { RULE } from "./constants";
import { DESIGNS } from "./designRecords";
import { INDEX } from "./recordIndex";

const ADRS = {
  "ADR-0028": {
    id: "ADR-0028",
    title: "One section on screen",
    state: "accepted",
    maps_to: { rule: RULE, modules: ["src/shell/Pager.tsx"] },
  },
  "ADR-0029": {
    id: "ADR-0029",
    title: "The strip reads the DOM",
    state: "accepted",
    maps_to: { rule: "The strip holds no list of its own." },
  },
  "ADR-0030": { id: "ADR-0030", title: "Another work's decision", state: "accepted" },
};

function installBundleGlobals(): void {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  /*
   * No module declares the decision global, because `src/data/bundle.ts` leaves it to the
   * reader of the file. One entry would pass the guard. The three here are the ones the
   * index links.
   */
  (window as unknown as Record<string, unknown>).ADRS = ADRS;
}

/*
 * jsdom has no `matchMedia` or `ResizeObserver`, and the shell uses both on its first
 * render. The stubs answer false and observe nothing: a desktop rail, and a diagram tile
 * whose box is never measured.
 */
export function useLevelFixture(): void {
  beforeAll(installJsdomStubs);
  beforeEach(installBundleGlobals);
  afterEach(cleanup);
}
