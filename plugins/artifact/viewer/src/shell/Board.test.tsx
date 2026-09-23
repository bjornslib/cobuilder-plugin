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
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import type { DesignEntity, DesignRow, EpicEntity } from "@/data/types";

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
