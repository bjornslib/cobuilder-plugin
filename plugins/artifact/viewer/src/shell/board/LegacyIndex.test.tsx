import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PANE_ID } from "../app/ids";
import { installAdrs } from "../testSupport/App/fixtures";
import { renderAt } from "../testSupport/App/render";
import { BOARD_DESIGNS, BOARD_INDEX } from "../testSupport/board/fixtures";
import { found } from "../testSupport/board/queries";
import { installJsdomStubs } from "../testSupport/jsdom";

const NO_TIME = "No build time in this index";
const BUILT_AT = "2026-11-21T12:00:00Z";
const BUILT_INDEX = { ...BOARD_INDEX, built_at: BUILT_AT };

beforeAll(installJsdomStubs);

beforeEach(() => {
  window.INDEX = BOARD_INDEX;
  window.DESIGNS = BOARD_DESIGNS;
  installAdrs();
});

afterEach(cleanup);

async function openAt(hash: string): Promise<void> {
  renderAt(hash);
  await waitFor(() => expect(screen.queryByRole("heading", { level: 1, name: "Kanban board" })).not.toBeNull());
}

function paneText(): string {
  return document.getElementById(PANE_ID)?.textContent ?? "";
}

async function readsNoBuildTimeOnTheProgramBoard() {
  await openAt("#/board");
  expect(screen.queryByText(NO_TIME), "the band states the missing time").not.toBeNull();
  expect(document.querySelector("time"), "no time element without built_at").toBeNull();
}

async function showsTheEpicIdOnAnEpicBoardWithoutTitles() {
  await openAt("#/board?program=beta");
  await found(() => screen.queryByRole("link", { name: "Open epic E1" }), "the epic card names its epic id");
  expect(screen.queryByText(NO_TIME), "the lower board states the missing time too").not.toBeNull();
  expect(paneText(), "no cell reads undefined").not.toMatch(/undefined/);
}

async function showsTheBuildTimeInATimeElement() {
  window.INDEX = BUILT_INDEX;
  await openAt("#/board");
  const time = await found(() => document.querySelector("time"), "the band holds a time element");
  expect(time.dateTime, "dateTime holds the ISO value").toBe(BUILT_AT);
  expect(paneText()).toMatch(/Index built \d{1,2} Nov 2026, \d{2}:\d{2}/);
  expect(screen.queryByText(NO_TIME), "no missing-time sentence beside a time").toBeNull();
}

async function keepsTheTimeOnTheEpicBoard() {
  window.INDEX = BUILT_INDEX;
  await openAt("#/board?program=beta");
  const time = await found(() => document.querySelector("time"), "the lower board holds the time element");
  expect(time.dateTime).toBe(BUILT_AT);
  expect(paneText()).not.toMatch(/undefined|Invalid Date|NaN/);
}

describe("an index from before the build time and the epic title", () => {
  it("reads No build time in this index on the program board", readsNoBuildTimeOnTheProgramBoard);
  it("shows the epic id and the missing time on an epic board without titles", showsTheEpicIdOnAnEpicBoardWithoutTitles);
  it("shows the build time in a time element whose dateTime is the ISO value", showsTheBuildTimeInATimeElement);
  it("keeps the build time in the band of the epic board", keepsTheTimeOnTheEpicBoard);
});
