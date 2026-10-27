import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { VIEWER, INDEX, installAdrs } from "./testSupport/App/fixtures";
import { renderAt } from "./testSupport/App/render";
import { changeBundleFor, strip } from "./testSupport/InShort/bundle";
import { installJsdomStubs } from "./testSupport/jsdom";

const AUDIO = "../data/audio/pr11_intent.wav";

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

async function showsNarrationAndKeepsItOnSectionChange() {
  renderAt("#/cobuilder-viewer/pull-requests/11/intent");
  const region = await screen.findByRole("region", { name: "In Short" });
  expect(region.textContent).toContain("PR intent in short.");
  expect(within(region).getByText("In Short").textContent).toBe("In Short");
  const before = region.textContent;
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() => expect(screen.getByText("Section 2 of 4")).toBeTruthy());
  expect(strip()?.textContent).toBe(before);
  expect(screen.getAllByText("PR intent in short.")).toHaveLength(1);
}

async function takesCurrentLevelText() {
  renderAt("#/cobuilder-viewer/pull-requests/11/architecture");
  const region = await screen.findByRole("region", { name: "In Short" });
  expect(region.textContent).toContain("PR architecture in short.");
}

async function drawsNoStripOnFileDiffs() {
  renderAt("#/cobuilder-viewer/pull-requests/11/file-diffs");
  await waitFor(() => expect(screen.getByText("Section 1 of 2")).toBeTruthy());
  expect(strip()).toBeNull();
  expect(screen.queryByText("PR diff in short.")).toBeNull();
}

async function drawsNoStripWithoutNarration() {
  state.narrations = false;
  renderAt("#/cobuilder-viewer/pull-requests/11/intent");
  await waitFor(() => expect(screen.getByText("Section 1 of 4")).toBeTruthy());
  expect(strip()).toBeNull();
  expect(document.body.textContent).not.toMatch(/narration record|no narration text/);
}

async function drawsNoListenWhenNotServed() {
  state.served = { [AUDIO]: false };
  renderAt("#/cobuilder-viewer/pull-requests/11/intent");
  await screen.findByRole("region", { name: "In Short" });
  expect(screen.queryByRole("button", { name: "Listen" })).toBeNull();
  expect(document.body.textContent).not.toContain("pr11_intent");
}

async function drawsListenAndTogglesToPause() {
  state.served = { [AUDIO]: true };
  renderAt("#/cobuilder-viewer/pull-requests/11/intent");
  const region = await screen.findByRole("region", { name: "In Short" });
  fireEvent.click(within(region).getByRole("button", { name: "Listen" }));
  await waitFor(() => expect(within(region).getByRole("button", { name: "Pause" })).toBeTruthy());
  expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  fireEvent.click(within(region).getByRole("button", { name: "Pause" }));
  expect(within(region).getByRole("button", { name: "Listen" })).toBeTruthy();
  expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
}

describe("In Short on the pull request", () => {
  it("shows the level's narration, and keeps it when the section changes", showsNarrationAndKeepsItOnSectionChange);
  it("takes the current level's text", takesCurrentLevelText);
  it("draws no strip on File Diffs", drawsNoStripOnFileDiffs);
});

describe("In Short on the pull request", () => {
  it("draws no strip and no sentence for a level without narration", drawsNoStripWithoutNarration);
  it("draws no Listen when the file is not served", drawsNoListenWhenNotServed);
  it("draws Listen when the file is served, and toggles to Pause and back", drawsListenAndTogglesToPause);
});
