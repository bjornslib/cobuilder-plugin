import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PANE_ID } from "../app/ids";
import { installAdrs } from "../testSupport/App/fixtures";
import { workItemName } from "../testSupport/App/queries";
import { renderAt } from "../testSupport/App/render";
import { BOARD_DESIGNS, BOARD_INDEX } from "../testSupport/board/fixtures";
import { installJsdomStubs } from "../testSupport/jsdom";
import { readBoardAddress } from "./address";

beforeAll(installJsdomStubs);

beforeEach(() => {
  window.INDEX = BOARD_INDEX;
  window.DESIGNS = BOARD_DESIGNS;
  installAdrs();
});

afterEach(cleanup);

function boardTitle(hidden = false): HTMLElement | null {
  return screen.queryByRole("heading", { level: 1, name: "Kanban board", hidden });
}

function column(label: string): HTMLElement | null {
  return screen.queryByRole("region", { name: new RegExp(`^${label}\\b`) });
}

function boardLink(): HTMLElement | null {
  return screen.queryByRole("link", { name: "Kanban board" });
}

async function openBoard(): Promise<void> {
  renderAt("#/board");
  await waitFor(() => expect(boardTitle(), "the board draws its h1").not.toBeNull());
}

function shownPair(unit: RegExp): string {
  const counts = screen.queryByLabelText("Shown counts");
  const term = Array.from(counts?.querySelectorAll("dt") ?? []).find((dt) => unit.test(dt.textContent ?? ""));
  return (term?.nextElementSibling?.textContent ?? "").trim();
}

async function drawsTheBand() {
  await openBoard();
  expect(document.getElementById(PANE_ID)?.getAttribute("aria-label")).toBe("Kanban board");
  expect(shownPair(/programs/i), "two superseded programs start hidden").toBe("4 of 6");
}

async function drawsTheFiveColumnHeads() {
  await openBoard();
  expect(column("Needs a decision")).not.toBeNull();
  expect(column("Needs a decision")?.getAttribute("aria-labelledby"), "a section named by its head").toBeTruthy();
  expect(column("Ready to build")).not.toBeNull();
  expect(column("In review")).not.toBeNull();
  expect(column("Shipped")).not.toBeNull();
  expect(column("Superseded"), "Superseded starts as a rail").toBeNull();
  expect(screen.queryByRole("button", { name: "Show Superseded, 2 programs" })).not.toBeNull();
}

function namesIn(label: string, names: string[]) {
  const region = column(label);
  expect(region, `the ${label} column`).not.toBeNull();
  for (const name of names) {
    expect(within(region as HTMLElement).queryAllByText(name).length, `${name} sits in ${label}`).toBeGreaterThan(0);
  }
}

async function drawsOneCardForEachProgram() {
  await openBoard();
  namesIn("Needs a decision", ["alpha"]);
  namesIn("Ready to build", ["beta"]);
  namesIn("In review", ["gamma"]);
  namesIn("Shipped", ["delta"]);
  const build = column("Ready to build")?.textContent ?? "";
  expect(build).toMatch(/3 of 6 (slices )?done/);
  expect(build).toMatch(/next #4/);
}

async function supersededRail(): Promise<HTMLElement> {
  return waitFor(() => {
    const found = screen.queryByRole("button", { name: "Show Superseded, 2 programs" });
    expect(found, "the Superseded rail").not.toBeNull();
    return found as HTMLElement;
  });
}

async function showsTheHiddenColumnAgain() {
  await openBoard();
  fireEvent.click(await supersededRail());
  await waitFor(() => expect(column("Superseded")).not.toBeNull());
  namesIn("Superseded", ["old-one", "old-two"]);
  expect(readBoardAddress(window.location.hash)?.hide, "the address keeps the choice").toEqual([]);
  expect(shownPair(/programs/i)).toBe("6 of 6");
}

async function marksTheTopBarLinkOnTheBoard() {
  await openBoard();
  expect(boardLink()?.getAttribute("href")).toBe("#/board");
  expect(boardLink()?.getAttribute("aria-current")).toBe("page");
}

async function leavesTheTopBarLinkUnmarkedElsewhere() {
  renderAt("#/beta/intent");
  await waitFor(() => expect(workItemName()).toBe("beta"));
  expect(boardLink(), "the link shows on every surface").not.toBeNull();
  expect(boardLink()?.getAttribute("aria-current")).toBeNull();
}

async function opensTheDrawerOverTheBoard() {
  await openBoard();
  fireEvent.click(screen.getByRole("button", { name: "Work board" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "WORK" })).not.toBeNull());
  expect(window.location.hash).toBe("#/board");
  expect(boardTitle(true), "the board stays under the drawer").not.toBeNull();
}

describe("the Kanban route", () => {
  it("draws the band with the shown program count", drawsTheBand);
  it("draws the five stage column heads, with Superseded as a rail", drawsTheFiveColumnHeads);
  it("draws one card for each visible program in the column of its stage", drawsOneCardForEachProgram);
  it("shows the Superseded column again from its rail, and the address keeps it", showsTheHiddenColumnAgain);
  it("marks the top bar link with aria-current on the board", marksTheTopBarLinkOnTheBoard);
  it("keeps the top bar link unmarked on another surface", leavesTheTopBarLinkUnmarkedElsewhere);
  it("opens the Work drawer over the board", opensTheDrawerOverTheBoard);
});
