import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { installAdrs } from "../testSupport/App/fixtures";
import { renderAt } from "../testSupport/App/render";
import { BOARD_DESIGNS, BOARD_INDEX } from "../testSupport/board/fixtures";
import { DONE_EPICS_INDEX, SEALED_EPIC, WAITING_EPIC } from "../testSupport/board/promptFixtures";
import { installJsdomStubs } from "../testSupport/jsdom";

const FAILED_TEXT = "/architect:design alpha";

beforeAll(installJsdomStubs);

beforeEach(() => {
  window.INDEX = BOARD_INDEX;
  window.DESIGNS = BOARD_DESIGNS;
  installAdrs();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

function stubClipboard(outcome: "resolve" | "reject") {
  const writeText = vi.fn((_text: string) => (outcome === "resolve" ? Promise.resolve() : Promise.reject(new Error("refused"))));
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  return writeText;
}

function copyButton(name: RegExp): HTMLElement | null {
  return screen.queryByRole("button", { name });
}

function notice(): HTMLElement | null {
  return screen.queryAllByRole("status").find((one) => /Prompt copied|Copy failed/.test(one.textContent ?? "")) ?? null;
}

async function openAt(hash: string, name: RegExp): Promise<HTMLElement> {
  renderAt(hash);
  return waitFor(() => {
    const found = copyButton(name);
    expect(found, `the copy button ${name}`).not.toBeNull();
    return found as HTMLElement;
  });
}

async function press(button: HTMLElement): Promise<void> {
  await act(async () => {
    fireEvent.click(button);
  });
}

async function copiesTheProgramPrompt() {
  const writeText = stubClipboard("resolve");
  await press(await openAt("#/board", /^Copy the start prompt for alpha$/));
  expect(writeText).toHaveBeenCalledWith("/architect:design alpha");
  expect(notice()?.textContent).toContain("Prompt copied");
}

async function copiesTheBuildPrompt() {
  const writeText = stubClipboard("resolve");
  await press(await openAt("#/board", /^Copy the start prompt for beta$/));
  expect(writeText).toHaveBeenCalledWith("/implement:start beta");
}

async function showsTheTextWhenTheWriteFails() {
  stubClipboard("reject");
  await press(await openAt("#/board", /^Copy the start prompt for alpha$/));
  const failed = notice() as HTMLElement;
  expect(failed?.textContent).toContain("Copy failed");
  expect(within(failed).queryByText(FAILED_TEXT)?.tagName, "the prompt sits in a code block").toBe("CODE");
  expect(within(failed).queryByRole("button", { name: "Close" })).not.toBeNull();
}

async function treatsAMissingClipboardAsRefused() {
  Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  await press(await openAt("#/board", /^Copy the start prompt for alpha$/));
  expect(notice()?.textContent).toContain("Copy failed");
}

async function closesTheFailureWithClose() {
  stubClipboard("reject");
  await press(await openAt("#/board", /^Copy the start prompt for alpha$/));
  await press(within(notice() as HTMLElement).getByRole("button", { name: "Close" }));
  expect(notice(), "Close removes the notice").toBeNull();
}

async function closesTheFailureWithEscape() {
  stubClipboard("reject");
  await press(await openAt("#/board", /^Copy the start prompt for alpha$/));
  await press(document.body);
  fireEvent.keyDown(document.body, { key: "Escape" });
  await waitFor(() => expect(notice(), "Escape removes the notice").toBeNull());
}

async function holdsTheCopiedNoticeFor1800Ms() {
  stubClipboard("resolve");
  const button = await openAt("#/board", /^Copy the start prompt for alpha$/);
  vi.useFakeTimers();
  await press(button);
  expect(notice()?.textContent, "the notice shows").toContain("Prompt copied");
  await act(() => vi.advanceTimersByTimeAsync(1799));
  expect(notice()?.textContent, "the notice holds at 1799 ms").toContain("Prompt copied");
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(notice(), "the notice ends at 1800 ms").toBeNull();
}

async function drawsNoIconOnAFinishedProgram() {
  await openAt("#/board", /^Copy the start prompt for alpha$/);
  expect(copyButton(/^Copy the start prompt for delta$/), "implemented has no next workflow").toBeNull();
}

async function startsAnOpenEpic() {
  const writeText = stubClipboard("resolve");
  window.INDEX = DONE_EPICS_INDEX;
  await press(await openAt("#/board?program=beta", /^Copy the start prompt for .*Wire the drawer/));
  expect(writeText).toHaveBeenCalledWith("/implement:start beta E2");
}

async function drawsNoIconOnAClosedEpic() {
  window.INDEX = DONE_EPICS_INDEX;
  await openAt("#/board?program=beta", /^Copy the start prompt for .*Wire the drawer/);
  expect(copyButton(/^Copy the start prompt for .*Ship the first cut/), "a closed epic has no icon").toBeNull();
}

async function marksOpenEpicsWithAllSlicesDone() {
  window.INDEX = DONE_EPICS_INDEX;
  await openAt("#/board?program=beta", /^Copy the start prompt for .*Wire the drawer/);
  expect(screen.queryAllByText("Slices done"), "E5 and E6 only, not the closed E1").toHaveLength(2);
}

async function copiesThePullRequestPrompts() {
  const writeText = stubClipboard("resolve");
  window.INDEX = DONE_EPICS_INDEX;
  await press(await openAt("#/board?program=beta", new RegExp(`^Copy the start prompt for .*${SEALED_EPIC}`)));
  await press(copyButton(new RegExp(`^Copy the start prompt for .*${WAITING_EPIC}`)) as HTMLElement);
  expect(writeText).toHaveBeenNthCalledWith(1, "/pr:generate feat/beta-E5");
  expect(writeText.mock.calls[1]?.[0]).toMatch(/^Check that pull request 7 of E6 merged, then record it with tracker.py set-pull-request-state/);
}

describe("the copy icon", () => {
  it("copies the program prompt and shows Prompt copied", copiesTheProgramPrompt);
  it("copies the build prompt of an approved program", copiesTheBuildPrompt);
  it("shows Copy failed with the text in a code block and a Close button", showsTheTextWhenTheWriteFails);
});

describe("the copy notice", () => {
  it("treats an absent clipboard as a refused write", treatsAMissingClipboardAsRefused);
  it("removes the failure with Close", closesTheFailureWithClose);
  it("removes the failure with Escape", closesTheFailureWithEscape);
  it("holds the copied notice for 1800 ms", holdsTheCopiedNoticeFor1800Ms);
});

describe("the copy icon on a card", () => {
  it("draws no icon on a program with no next workflow", drawsNoIconOnAFinishedProgram);
  it("copies the start prompt of an open epic", startsAnOpenEpic);
  it("draws no icon on a closed epic", drawsNoIconOnAClosedEpic);
  it("marks only the open epics with all slices done", marksOpenEpicsWithAllSlicesDone);
  it("copies the pull request prompts of a done epic", copiesThePullRequestPrompts);
});
