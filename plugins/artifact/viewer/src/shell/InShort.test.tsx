import { cleanup, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { VIEWER, INDEX, installAdrs } from "./testSupport/App/fixtures";
import { renderAt } from "./testSupport/App/render";
import { changeBundleFor, strip } from "./testSupport/InShort/bundle";
import { installJsdomStubs } from "./testSupport/jsdom";

const state = vi.hoisted(() => ({
  served: {} as Record<string, boolean>,
  narrations: true,
}));

vi.mock("./change/levels", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./change/levels")>();
  return {
    ...actual,
    useServedAudio: () => state.served,
    useChangeBundle: (pr: number | null) => changeBundleFor(pr, state.narrations),
  };
});

beforeAll(installJsdomStubs);

beforeEach(() => {
  window.INDEX = INDEX;
  window.DESIGNS = { "cobuilder-viewer": VIEWER };
  installAdrs();
  state.served = {};
  state.narrations = true;
  window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = vi.fn();
});

afterEach(cleanup);

async function showsDesignNarrationForLevel() {
  renderAt("#/cobuilder-viewer/problem-and-solution");
  const region = await screen.findByRole("region", { name: "In Short" });
  expect(region.textContent).toContain("The board is the landing surface.");
  expect(within(region).getByText("In Short").textContent).toBe("In Short");
  expect(within(region).queryByRole("button")).toBeNull();
  expect(region.querySelector("audio")).toBeNull();
}

async function followsTheLevel() {
  renderAt("#/cobuilder-viewer/architecture");
  const region = await screen.findByRole("region", { name: "In Short" });
  expect(region.textContent).toContain("One derivation, one row each.");
}

async function sitsAboveSectionTabs() {
  renderAt("#/cobuilder-viewer/architecture");
  const region = await screen.findByRole("region", { name: "In Short" });
  const tabs = screen.getByRole("navigation", { name: "Sections of this level" });
  expect(region.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

async function drawsNoStripOnEpicsView() {
  renderAt("#/cobuilder-viewer/build/epics");
  await waitFor(() => expect(document.getElementById("work-section-heading")?.textContent).toBe("Build"));
  expect(strip()).toBeNull();
}

describe("In Short on the work item", () => {
  it("shows the design's narration for the level, labelled In Short", showsDesignNarrationForLevel);
  it("follows the level", followsTheLevel);
  it("sits above the section tabs", sitsAboveSectionTabs);
  it("draws no strip on Build's epics view", drawsNoStripOnEpicsView);
});
