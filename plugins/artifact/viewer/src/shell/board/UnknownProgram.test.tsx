import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { installAdrs } from "../testSupport/App/fixtures";
import { renderAt } from "../testSupport/App/render";
import { BOARD_DESIGNS, EPIC_BOARD_INDEX } from "../testSupport/board/fixtures";
import { installJsdomStubs } from "../testSupport/jsdom";

const SENTENCE = "The record index holds no program named “nope”. This is the program board.";

beforeAll(installJsdomStubs);

beforeEach(() => {
  window.INDEX = EPIC_BOARD_INDEX;
  window.DESIGNS = BOARD_DESIGNS;
  installAdrs();
});

afterEach(cleanup);

function notice(): HTMLElement | null {
  return screen.queryAllByRole("status").find((one) => (one.textContent ?? "").includes("holds no program")) ?? null;
}

async function openUnknown(): Promise<HTMLElement> {
  renderAt("#/board?program=nope");
  return waitFor(() => {
    expect(notice(), "the unknown program notice").not.toBeNull();
    return notice() as HTMLElement;
  });
}

async function showsTheProgramBoardAndTheSentence() {
  const region = await openUnknown();
  expect(region.textContent).toContain(SENTENCE);
  expect(region.getAttribute("aria-live")).toBe("polite");
  expect(region.getAttribute("aria-atomic")).toBe("true");
  expect(within(region).queryByRole("button", { name: "Close" })).not.toBeNull();
  expect(screen.queryByRole("region", { name: /^Ready to build\b/ }), "the program board").not.toBeNull();
  expect(screen.queryByRole("heading", { level: 2, name: "nope" }), "no epic board").toBeNull();
}

async function closeRemovesTheNotice() {
  const region = await openUnknown();
  fireEvent.click(within(region).getByRole("button", { name: "Close" }));
  await waitFor(() => expect(notice(), "Close removes the notice").toBeNull());
  expect(window.location.hash).toBe("#/board");
}

async function anAddressWriteRemovesTheNotice() {
  await openUnknown();
  fireEvent.click(screen.getByRole("button", { name: "Show Superseded, 2 programs" }));
  await waitFor(() => expect(notice(), "an address write removes the notice").toBeNull());
}

describe("the unknown program notice", () => {
  it("shows the program board and the sentence with a Close button", showsTheProgramBoardAndTheSentence);
  it("removes the notice and the value with Close", closeRemovesTheNotice);
  it("removes the notice on an address write", anAddressWriteRemovesTheNotice);
});
