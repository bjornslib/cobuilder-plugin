/**
 * The readiness rule, on its own.
 *
 * `recordVerdicts` turns one design's authored records into a verdict per record kind.
 * `presentCount` counts how many of the six records exist. Both are pure, so this file
 * needs no DOM, no bundle, and no runner setup beyond Vitest itself.
 *
 * Every fixture is written the way `data/designs.js` writes a record. The fixtures reach
 * `DesignRecord` through `unknown` on purpose: this file fixes what the rule reads, not
 * how the record type spells its optionality.
 *
 * Slice 18 adds the board's own row rules to this file: which status a row states, which
 * statuses the strip names, which rows a status tab and a kind tab keep, and which pull
 * requests the board lists alone. Those rules are pure, so they need no DOM either, and
 * the file is where `readiness.ts` keeps them. They read the module through the
 * `BoardRules` shape below, because the file fixes the contract before the code exists.
 */

import { describe, expect, it } from "vitest";

import type { DesignRow, PullRequest } from "@/data/types";

import * as readiness from "./readiness";
import {
  RECORD_KINDS,
  RECORD_LABEL,
  presentCount,
  recordVerdicts,
  type DesignRecord,
} from "./readiness";

/* ------------------------------------------------------------------ fixtures */

function record(parts: Record<string, unknown>): DesignRecord {
  return parts as unknown as DesignRecord;
}

/** A whole goal, so a fixture can vary one record and leave the other five whole. */
const GOAL = {
  name: "cobuilder-viewer",
  title: "The Work board",
  created: "2026-09-22",
  outcome: "A reader arrives on the board and surveys every design.",
  done_when: ["Every design reads as a row."],
  min_work: { challenge_stage_run: true },
  stage: "approved",
  supersedes: null,
  adr: null,
  adrs: ["ADR-0028"],
};

/** The goal above, plus the records a fixture chooses to add. */
function withGoal(parts: Record<string, unknown> = {}): DesignRecord {
  return record({ goal: GOAL, ...parts });
}

/** A whole record of every kind, as the richest design in the bundle writes one. */
const EVERY_RECORD = withGoal({
  intent: {
    problem: "An open pull request is no entity in the index.",
    approach: "Add the entity and refine the join.",
    risks: ["The placeholder reads as a real state."],
    unknowns: ["How many epics point at an open pull request."],
  },
  narrative: {
    landscape: { narration: "The index reads merged history." },
    problem_solution: { narration: "The open set is absent." },
    architecture: { narration: "One derived index resolves the open set." },
  },
  assessment: {
    verdict: "proceed",
    summary: "The gap is recorded and scoped.",
    findings: [
      { kind: "drift", title: "The placeholder is not a state.", detail: "Refine it." },
    ],
  },
  pr_draft: "# The open set\n\n## What changes\n\nOne entity.\n\n## Why now\n\nA gap.\n",
  diagrams: {
    "1": "C4Container\n",
    "2": "sequenceDiagram\n",
    "3": "classDiagram\n",
  },
});

/* -------------------------------------------------------------------- tests */

describe("readiness", () => {
  it("names the six record kinds in reading order", () => {
    expect(RECORD_KINDS).toEqual([
      "goal",
      "intent",
      "narrative",
      "assessment",
      "pr-draft",
      "diagrams",
    ]);

    const labels = RECORD_KINDS.map((kind) => RECORD_LABEL[kind]);
    expect(labels.every((label) => typeof label === "string" && label.length > 0)).toBe(
      true,
    );
    expect(new Set(labels).size).toBe(RECORD_KINDS.length);
  });

  it("reads a design holding every record as present on all six", () => {
    const verdicts = recordVerdicts(EVERY_RECORD);

    for (const kind of RECORD_KINDS) {
      expect(verdicts[kind].state, RECORD_LABEL[kind]).toBe("present");
      expect(verdicts[kind].missing, RECORD_LABEL[kind]).toEqual([]);
    }
    expect(presentCount(verdicts)).toBe(6);
  });

  it("reads a design designs.js does not carry as absent on all six", () => {
    const verdicts = recordVerdicts(undefined);

    for (const kind of RECORD_KINDS) {
      expect(verdicts[kind].state, RECORD_LABEL[kind]).toBe("absent");
    }
    expect(presentCount(verdicts)).toBe(0);
  });

  it("counts a partial record as held and an absent one as not held", () => {
    const verdicts = recordVerdicts(
      withGoal({
        intent: { problem: "A problem.", approach: "An approach.", risks: [], unknowns: [] },
        narrative: { landscape: { narration: "Only the landscape." } },
      }),
    );

    expect(verdicts.intent.state).toBe("partial");
    expect(verdicts.narrative.state).toBe("partial");
    expect(verdicts.assessment.state).toBe("absent");
    expect(presentCount(verdicts)).toBe(3);
  });

  it("names design mode's stages 2 to 7 as the goal's missing part on a backlog design", () => {
    const verdicts = recordVerdicts(
      withGoal({ goal: { ...GOAL, min_work: { challenge_stage_run: false } } }),
    );

    expect(verdicts.goal.state).toBe("partial");
    expect(verdicts.goal.missing).toHaveLength(1);
    expect(verdicts.goal.missing.join(" ")).toMatch(/stages 2 to 7/);
    expect(verdicts.intent.state).toBe("absent");
    expect(presentCount(verdicts)).toBe(1);
  });

  it("names the goal's empty fields when the goal omits them", () => {
    const verdicts = recordVerdicts(
      withGoal({ goal: { ...GOAL, outcome: "   ", done_when: [] } }),
    );

    expect(verdicts.goal.state).toBe("partial");
    expect(verdicts.goal.missing).toContain("outcome");
    expect(verdicts.goal.missing).toContain("done_when");
  });

  it("names the intent's empty fields", () => {
    const verdicts = recordVerdicts(
      withGoal({ intent: { problem: "A problem.", approach: "  ", risks: [], unknowns: [] } }),
    );

    expect(verdicts.intent.state).toBe("partial");
    expect(verdicts.intent.missing).toContain("approach");
    expect(verdicts.intent.missing).toContain("risks");
    expect(verdicts.intent.missing).toContain("unknowns");
  });

  it("reads a narrative whose three levels sit under levels as present", () => {
    const verdicts = recordVerdicts(
      withGoal({
        narrative: {
          levels: {
            landscape: { narration: "The landscape." },
            problem_solution: { narration: "The problem and the solution." },
            architecture: { narration: "The architecture." },
          },
        },
      }),
    );

    expect(verdicts.narrative.state).toBe("present");
    expect(verdicts.narrative.missing).toEqual([]);
  });

  it("names the narrative level that carries no narration", () => {
    const verdicts = recordVerdicts(
      withGoal({
        narrative: {
          landscape: { narration: "The landscape." },
          problem_solution: { narration: "The problem and the solution." },
        },
      }),
    );

    expect(verdicts.narrative.state).toBe("partial");
    expect(verdicts.narrative.missing.join(" ")).toMatch(/architecture/i);
  });

  it("names the assessment's empty fields", () => {
    const verdicts = recordVerdicts(
      withGoal({ assessment: { verdict: "proceed", summary: "", findings: [] } }),
    );

    expect(verdicts.assessment.state).toBe("partial");
    expect(verdicts.assessment.missing).toContain("summary");
    expect(verdicts.assessment.missing).toContain("findings");
  });

  it("names a draft with no section as partial", () => {
    const verdicts = recordVerdicts(withGoal({ pr_draft: "A draft with no heading." }));

    expect(verdicts["pr-draft"].state).toBe("partial");
    expect(verdicts["pr-draft"].missing.join(" ")).toMatch(/sections/i);
  });

  it("names the diagram levels the record does not carry", () => {
    const verdicts = recordVerdicts(
      withGoal({ diagrams: { "1": "C4Container\n", "2": "sequenceDiagram\n" } }),
    );

    expect(verdicts.diagrams.state).toBe("partial");
    expect(verdicts.diagrams.missing.join(" ")).toMatch(/level 3/);
  });
});

/* ------------------------------------------------------- the board's row rules */

/**
 * The board's own row rules, as slice 18 fixes them.
 *
 * The shape is declared here and the module is read through it, so this file fixes the
 * contract before the code exists and keeps the contract after. A rule that is missing
 * fails the assertion that names it rather than throwing somewhere later in a case.
 */
interface BoardRules {
  ROW_KINDS: string[];
  ROW_KIND_LABEL: Record<string, string>;
  boardStatus: (source: Source) => string;
  statusTabs: (sources: Source[]) => string[];
  matchesStatus: (source: Source, status: string) => boolean;
  matchesKind: (source: Source, kind: string) => boolean;
  prAloneSources: (rows: DesignRow[], pullRequests: PullRequest[]) => Source[];
}

/** One board row, whether it carries a design or a pull request of its own. */
type Source =
  | { kind: "design"; row: DesignRow }
  | { kind: "pull-request"; row: PullRequest };

const rules = readiness as unknown as BoardRules;

/** One rule, or a failure that names it. A missing rule reads as an assertion. */
function rule<K extends keyof BoardRules>(name: K): BoardRules[K] {
  const found = rules[name];
  expect(typeof found, `readiness.ts must export ${String(name)}`).toBe("function");
  return found;
}

function designRowOf(stage: string, pullRequests: number[] = []): DesignRow {
  return {
    design: { id: `d-${stage}`, name: `d-${stage}`, outcome: "An outcome.", stage },
    epics: [],
    slices: [],
    done: 0,
    pullRequests,
  };
}

function pullRequestOf(id: number, state: string): PullRequest {
  return { id, title: `Pull request ${id}`, state, commit: null, date: null };
}

function designSource(stage: string, pullRequests: number[] = []): Source {
  return { kind: "design", row: designRowOf(stage, pullRequests) };
}

function prSource(id: number, state: string): Source {
  return { kind: "pull-request", row: pullRequestOf(id, state) };
}

/** The PR-alone ids a set of sources carries, in the order the set lists them. */
function prIdsOf(sources: Source[]): number[] {
  return sources
    .filter((source) => source.kind === "pull-request")
    .map((source) => source.row.id);
}

describe("the board's rows", () => {
  it("names the two row kinds, and words a pull request's kind as PR", () => {
    const kinds = rules.ROW_KINDS;
    expect(kinds, "readiness.ts must export ROW_KINDS").toBeTruthy();
    expect(kinds.slice().sort()).toEqual(["design", "pull-request"]);
    expect(new Set(kinds).size, "one entry per kind").toBe(kinds.length);

    const labels = rules.ROW_KIND_LABEL;
    expect(labels, "readiness.ts must export ROW_KIND_LABEL").toBeTruthy();
    expect(labels["pull-request"], "PR names the kind and never a status").toBe("PR");
    expect(labels.design, "the design kind carries its own word").toBeTruthy();
  });

  it("reads a row's status as a design's stage or a pull request's own state", () => {
    const boardStatus = rule("boardStatus");

    expect(boardStatus(designSource("approved"))).toBe("approved");
    expect(boardStatus(designSource("superseded"))).toBe("superseded");
    expect(boardStatus(prSource(17, "open"))).toBe("open");
    expect(boardStatus(prSource(1, "merged"))).toBe("merged");
  });

  it("names each status its rows record once, and no status no row carries", () => {
    const statusTabs = rule("statusTabs");
    const sources = [
      designSource("approved"),
      designSource("backlog"),
      prSource(17, "open"),
      prSource(22, "open"),
      prSource(1, "merged"),
    ];

    const tabs = statusTabs(sources);

    expect(new Set(tabs).size, "a status is named once").toBe(tabs.length);
    expect(tabs.slice().sort()).toEqual(["approved", "backlog", "merged", "open"]);
    expect(tabs, "no row carries review").not.toContain("review");
    for (const tab of tabs) {
      expect(
        sources.some((source) => rules.boardStatus(source) === tab),
        `a tab reads ${tab}, and some row records it`,
      ).toBe(true);
    }
  });

  it("keeps every row that carries a status, and drops every other one", () => {
    const matchesStatus = rule("matchesStatus");
    const sources = [
      designSource("approved"),
      designSource("backlog"),
      prSource(17, "open"),
      prSource(1, "merged"),
    ];

    const open = sources.filter((source) => matchesStatus(source, "open"));
    expect(prIdsOf(open)).toEqual([17]);

    const approved = sources.filter((source) => matchesStatus(source, "approved"));
    expect(approved).toHaveLength(1);
    expect(approved[0].kind).toBe("design");

    for (const source of sources) {
      expect(matchesStatus(source, "review"), "no row carries review").toBe(false);
    }
  });

  it("keeps one kind alone, and the two rules together keep one state's PR rows", () => {
    const matchesKind = rule("matchesKind");
    const matchesStatus = rule("matchesStatus");
    const sources = [
      designSource("approved"),
      designSource("backlog"),
      prSource(17, "open"),
      prSource(1, "merged"),
    ];

    const designOnly = sources.filter((source) => matchesKind(source, "design"));
    expect(designOnly).toHaveLength(2);
    expect(designOnly.every((source) => source.kind === "design")).toBe(true);

    const prOnly = sources.filter((source) => matchesKind(source, "pull-request"));
    expect(prIdsOf(prOnly)).toEqual([17, 1]);

    const openPrOnly = sources.filter(
      (source) => matchesKind(source, "pull-request") && matchesStatus(source, "open"),
    );
    expect(prIdsOf(openPrOnly)).toEqual([17]);
  });

  it("lists a pull request alone once, and drops one a design's epics carry", () => {
    const prAloneSources = rule("prAloneSources");
    const rows = [designRowOf("approved", [11]), designRowOf("backlog", [11, 12])];
    const pullRequests = [
      pullRequestOf(11, "merged"),
      pullRequestOf(12, "merged"),
      pullRequestOf(17, "open"),
      pullRequestOf(22, "open"),
    ];

    const alone = prAloneSources(rows, pullRequests);

    expect(prIdsOf(alone)).toEqual([17, 22]);
    expect(new Set(prIdsOf(alone)).size, "one row per pull request").toBe(alone.length);

    const pullRows = alone.filter(
      (source): source is { kind: "pull-request"; row: PullRequest } =>
        source.kind === "pull-request",
    );
    expect(pullRows, "every PR-alone source carries a pull request").toHaveLength(
      alone.length,
    );
    for (const source of pullRows) {
      expect(source.row.title, "a row carries the pull request's own title").toBeTruthy();
    }
  });

  it("lists a pull request alone in id order, whatever order the index holds", () => {
    const prAloneSources = rule("prAloneSources");
    const rows = [designRowOf("approved", [])];
    const pullRequests = [
      pullRequestOf(22, "open"),
      pullRequestOf(3, "merged"),
      pullRequestOf(17, "open"),
    ];

    expect(prIdsOf(prAloneSources(rows, pullRequests))).toEqual([3, 17, 22]);
  });
});
