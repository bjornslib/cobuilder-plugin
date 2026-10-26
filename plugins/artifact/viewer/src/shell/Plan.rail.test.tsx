import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ALPHA, GAMMA } from "./testSupport/Plan/fixtures";
import { installBrowserStubs, installFixtures, openRail, planRow } from "./testSupport/Plan/page";

beforeAll(installBrowserStubs);

beforeEach(installFixtures);

afterEach(cleanup);

async function disablesPlanRowWithoutPlan() {
  await openRail(`#/${GAMMA}/intent`);
  const row = planRow() as HTMLElement;
  expect(row.getAttribute("aria-disabled")).toBe("true");
  expect(row.getAttribute("href") ?? "#").toBe("#");
  expect(document.querySelector(`a[href="#/${GAMMA}/build/plan"]`)).toBeNull();
  expect(`${row.getAttribute("aria-label") ?? ""} ${row.textContent ?? ""}`).toContain("no plan");
}

async function givesPlanRowMinHeight() {
  await openRail(`#/${ALPHA}/intent`);
  expect(planRow()).toBeTruthy();
  expect((planRow() as HTMLElement).className.split(/\s+/)).toContain("min-h-11");
}

/*
 * The Plan rail row, per ui-spec.jsonc `planRow`: a 44 px minimum height, and a work with
 * no plan documents shows the row disabled with the reason "no plan", not hidden.
 *
 * THE 44 PX FLOOR. The rail's shared row frame sets `min-h-9` (36 px) for an expanded row
 * and reaches 44 px only in icon mode. No class sets 44 px for an expanded row today, so
 * this case asserts Tailwind's `min-h-11` (44 px) on the Plan row itself.
 */
describe("the plan rail row", () => {
  it("shows a disabled Plan row with the reason 'no plan' for a work with no plan", disablesPlanRowWithoutPlan);

  it("gives the Plan row a 44 px minimum height", givesPlanRowMinHeight);
});
