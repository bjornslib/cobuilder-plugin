import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { installAdrs } from "../testSupport/App/fixtures";
import { workItemName } from "../testSupport/App/queries";
import { renderAt } from "../testSupport/App/render";
import { BOARD_DESIGNS, EPIC_BOARD_INDEX } from "../testSupport/board/fixtures";
import { openBoardAt } from "../testSupport/board/queries";
import { installJsdomStubs } from "../testSupport/jsdom";

const BOARD_HASHES = ["#/board", "#/board?program=beta", "#/board?orphans=1"];
const WORK_HASHES = ["#/beta/intent", "#/beta/build/epics/E2"];

beforeAll(installJsdomStubs);

beforeEach(() => {
  window.INDEX = EPIC_BOARD_INDEX;
  window.DESIGNS = BOARD_DESIGNS;
  installAdrs();
});

afterEach(cleanup);

function railNav(): HTMLElement | null {
  return screen.queryByRole("navigation", { name: "Work sections", hidden: true });
}

function railTrigger(): HTMLElement | null {
  const toggles = screen.queryAllByRole("button", { name: "Toggle Sidebar", hidden: true });
  return toggles.find((toggle) => toggle.dataset.slot === "sidebar-trigger") ?? null;
}

async function drawsNoRailOn(hash: string) {
  await openBoardAt(hash);
  expect(screen.queryByRole("link", { name: "Kanban board" }), "the top bar draws").not.toBeNull();
  expect(railNav(), "no rail navigation on the board").toBeNull();
  expect(railTrigger(), "no rail trigger in the top bar on the board").toBeNull();
  expect(screen.queryAllByRole("button", { name: "Toggle Sidebar", hidden: true }), "no control toggles a rail on the board").toEqual([]);
}

async function drawsTheRailOn(hash: string) {
  renderAt(hash);
  await waitFor(() => expect(workItemName()).toBe("beta"));
  expect(railNav(), "the rail navigation draws on a work-item page").not.toBeNull();
  expect(railTrigger(), "the rail trigger draws in the top bar on a work-item page").not.toBeNull();
}

describe("the rail on the Kanban board", () => {
  it.each(BOARD_HASHES)("draws no rail and no rail trigger on %s", drawsNoRailOn);
  it.each(WORK_HASHES)("draws the rail and its trigger on %s", drawsTheRailOn);
});
