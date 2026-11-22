import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { installAdrs } from "../testSupport/App/fixtures";
import { BOARD_DESIGNS } from "../testSupport/board/fixtures";
import { NO_ORPHAN_INDEX, ORPHAN_INDEX } from "../testSupport/board/orphans";
import { boardColumn, found, openBoardAt, programsIn, shownPair } from "../testSupport/board/queries";
import { installJsdomStubs } from "../testSupport/jsdom";

const SCORED_NAME = "Show the end state, score, and attempts of Slice spare-plan/1";
const IN_PLACE = import.meta.glob<Record<string, unknown>>("./inPlaceCard.tsx", { eager: true });
const OLD_CARD = import.meta.glob<Record<string, unknown>>("./orphanCard.tsx", { eager: true });
const STAGE_LABELS = ["Needs a decision", "Ready to build", "In review", "Shipped"];

beforeAll(installJsdomStubs);

beforeEach(() => {
  window.INDEX = ORPHAN_INDEX;
  window.DESIGNS = BOARD_DESIGNS;
  installAdrs();
});

afterEach(cleanup);

function noProgramCard(): HTMLElement | null {
  return screen.queryByRole("link", { name: /No program/ });
}

function subject(): HTMLElement | null {
  return screen.queryByRole("heading", { level: 2, name: "No program" });
}

function holds(label: string, texts: string[]) {
  const region = boardColumn(label);
  expect(region, `the ${label} column`).not.toBeNull();
  for (const text of texts) {
    expect(within(region as HTMLElement).queryAllByText(text).length, `${text} sits in ${label}`).toBeGreaterThan(0);
  }
}

async function showsTheCardWithItsCounts() {
  await openBoardAt("#/board");
  const card = await found(noProgramCard, "the No program card");
  expect(card.getAttribute("href")).toBe("#/board?orphans=1");
  expect(card.textContent ?? "").toMatch(/6 slices in 3 plans/);
}

async function opensTheNoProgramBoard() {
  await openBoardAt("#/board");
  fireEvent.click(await found(noProgramCard, "the No program card"));
  await waitFor(() => expect(window.location.hash).toBe("#/board?orphans=1"));
  await found(subject, "the band names No program");
  holds("Planned", ["lost-plan", "Slice lost-plan/1"]);
  holds("In progress", ["spare-plan", "odd-plan", "Slice odd-plan/1"]);
  holds("Done", ["lost-plan", "spare-plan", "Slice spare-plan/3"]);
  expect(shownPair(/slices/i)).toBe("6 of 6");
}

async function expandsAnInPlaceSliceCard() {
  await openBoardAt("#/board?orphans=1");
  const card = await found(() => screen.queryByRole("button", { name: SCORED_NAME }), "the in-place slice card");
  expect([card.getAttribute("aria-expanded"), card.closest("a")], "collapsed, and not inside a link").toEqual(["false", null]);
  fireEvent.click(card);
  await waitFor(() => expect(card.getAttribute("aria-expanded")).toBe("true"));
  const panel = document.getElementById(card.getAttribute("aria-controls") ?? "");
  expect(panel?.textContent ?? "", "the end state, the score, and the attempts").toMatch(/The end state of spare-plan\/1\.[\s\S]*0\.93[\s\S]*2/);
  expect(window.location.hash, "no page opens").toBe("#/board?orphans=1");
}

function sliceCard(id: string): HTMLElement | null {
  return screen.queryByRole("button", { name: `Show the end state, score, and attempts of Slice ${id}` });
}

async function keepsOneCardOpenAtATime() {
  await openBoardAt("#/board?orphans=1");
  const first = await found(() => sliceCard("spare-plan/1"), "the first in-place slice card");
  const second = await found(() => sliceCard("lost-plan/1"), "the second in-place slice card");
  fireEvent.click(first);
  await waitFor(() => expect(first.getAttribute("aria-expanded")).toBe("true"));
  fireEvent.click(second);
  const states = () => [first, second].map((card) => card.getAttribute("aria-expanded"));
  await waitFor(() => expect(states(), "the second press closes the first").toEqual(["false", "true"]));
  fireEvent.click(second);
  await waitFor(() => expect(states(), "a press on the open card closes it").toEqual(["false", "false"]));
}

async function dropsTheCardWithNoOrphan() {
  await openBoardAt("#/board");
  await found(noProgramCard, "the card while orphan slices exist");
  cleanup();
  window.INDEX = NO_ORPHAN_INDEX;
  await openBoardAt("#/board");
  await found(() => screen.queryByRole("link", { name: "Open the epic board of beta" }), "the program board");
  expect(noProgramCard(), "no orphan slice, no card").toBeNull();
}

async function keepsTheCardOutsideTheProgramCount() {
  await openBoardAt("#/board");
  const card = await found(noProgramCard, "the No program card");
  expect(card.closest("section"), "the card sits outside every column").toBeNull();
  expect(shownPair(/programs/i)).toBe("4 of 6");
  expect(STAGE_LABELS.flatMap(programsIn)).not.toContain("No program");
  expect(STAGE_LABELS.flatMap(programsIn)).toHaveLength(4);
}

function namesTheInPlaceSliceCard() {
  expect(typeof IN_PLACE["./inPlaceCard.tsx"]?.InPlaceSliceCard, "inPlaceCard.tsx exports InPlaceSliceCard").toBe("function");
  expect(Object.keys(OLD_CARD), "orphanCard.tsx is gone").toEqual([]);
}

describe("the No program card", () => {
  it("shows the orphan count and the plan count, and targets #/board?orphans=1", showsTheCardWithItsCounts);
  it("opens the No program board with the orphan slices by status under their plan slug", opensTheNoProgramBoard);
  it("is absent when the index holds no orphan slice", dropsTheCardWithNoOrphan);
  it("never counts as a program", keepsTheCardOutsideTheProgramCount);
});

describe("the in-place slice card of the No program board", () => {
  it("expands in place with the end state, the score, and the attempts, and opens no page", expandsAnInPlaceSliceCard);
  it("keeps one card open at a time: a second card's press closes the first", keepsOneCardOpenAtATime);
  it("is InPlaceSliceCard in inPlaceCard.tsx", namesTheInPlaceSliceCard);
});
