/**
 * The board, as the shell's landing surface.
 *
 * With no work item named, the board is what a reader meets. The tests below fix the
 * ending statement of slice 6 and nothing after it: one row per design, the row states
 * its stage, the row states which records it holds, and no error state renders.
 *
 * The row's destination is slice 7, so nothing here reads an href or presses a row.
 *
 * The board takes its data the way the rest of this package does. `rows` is the resolved
 * `DesignRow[]` the record index yields, and `records` is the per-design record map that
 * `data/designs.js` carries.
 *
 * Slice 18 adds the second row source and the two filters, and its cases sit in their own
 * block below. That block hands the board the index's pull request entities beside its
 * rows, exactly as `App.tsx` does, and it reads the block's own fixtures so the slice-6
 * cases above keep the rows they were written against.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import type { DesignEntity, DesignRow, EpicEntity, PullRequest } from "@/data/types";

import { Board, type BoardProps } from "./Board";
import {
  RECORD_KINDS,
  RECORD_LABEL,
  type DesignRecord,
  type DesignRecords,
} from "./readiness";

afterEach(cleanup);

/* ------------------------------------------------------------------ fixtures */

/** The label a row carries on its record signature. One per row, one per kind. */
const SIGNATURE_LABEL = "Records this work item holds";

/** The id the shell moves focus to on a route change. */
const HEADING_ID = "work-section-heading";

const DESIGNS: DesignRow[] = [
  designRow(
    {
      id: "cobuilder-viewer",
      name: "cobuilder-viewer",
      outcome: "The shell lands on a board of every design in the bundle.",
      stage: "approved",
    },
    [epic("cobuilder-viewer", "E19", "completed")],
  ),
  designRow(
    {
      id: "maintainable-viewer",
      name: "maintainable-viewer",
      outcome: "Authoring moves into parts under viewer/src.",
      stage: "backlog",
    },
    [epic("maintainable-viewer", "E1", "unstarted")],
  ),
  designRow(
    {
      id: "inflight-record-store",
      name: "inflight-record-store",
      outcome: "An open pull request becomes an entity in the index.",
      stage: "superseded",
    },
    [epic("inflight-record-store", "E1", "unstarted")],
  ),
  designRow({
    id: "reference-surface",
    name: "reference-surface",
    outcome: "A design whose stage is newer than this shell knows.",
    stage: "proposed",
  }),
];

const EVERY_RECORD = {
  goal: {
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
  },
  intent: {
    problem: "The shell had no landing surface.",
    approach: "One flat row per design.",
    risks: ["Two boards disagree about one bundle."],
    unknowns: ["What sixty designs read like."],
  },
  narrative: {
    landscape: { narration: "The shell lands nowhere." },
    problem_solution: { narration: "The board is the landing surface." },
    architecture: { narration: "One derivation, one row each." },
  },
  assessment: {
    verdict: "proceed",
    summary: "The surface is small and legible.",
    findings: [{ kind: "drift", title: "The lane board stays.", detail: "Confirm it." }],
  },
  pr_draft: "# The board\n\n## What changes\n\nOne row each.\n",
  diagrams: { "1": "C4Container\n", "2": "sequenceDiagram\n", "3": "classDiagram\n" },
} as unknown as DesignRecord;

/** The one sparse design: a `goal.json` and nothing else, so its goal reads partial. */
const GOAL_ONLY = {
  goal: {
    name: "maintainable-viewer",
    title: "The viewer as parts",
    created: "2026-09-18",
    outcome: "Authoring moves into parts under viewer/src.",
    done_when: ["A build reproduces index.html."],
    min_work: { challenge_stage_run: false },
    stage: "backlog",
    supersedes: null,
    adr: null,
    adrs: [],
  },
} as unknown as DesignRecord;

const RECORDS: DesignRecords = {
  "cobuilder-viewer": EVERY_RECORD,
  "maintainable-viewer": GOAL_ONLY,
};

function epic(design: string, epicId: string, state: string): EpicEntity {
  return {
    id: `${design}/${epicId}`,
    design,
    epic_id: epicId,
    branch: null,
    pr: null,
    state,
    note: null,
  };
}

function designRow(design: DesignEntity, epics: EpicEntity[] = []): DesignRow {
  const done = epics.filter(
    (one) => one.state === "completed" || one.state === "merged",
  ).length;
  return { design, epics, slices: [], done, pullRequests: [] };
}

/* ------------------------------------------------------------------- helpers */

function renderBoard(overrides: Partial<BoardProps> = {}) {
  const props: BoardProps = {
    rows: DESIGNS,
    records: RECORDS,
    ready: true,
    headingId: HEADING_ID,
    ...overrides,
  };
  return render(
    <TooltipProvider delayDuration={150}>
      <Board {...props} />
    </TooltipProvider>,
  );
}

/** The heading of every row. A row is a list item, and its name sits in a level-2 heading. */
function rowHeadings(): HTMLElement[] {
  return screen
    .queryAllByRole("heading", { level: 2 })
    .filter((heading) => heading.closest("li") !== null);
}

function rowOf(name: string): HTMLElement {
  const heading = rowHeadings().find((one) => (one.textContent ?? "").trim() === name);
  expect(heading, `a row names ${name}`).toBeTruthy();
  const row = heading?.closest("li");
  expect(row, `the row for ${name} is a list item`).toBeTruthy();
  return row as HTMLElement;
}

/** The one record signature a row carries. */
function signatureOf(name: string): string {
  const marks = within(rowOf(name)).getAllByLabelText(SIGNATURE_LABEL);
  expect(marks.length, `one record signature on the ${name} row`).toBe(1);
  return marks[0].textContent ?? "";
}

/* --------------------------------------------------------------------- tests */

describe("Board", () => {
  it("shows every design as a row, once each", () => {
    renderBoard();

    const names = rowHeadings().map((heading) => (heading.textContent ?? "").trim());
    expect(names.slice().sort()).toEqual(DESIGNS.map((row) => row.design.name).sort());
    expect(new Set(names).size).toBe(DESIGNS.length);
  });

  it("states the stage on each row", () => {
    renderBoard();

    for (const row of DESIGNS) {
      const stage = new RegExp(row.design.stage, "i");
      const said = within(rowOf(row.design.name)).queryAllByText(stage);
      expect(said.length, `${row.design.name} states ${row.design.stage}`).toBeGreaterThan(
        0,
      );
    }
  });

  it("states the six record marks on a row, in the record order", () => {
    renderBoard();

    const signature = signatureOf("cobuilder-viewer");
    let at = -1;
    for (const kind of RECORD_KINDS) {
      const next = signature.indexOf(RECORD_LABEL[kind], at + 1);
      expect(next, `${RECORD_LABEL[kind]} reads after the kind before it`).toBeGreaterThan(
        at,
      );
      at = next;
    }
    expect(signature).toMatch(/goal: present/);
    expect(signature).toMatch(/diagrams: present/);
  });

  it("states six absences on a row whose design holds no record", () => {
    renderBoard();

    const signature = signatureOf("inflight-record-store");
    for (const kind of RECORD_KINDS) {
      expect(signature, RECORD_LABEL[kind]).toMatch(
        new RegExp(`${RECORD_LABEL[kind]}: absent`),
      );
    }
  });

  it("states the empty part of a partial record on its row", () => {
    renderBoard();

    const signature = signatureOf("maintainable-viewer");
    expect(signature).toMatch(/goal: partial/);
    expect(signature).toMatch(/stages 2 to 7/);
    expect(signature).toMatch(/intent: absent/);
  });

  it("states how many of the six records each row holds", () => {
    renderBoard();

    expect(rowOf("cobuilder-viewer").textContent ?? "").toMatch(/6 of 6 records/);
    expect(rowOf("maintainable-viewer").textContent ?? "").toMatch(/1 of 6 records/);
    expect(rowOf("inflight-record-store").textContent ?? "").toMatch(/0 of 6 records/);
  });

  it("renders no error state", () => {
    renderBoard();

    expect(screen.queryByRole("alert")).toBeNull();
    expect(document.body.textContent ?? "").not.toMatch(
      /did not load|unreadable|is not a record index/i,
    );
    expect(rowHeadings()).toHaveLength(DESIGNS.length);
  });

  it("renders a heading the shell can move focus to", () => {
    renderBoard();

    const heading = document.getElementById(HEADING_ID);
    expect(heading).toBeTruthy();
    expect(heading?.tagName).toBe("H1");
    expect((heading?.textContent ?? "").trim().length).toBeGreaterThan(0);
  });

  it("states that it is reading while the index is in flight", () => {
    renderBoard({ ready: false });

    expect(rowHeadings()).toHaveLength(0);
    expect(screen.queryByRole("alert")).toBeNull();
    expect((document.body.textContent ?? "").trim().length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------- the board's second row source */

/**
 * Slice 18: a pull request that belongs to no design reads as a row of its own.
 *
 * The block below hands the board the index's pull request entities beside its rows,
 * the way `App.tsx` does, and it fixes the three claims the slice's own end states:
 * a PR-alone row exists, its status is the pull request's own state, and the two
 * filters keep the rows their vocabulary names.
 *
 * The block's props are typed as `BoardProps`, the same type the slice-6 block above
 * uses, and it renders `Board` directly with no cast. Slice 18 added `pullRequests` to
 * `BoardProps`, so a case that hands the board a pull request list is checked against
 * the component's own prop types: a misspelled prop name or a wrong shape reaches `tsc`
 * as an error rather than passing through a cast that erases the props.
 */

/** One pull request, as `data/index.json` writes the entity. */
function pullRequest(id: number, state: string): PullRequest {
  return {
    id,
    title: `Pull request ${id}`,
    state,
    commit: "abc1234",
    date: "2026-09-20",
  };
}

/* Four design rows, and four pull requests. One design's epics carry `21`, so the
   board must list it inside that design's row and never beside it. */
const PR_DESIGNS: DesignRow[] = [
  { ...DESIGNS[0], pullRequests: [21] },
  DESIGNS[1],
  DESIGNS[2],
  { ...DESIGNS[3], design: { ...DESIGNS[3].design, stage: "decided" } },
];

const PULL_REQUESTS: PullRequest[] = [
  pullRequest(11, "merged"),
  pullRequest(21, "merged"),
  pullRequest(17, "open"),
  pullRequest(22, "open"),
];

/** The three pull requests no design's epics carry: 11, 17, and 22. */
const PR_ALONE_IDS = [11, 17, 22];

function renderPrBoard(overrides: Partial<BoardProps> = {}) {
  const props: BoardProps = {
    rows: PR_DESIGNS,
    records: RECORDS,
    ready: true,
    headingId: HEADING_ID,
    pullRequests: PULL_REQUESTS,
    ...overrides,
  };
  return render(
    <TooltipProvider delayDuration={150}>
      <Board {...props} />
    </TooltipProvider>,
  );
}

/** Every board row. A row is a list item that carries the row's one anchor. */
function boardRows(): HTMLElement[] {
  return screen
    .queryAllByRole("listitem")
    .filter((item) => item.querySelector("a") !== null);
}

/** The one board row whose text names `name`, or a failure naming it. */
function boardRowOf(name: string): HTMLElement {
  const found = boardRows().find((row) => (row.textContent ?? "").includes(name));
  expect(found, `a board row names ${name}`).toBeTruthy();
  return found as HTMLElement;
}

/** Every tab on the board: the status strip's, then the kind control's. */
function tabs(): HTMLElement[] {
  const found = screen.queryAllByRole("tab");
  expect(found.length, "the board draws a tab strip").toBeGreaterThan(0);
  return found;
}

/** The tab whose label reads `pattern`, or a failure naming the pattern. */
function tabMatching(pattern: RegExp): HTMLElement {
  const found = tabs().find((tab) => pattern.test((tab.textContent ?? "").trim()));
  expect(found, `a tab whose label reads ${pattern}`).toBeTruthy();
  return found as HTMLElement;
}

/** A tab's count, as the number it reads beside its label. */
function tabCount(tab: HTMLElement): number {
  const digits = (tab.textContent ?? "").match(/\d+/g) ?? [];
  expect(digits.length, `a count beside the tab ${tab.textContent ?? ""}`).toBeGreaterThan(
    0,
  );
  return Number(digits[digits.length - 1]);
}

/** A press, in the two events a tab strip listens for. */
function pressTab(tab: HTMLElement): void {
  fireEvent.mouseDown(tab, { button: 0 });
  fireEvent.click(tab);
}

describe("Board, with the index's pull requests beside its rows", () => {
  it("lists a pull request no design carries as a row of its own", () => {
    renderPrBoard();

    expect(boardRows()).toHaveLength(PR_DESIGNS.length + 3);
    for (const id of PR_ALONE_IDS) {
      expect(boardRowOf(`Pull request ${id}`), `a row for pull request ${id}`);
    }

    /* The board is not a paged level, and slice 18 changes nothing about that. */
    expect(screen.queryByText(/Section \d+ of \d+/)).toBeNull();
    expect(screen.queryByRole("button", { name: /^next$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^previous$/i })).toBeNull();
  });

  it("states the pull request's own state and kind word, and no record signature", () => {
    renderPrBoard();

    const row = boardRowOf("Pull request 17");
    expect(row.textContent ?? "").toMatch(/\bopen\b/i);
    expect(row.textContent ?? "").toMatch(/\bPR\b/);
    expect(
      within(row).queryAllByLabelText(SIGNATURE_LABEL),
      "a pull request holds no design directory, so its row carries no six marks",
    ).toHaveLength(0);

    const merged = boardRowOf("Pull request 11");
    expect(merged.textContent ?? "").toMatch(/\bmerged\b/i);
  });

  it("renders no second row for a pull request a design's own epics carry", () => {
    renderPrBoard();

    expect(boardRows()).toHaveLength(PR_DESIGNS.length + 3);
    expect(
      boardRows().filter((row) => (row.textContent ?? "").includes("Pull request 21")),
      "pull request 21 reads inside its design's row, and nowhere else",
    ).toHaveLength(0);

    /* The design rows still render, still state their stage, and still open a work
       item: slice 18 adds rows beside them and changes nothing inside them. */
    for (const row of PR_DESIGNS) {
      const rendered = boardRowOf(row.design.name);
      expect(rendered.textContent ?? "").toMatch(new RegExp(row.design.stage, "i"));
      const link = rendered.querySelector("a");
      expect(link?.getAttribute("href"), `${row.design.name} still opens a work item`)
        .toBeTruthy();
      expect(within(rendered).getAllByLabelText(SIGNATURE_LABEL)).toHaveLength(1);
    }
  });

  it("keeps only the rows a status tab names, and counts them", () => {
    renderPrBoard();

    const all = tabCount(tabMatching(/^All\b/i));
    expect(all).toBe(PR_DESIGNS.length + 3);
    expect(tabCount(tabMatching(/\bopen\b/i))).toBe(2);
    expect(tabCount(tabMatching(/\bmerged\b/i))).toBe(1);

    pressTab(tabMatching(/\bopen\b/i));
    expect(boardRows()).toHaveLength(2);
    expect(
      boardRows().every((row) => /open/i.test(row.textContent ?? "")),
      "every row the open tab keeps carries that status",
    ).toBe(true);

    pressTab(tabMatching(/\bmerged\b/i));
    expect(boardRows()).toHaveLength(1);
    expect(boardRows()[0].textContent ?? "").toContain("Pull request 11");

    for (const tab of tabs().filter((one) => /^All\b/i.test(one.textContent ?? ""))) {
      pressTab(tab);
    }
    expect(boardRows()).toHaveLength(all);
  });

  it("narrows to the PR-alone rows under the kind control, and filters them by status", () => {
    renderPrBoard();

    expect(boardRows()).toHaveLength(PR_DESIGNS.length + 3);

    pressTab(tabMatching(/\bPR\b/));
    expect(boardRows()).toHaveLength(3);
    expect(
      boardRows().every((row) => /PR/.test(row.textContent ?? "")),
      "every row the kind control keeps is a pull request row",
    ).toBe(true);

    pressTab(tabMatching(/\bopen\b/i));
    expect(boardRows()).toHaveLength(2);

    for (const tab of tabs().filter((one) => /^All\b/i.test(one.textContent ?? ""))) {
      pressTab(tab);
    }
    expect(boardRows()).toHaveLength(PR_DESIGNS.length + 3);

    /* Still no section strip, no pager bar, and no level progress bar. */
    expect(screen.queryByText(/Section \d+ of \d+/)).toBeNull();
    expect(screen.queryByRole("button", { name: /^next$/i })).toBeNull();
  });
});
