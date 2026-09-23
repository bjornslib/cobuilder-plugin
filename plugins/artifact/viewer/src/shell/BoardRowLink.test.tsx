/**
 * A row's destination: a real link, and the address it carries.
 *
 * Slice 6 fixed the board's list. This file fixes slice 7's ending statement at the
 * board's own level: a row is an anchor, its address is the shell's own work-item route
 * for that one design, and that address names a section the design can fill. The press,
 * and the surface it lands on, are `App.test.tsx`'s cases, because the shell resolves a
 * route and the board does not.
 *
 * A ROW DERIVES ITS ADDRESS FROM `./model`, the way `Rail.tsx` derives its own. Both are
 * shell surfaces, both read `routeHref`, and neither takes an href prop. The board
 * therefore keeps the four props E19 fixed for it.
 *
 * THE SECTION A ROW NAMES IS THE FIRST ONE THE DESIGN CAN FILL, in the shell's own order:
 * intent, problem and solution, architecture, build, pull requests, shipped. The Intent
 * level is available exactly when `designs.js` carries a record for the design, which is
 * the fact the record map beside the rows already holds. A design that file does not
 * carry fills no level at all, so its row names the first section its own figures fill,
 * which is Build when it carries an epic. Naming Intent for that design would send the
 * reader to a section the shell then redirects away from, and the redirect is stated.
 *
 * The rows are fixtures, and the record map is the one `data/designs.js` carries:
 * `cobuilder-viewer` holds every record, `inflight-record-store` holds `goal.json` alone,
 * and `designs.js` carries nothing for `reference-surface`.
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import type { DesignEntity, DesignRow, EpicEntity } from "@/data/types";

import { Board, type BoardProps } from "./Board";
import { isSectionKey, readRoute } from "./model";
import { type DesignRecord, type DesignRecords } from "./readiness";

afterEach(cleanup);

/* ------------------------------------------------------------------ fixtures */

/** The id the shell moves focus to on a route change. */
const HEADING_ID = "work-section-heading";

/** The three designs the cases below read: a whole one, a one-record one, a bare one. */
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
      id: "inflight-record-store",
      name: "inflight-record-store",
      outcome: "An open pull request becomes an entity in the index.",
      stage: "backlog",
    },
    [epic("inflight-record-store", "E1", "unstarted")],
  ),
  designRow(
    {
      id: "reference-surface",
      name: "reference-surface",
      outcome: "A design whose stage is newer than this shell knows.",
      stage: "proposed",
    },
    [epic("reference-surface", "E1", "unstarted")],
  ),
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

/** The one sparse design: a `goal.json` and nothing else, so no level but Intent fills. */
const GOAL_ONLY = {
  goal: {
    name: "inflight-record-store",
    title: "The open set as an entity",
    created: "2026-09-18",
    outcome: "An open pull request becomes an entity in the index.",
    done_when: ["The join resolves an open pull request."],
    min_work: { challenge_stage_run: false },
    stage: "backlog",
    supersedes: null,
    adr: null,
    adrs: [],
  },
} as unknown as DesignRecord;

const RECORDS: DesignRecords = {
  "cobuilder-viewer": EVERY_RECORD,
  "inflight-record-store": GOAL_ONLY,
  /* `reference-surface` is absent on purpose, so a design the file misses gets a row. */
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

/** The one link a row carries. Slice 7 makes the row a destination, so a row has one. */
function linkOf(name: string): HTMLElement {
  const links = within(rowOf(name)).queryAllByRole("link");
  expect(links.length, `the row for ${name} carries one link`).toBe(1);
  return links[0];
}

/* --------------------------------------------------------------------- tests */

describe("Board rows as links", () => {
  it("renders one link per row, and no bare control", () => {
    renderBoard();

    for (const row of DESIGNS) {
      const name = row.design.name;
      const href = linkOf(name).getAttribute("href") ?? "";

      expect(href.length, `${name} carries an address`).toBeGreaterThan(0);
      expect(href.startsWith("#/"), `${name} carries a route`).toBe(true);
      expect(
        within(rowOf(name)).queryAllByRole("button"),
        `${name} is a link and not a bare control`,
      ).toEqual([]);
    }
  });

  it("names the design and its stage on the row's link", () => {
    renderBoard();

    for (const row of DESIGNS) {
      const name = row.design.name;
      const named = within(rowOf(name)).queryAllByRole("link", {
        name: new RegExp(name),
      });
      const staged = within(rowOf(name)).queryAllByRole("link", {
        name: new RegExp(row.design.stage, "i"),
      });

      expect(named.length, `${name}'s link names the design`).toBe(1);
      expect(staged.length, `${name}'s link names the stage ${row.design.stage}`).toBe(1);
    }
  });

  it("gives a row the shell's own work-item address, and not a board-local one", () => {
    renderBoard();

    for (const row of DESIGNS) {
      const href = linkOf(row.design.name).getAttribute("href") ?? "";

      /*
        The shell's own reader decides. A board-local id would leave `workId` null, and
        a subsection would leave the section unknown.
      */
      window.location.hash = href;
      const route = readRoute();

      expect(route.workId, `${row.design.name}'s address names the design`).toBe(
        row.design.id,
      );
      expect(
        isSectionKey(route.section),
        `${row.design.name}'s address names a section of this shell`,
      ).toBe(true);
    }
  });

  it("keeps one address per design", () => {
    renderBoard();

    const hrefs = DESIGNS.map((row) => linkOf(row.design.name).getAttribute("href"));
    expect(new Set(hrefs).size).toBe(DESIGNS.length);
  });

  it("opens the first level a design with one record can fill", () => {
    renderBoard();

    /*
      `inflight-record-store` holds `goal.json` alone. The goal fills Intent and nothing
      else, so the row names Intent rather than a level the design cannot fill.
    */
    expect(linkOf("inflight-record-store").getAttribute("href")).toBe(
      "#/inflight-record-store/intent",
    );
  });

  it("names a section the design can fill when designs.js carries no record", () => {
    renderBoard();

    /*
      A design the record file misses fills no level, so its row names the first section
      its own figures fill. Build is that section for this one, because it carries an
      epic. Intent here would be an address the shell redirects away from.
    */
    expect(linkOf("reference-surface").getAttribute("href")).toBe(
      "#/reference-surface/build",
    );
  });
});
