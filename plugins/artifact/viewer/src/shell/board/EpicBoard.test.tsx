import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { installAdrs } from "../testSupport/App/fixtures";
import { renderAt } from "../testSupport/App/render";
import { BOARD_DESIGNS, EPIC_BOARD_INDEX } from "../testSupport/board/fixtures";
import { installJsdomStubs } from "../testSupport/jsdom";

const NOTE = "2 slices join no epic. Switch to Slices to see them.";
const ORPHAN_NAME = "Show the end state, score, and attempts of Slice beta/7";

beforeAll(installJsdomStubs);

beforeEach(() => {
  window.INDEX = EPIC_BOARD_INDEX;
  window.DESIGNS = BOARD_DESIGNS;
  installAdrs();
});

afterEach(cleanup);

function subject(): HTMLElement | null {
  return screen.queryByRole("heading", { level: 2, name: "beta" });
}

function column(label: string): HTMLElement | null {
  return screen.queryByRole("region", { name: new RegExp(`^${label}\\b`) });
}

async function openAt(hash: string): Promise<void> {
  renderAt(hash);
  await waitFor(() => expect(screen.queryByRole("heading", { level: 1, name: "Kanban board" })).not.toBeNull());
}

async function found<T>(read: () => T | null, what: string): Promise<T> {
  return waitFor(() => {
    const value = read();
    expect(value, what).not.toBeNull();
    return value as T;
  });
}

function shownPair(unit: RegExp): string {
  const counts = screen.queryByLabelText("Shown counts");
  const term = Array.from(counts?.querySelectorAll("dt") ?? []).find((dt) => unit.test(dt.textContent ?? ""));
  return (term?.nextElementSibling?.textContent ?? "").trim();
}

async function opensTheEpicBoardFromAProgramCard() {
  await openAt("#/board");
  const target = await found(() => screen.queryByRole("link", { name: "Open the epic board of beta" }), "the card target");
  expect(target.getAttribute("href")).toBe("#/board?program=beta");
  fireEvent.click(target);
  await waitFor(() => expect(window.location.hash).toBe("#/board?program=beta"));
  await found(subject, "the band names the program");
}

async function movesFocusToTheProgramName() {
  await openAt("#/board");
  fireEvent.click(await found(() => screen.queryByRole("link", { name: "Open the epic board of beta" }), "the card target"));
  await waitFor(() => expect(document.activeElement).toBe(subject()));
  expect(document.activeElement?.tagName).toBe("H2");
}

function backLink(): HTMLElement | null {
  return screen.queryByRole("link", { name: /All programs/ });
}

async function returnsWithAllPrograms() {
  await openAt("#/board?program=beta");
  await found(subject, "the epic board");
  const back = await found(backLink, "the back link");
  expect(back.getAttribute("href")).toBe("#/board");
  fireEvent.click(back);
  await waitFor(() => expect(window.location.hash).toBe("#/board"));
  await waitFor(() => expect(subject(), "the program board has no subject").toBeNull());
  expect(backLink(), "the program board has no back link").toBeNull();
}

async function keepsOnlyTheSearchOnTheWayBack() {
  await openAt("#/board?program=beta&q=wire&cards=slices");
  const back = await found(backLink, "the back link");
  expect(back.getAttribute("href")).toBe("#/board?q=wire");
}

function holds(label: string, texts: string[]) {
  const region = column(label);
  expect(region, `the ${label} column`).not.toBeNull();
  for (const text of texts) {
    expect(within(region as HTMLElement).queryAllByText(text).length, `${text} sits in ${label}`).toBeGreaterThan(0);
  }
}

async function placesEachEpicWithItsTitle() {
  await openAt("#/board?program=beta");
  await found(() => column("Planned"), "the Planned column");
  holds("Planned", ["Polish the board"]);
  holds("In progress", ["Wire the drawer", "Close the gaps", "no-pull-request"]);
  holds("Done", ["Ship the first cut"]);
  expect(column("Needs a decision"), "the stage columns are gone").toBeNull();
  expect(shownPair(/epics/i)).toBe("4 of 4");
}

async function opensTheEpicPageFromItsHead() {
  await openAt("#/board?program=beta");
  const head = await found(() => screen.queryByRole("link", { name: "Open epic Wire the drawer" }), "the epic head");
  expect(head.getAttribute("href")).toBe("#/beta/build/epics/E2");
}

function cardsButton(name: string): HTMLElement | null {
  const group = screen.queryByRole("group", { name: "Cards" });
  return group === null ? null : within(group).queryByRole("button", { name });
}

async function switchesToTheSlicesGrain() {
  await openAt("#/board?program=beta");
  const slices = await found(() => cardsButton("Slices"), "the Cards switch");
  expect(cardsButton("Epics")?.getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(slices);
  await waitFor(() => expect(window.location.hash).toBe("#/board?program=beta&cards=slices"));
  await waitFor(() => expect(cardsButton("Slices")?.getAttribute("aria-pressed")).toBe("true"));
  holds("Planned", ["No epic", "Slice beta/7"]);
  holds("Done", ["No epic", "Slice beta/8"]);
  expect(shownPair(/slices/i), "the slices total counts the unjoined slices").toBe("8 of 8");
}

async function gatesTheCardsSwitchToTheEpicBoard() {
  await openAt("#/board?program=beta");
  await found(() => cardsButton("Slices"), "the switch on the epic board");
  cleanup();
  await openAt("#/board");
  expect(screen.queryByRole("group", { name: "Cards" }), "no switch on the program board").toBeNull();
}

async function expandsTheNoEpicCardInPlace() {
  await openAt("#/board?program=beta&cards=slices");
  const card = await found(() => screen.queryByRole("button", { name: ORPHAN_NAME }), "the No epic card");
  expect(card.getAttribute("aria-expanded")).toBe("false");
  expect(card.closest("a"), "the card is not inside a link").toBeNull();
  fireEvent.click(card);
  await waitFor(() => expect(card.getAttribute("aria-expanded")).toBe("true"));
  expect(screen.queryAllByText("The end state of beta/7.").length, "the panel shows the end state").toBeGreaterThan(0);
  expect(window.location.hash, "no page opens").toBe("#/board?program=beta&cards=slices");
}

async function statesTheUnjoinedCountUnderTheColumns() {
  await openAt("#/board?program=beta");
  const note = await found(() => screen.queryByText(NOTE), "the note");
  const done = column("Done") as HTMLElement;
  expect(note.closest("section"), "the note sits outside every column").toBeNull();
  expect(done.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING, "the note follows the columns").toBeTruthy();
}

async function dropsTheNoteOnTheSlicesGrain() {
  await openAt("#/board?program=beta&cards=slices");
  await found(() => screen.queryByRole("button", { name: ORPHAN_NAME }), "the slices grain");
  expect(screen.queryByText(NOTE)).toBeNull();
}

async function opensTheSliceRowsInPlace() {
  await openAt("#/board?program=beta");
  const toggle = await found(() => screen.queryByRole("button", { name: "Show the 2 slices of Wire the drawer" }), "the pips toggle");
  expect([toggle.getAttribute("aria-expanded"), toggle.closest("a")], "collapsed, and outside the head link").toEqual(["false", null]);
  expect(screen.queryByText("Slice beta/4"), "the slice list starts collapsed").toBeNull();
  fireEvent.click(toggle);
  await waitFor(() => expect(toggle.getAttribute("aria-expanded")).toBe("true"));
  expect(screen.queryByRole("button", { name: "Hide the 2 slices of Wire the drawer" }), "the open toggle names its next press").toBe(toggle);
  const list = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
  expect(list?.textContent ?? "", "aria-controls names the slice list").toMatch(/Slice beta\/4[\s\S]*Slice beta\/5/);
  expect(window.location.hash, "the toggle writes no address").toBe("#/board?program=beta");
}

async function gatesTheToggleToAnEpicWithSlices() {
  await openAt("#/board?program=beta");
  await found(() => screen.queryByRole("button", { name: "Show the 2 slices of Wire the drawer" }), "the toggle of an epic with slices");
  expect(screen.queryByRole("button", { name: /slices of Close the gaps/ }), "an epic with no slice has no toggle").toBeNull();
}

describe("the epic board", () => {
  it("opens the epic board from a program card", opensTheEpicBoardFromAProgramCard);
  it("moves focus to the program name on the epic board", movesFocusToTheProgramName);
  it("returns to the program board with All programs", returnsWithAllPrograms);
  it("keeps only the search on the way back", keepsOnlyTheSearchOnTheWayBack);
  it("places each epic in its status column with its tracker title and raw word", placesEachEpicWithItsTitle);
  it("opens the epic page from an epic card head", opensTheEpicPageFromItsHead);
  it("switches to the slices grain, with a No epic head in each state column", switchesToTheSlicesGrain);
  it("shows the Cards switch on the epic board only", gatesTheCardsSwitchToTheEpicBoard);
  it("opens an epic's slice rows in place from the pips toggle, and writes no address", opensTheSliceRowsInPlace);
  it("shows the pips toggle only on an epic that holds a slice", gatesTheToggleToAnEpicWithSlices);
});

describe("the No epic group of the epic board", () => {
  it("expands a No epic card in place and opens no page", expandsTheNoEpicCardInPlace);
  it("states the count of unjoined slices under the columns on the epics grain", statesTheUnjoinedCountUnderTheColumns);
  it("drops the unjoined note on the slices grain", dropsTheNoteOnTheSlicesGrain);
});
