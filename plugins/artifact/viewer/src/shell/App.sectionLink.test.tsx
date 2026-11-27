import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { DESIGNS, INDEX, installAdrs } from "./testSupport/App/fixtures";
import {
  at,
  currentSectionTab,
  firstSectionTab,
  levelHeading,
  press,
} from "./testSupport/App/queries";
import { renderAt } from "./testSupport/App/render";
import { installJsdomStubs } from "./testSupport/jsdom";

beforeAll(installJsdomStubs);

beforeEach(() => {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  installAdrs();
});

afterEach(cleanup);

function expectHeadingLinkShape(links: HTMLElement[]) {
  expect(links.length).toBeGreaterThan(0);
  expect(links[0].closest("header")?.querySelector("h2")).not.toBeNull();
  expect(links[0].getAttribute("href")).toBe("#/cobuilder-viewer/pull-requests/11");
}

async function readsInPr11AndLandsOnFirstSection() {
  renderAt("#/cobuilder-viewer/intent");
  await waitFor(() => expect(levelHeading()).toBe("Intent"));
  const links = await screen.findAllByRole("link", { name: "Read in PR 11 ›" });
  expectHeadingLinkShape(links);
  fireEvent.click(links[0]);
  await waitFor(() => expect(window.location.hash).toBe("#/cobuilder-viewer/pull-requests/11"));
  const back = await screen.findAllByRole("link", { name: "Read in the work item ›" });
  expect(back[0].getAttribute("href")).toBe("#/cobuilder-viewer/intent");
  expect(currentSectionTab()).toBe(firstSectionTab());
}

function pressRightTwice() {
  press("ArrowRight");
  press("ArrowRight");
}

function clickReadInPr() {
  fireEvent.click(screen.getAllByRole("link", { name: "Read in PR 11 ›" })[0]);
}

async function leaveAddressAndReturn() {
  at("#/cobuilder-viewer/intent");
  await waitFor(() => expect(levelHeading()).toBe("Intent"));
  at("#/cobuilder-viewer/pull-requests/11/architecture");
  await waitFor(() => expect(screen.getByText("Section 1 of 4")).toBeTruthy());
  expect(currentSectionTab()).toBe(firstSectionTab());
}

async function dropsCarriedNameOnLeaving() {
  renderAt("#/cobuilder-viewer/architecture");
  await waitFor(() => expect(levelHeading()).toBe("Architecture"));
  await screen.findAllByRole("link", { name: "Read in PR 11 ›" });
  pressRightTwice();
  await waitFor(() => expect(screen.getByText("Section 3 of 4")).toBeTruthy());
  clickReadInPr();
  await waitFor(() => expect(screen.getByText("Section 3 of 4")).toBeTruthy());
  await leaveAddressAndReturn();
}

async function carriesNameToSameNamedSection() {
  renderAt("#/cobuilder-viewer/architecture");
  await waitFor(() => expect(levelHeading()).toBe("Architecture"));
  await screen.findAllByRole("link", { name: "Read in PR 11 ›" });
  /* A new route starts on the first section, so landing on the third one is the carry. */
  pressRightTwice();
  await waitFor(() => expect(screen.getByText("Section 3 of 4")).toBeTruthy());
  clickReadInPr();
  await waitFor(() => expect(window.location.hash).toBe("#/cobuilder-viewer/pull-requests/11/architecture"));
  await waitFor(() => expect(screen.getByText("Section 3 of 4")).toBeTruthy());
}

async function drawsNoLinkOnPlanEpicsOrFileDiffs() {
  renderAt("#/cobuilder-viewer/build/epics");
  await waitFor(() => expect(levelHeading()).toBe("Build"));
  expect(screen.queryAllByRole("link", { name: /^Read in / })).toHaveLength(0);
  cleanup();
  renderAt("#/cobuilder-viewer/pull-requests/11/file-diffs");
  await waitFor(() => expect(levelHeading()).toBe("Pull request 11"));
  expect(screen.queryAllByRole("link", { name: /^Read in / })).toHaveLength(0);
}

describe("the link on a section heading", () => {
  it("reads in PR 11 and lands on the first section when no name matches", readsInPr11AndLandsOnFirstSection);
  it("drops the carried name once the reader leaves the address", dropsCarriedNameOnLeaving);
  it("carries the section name to the same-named section", carriesNameToSameNamedSection);
  it("draws no link on the Plan, Epics, or File Diffs levels", drawsNoLinkOnPlanEpicsOrFileDiffs);
});
