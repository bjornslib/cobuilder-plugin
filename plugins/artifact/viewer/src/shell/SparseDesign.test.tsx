/**
 * A `goal.json`-only design's Work surface, and the rail that gates what it cannot fill.
 *
 * Cobuilder-viewer slice 13, epic `cobuilder-viewer/E5`. `04-slices.md` writes the slice's
 * end as one sentence: "One of the seven sparse designs shows every level it can fill, and
 * the rail gates the levels it cannot." The rail carries two accounts now, and a "level" is
 * one of its rows, so this file holds the same claim against the row list the shell builds.
 *
 * THE SLICE'S END, IN TWO PARTS, AND ONE CASE HOLDS EACH.
 *
 *   1. Every row the design can fill renders, and it renders the record's own content. A
 *      row that fills and shows nothing is the defect this part exists to find.
 *   2. Every row it cannot fill stays in the rail, reads disabled, and states the records
 *      it could not read in place. An absence must read as a state, never as a blank box.
 *
 * THE FIXTURE IS THE REPOSITORY'S OWN. A design directory under
 * `docs/architecture/designs/` that holds `goal.json` alone is a sparse design, and this
 * file reads every one of them from disk. Nothing about a design is written by hand here:
 * the id, the goal record, the epics it plans, and the decisions it names all come from the
 * authored file. A design that stops being sparse, or a corpus that loses its last sparse
 * design, fails the first case rather than passing in silence.
 *
 * THE ROW SET COMES FROM THE SHELL, NOT FROM THIS FILE. `railGroups` in `./model` is the one
 * list, and this file asks it for the rows rather than naming them. A row added to the
 * program's account reaches the cases below without an edit here. Only the promise each row
 * keeps is written down, and `promised` states it from the fixture's own facts: the record
 * body decides whether Problem & Solution is backed, and `goal.adrs[]` decides whether
 * Architecture is.
 *
 * THAT SPLIT IS WHAT LETS A CASE FAIL. A case that compared the rail against `railGroups`
 * alone would move with the code it measures, so a rule that stopped gating a row would
 * carry its own expectation along with it. The promise here is derived from the authored
 * design, and the rail is read through a browser-shaped DOM, so a change to either side is
 * visible.
 *
 * WHAT THIS FILE DOES NOT MEASURE. jsdom holds no layout engine, so the disabled row's 45
 * percent opacity, the tooltip's placement, and the strip's geometry are browser readings
 * and belong to the Gate 4c rubrics. The rule and the markup that produce them are here.
 * The browser reading was taken on 2026-09-25, on the built bundle served at
 * `.cobuilder-architect/self`: `lean-bundle-diffs` and `ubiquitous-language` gate Problem &
 * Solution and Architecture, `gate-state-resolution` and `inflight-record-store` fill
 * Architecture from a linked decision, and every one of the eight rendered no error state.
 *
 * Run with: npm test -- src/shell/SparseDesign.test.tsx
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { AdrEntity, DesignEntity, EpicEntity, RecordIndex } from "@/data/types";
import type { DesignGoal, DesignRecord, DesignRecords, PlanEpicRow } from "@/data/bundle";

import Shell from "./App";
import { buildWorkItems, gatesOf, levelsOf, railGroups, routeHref } from "./model";
import type { RailRow, RailSource } from "./model";

/* ------------------------------------------------------------------------ jsdom */

/*
 * jsdom implements neither `matchMedia` nor `ResizeObserver`, and the shell asks both
 * questions on its first render: `useCollapsedRail` reads a media query and the diagram
 * tiles observe their box. The stubs answer the query false and observe nothing.
 */
beforeAll(() => {
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

  class StubResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  window.ResizeObserver = StubResizeObserver as unknown as typeof window.ResizeObserver;

  /* The pane resets its own scroll on a route change, and jsdom has no scroll. */
  Element.prototype.scrollTo = () => undefined;
});

afterEach(cleanup);

/* --------------------------------------------------------------------- fixture */

/**
 * This repository's root: the nearest directory above the runner that carries the
 * authored designs.
 *
 * `import.meta.url` is not a file URL under this package's jsdom runner, so the path is
 * walked rather than computed. The walk also holds when the runner starts from the
 * repository root instead of from this package.
 */
function repoRoot(): string {
  let dir = process.cwd();
  for (;;) {
    if (existsSync(join(dir, "docs", "architecture", "designs"))) return dir;
    const above = dirname(dir);
    if (above === dir) {
      throw new Error(
        `No docs/architecture/designs above ${process.cwd()}, so this file cannot read ` +
          "this repository's own sparse designs.",
      );
    }
    dir = above;
  }
}

/** This repository's authored designs. */
const DESIGNS_DIR = join(repoRoot(), "docs", "architecture", "designs");

/** One sparse design: the id its index entity carries, and its authored goal record. */
interface SparseDesign {
  id: string;
  goal: DesignGoal;
}

/** The file names one design's own authored directory holds, sorted. */
function authoredFiles(id: string): string[] {
  return readdirSync(join(DESIGNS_DIR, id))
    .filter((name) => statSync(join(DESIGNS_DIR, id, name)).isFile())
    .sort();
}

/**
 * Every design in this repository whose authored directory holds `goal.json` alone.
 *
 * This is the slice's own subject, read from disk rather than named here. The directory
 * name is the design id, which is the key the index's design entity and the route both use.
 */
const SPARSE: SparseDesign[] = readdirSync(DESIGNS_DIR)
  .filter((name) => statSync(join(DESIGNS_DIR, name)).isDirectory())
  .filter((name) => {
    const files = authoredFiles(name);
    return files.length === 1 && files[0] === "goal.json";
  })
  .sort()
  .map((id) => ({
    id,
    goal: JSON.parse(readFileSync(join(DESIGNS_DIR, id, "goal.json"), "utf8")) as DesignGoal,
  }));

/** The record body `data/designs.js` carries for a sparse design: the goal and nothing else. */
function recordOf(design: SparseDesign): DesignRecord {
  return { goal: design.goal };
}

/**
 * One decision the fixture's index carries, so the `ADRS` global holds an entry to read.
 *
 * `src/data/bundle.ts` reads that global through a guard that looks at the first value's
 * `title`, so an empty map reads as a file that assigned nothing and the loader then asks
 * the dev server for one. No sparse design's goal names this id, so it adds no linked
 * decision to any work item.
 */
const STANDIN_ADR: AdrEntity = {
  id: "ADR-0001",
  title: "A decision this fixture carries and no design names",
  state: "accepted",
};

/** The decisions one sparse design's goal names, as the index would project them. */
function adrsOf(design: SparseDesign): AdrEntity[] {
  return (design.goal.adrs ?? []).map((id) => ({ id, title: `Decision ${id}`, state: "accepted" }));
}

function designEntity(design: SparseDesign): DesignEntity {
  return {
    id: design.id,
    name: design.goal.name ?? design.id,
    outcome: design.goal.outcome ?? "",
    stage: design.goal.stage ?? "backlog",
  };
}

function epicsOf(design: SparseDesign): EpicEntity[] {
  return (design.goal.epics ?? []).map((row: PlanEpicRow) => ({
    id: `${design.id}/${row.id}`,
    design: design.id,
    epic_id: row.id,
    branch: row.branch,
    pr: row.pr,
    state: row.state,
    note: row.note ?? null,
  }));
}

/**
 * The record index every sparse design resolves against, and nothing else.
 *
 * THE INDEX CARRIES NO DIAGRAM, NO DISTRICT, NO CONTEXT, AND NO BOUNDARY RULE. A sparse
 * design's authored directory holds no `diagrams` key, and no district or context record
 * names it, so the fixture mirrors that. Architecture is therefore backed by a linked
 * decision alone, which is the arm `interaction-design.md` states for these designs.
 *
 * ONE BUNDLE HOLDS EVERY SPARSE DESIGN, THE WAY A REAL BUNDLE DOES. `loadDesigns` caches
 * its promise in module state, so a fixture that published one design at a time would hand
 * the second case the first case's records. The globals below are set once, and every case
 * reads the same bundle through the route it names.
 */
const INDEX: RecordIndex = {
  schema_version: "1.3",
  sources: { git_head: "0123456789abcdef", trees: {} },
  entities: {
    adr: [STANDIN_ADR, ...SPARSE.flatMap(adrsOf)],
    design: SPARSE.map(designEntity),
    epic: SPARSE.flatMap(epicsOf),
    context: [],
    district: [],
    boundary_rule: [],
    pull_request: [],
    slice: [],
    publication: [],
    program_design: [],
    epic_design: [],
    interaction_design: [],
  },
  joins: {
    adr_to_pull_request: {},
    epic_to_pull_request: {},
    epic_status: {},
    slice_to_epic: {},
    slice_to_epic_unresolved: {},
    context_verifies_district: {},
    district_uncovered: [],
    adr_to_context: {},
    adr_to_district: {},
    feature_gates: {},
  },
};

/** Every sparse design's record body, keyed by the id the index carries. */
const DESIGNS: DesignRecords = Object.fromEntries(
  SPARSE.map((design) => [design.id, recordOf(design)]),
);

/** Every decision the fixture names, as the `ADRS` global holds them. */
const ADRS: Record<string, AdrEntity> = Object.fromEntries(
  [STANDIN_ADR, ...SPARSE.flatMap(adrsOf)].map((adr) => [adr.id, adr]),
);

beforeEach(() => {
  /* Hand the shell the whole bundle in memory, the way a published file inlines it. */
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  /* The decision global is declared by no module, so this line reads it through a cast. */
  (window as unknown as Record<string, unknown>).ADRS = ADRS;
});

/* --------------------------------------------------------------------- the rail */

/** The rail's own input, built the way `App.tsx` builds it, from the fixture above. */
function sourceOf(design: SparseDesign): RailSource {
  const works = buildWorkItems(INDEX, DESIGNS);
  const work = works.get(design.id) ?? null;
  return {
    work,
    gates: work === null ? null : gatesOf(work),
    levels: work === null ? null : levelsOf(work),
    changePr: null,
    changeLevels: [],
    diffFiles: null,
    servedAudio: {},
  };
}

/** The rows the shell holds for one sparse design, in the rail's own order. */
function rowsOfShell(design: SparseDesign): RailRow[] {
  return railGroups(sourceOf(design)).flatMap((group) => group.rows);
}

/** The rail, which holds the board's own row and every group the work fills. */
function rail(): HTMLElement {
  return screen.getByRole("navigation", { name: "Work sections" });
}

/** Every rail row, in the order the rail renders it. A disabled row is a row too. */
function railRows(): HTMLElement[] {
  return within(rail()).getAllByRole("link");
}

/**
 * The label a rail row carries, whichever state it is in.
 *
 * `Rail.tsx` writes an available row's accessible name as `<label>, the <account> account ·
 * <count>`, and a disabled row's as `<label> is disabled. Absent: <records>`. Both open with
 * the row's own label, so this reads the label and drops the rest.
 *
 * This is unambiguous here because a sparse design's work carries no pull request, so the
 * change's account draws no row and no two rows share a label. `Board.test.tsx` names the
 * same collision for the same reason.
 */
function labelOf(row: HTMLElement): string {
  const name = row.getAttribute("aria-label") ?? "";
  return name.replace(/,? is disabled.*$/, "").split(", the ")[0].trim();
}

/** One rail row, by the label it carries, or a failure naming it. */
function rowNamed(label: string): HTMLElement {
  const row = railRows().find((candidate) => labelOf(candidate) === label);
  expect(row, `the rail holds a row named ${label}`).toBeTruthy();
  return row as HTMLElement;
}

/** True when the rail draws a row disabled. A disabled row is never a step. */
function disabledOf(row: HTMLElement): boolean {
  return row.getAttribute("aria-disabled") === "true";
}

/** The row's address. A row whose record is absent carries `#` and no route. */
function hrefOf(row: HTMLElement): string {
  return row.getAttribute("href") ?? "";
}

/** Everything a reader meets on one row: its visible words and its accessible name. */
function saidOn(row: HTMLElement): string {
  const words = `${row.textContent ?? ""} ${row.getAttribute("aria-label") ?? ""}`;
  return words.replace(/\s+/g, " ").trim().toLowerCase();
}

/** The rail's own name for an available row, read the way `Rail.tsx` writes it. */
function accessibleNameOf(row: RailRow): string {
  const who = row.account === "change" ? "the pull request" : "the work item";
  return row.count === "" ? `${row.label}, ${who}` : `${row.label}, ${who}, ${row.count}`;
}

/* ------------------------------------------------------------------ the promise */

/** The three records Problem & Solution is backed by, and the file each one lives in. */
const BACKING_RECORDS: Record<string, string> = {
  intent: "intent.json",
  narrative: "narrative.json",
  assessment: "assessment.json",
};

/** The record files one sparse record body does not carry, in the order the rail names them. */
function absentRecords(record: DesignRecord): string[] {
  const body = record as Record<string, unknown>;
  return Object.keys(BACKING_RECORDS)
    .filter((key) => body[key] === undefined)
    .map((key) => BACKING_RECORDS[key]);
}

/** What the slice promises one row reads, derived from the authored design alone. */
function promised(
  row: RailRow,
  design: SparseDesign,
  record: DesignRecord,
): { available: boolean; absent: string[] } {
  /* The change's File Diffs row is disabled when no pull request is carried. The reason is
     asserted apart, in the no-change test, so no fixed words are promised here. */
  if (row.label === "File Diffs") return { available: false, absent: [] };

  const section = row.key.replace(/^program-/, "");

  if (section === "intent") {
    /* Intent reads the record file, and a sparse design's record file carries its goal. */
    return { available: record.goal !== undefined, absent: ["designs.js"] };
  }
  if (section === "problem-and-solution") {
    const absent = absentRecords(record);
    return { available: absent.length === 0, absent };
  }
  if (section === "architecture") {
    /*
     * ARCHITECTURE IS BACKED BY A DECISION THIS DESIGN NAMES. The fixture's index carries
     * no diagram, no district, and no context for the design, so `goal.adrs[]` is the whole
     * of the rule here.
     */
    const named = (design.goal.adrs ?? []).length > 0;
    return {
      available: named,
      absent: named ? [] : ["no linked decision in goal.adrs[]"],
    };
  }
  if (section === "epics") {
    const planned = (design.goal.epics ?? []).length;
    return {
      available: planned > 0,
      absent: planned > 0 ? [] : ["the work carries no epic"],
    };
  }
  if (section === "rubrics") return { available: true, absent: [] };
  if (section === "plan") {
    /*
     * PLAN IS BACKED BY A PLAN DOCUMENT. The fixture's index holds the plan documents a
     * work carries, so any entry there that names this design is a plan.
     */
    const planned =
      [
        ...INDEX.entities.program_design,
        ...INDEX.entities.epic_design,
        ...INDEX.entities.interaction_design,
        ...INDEX.entities.slice,
      ].some((doc) => JSON.stringify(doc).includes(design.id)) ||
      Object.keys(INDEX.joins.feature_gates).includes(design.id);
    return { available: planned, absent: planned ? [] : ["no plan"] };
  }

  /* A row this file has not promised must fail loudly rather than pass by default. */
  throw new Error(
    `The shell holds a row this file states no promise for: ${row.key}. ` +
      "State the promise the slice makes for it.",
  );
}

/* --------------------------------------------------------------------- helpers */

/**
 * Open a sparse design's Work surface and wait for it to settle.
 *
 * The hash is set before the render, because the shell reads its route on the first one.
 */
async function openAt(design: SparseDesign, section: string): Promise<void> {
  window.location.hash = `#/${design.id}/${section}`;
  render(<Shell />);
  await waitFor(() => {
    expect(workItemName()).toBe(design.id);
  });
}

/** The top line of a Work surface. It names the work item the route carried. */
function workItemName(): string {
  return (document.getElementById("work-item-name")?.textContent ?? "").trim();
}

/** The level heading of a Work surface. */
function levelHeading(): string {
  return (document.getElementById("work-section-heading")?.textContent ?? "").trim();
}

/** The whole page's words, with every run of space collapsed. */
function pageText(): string {
  return (document.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

/* ----------------------------------------------------------------------- tests */

describe("a goal.json-only design's Work surface", () => {
  it("reads its subject from this repository's own sparse designs", () => {
    expect(
      SPARSE.length,
      "the corpus holds no design whose authored directory is goal.json alone, so this " +
        "slice has no subject. docs/architecture/designs/ is where one lives.",
    ).toBeGreaterThan(0);

    for (const design of SPARSE) {
      expect(authoredFiles(design.id), `${design.id} is a sparse design`).toEqual(["goal.json"]);
    }
  });

  for (const design of SPARSE) {
    it(`gates every row ${design.id} cannot fill, and states each absence in place`, async () => {
      await openAt(design, "intent");

      /* The rows are the shell's own list. This file names none of them. */
      const rows = rowsOfShell(design);
      expect(rows.length, "the rail holds rows for a sparse design").toBeGreaterThan(0);
      expect(railRows().map(labelOf)).toEqual(rows.map((row) => row.label));

      const gated = rows.filter((row) => !promised(row, design, recordOf(design)).available);
      expect(
        gated.length,
        `${design.id} gates a row, so the gate itself is exercised`,
      ).toBeGreaterThan(0);

      for (const row of gated) {
        const { absent } = promised(row, design, recordOf(design));
        const rendered = rowNamed(row.label);

        /* THE ROW IS DISABLED. A row that is not disabled is a control that leads nowhere. */
        expect(disabledOf(rendered), `${row.label} reads disabled`).toBe(true);
        expect(hrefOf(rendered), `${row.label} opens no address`).toBe("#");

        /* THE ABSENCE IS STATED IN PLACE, on the row, and not only in a tooltip. */
        const said = saidOn(rendered);
        expect(
          (rendered.textContent ?? "").trim().length,
          `${row.label} is not drawn as an empty box`,
        ).toBeGreaterThan(row.label.length);
        for (const record of absent) {
          expect(said, `${row.label} names ${record}`).toContain(record.toLowerCase());
        }

        /* A PRESS ON A GATED ROW GOES NOWHERE, and it does not move the address. */
        fireEvent.click(rendered);
        expect(window.location.hash, `a press on ${row.label} stays put`).toBe(
          `#/${design.id}/intent`,
        );
      }
    });

    it(`renders the rows ${design.id} can fill, with the record's own content`, async () => {
      await openAt(design, "intent");

      const rows = rowsOfShell(design);
      const filled = rows.filter((row) => promised(row, design, recordOf(design)).available);
      expect(filled.length, `${design.id} fills a row`).toBeGreaterThan(0);

      for (const row of filled) {
        const rendered = rowNamed(row.label);
        expect(disabledOf(rendered), `${row.label} is a row this design fills`).toBe(false);
        expect(hrefOf(rendered), `${row.label} opens a real address`).not.toBe("#");
        expect(hrefOf(rendered), `${row.label} opens its own address`).toBe(row.href);

        /* What the row holds is on the row, where a reader reads it. */
        expect(
          rendered.getAttribute("aria-label"),
          `${row.label} states what it holds`,
        ).toBe(accessibleNameOf(row));
      }

      /* The Intent row holds the one record the sparse design carries. */
      const intent = filled.find((row) => row.key === "program-intent");
      expect(intent, `${design.id} fills its Intent row`).toBeTruthy();
      expect(
        accessibleNameOf(intent as RailRow),
        "the Intent row counts the one record the sparse design carries",
      ).toContain("1 records");

      /* The Epics row counts the epics the goal itself plans. */
      const epics = filled.find((row) => row.key === "program-epics");
      const planned = (design.goal.epics ?? []).length;
      if (planned > 0) {
        expect(epics, `${design.id} fills its Epics row`).toBeTruthy();
        expect(accessibleNameOf(epics as RailRow)).toContain(`${planned} epics`);
      }

      /*
       * THE LEVEL THE ROUTE NAMED RENDERS ITS OWN RECORD. The work item resolves, the level
       * opens on Intent, and the goal's own outcome is what the reader meets there.
       */
      expect(workItemName(), "the surface names the sparse design").toBe(design.id);
      expect(levelHeading(), "the surface opens on Intent").toBe("Intent");

      const outcome = (design.goal.outcome ?? "").replace(/\s+/g, " ").trim();
      expect(outcome.length, `${design.id} records an outcome`).toBeGreaterThan(0);
      expect(
        pageText(),
        "the Intent level shows the goal record's own outcome",
      ).toContain(outcome.slice(0, 120));
    });
  }

  it("holds a disabled File Diffs row and no change level row for a sparse design's work", async () => {
    const design = SPARSE[0];
    await openAt(design, "intent");

    /* No epic names a pull request, so the File Diffs row is disabled, with a reason. */
    const groups = railGroups(sourceOf(design));
    expect(groups.map((group) => group.key)).toEqual(["levels", "also"]);
    const changeRows = groups.flatMap((group) => group.rows).filter((row) => row.account === "change");
    expect(changeRows.map((row) => row.label)).toEqual(["File Diffs"]);
    const [diffs] = changeRows;
    expect(diffs.available).toBe(false);
    expect(diffs.href).toBe("#");
    expect(diffs.shared).toBeNull();
    expect(Array.isArray(diffs.absent) && diffs.absent.length > 0).toBe(true);

    /* It is a row, and not an entry. */
    const entries = groups.flatMap((group) => group.entries);
    expect(entries.map((entry) => entry.label)).not.toContain("File Diffs");

    /* It is drawn disabled, names its account, then states its reason. */
    const rendered = railRows().find((row) =>
      (row.getAttribute("aria-label") ?? "").startsWith("File Diffs, the pull request"),
    );
    expect(rendered, "the rail draws a File Diffs row for the pull request").toBeTruthy();
    expect(disabledOf(rendered as HTMLElement)).toBe(true);
    expect(hrefOf(rendered as HTMLElement)).toBe("#");
    for (const reason of diffs.absent ?? []) {
      expect(saidOn(rendered as HTMLElement)).toContain(reason.toLowerCase());
    }
  });

  it("sends a route that names a gated level to one the design fills, and says so", async () => {
    /* Problem & Solution is gated for every sparse design: no backing record is authored. */
    const design = SPARSE[0];
    const gated = rowsOfShell(design).find(
      (row) => row.key === "program-problem-and-solution",
    );
    expect(gated, "the shell holds a Problem & Solution row").toBeTruthy();
    expect(promised(gated as RailRow, design, recordOf(design)).available).toBe(false);

    await openAt(design, "problem-and-solution");

    /* The shell lands on a level the design fills, and it states the move. */
    expect(window.location.hash).toBe(routeHref(design.id, "intent"));
    expect(pageText()).toContain("The route named problem-and-solution");
    expect(pageText()).toMatch(/redirected to intent\./i);
  });
});
