import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";

import Shell from "./App";
import { ALPHA } from "./testSupport/Plan/fixtures";
import { blockKinds, blockOf, blocks, installBrowserStubs, installFixtures, openPlan } from "./testSupport/Plan/page";

beforeAll(installBrowserStubs);

beforeEach(installFixtures);

afterEach(cleanup);

type ScrollSpy = MockInstance<Element["scrollIntoView"]>;

async function rendersAtTailRoute() {
  await openPlan(`#/${ALPHA}/build/plan/program`);
  expect(blocks()).toHaveLength(3);
  expect(blockKinds()).toEqual(["product", "architecture", "program"]);
}

async function putsPlanRowInRail() {
  window.location.hash = `#/${ALPHA}/intent`;
  render(<Shell />);
  await waitFor(() =>
    expect(
      document.querySelector(`a[href="#/${ALPHA}/build/plan"]`),
      "the rail links to the plan page",
    ).not.toBeNull(),
  );
}

function expectScrolled(spy: ScrollSpy, target: HTMLElement) {
  expect(
    spy.mock.contexts.some((ctx) => ctx === target || target.contains(ctx as Node)),
    "the page scrolls the architecture block into view",
  ).toBe(true);
}

function expectNotSmooth(spy: ScrollSpy, target: HTMLElement) {
  const call = spy.mock.calls[spy.mock.contexts.findIndex((ctx) => ctx === target)];
  const arg = call?.[0] as ScrollIntoViewOptions | boolean | undefined;
  if (arg && typeof arg === "object") expect(arg.behavior ?? "auto").not.toBe("smooth");
}

async function scrollsNamedBlock() {
  const spy = vi.spyOn(Element.prototype, "scrollIntoView");
  try {
    await openPlan(`#/${ALPHA}/build/plan/architecture`);
    const target = blockOf("architecture");
    await waitFor(() => expectScrolled(spy, target));
    /* The spec scrolls with no animation. */
    expectNotSmooth(spy, target);
  } finally {
    spy.mockRestore();
  }
}

describe("the plan page", () => {
  it("renders the same page at a gate tail route", rendersAtTailRoute);

  it("puts a plan row in the rail that opens the plan route", putsPlanRowInRail);

  it("scrolls the named block into view at a gate tail route", scrollsNamedBlock);
});
