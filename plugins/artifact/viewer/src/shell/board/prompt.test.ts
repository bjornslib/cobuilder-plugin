import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { DesignEntity, SliceEntity } from "@/data/types";
import type { BoardEpic } from "@/data/types/board";

const PROMPT = import.meta.glob<Record<string, unknown>>("./prompt.ts", { eager: true });
const EPIC_CARD = import.meta.glob<Record<string, unknown>>("./epicCard.tsx", { eager: true });

const MERGE_CHECK = (pr: number) =>
  `Check that pull request ${pr} of E2 merged, then record it with tracker.py set-pull-request-state and close the epic with tracker.py set-epic-state`;

function exported<T>(name: string): T {
  const found = PROMPT["./prompt.ts"]?.[name];
  expect(typeof found, `prompt.ts exports ${name}`).toBe("function");
  return found as T;
}

const program = (stage: string): DesignEntity => ({ id: "kanban", name: "kanban", outcome: "", stage });

const epic = (over: Partial<BoardEpic> = {}): BoardEpic => ({
  id: "kanban/E2",
  epicId: "E2",
  design: "kanban",
  title: null,
  branch: "feat/kanban-E2",
  pr: null,
  status: "open",
  lifecycle: "open",
  ...over,
});

const slice = (n: number, state: string): SliceEntity => ({
  id: `kanban/${n}`,
  feature: "kanban",
  n,
  title: `Slice ${n}`,
  ends_with: "",
  score: null,
  attempts: 0,
  state,
});

const DONE = [slice(1, "completed"), slice(2, "completed")];
const MIXED = [slice(1, "completed"), slice(2, "planned")];

function promptOfProgram(stage: string): string | null {
  return exported<(design: DesignEntity) => string | null>("programPrompt")(program(stage));
}

function promptOfEpic(row: BoardEpic, slices: SliceEntity[]): string | null {
  return exported<(one: BoardEpic, rows: readonly SliceEntity[]) => string | null>("epicPrompt")(row, slices);
}

function designsFromBacklogDecidedReview() {
  expect(["backlog", "decided", "review"].map(promptOfProgram)).toEqual(Array(3).fill("/architect:design kanban"));
}

function buildsFromApproved() {
  expect(promptOfProgram("approved")).toBe("/implement:start kanban");
}

function givesNoIconToAFinishedProgram() {
  expect([promptOfProgram("implemented"), promptOfProgram("superseded")]).toEqual([null, null]);
}

function startsAnEpicWithASliceNotDone() {
  expect(promptOfEpic(epic(), MIXED)).toBe("/implement:start kanban E2");
}

function startsAnEpicWithNoSlice() {
  expect(promptOfEpic(epic(), [])).toBe("/implement:start kanban E2");
}

function opensThePullRequestWhenAllSlicesAreDone() {
  expect(promptOfEpic(epic(), DONE)).toBe("/pr:generate feat/kanban-E2");
}

function checksTheMergeOfAPullRequest() {
  expect(promptOfEpic(epic({ pr: 17 }), DONE)).toBe(MERGE_CHECK(17));
}

function checksTheMergeOfAMergedEpic() {
  expect(promptOfEpic(epic({ pr: 18, status: "merged" }), DONE)).toBe(MERGE_CHECK(18));
}

function givesNoIconToAClosedEpic() {
  expect(promptOfEpic(epic({ lifecycle: "closed" }), MIXED), "a closed epic with a slice open").toBeNull();
  expect(promptOfEpic(epic({ lifecycle: "closed", pr: 17 }), DONE), "a closed epic with a pull request").toBeNull();
}

function givesNoIconWithoutABranch() {
  expect(promptOfEpic(epic({ branch: null }), DONE)).toBeNull();
}

function readsTheSlicesDoneRule() {
  const rule = exported<(one: BoardEpic, rows: readonly SliceEntity[]) => boolean>("slicesDoneOf");
  expect(rule(epic(), DONE), "open, all done").toBe(true);
  expect(rule(epic({ branch: null }), DONE), "no branch still counts").toBe(true);
  expect([rule(epic(), MIXED), rule(epic(), []), rule(epic({ lifecycle: "closed" }), DONE)]).toEqual([false, false, false]);
}

function drawsTheSlicesDoneMark() {
  const mark = EPIC_CARD["./epicCard.tsx"]?.SlicesDoneMark;
  expect(typeof mark, "epicCard.tsx exports SlicesDoneMark").toBe("function");
  expect(renderToStaticMarkup(createElement(mark as ComponentType))).toContain("Slices done");
}

describe("the program prompt rule", () => {
  it("designs a program in backlog, decided, or review", designsFromBacklogDecidedReview);
  it("builds an approved program", buildsFromApproved);
  it("gives no prompt to an implemented or superseded program", givesNoIconToAFinishedProgram);
});

describe("the epic prompt rule", () => {
  it("starts an epic that holds a slice not done", startsAnEpicWithASliceNotDone);
  it("starts an epic that holds no slice", startsAnEpicWithNoSlice);
  it("opens the pull request of an epic with all slices done", opensThePullRequestWhenAllSlicesAreDone);
  it("checks the merge when the epic holds a pull request", checksTheMergeOfAPullRequest);
  it("checks the merge when the status is merged", checksTheMergeOfAMergedEpic);
});

describe("the epic marks", () => {
  it("gives no prompt to a closed epic, even with a pull request", givesNoIconToAClosedEpic);
  it("gives no prompt to a done epic with no branch", givesNoIconWithoutABranch);
  it("marks only an open epic with at least one slice, all done", readsTheSlicesDoneRule);
  it("draws the Slices done mark", drawsTheSlicesDoneMark);
});
