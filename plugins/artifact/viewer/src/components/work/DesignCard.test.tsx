import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import type { DesignRow, TrackerPullRequest } from "@/data/types";

import { DesignCard } from "./DesignCard";

afterEach(cleanup);

const records: TrackerPullRequest[] = [
  { ref: "pr-open", number: 43, state: "open", epics: ["d/E1"] },
  { ref: "pr-done", number: 44, state: "merged", epics: ["d/E2"] },
];

const epicOf = (n: number) => ({ id: `d/E${n}`, design: "d", epic_id: `E${n}`, state: "open", pr: null });

const nextReady = {
  id: "d/3",
  feature: "d",
  n: 3,
  title: "Third slice",
  ends_with: "",
  score: null,
  attempts: 0,
  state: "open",
};

const baseRow = {
  design: { id: "d", name: "d", outcome: "An outcome.", stage: "review" },
  epics: [1, 2, 3, 4, 5].map(epicOf),
  slices: [],
  done: 3,
  slicesDone: 2,
  slicesTotal: 4,
  nextReady,
  trackerPullRequests: records,
  stageSource: "tracker",
  trackerRead: true,
  pullRequests: [],
};

function rowOf(over: Partial<DesignRow>): DesignRow {
  return { ...baseRow, ...over } as DesignRow;
}

function Wrapped({ row }: { row: DesignRow }) {
  return (
    <TooltipProvider>
      <DesignCard row={row} />
    </TooltipProvider>
  );
}

function expectSummary(container: HTMLElement) {
  expect(container.textContent).toContain("of 5 epics closed");
  expect(container.textContent).toContain("2/4 slices");
}

function expectChips(container: HTMLElement) {
  const open = container.querySelector('[data-pr-state="open"]');
  const merged = container.querySelector('[data-pr-state="merged"]');
  expect(open?.textContent).toBe("#43 open");
  expect(merged?.textContent).toBe("#44 merged");
  expect(open?.querySelector("svg")).toBeNull();
  expect(merged?.querySelector("svg")).not.toBeNull();
}

function showsTrackerValues() {
  const { container, getByText } = render(<Wrapped row={rowOf({})} />);
  expectSummary(container);
  getByText("next: 3 Third slice");
  expectChips(container);
}

function showsNothingWhenUnread() {
  const { container } = render(<Wrapped row={rowOf({ trackerRead: false })} />);
  expect(container.querySelector("[data-pr-state]")).toBeNull();
  expect(container.textContent).not.toContain("next:");
}

describe("DesignCard tracker values", () => {
  it("shows closed epics, slices, next ready, and one chip per record", showsTrackerValues);

  it("shows no chip and no next ready when the tracker was not read", showsNothingWhenUnread);
});
