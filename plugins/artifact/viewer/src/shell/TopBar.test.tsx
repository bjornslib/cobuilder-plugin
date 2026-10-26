/**
 * The top bar's branch and supersedes marks, per slice 1 of level-page-restructure.
 *
 * The branch is quiet text next to the status badge. Nothing draws when there is no
 * branch, and the supersedes mark draws only when the work item supersedes a design.
 */

import { cleanup, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { installMatchMedia } from "./testSupport/jsdom";
import { renderBar } from "./testSupport/TopBar/renderBar";

/* jsdom has no `matchMedia`, and the sidebar provider asks for it on mount. */
beforeAll(installMatchMedia);

afterEach(cleanup);

function showsBranchAsText() {
  renderBar({ branch: "design/a", branches: ["design/a"] });
  expect(screen.getByText("design/a")).toBeTruthy();
  expect(screen.queryByText("+1")).toBeNull();
}

function drawsNothingWithoutBranch() {
  const { container } = renderBar({});
  expect(container.textContent).not.toMatch(/branch/i);
  expect(container.querySelector("[title^='design']")).toBeNull();
}

function listsAllBranchesInTitle() {
  renderBar({ branch: "b/one", branches: ["b/one", "b/two", "b/three"] });
  expect(screen.getByText("b/one")).toBeTruthy();
  expect(screen.getByText("+2")).toBeTruthy();
  expect(screen.getByText("b/one").parentElement?.getAttribute("title")).toBe(
    "b/one\nb/two\nb/three",
  );
}

function showsSupersedesOnlyWhenSet() {
  const { unmount } = renderBar({});
  expect(screen.queryByText("supersedes")).toBeNull();
  unmount();
  renderBar({ supersedes: ["old-design"] });
  expect(screen.getByText("supersedes").getAttribute("title")).toContain("old-design");
}

describe("TopBar branch and supersedes", () => {
  it("shows the branch as text", showsBranchAsText);

  it("draws nothing when there is no branch", drawsNothingWithoutBranch);

  it("shows the first of several branches and lists all in the title", listsAllBranchesInTitle);

  it(
    "shows the supersedes mark only when the work supersedes a design",
    showsSupersedesOnlyWhenSet,
  );
});
