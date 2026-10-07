/**
 * The top bar's branch and supersedes marks, per slice 1 of level-page-restructure.
 *
 * The branch is quiet text next to the status badge. Nothing draws when there is no
 * branch, and the supersedes mark draws only when the work item supersedes a design.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SidebarProvider } from "@/components/ui/sidebar";

import { TopBar, type TopBarProps } from "./TopBar";

beforeAll(() => {
  /* jsdom has no `matchMedia`, and the sidebar provider asks for it on mount. */
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(cleanup);

function renderBar(over: Partial<TopBarProps>) {
  const props: TopBarProps = {
    workId: "w",
    workName: "w",
    stage: "building",
    supersededBy: null,
    branch: null,
    branches: [],
    supersedes: [],
    ready: true,
    board: false,
    designs: [],
    epics: [],
    onChooseWork: vi.fn(),
    onChooseEpic: vi.fn(),
    theme: "light",
    onToggleTheme: vi.fn(),
    onOpenWork: vi.fn(),
    paneId: "pane",
    nameId: "name",
    ...over,
  };
  return render(
    <SidebarProvider>
      <TopBar {...props} />
    </SidebarProvider>,
  );
}

describe("TopBar branch and supersedes", () => {
  it("shows the branch as text", () => {
    renderBar({ branch: "design/a", branches: ["design/a"] });
    expect(screen.getByText("design/a")).toBeTruthy();
    expect(screen.queryByText("+1")).toBeNull();
  });

  it("draws nothing when there is no branch", () => {
    const { container } = renderBar({});
    expect(container.textContent).not.toMatch(/branch/i);
    expect(container.querySelector("[title^='design']")).toBeNull();
  });

  it("shows the first of several branches and lists all in the title", () => {
    renderBar({ branch: "b/one", branches: ["b/one", "b/two", "b/three"] });
    expect(screen.getByText("b/one")).toBeTruthy();
    expect(screen.getByText("+2")).toBeTruthy();
    expect(screen.getByText("b/one").parentElement?.getAttribute("title")).toBe(
      "b/one\nb/two\nb/three",
    );
  });

  it("shows the supersedes mark only when the work supersedes a design", () => {
    const { unmount } = renderBar({});
    expect(screen.queryByText("supersedes")).toBeNull();
    unmount();
    renderBar({ supersedes: ["old-design"] });
    expect(screen.getByText("supersedes").getAttribute("title")).toContain("old-design");
  });
});
