import { describe, expect, it } from "vitest";

import * as readiness from "./readiness";
import {
  ALONE_PULL_REQUESTS,
  MIXED_SOURCES,
  TAB_SOURCES,
  designRowOf,
  designSource,
  pullRequestOf,
  prIdsOf,
  prSource,
  type BoardRules,
  type PullRequestSource,
  type Source,
} from "./testSupport/readiness/board";

const rules = readiness as unknown as BoardRules;

/** One rule, or a failure that names it. A missing rule reads as an assertion. */
function rule<K extends keyof BoardRules>(name: K): BoardRules[K] {
  const found = rules[name];
  expect(typeof found, `readiness.ts must export ${String(name)}`).toBe("function");
  return found;
}

const withKind = (kind: string) => MIXED_SOURCES.filter((source) => rule("matchesKind")(source, kind));

function expectSomeRowRecords(sources: Source[], tab: string) {
  expect(
    sources.some((source) => rules.boardStatus(source) === tab),
    `a tab reads ${tab}, and some row records it`,
  ).toBe(true);
}

function expectPullRequestSources(alone: Source[]) {
  const pullRows = alone.filter(
    (source): source is PullRequestSource => source.kind === "pull-request",
  );
  expect(pullRows, "every PR-alone source carries a pull request").toHaveLength(alone.length);
  for (const source of pullRows) {
    expect(source.row.title, "a row carries the pull request's own title").toBeTruthy();
  }
}

function namesTwoRowKinds() {
  const kinds = rules.ROW_KINDS;
  expect(kinds, "readiness.ts must export ROW_KINDS").toBeTruthy();
  expect(kinds.slice().sort()).toEqual(["design", "pull-request"]);
  expect(new Set(kinds).size, "one entry per kind").toBe(kinds.length);
  const labels = rules.ROW_KIND_LABEL;
  expect(labels, "readiness.ts must export ROW_KIND_LABEL").toBeTruthy();
  expect(labels["pull-request"], "PR names the kind and never a status").toBe("PR");
  expect(labels.design, "the design kind carries its own word").toBeTruthy();
}

function readsStatusOfRow() {
  const boardStatus = rule("boardStatus");

  expect(boardStatus(designSource("approved"))).toBe("approved");
  expect(boardStatus(designSource("superseded"))).toBe("superseded");
  expect(boardStatus(prSource(17, "open"))).toBe("open");
  expect(boardStatus(prSource(1, "merged"))).toBe("merged");
}

function namesEachStatusOnce() {
  const tabs = rule("statusTabs")(TAB_SOURCES);

  expect(new Set(tabs).size, "a status is named once").toBe(tabs.length);
  expect(tabs.slice().sort()).toEqual(["approved", "backlog", "merged", "open"]);
  expect(tabs, "no row carries review").not.toContain("review");
  for (const tab of tabs) expectSomeRowRecords(TAB_SOURCES, tab);
}

function keepsRowsThatCarryStatus() {
  const matchesStatus = rule("matchesStatus");
  const open = MIXED_SOURCES.filter((source) => matchesStatus(source, "open"));
  expect(prIdsOf(open)).toEqual([17]);
  const approved = MIXED_SOURCES.filter((source) => matchesStatus(source, "approved"));
  expect(approved).toHaveLength(1);
  expect(approved[0].kind).toBe("design");
  for (const source of MIXED_SOURCES) {
    expect(matchesStatus(source, "review"), "no row carries review").toBe(false);
  }
}

function keepsOneKindAlone() {
  const designOnly = withKind("design");
  expect(designOnly).toHaveLength(2);
  expect(designOnly.every((source) => source.kind === "design")).toBe(true);
  expect(prIdsOf(withKind("pull-request"))).toEqual([17, 1]);
  const matchesStatus = rule("matchesStatus");
  const openPrOnly = withKind("pull-request").filter((source) => matchesStatus(source, "open"));
  expect(prIdsOf(openPrOnly)).toEqual([17]);
}

function listsPullRequestAloneOnce() {
  const rows = [designRowOf("approved", [11]), designRowOf("backlog", [11, 12])];
  const alone = rule("prAloneSources")(rows, ALONE_PULL_REQUESTS);

  expect(prIdsOf(alone)).toEqual([17, 22]);
  expect(new Set(prIdsOf(alone)).size, "one row per pull request").toBe(alone.length);
  expectPullRequestSources(alone);
}

function listsPullRequestAloneInIdOrder() {
  const rows = [designRowOf("approved", [])];
  const pullRequests = [
    pullRequestOf(22, "open"),
    pullRequestOf(3, "merged"),
    pullRequestOf(17, "open"),
  ];

  expect(prIdsOf(rule("prAloneSources")(rows, pullRequests))).toEqual([3, 17, 22]);
}

describe("the board's rows", () => {
  it("names the two row kinds, and words a pull request's kind as PR", namesTwoRowKinds);
  it("reads a row's status as a design's stage or a pull request's own state", readsStatusOfRow);
  it("names each status its rows record once, and no status no row carries", namesEachStatusOnce);
  it("keeps every row that carries a status, and drops every other one", keepsRowsThatCarryStatus);
  it(
    "keeps one kind alone, and the two rules together keep one state's PR rows",
    keepsOneKindAlone,
  );
});

describe("the board's rows", () => {
  it("lists a pull request alone once, and drops one a design's epics carry", listsPullRequestAloneOnce);
  it("lists a pull request alone in id order, whatever order the index holds", listsPullRequestAloneInIdOrder);
});
