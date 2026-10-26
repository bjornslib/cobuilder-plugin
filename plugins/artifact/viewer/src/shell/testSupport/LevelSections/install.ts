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
   * The decision global is declared by no module, because `src/data/bundle.ts` leaves it to
   * whoever reads the file. One entry is enough for the guard, and the three below are the
   * three the index links.
   */
  (window as unknown as Record<string, unknown>).ADRS = ADRS;
}

/*
 * jsdom implements neither `matchMedia` nor `ResizeObserver`, and the shell asks both
 * questions on its first render. The stubs answer the query false and observe nothing,
 * which is the desktop rail and a diagram tile whose box is never measured.
 */
export function useLevelFixture(): void {
  beforeAll(installJsdomStubs);
  beforeEach(installBundleGlobals);
  afterEach(cleanup);
}
