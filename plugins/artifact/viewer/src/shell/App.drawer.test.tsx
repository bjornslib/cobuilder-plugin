import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { DESIGNS, INDEX, installAdrs } from "./testSupport/App/fixtures";
import { drawerScope, levelHeading, workItemName } from "./testSupport/App/queries";
import { renderAt } from "./testSupport/App/render";
import { installJsdomStubs } from "./testSupport/jsdom";

beforeAll(installJsdomStubs);

beforeEach(() => {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  installAdrs();
});

afterEach(cleanup);

/*
  The rail's Work entry is gone (ADR-0034), so the top bar's icon is the
  one control that opens the deck from a Work surface. `href="#/"` was
  the old way back; the icon is the new one.
*/
async function opensDrawerFromWorkIcon() {
  renderAt("#/cobuilder-viewer/intent");
  const icon = await waitFor(() => screen.getByRole("button", { name: "Work board" }));
  fireEvent.click(icon);
  await waitFor(() => expect(drawerScope()).toBeTruthy());
  expect(window.location.hash).toBe("#/cobuilder-viewer/intent");
}

/*
  The harness used to answer `#/variations` and one address per variation, and the
  shell handed those addresses back whole. Slice 4 of cobuilder-viewer removes the
  harness from the shipped graph, so `#/variations` is an id the bundle lacks and
  nothing else: the shell states that, and it draws no variation switcher. The
  prototypes were removed from `src/variations/` on 2026-10-08.
*/
async function handsNoAddressToHarness() {
  renderAt("#/variations");
  await waitFor(() =>
    expect(screen.getByText("The route names an id the bundle lacks")).toBeTruthy(),
  );
  expect(screen.queryByRole("navigation", { name: "Variation" })).toBeNull();
}

async function openInflightThroughSearch(dialog: HTMLElement) {
  const field = within(dialog).getByRole("textbox", { name: "Search the work items" });
  fireEvent.change(field, { target: { value: "inflight" } });
  const link = await waitFor(() =>
    within(dialog).getByRole("link", { name: "Open work item: inflight-record-store" }),
  );
  fireEvent.click(link);
}

/*
  The deck's own path: the bare route opens the drawer, the search
  narrows to one row, the sole result reads itself, and the pane's link
  opens the surface the shell routes. The drawer closes as it leaves.
*/
async function opensWorkItemThroughDrawer() {
  renderAt("#/");
  await waitFor(() => expect(screen.getByRole("dialog", { name: "WORK" })).toBeTruthy());
  await openInflightThroughSearch(screen.getByRole("dialog", { name: "WORK" }));
  /* The drawer closed on its way out, and the surface it opened resolves. */
  await waitFor(() => expect(levelHeading()).toBe("Intent"));
  expect(workItemName()).toBe("inflight-record-store");
  expect(screen.getByText("The join resolves an open pull request.")).toBeTruthy();
}

async function opensRowAddressWithNoDrawer() {
  renderAt("#/");
  await waitFor(() => expect(screen.getByRole("dialog", { name: "WORK" })).toBeTruthy());
  /* A fresh page load of that address, the way a new tab would open it. */
  cleanup();
  renderAt("#/inflight-record-store/intent");
  await waitFor(() => expect(levelHeading()).toBe("Intent"));
  expect(workItemName()).toBe("inflight-record-store");
  expect(screen.getByText("The join resolves an open pull request.")).toBeTruthy();
  expect(screen.queryByText("The route names an id the bundle lacks")).toBeNull();
}

describe("Shell", () => {
  it("opens the drawer from the top bar's Work icon", opensDrawerFromWorkIcon);
  it("no longer hands an address to the comparison harness", handsNoAddressToHarness);
  it("opens a work item's surface through the drawer itself", opensWorkItemThroughDrawer);
  it("opens a row's address with no drawer first", opensRowAddressWithNoDrawer);
});
