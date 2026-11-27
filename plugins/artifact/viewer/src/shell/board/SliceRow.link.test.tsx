import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { installAdrs } from "../testSupport/App/fixtures";
import { renderAt } from "../testSupport/App/render";
import { BOARD_DESIGNS, EPIC_BOARD_INDEX } from "../testSupport/board/fixtures";
import { installJsdomStubs } from "../testSupport/jsdom";

const SLICE_TARGETS = [
  ["Done", "Slice beta/3", "#/beta/build/epics/E1/3"],
  ["In progress", "Slice beta/5", "#/beta/build/epics/E2/5"],
  ["Planned", "Slice beta/4", "#/beta/build/epics/E2/4"],
  ["Planned", "Slice beta/6", "#/beta/build/epics/E3/6"],
] as const;

beforeAll(installJsdomStubs);

beforeEach(() => {
  window.INDEX = EPIC_BOARD_INDEX;
  window.DESIGNS = BOARD_DESIGNS;
  installAdrs();
});

afterEach(cleanup);

async function found<T>(read: () => T | null, what: string): Promise<T> {
  return waitFor(() => {
    const value = read();
    expect(value, what).not.toBeNull();
    return value as T;
  });
}

function column(label: string): HTMLElement | null {
  return screen.queryByRole("region", { name: new RegExp(`^${label}\\b`) });
}

function cardLink(label: string, title: string): string | null {
  const region = column(label);
  const text = region === null ? null : within(region).queryAllByText(title)[0];
  return text?.closest("a")?.getAttribute("href") ?? null;
}

async function openPipsList(): Promise<HTMLElement> {
  renderAt("#/board?program=beta");
  const toggle = await found(() => screen.queryByRole("button", { name: "Show the 3 slices of Ship the first cut" }), "the pips toggle of E1");
  fireEvent.click(toggle);
  await waitFor(() => expect(toggle.getAttribute("aria-expanded")).toBe("true"));
  return document.getElementById(toggle.getAttribute("aria-controls") ?? "") as HTMLElement;
}

async function linksEachPipsRow() {
  const list = await openPipsList();
  const hrefs = Array.from(list.querySelectorAll("a")).map((link) => link.getAttribute("href"));
  expect(hrefs, "each slice row of the open list links to its slice address").toEqual([
    "#/beta/build/epics/E1/1",
    "#/beta/build/epics/E1/2",
    "#/beta/build/epics/E1/3",
  ]);
}

async function linksEachSliceCard() {
  renderAt("#/board?program=beta&cards=slices");
  await found(() => column("Done"), "the slices grain");
  const read = SLICE_TARGETS.map(([label, title]) => [label, title, cardLink(label, title)]);
  expect(read, "each slice card links to its slice address").toEqual(SLICE_TARGETS.map((row) => [...row]));
}

async function opensTheSliceAddressFromACard() {
  renderAt("#/board?program=beta&cards=slices");
  await found(() => column("Done"), "the slices grain");
  const link = within(column("Done") as HTMLElement).queryAllByText("Slice beta/3")[0]?.closest("a");
  expect(link, "the Done card of slice 3 is a link").toBeTruthy();
  fireEvent.click(link as HTMLAnchorElement);
  await waitFor(() => expect(window.location.hash).toBe("#/beta/build/epics/E1/3"));
}

describe("the slice links of the epic board", () => {
  it("links each slice row of an open pips list to its slice address", linksEachPipsRow);
  it("links each slice card of the slices grain to its slice address", linksEachSliceCard);
  it("opens the slice address from a slice card", opensTheSliceAddressFromACard);
});
