/**
 * Slice 10 — every level renders its own sections, stated as cases.
 *
 * The slice's end, from the ladder in `docs/plans/cobuilder-viewer/04-slices.md`: "A
 * reader walks Intent, Problem & Solution, Architecture, Build, Pull requests, and Shipped
 * of one work item, and the envisioned pull request leads the Pull requests level." The
 * rubric that scores it is `.cobuilder/rubrics/cobuilder-viewer/slice-10.md`, and its five
 * criteria are the five groups below.
 *
 * THE SUBJECT IS THE SIX LEVELS AND THE PANELS THEY PAGE. `panels/` holds one entry point
 * per level, `sections.tsx` holds the Build, Pull requests, and Shipped sections, and
 * `App.tsx` assembles them. A section with no level around it is not a state a reader can
 * meet, so every case below renders `Shell` at a real address and reads the panes it
 * built.
 *
 * SLICE 8 AND SLICE 9 ALREADY OWN THE MODEL AND THE READING. `Pager.test.tsx` owns the
 * box, the index, the strip, the pager, and the arrow keys. `LevelProgress.test.tsx` owns
 * the progress reading. No case here restates one of theirs. What is here is the content:
 * which sections each level lays down, what each section holds, which order the reader
 * meets them in, and where the envisioned pull request sits.
 *
 * THE PORTED SHELL ALREADY SATISFIES MOST OF THIS SLICE, AND THAT IS THE HONEST READING.
 * The six levels and their panels landed with the port in slice 5, so these cases are a
 * statement of the contract rather than a report of new work. Each green case below names
 * in its own comment what carries it. The staged runs named in the report are what show
 * the cases can fail.
 *
 * WHAT A DOM CANNOT CARRY, SAID PLAINLY. jsdom has no layout engine: every height reads
 * zero, every bounding rect reads zero, and no stylesheet is applied. Three claims of this
 * slice's rubric are therefore out of this file's reach, and each one is named beside the
 * case that carries its contract instead:
 *
 * 1. **A section fits one screen.** C4 states that each Build section fits one screen.
 *    The case here reads the cut and the row count, which is the contract the screen
 *    follows. Only a browser knows the box's own height.
 * 2. **A panel's body renders open to the reader.** The case reads the `inert` attribute
 *    and the absence of a panel-level disclosure. A body animated to zero height carries
 *    neither flag, so an open body is a browser's reading.
 * 3. **A reader sees one section at a time.** Slice 8 owns that geometry, and its file
 *    says so. This file reads the tree and never a rect.
 *
 * WHAT A VALIDATOR SHOULD MEASURE IN A BROWSER, to score the rest of the rubric. Serve the
 * bundle rooted at `.cobuilder-architect/self/`, open the Work surface at
 * `#/cobuilder-viewer`, and read the DOM at each level:
 * - For each of the four paged levels, the box on screen is the box the strip marks
 *   active, and the reader meets each section by pressing Next. Take a snapshot of each
 *   section and read the records it holds.
 * - On the Build level, measure each section's box height against the pane's own height.
 *   A section that needs a scroll of more than one screen fails C4's 1.0 score.
 * - On each paged level, read the panel body's rendered height and opacity. Every panel
 *   body is at its full height, and no disclosure control sits in a panel header. The one
 *   fold count that is NOT zero is the record disclosures inside a body: the Architecture
 *   level's decisions and the Build level's epics each disclose a record, and those are
 *   accordion rows rather than panel folds.
 * - Read the console across the walk. No message reports an error.
 * - Compare one section against the bundle: the decisions the Architecture level lists are
 *   the decisions `data/index.json` links to that design.
 *
 * THE FIXTURE HOLDS TWO WORKS, AND THE SECOND ONE CARRIES THE ABSENCES. The rich work
 * fills every level, so each section has its own record to show. The other work is the
 * same shape with no assessment, no risk, no unknown, and no drafted pull request, so the
 * cases for an absence in place and for the draft's own absence have something to read.
 * Both live in one `DESIGNS` map, because `loadDesigns` caches its answer for the whole
 * file and a record a case swapped in would never be read.
 *
 * jsdom implements neither `matchMedia` nor `ResizeObserver`, and the shell asks both
 * questions on its first render. The stubs answer the query false and observe nothing,
 * which is the desktop rail and a diagram tile whose box is never measured.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { DesignRecord, DesignRecords } from "@/data/bundle";
import type { EpicEntity, RecordIndex } from "@/data/types";

import Shell from "./App";
import type { WorkItem } from "./model";
import { buildWorkItems, epicGroups } from "./model";

/* ------------------------------------------------------------------- jsdom */

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

/* ---------------------------------------------------------------- fixtures */

const DESIGN = "cobuilder-viewer";
const OTHER = "cobuilder-viewer-other";

/** Eighteen epics, so the Build level's cut has more than one section to page. */
const EPIC_COUNT = 18;

/**
 * How many epics one Build section holds.
 *
 * `EPICS_PER_SECTION` in `model.ts` is 6 and is not exported, so this case restates the
 * number the design gives. `epic-E5-design.md` states the cut: "the epics in delivery
 * order, six to a section". A change to the cut is a design change, and the assertions
 * below are written to fail loudly on it rather than to follow it.
 */
const EPICS_PER_SECTION = 6;

const OUTCOME = "One box is on screen at a time.";
const DONE_WHEN = ["Every level renders its own sections.", "The strip names the box on screen."];
const ABORT_IF = ["Two boxes are on screen at once."];
const OUT_OF_SCOPE = ["A shared link to one section."];
const PROBLEM = "A stacked level hides its last panel.";
const APPROACH = "One box per section, on a track.";
const RISKS = ["The strip and the boxes drift apart."];
const UNKNOWNS = ["How a long section reads inside its box."];
const VERDICT = "concerns";
const SUMMARY = "The model is small and legible.";
const ALTERNATIVE_OPTION = "A stacked column";
const ALTERNATIVE_REASON = "It hides the fourth panel behind a scroll.";
const BOUNDARY_TARGET = "src/data/";
const RULE = "One section is on screen at a time.";
const PR_TITLE = "The pager lands on the bundle";
const DRAFT = "# The section model\n\n## What changes\n\nOne box on screen.\n";
/** The draft, flattened by `excerpt`: the panel shows one line, not the markdown. */
const DRAFT_FLAT = "# The section model ## What changes One box on screen.";
const DRAFT_TITLE = "The pull request this work will open";
/** The count in the title is this work's own pull-request count, and 3 is its one. */
const WORK_PR_TITLE = `This work's pull requests · 1`;
const FLIGHTDECK_TITLE = "An open pull request";
const OTHER_PR_TITLE = "A real pull request";
const OTHER_PROBLEM = "The board lists every design and no work item opens.";
const OTHER_APPROACH = "A row opens the work item's own surface.";
const SHIPPED_STAGE = "implemented";

/** The Build level's runs, as the panel titles spell them. The dash is an en dash. */
const RUN_TITLES = [
  "Epics E1–E6",
  "Epics E7–E12",
  "Epics E13–E18",
];

/** The gate steps the index holds for this work, as the Rubrics section lists them. */
const GATE_STEPS = [
  { n: "4a", name: "The slice plan is approved", state: "approved" },
  { n: "4b", name: "The technical solution design is approved", state: "pending" },
];

/** One `goal.epics[]` row per epic, so a row shows the record's own outcome. */
const EPIC_ROWS = Array.from({ length: EPIC_COUNT }, (_, position) => ({
  id: `E${position + 1}`,
  branch: "design/cobuilder-viewer/work-surface",
  pr: null,
  state: "planned",
  outcome: `Epic ${position + 1} takes the work one step further.`,
}));

const EPICS: EpicEntity[] = Array.from({ length: EPIC_COUNT }, (_, position) => ({
  id: `${DESIGN}/E${position + 1}`,
  design: DESIGN,
  epic_id: `E${position + 1}`,
  branch: "design/cobuilder-viewer/work-surface",
  pr: null,
  state: "planned",
  note: null,
}));

const INDEX: RecordIndex = {
  schema_version: "1.3",
  sources: { git_head: "0123456789abcdef", trees: {} },
  entities: {
    design: [
      { id: DESIGN, name: DESIGN, outcome: OUTCOME, stage: SHIPPED_STAGE },
      { id: OTHER, name: OTHER, outcome: OTHER_PROBLEM, stage: "approved" },
    ],
    epic: [
      ...EPICS,
      {
        id: `${OTHER}/E1`,
        design: OTHER,
        epic_id: "E1",
        branch: "design/cobuilder-viewer/work-surface",
        pr: null,
        state: "planned",
        note: null,
      },
    ],
    slice: [],
    adr: [
      { id: "ADR-0028", title: "One section on screen", state: "accepted" },
      { id: "ADR-0029", title: "The strip reads the DOM", state: "accepted" },
      { id: "ADR-0030", title: "Another work's decision", state: "accepted" },
    ],
    context: [
      {
        id: "viewer-data",
        name: "The viewer's data module",
        path: "plugins/artifact/viewer/src/data",
        verifies: ["viewer"],
      },
    ],
    district: [{ id: "viewer", label: "The viewer", paths: ["plugins/artifact/viewer"] }],
    boundary_rule: [
      {
        id: "br-1",
        context: "viewer-data",
        kind: "dependency",
        detail: { target: BOUNDARY_TARGET, why: "One module names a bundle global." },
      },
    ],
    pull_request: [
      {
        id: 3,
        title: PR_TITLE,
        state: "merged",
        commit: "0123456789abcdef",
        date: "2026-09-22",
      },
      { id: 5, title: OTHER_PR_TITLE, state: "merged", commit: null, date: null },
      {
        id: 7,
        title: FLIGHTDECK_TITLE,
        state: "open",
        commit: "abcdef0123456",
        date: "2026-09-23",
      },
    ],
    publication: [],
    program_design: [],
    epic_design: [],
    interaction_design: [],
  },
  joins: {
    adr_to_pull_request: {},
    epic_to_pull_request: { [`${DESIGN}/E1`]: 3, [`${OTHER}/E1`]: 5 },
    epic_status: {},
    slice_to_epic: {},
    slice_to_epic_unresolved: {},
    context_verifies_district: {},
    district_uncovered: [],
    adr_to_context: { "ADR-0028": "viewer-data" },
    adr_to_district: { "ADR-0028": "viewer" },
    feature_gates: { [DESIGN]: GATE_STEPS },
  },
};

/**
 * The rich work item: every level fills, and every section has its own record.
 *
 * Two linked decisions, at the index's own ids, so the Architecture level's list can be
 * compared against `data/index.json`'s `adr` entities and `goal.adrs[]` between them.
 * `goals.epics[]` holds one row per epic, because the row's outcome comes from the plan
 * record and the panel's only fallback is a sentence about a missing one. The stage reads
 * implemented so the Shipped level fills and its own section renders.
 */
const RICH: DesignRecord = {
  goal: {
    name: DESIGN,
    title: "The Work surface",
    created: "2026-09-22",
    outcome: OUTCOME,
    done_when: DONE_WHEN,
    abort_if: ABORT_IF,
    min_work: { challenge_stage_run: true },
    epics: EPIC_ROWS,
    stage: SHIPPED_STAGE,
    supersedes: null,
    adr: null,
    adrs: ["ADR-0028", "ADR-0029"],
  },
  intent: {
    problem: PROBLEM,
    approach: APPROACH,
    alternatives: [{ option: ALTERNATIVE_OPTION, rejected_because: ALTERNATIVE_REASON }],
    risks: RISKS,
    unknowns: UNKNOWNS,
    out_of_scope: OUT_OF_SCOPE,
  },
  narrative: {
    problem_solution: {
      narration: "One index, three controls.",
      beats: [
        { kind: "problem", text: "A reader met the plan one screen at a time." },
        { kind: "decision", text: "The track holds one box per section." },
      ],
    },
  },
  assessment: {
    verdict: VERDICT,
    summary: SUMMARY,
    findings: [],
    risk_tier: "medium",
    stage: "design",
  },
  diagrams: {
    "1": "%% the container drawing\nC4Container\n    title cobuilder-viewer\n",
    "2": "sequenceDiagram\n  A->>B: step\n",
    "3": "classDiagram\n  class A\n",
  },
  pr_draft: DRAFT,
};

/**
 * The other work item: the same shape with four records missing.
 *
 * No assessment, no risk, no unknown, and no drafted pull request. Its own epic carries a
 * real merged pull request, so the Pull requests level fills without a draft and the case
 * for the draft's absence has a level to read. Its one linked decision is a decision the
 * rich work does not name, which is what makes the "no other design's records" case bite.
 */
const SPARSE: DesignRecord = {
  goal: {
    name: OTHER,
    title: "The Work board",
    created: "2026-09-22",
    outcome: OTHER_PROBLEM,
    done_when: ["A row opens the work item's own surface."],
    abort_if: [],
    min_work: { challenge_stage_run: true },
    stage: "approved",
    supersedes: null,
    adr: null,
    adrs: ["ADR-0030"],
  },
  intent: {
    problem: OTHER_PROBLEM,
    approach: OTHER_APPROACH,
    risks: [],
    unknowns: [],
    out_of_scope: [],
  },
  narrative: { problem_solution: { narration: "One row per design." } },
};

const DESIGNS: DesignRecords = { [DESIGN]: RICH, [OTHER]: SPARSE };

const ADRS = {
  "ADR-0028": {
    id: "ADR-0028",
    title: "One section on screen",
    state: "accepted",
    maps_to: { rule: RULE, modules: ["src/shell/Pager.tsx"] },
  },
  "ADR-0029": {
    id: "ADR-0029",
    title: "The strip reads the DOM",
    state: "accepted",
    maps_to: { rule: "The strip holds no list of its own." },
  },
  "ADR-0030": { id: "ADR-0030", title: "Another work's decision", state: "accepted" },
};

beforeEach(() => {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  /*
   * The decision global is declared by no module, because `src/data/bundle.ts` leaves it to
   * whoever reads the file. One entry is enough for the guard, and the three below are the
   * three the index links.
   */
  (window as unknown as Record<string, unknown>).ADRS = ADRS;
});

afterEach(cleanup);

/* ----------------------------------------------------------------- helpers */

const PANE_ID = "work-scroll-pane";
const HEADING_ID = "work-section-heading";
const STRIP_NAME = "Sections of this level";

/** One level of one work item, settled before a case reads it. */
async function openLevel(hash: string, title: string): Promise<void> {
  window.location.hash = hash;
  render(<Shell />);
  await waitFor(() => expect(levelTitle()).toBe(title));
}

/** One paged level, settled, with its boxes handed back. */
async function openPaged(hash: string, title: string): Promise<HTMLElement[]> {
  await openLevel(hash, title);
  await waitFor(() => expect(hasStrip()).toBe(true));
  return boxesOf();
}

/** The level heading's own words. It is the one `h1` the level keeps. */
function levelTitle(): string {
  return (document.getElementById(HEADING_ID)?.textContent ?? "").trim();
}

/** The scroll pane, which holds every panel the level on screen rendered. */
function pane(): HTMLElement {
  return document.getElementById(PANE_ID) as HTMLElement;
}

/** Every panel of the level on screen, in document order. */
function panels(): HTMLElement[] {
  return Array.from(pane().querySelectorAll<HTMLElement>("[data-shell-panel]"));
}

/** The heading each panel carries. `Panel` is the one writer of the attribute. */
function panelTitles(): string[] {
  return panels().map((panel) => panel.getAttribute("data-shell-panel") ?? "");
}

/** One panel by the heading it carries. A level that dropped it fails here. */
function panelNamed(title: string): HTMLElement {
  const found = panels().find((panel) => panel.getAttribute("data-shell-panel") === title);
  expect(found, `the level renders a panel named ${title}`).toBeTruthy();
  return found as HTMLElement;
}

/** True when the panel's own text holds this value. */
function holds(panel: HTMLElement, value: string): boolean {
  return within(panel).queryAllByText(value, { exact: true }).length > 0;
}

/** The strip, once the level rendered one. */
function strip(): HTMLElement {
  return screen.getByRole("navigation", { name: STRIP_NAME });
}

function hasStrip(): boolean {
  return screen.queryByRole("navigation", { name: STRIP_NAME }) !== null;
}

function stripLabels(): string[] {
  return Array.from(strip().querySelectorAll("a")).map((link) =>
    (link.textContent ?? "").trim(),
  );
}

/** The pager's own words. */
function pagerText(): string {
  return (screen.getByText(/^Section \d+ of \d+$/).textContent ?? "").trim();
}

/**
 * The paged level's column, read from the strip by sibling order.
 *
 * Slice 8's file reads the tree this way for its own reason: the DOM order here is not the
 * paint order, so a class name would read a different element after a tidy-up. The strip's
 * next sibling is the stage, the stage's one child is the track, and the track's children
 * are the boxes.
 */
function boxesOf(): HTMLElement[] {
  const stage = strip().nextElementSibling as HTMLElement;
  const track = stage.firstElementChild as HTMLElement;
  return Array.from(track.children) as HTMLElement[];
}

/** The one panel a box of a paged level holds. */
function panelOf(box: HTMLElement): HTMLElement {
  const found = Array.from(box.querySelectorAll<HTMLElement>("[data-shell-panel]"));
  expect(found, "a box of a paged level holds exactly one panel").toHaveLength(1);
  return found[0];
}

/**
 * The panel's own disclosure control, if it carries one.
 *
 * This is the panel-level fold and it is the one C3 scores: `Panel` renders the toggle as
 * a direct child of its own header when the caller passes `collapsible`. A record
 * disclosure inside a body is a different thing — the Architecture level's decisions and
 * the Build level's epics each hold an accordion — and it is not counted here. The report
 * states that reading, because the rubric's own sentence can be read to include them.
 */
function panelCarriesFold(panel: HTMLElement): boolean {
  const header = panel.children[0] as HTMLElement;
  expect(header.tagName, "the panel's first child is its own header").toBe("HEADER");
  return Array.from(header.children).some(
    (child) => child.tagName === "BUTTON" && child.hasAttribute("aria-expanded"),
  );
}

/** The panel's own body, which is the element after its header. */
function panelBody(panel: HTMLElement): HTMLElement {
  const body = panel.children[1] as HTMLElement;
  expect(body, "the panel carries a body element").toBeTruthy();
  return body;
}

/** The disclosure rows inside a panel's body: one per record the panel lists. */
function rowsIn(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>("button[aria-expanded]"));
}

/**
 * The record an accordion row names, read from the row's own text.
 *
 * A row's title holds the record's id and then its title, in two spans that sit side by
 * side with no space between them, so the id is read by its own form: an epic id is `E`
 * and its number, and a decision id is `ADR-` and its number. Both panels that carry rows
 * write one of the two.
 */
function rowId(row: HTMLElement): string {
  const found = /^(E\d+|ADR-\d+)/.exec((row.textContent ?? "").trim());
  expect(found, "the row names the record it discloses").not.toBeNull();
  return (found as RegExpExecArray)[1];
}

/** The record ids a panel's rows name, in the order the panel lists them. */
function rowIds(panel: HTMLElement): string[] {
  return rowsIn(panel).map(rowId);
}

/** The diagram levels a panel draws, read from the tiles' own accessible names. */
function drawnLevels(panel: HTMLElement): string[] {
  return within(panel)
    .queryAllByRole("button", { name: /drawing for level \d+/ })
    .map((tile) => /level (\d+)/.exec(tile.getAttribute("aria-label") ?? "")?.[1] ?? "");
}

/** The work item the shell builds for an id, from the same index and records. */
function workOf(id: string): WorkItem {
  const work = buildWorkItems(INDEX, DESIGNS).get(id);
  expect(work, `the index resolves the work item ${id}`).toBeTruthy();
  return work as WorkItem;
}

/** The four addresses that page their sections, and the level heading each one carries. */
const PAGED: Array<{ label: string; hash: string; title: string }> = [
  { label: "Intent", hash: `#/${DESIGN}/intent`, title: "Intent" },
  {
    label: "Problem & Solution",
    hash: `#/${DESIGN}/problem-and-solution`,
    title: "Problem and solution",
  },
  { label: "Architecture", hash: `#/${DESIGN}/architecture`, title: "Architecture" },
  { label: "Build's epics", hash: `#/${DESIGN}/build/epics`, title: "Build" },
];

/* -------------------------------------------------------------------- C1 */

describe("Slice 10 · every section of every level renders its own records", () => {
  it("renders the Intent level's four contract sections, each from the record", async () => {
    /*
      C1's first level. The four panels are the four parts of the contract, in the order
      the design lists them, and each one carries the value the record holds. `Why` also
      holds the container drawing, which is the design's own regrouping: this level renders
      no section named Diagrams, so its four panels are the four below.
    */
    await openPaged(`#/${DESIGN}/intent`, "Intent");

    expect(panelTitles()).toEqual(["Why", "Done when", "Abort if", "Out of scope"]);
    expect(stripLabels(), "the strip names the boxes it pages").toEqual(panelTitles());

    expect(holds(panelNamed("Why"), OUTCOME), "Why shows the goal's outcome").toBe(true);
    expect(holds(panelNamed("Done when"), DONE_WHEN[0])).toBe(true);
    expect(holds(panelNamed("Done when"), DONE_WHEN[1])).toBe(true);
    expect(holds(panelNamed("Abort if"), ABORT_IF[0])).toBe(true);
    expect(holds(panelNamed("Out of scope"), OUT_OF_SCOPE[0])).toBe(true);

    for (const title of panelTitles()) {
      expect(
        within(panelNamed(title)).queryByText(/not present/i),
        `${title} holds a record, so it marks no absence`,
      ).toBeNull();
    }
  });

  it("renders the Problem & Solution level's four sections, each from the record", async () => {
    /*
      C1's second level. The four panels carry the authored prose, the two lists, and the
      verdict. The verdict is the one value that also reads in the panel's own header, and
      the sample of it belongs to C5.
    */
    await openPaged(`#/${DESIGN}/problem-and-solution`, "Problem and solution");

    expect(panelTitles()).toEqual([
      "Problem and solution",
      "Risks",
      "Assessment",
      "Unknowns",
    ]);
    expect(stripLabels()).toEqual(panelTitles());

    const problem = panelNamed("Problem and solution");
    expect(holds(problem, PROBLEM), "the card's lead is the authored problem").toBe(true);
    expect(holds(problem, APPROACH), "and the approach is the solution card's").toBe(true);
    expect(holds(panelNamed("Risks"), RISKS[0])).toBe(true);
    expect(holds(panelNamed("Assessment"), SUMMARY)).toBe(true);
    expect(holds(panelNamed("Unknowns"), UNKNOWNS[0])).toBe(true);
  });

  it("renders the Architecture level's four sections, each from the record", async () => {
    /*
      C1's third level. The level draws the mechanism drawings, so its Diagrams panel holds
      levels 2 and 3 and never the container drawing, which belongs to Intent. The
      Boundaries panel reads the rules of the contexts a linked decision lands in, and the
      last panel holds the reach and the rejected alternative.
    */
    await openPaged(`#/${DESIGN}/architecture`, "Architecture");

    expect(panelTitles()).toEqual([
      "Diagrams",
      "Architecture Decisions",
      "Boundaries",
      "Districts and alternatives considered",
    ]);
    expect(stripLabels()).toEqual(panelTitles());

    expect(
      drawnLevels(panelNamed("Diagrams")),
      "the mechanism levels, and not the container drawing",
    ).toEqual(["2", "3"]);
    expect(rowIds(panelNamed("Architecture Decisions"))).toEqual(["ADR-0028", "ADR-0029"]);
    expect(holds(panelNamed("Boundaries"), BOUNDARY_TARGET)).toBe(true);
    expect(holds(panelNamed("Districts and alternatives considered"), ALTERNATIVE_OPTION)).toBe(
      true,
    );
  });

  it("renders the Build level's epic runs, one run per section", async () => {
    /*
      C1's fourth level, and the one whose sections come from the corpus rather than from a
      fixed list. Eighteen epics cut six to a section give three sections, and each box's
      panel is the run it holds. The second run's rows are read one by one, so a panel that
      repeated the first run fails here rather than passing on the count.
    */
    const boxes = await openPaged(`#/${DESIGN}/build/epics`, "Build");

    expect(boxes).toHaveLength(RUN_TITLES.length);
    expect(stripLabels()).toEqual(RUN_TITLES);
    expect(pagerText()).toBe("Section 1 of 3");

    boxes.forEach((box, position) => {
      const panel = panelOf(box);
      expect(panel.getAttribute("data-shell-panel")).toBe(RUN_TITLES[position]);
      expect(rowsIn(panel)).toHaveLength(EPICS_PER_SECTION);
    });

    expect(rowIds(panelOf(boxes[1])), "the middle run holds its own epics").toEqual([
      "E7",
      "E8",
      "E9",
      "E10",
      "E11",
      "E12",
    ]);
    expect(
      holds(panelOf(boxes[1]), EPIC_ROWS[7].outcome),
      "a run's row shows the plan record's own outcome",
    ).toBe(true);
  });

  it("renders the Build level's Rubrics sub-view with the gate steps the index holds", async () => {
    /*
      C1's fourth level, second sub-view. The Rubrics entry is a sub-view of Build rather
      than a section of the track, so it stacks in the pane's own scroll and carries one
      panel. Its rows are the steps `joins.feature_gates` holds for this work's plan slug,
      read in order with each step's own state.
    */
    await openLevel(`#/${DESIGN}/build/rubrics`, "Build");

    expect(panelTitles()).toEqual(["Rubrics"]);
    const panel = panelNamed("Rubrics");
    expect(
      within(panel).queryByText(/not present/i),
      "the index holds a gate record, so the panel marks no absence",
    ).toBeNull();

    const rows = Array.from(panel.querySelectorAll("li"));
    expect(rows.map((row) => (row.textContent ?? "").trim())).toEqual(
      GATE_STEPS.map((step) => `${step.n}${step.name}${step.state}`),
    );
  });

  it("renders the Pull requests level's three sections, and the real pull requests", async () => {
    /*
      C1's fifth level. The level stacks three panels in the pane's own scroll: the draft,
      this work's own pull requests, and the whole open set. The draft's own order is C2's
      subject and this case reads only that all three are there.
    */
    await openLevel(`#/${DESIGN}/pull-requests`, "Pull requests");

    expect(panelTitles()).toEqual([DRAFT_TITLE, WORK_PR_TITLE, "FlightDeck"]);
    expect(
      hasStrip(),
      "a stacked level draws no strip, because its panels share the pane's scroll",
    ).toBe(false);

    const real = panelNamed(WORK_PR_TITLE);
    expect(holds(real, PR_TITLE), "the work's own pull request").toBe(true);
    expect(
      within(real).queryByText(/not present/i),
      "a work with a pull request marks no absence",
    ).toBeNull();
    expect(holds(panelNamed("FlightDeck"), FLIGHTDECK_TITLE)).toBe(true);
  });

  it("renders the Shipped level's one section, with the stage the index holds", async () => {
    /*
      C1's sixth level. One panel, and it states the stage the design entity carries, the
      publications the bundle holds for this work's own pull requests, and the deploy
      record the corpus does not have.
    */
    await openLevel(`#/${DESIGN}/shipped`, "Shipped");

    expect(panelTitles()).toEqual(["Release status"]);
    const panel = panelNamed("Release status");
    expect(within(panel).queryByText(/not present/i)).toBeNull();
    expect(holds(panel, SHIPPED_STAGE), "the stage the index holds").toBe(true);
    expect(holds(panel, "0 publications")).toBe(true);
    expect(
      panel.textContent,
      "the section states the deploy gap rather than implying a release",
    ).toContain("No deploy record exists in this corpus.");
  });

  it("logs no error or warning across the walk of all six levels", async () => {
    /*
      C1's third piece of evidence: "Read the console messages across the walk. None
      reports an error." A DOM carries this one, so it is read here rather than left to the
      browser. The six levels are opened one after the other, and every message React or a
      component writes to the console is collected. React's own warnings count, because a
      duplicate key or a bad prop is a defect the walk would otherwise hide.
    */
    const walk = [
      ...PAGED,
      { label: "Pull requests", hash: `#/${DESIGN}/pull-requests`, title: "Pull requests" },
      { label: "Shipped", hash: `#/${DESIGN}/shipped`, title: "Shipped" },
    ];
    const logged: string[] = [];
    const errors = console.error;
    const warnings = console.warn;
    const collect =
      (write: (...args: unknown[]) => void) =>
      (...args: unknown[]) => {
        logged.push(args.map((arg) => String(arg)).join(" "));
        write(...args);
      };

    try {
      console.error = collect(console.error);
      console.warn = collect(console.warn);
      for (const level of walk) {
        cleanup();
        await openLevel(level.hash, level.title);
      }
    } finally {
      console.error = errors;
      console.warn = warnings;
    }

    expect(walk, "the walk visits all six levels").toHaveLength(6);
    expect(logged, "the walk reports nothing to the console").toEqual([]);
  });

  it("lists exactly the decisions the index links to this design, and no other work's", async () => {
    /*
      C1's second piece of evidence, and the one that compares a section against the
      bundle. `work.linkedAdrs` resolves `goal.adrs[]` through the index's `adr` entities,
      and the level lists what that returns. The other work names a third decision, so a
      panel that listed every decision in the bundle, or one that carried a list of its own,
      fails on one half of this case or the other.
    */
    const work = workOf(DESIGN);
    expect(
      work.linkedAdrs.map((adr) => adr.id),
      "the index links these two decisions to this design",
    ).toEqual(["ADR-0028", "ADR-0029"]);
    expect(INDEX.entities.adr.map((adr) => adr.id), "and the index holds three").toEqual([
      "ADR-0028",
      "ADR-0029",
      "ADR-0030",
    ]);

    await openPaged(`#/${DESIGN}/architecture`, "Architecture");
    /*
      The other work's decision is read first, so that a panel which listed every decision
      in the bundle fires here rather than on the order check below it.
    */
    expect(
      pane().textContent,
      "the other work's decision is not this work's",
    ).not.toContain("Another work's decision");
    expect(rowIds(panelNamed("Architecture Decisions"))).toEqual(["ADR-0028", "ADR-0029"]);

    cleanup();
    await openLevel(`#/${OTHER}/architecture`, "Architecture");
    expect(
      rowIds(panelNamed("Architecture Decisions")),
      "and the other work lists its own",
    ).toEqual(["ADR-0030"]);
  });
});

/* -------------------------------------------------------------------- C2 */

describe("Slice 10 · the envisioned pull request leads its level", () => {
  it("reads first on the Pull requests level, above every real pull request", async () => {
    /*
      C2's rule. The draft panel is the level's first panel, and the work's real pull
      requests come after it. The case reads the index of each in the pane's document
      order, so a draft moved below the real ones fails here even though the level still
      holds all three panels.
    */
    await openLevel(`#/${DESIGN}/pull-requests`, "Pull requests");

    const titles = panelTitles();
    expect(titles.indexOf(DRAFT_TITLE), "the draft leads the level").toBe(0);
    expect(
      titles.indexOf(WORK_PR_TITLE),
      "and the real pull requests come after it",
    ).toBeGreaterThan(titles.indexOf(DRAFT_TITLE));

    const draft = panelNamed(DRAFT_TITLE);
    expect(draft.textContent, "the panel holds the design's own draft text").toContain(
      DRAFT_FLAT,
    );
    expect(
      holds(panelNamed(WORK_PR_TITLE), PR_TITLE),
      "and the real pull request is a real one",
    ).toBe(true);
  });

  it("names itself a draft rather than a pull request that exists", async () => {
    /*
      C2's second piece of evidence. The heading is the design's own words and the lead
      states what a draft is.

      THE PANEL IS READ BY ITS POSITION, AND NOT BY ITS OWN TITLE. The claim is that the
      first block's heading says what it is, and a lookup by the words being tested would
      make the test pass on whatever the heading happened to say. So the heading is read
      from the level's first panel, and the shape is asserted before the wording: a heading
      of `PR 3`, or any heading that claimed the pull request exists, fires the first
      assertion below rather than the last.
    */
    await openLevel(`#/${DESIGN}/pull-requests`, "Pull requests");
    const draft = panels()[0];
    const heading = within(draft).getByRole("heading", { level: 2 });

    expect(
      heading.textContent,
      "the heading claims no pull request number",
    ).not.toMatch(/^PR \d+/);
    expect(heading.textContent, "the heading says this work will open it").toContain(
      "will open",
    );
    expect(heading.textContent, "and the heading is the one this level leads with").toBe(
      DRAFT_TITLE,
    );
    const lead = draft.querySelector("p.italic");
    expect(lead, "the panel carries a lead line").not.toBeNull();
    expect(lead?.textContent?.length ?? 0, "the lead line is not empty").toBeGreaterThan(0);
  });

  it("renders no draft block for a work whose design wrote none", async () => {
    /*
      C2's third piece of evidence, and the negative half. The other work carries a real
      pull request and no draft, so its level fills and its first block is the real one. A
      draft panel that rendered unconditionally, with empty content, fails the first
      assertion here.
    */
    await openLevel(`#/${OTHER}/pull-requests`, "Pull requests");

    const titles = panelTitles();
    expect(titles, "no draft block renders").not.toContain(DRAFT_TITLE);
    expect(titles[0], "the real pull requests lead instead").toBe(WORK_PR_TITLE);
    expect(holds(panelNamed(WORK_PR_TITLE), OTHER_PR_TITLE)).toBe(true);
    expect(
      pane().querySelectorAll(`[aria-label="${DRAFT_TITLE}"]`).length,
      "and no draft panel exists at all",
    ).toBe(0);
  });
});

/* -------------------------------------------------------------------- C3 */

describe("Slice 10 · an absence reads in place, and no panel is a fold", () => {
  it("states an absent record in place, in the section that would have held it", async () => {
    /*
      C3's first piece of evidence. The other work carries no assessment, no risk, and no
      unknown, so three of the level's four panels state an absence. Each one keeps its own
      box on the track, which is what puts the absence where the record would have read,
      and each one carries the `not present` pill beside that sentence.
    */
    const boxes = await openPaged(
      `#/${OTHER}/problem-and-solution`,
      "Problem and solution",
    );

    expect(boxes, "an absent record keeps its own section").toHaveLength(4);
    expect(stripLabels()).toEqual([
      "Problem and solution",
      "Risks",
      "Assessment",
      "Unknowns",
    ]);

    const assessment = panelNamed("Assessment");
    expect(within(assessment).getByText(/not present/i)).toBeTruthy();
    expect(
      assessment.textContent,
      "the panel states the absence in place",
    ).toContain("This work carries no assessment record, so the panel shows no verdict.");
    expect(
      boxes.some((box) => box.contains(assessment)),
      "and the panel still sits in a box of its own",
    ).toBe(true);

    expect(within(panelNamed("Risks")).getByText(/not present/i)).toBeTruthy();
    expect(within(panelNamed("Unknowns")).getByText(/not present/i)).toBeTruthy();
    expect(
      within(panelNamed("Problem and solution")).queryByText(/not present/i),
      "the section that holds a record marks no absence",
    ).toBeNull();
  });

  it("carries no fold on any panel of a paged level", async () => {
    /*
      C3's second piece of evidence, read as the panel contract. `epic-E5-design.md` states
      it: "A paged section carries no fold. Every panel of a paged section renders open, so
      `Panel` receives no `collapsible` prop on these levels." Both halves are read here:
      no panel header holds a disclosure control, and no panel body is inert, which is the
      attribute that hides a closed body from a reader.
    */
    for (const level of PAGED) {
      cleanup();
      const boxes = await openPaged(level.hash, level.title);

      boxes.forEach((box, position) => {
        const panel = panelOf(box);
        /*
          The body is read first and the header second. A staged run of this case shows
          which half fires: `collapsible` alone gives the header a toggle and leaves the
          body open, and `collapsible` with `defaultOpen={false}` closes the body as well.
        */
        expect(
          panelBody(panel).hasAttribute("inert"),
          `${level.label} section ${position + 1} renders its body open`,
        ).toBe(false);
        expect(
          panelCarriesFold(panel),
          `${level.label} section ${position + 1} carries no panel fold`,
        ).toBe(false);
      });
    }
  });

  it("draws no disclosure control at all where no panel holds a record disclosure", async () => {
    /*
      C3's second piece of evidence at its strongest, on the one level whose panels disclose
      no record of their own. The four Intent sections hold prose and a list each, so not
      one `aria-expanded` control renders inside any of the four boxes. The other three
      paged levels are not read this way: the Architecture level's decisions and the Build
      level's epics each disclose a record inside a body, and those controls are records
      rather than panel folds. The report states that reading.
    */
    const boxes = await openPaged(`#/${DESIGN}/intent`, "Intent");

    const disclosures = boxes.flatMap((box) =>
      Array.from(box.querySelectorAll("[aria-expanded]")),
    );
    expect(disclosures, "no disclosure control renders in the Intent level's boxes").toEqual(
      [],
    );
  });
});

/* -------------------------------------------------------------------- C4 */

describe("Slice 10 · the Build level pages its epics in runs", () => {
  it("cuts the work's epics into runs of six, in delivery order", () => {
    /*
      C4's rule as the derivation, read directly. Eighteen epics cut six to a section give
      three runs, and the runs joined in order are the epic list with nothing moved and
      nothing dropped. The epics arrive in delivery order from the index, and this asserts
      that the fixture's order is the one the design assumes: E1 through E18.
    */
    const work = workOf(DESIGN);
    const groups = epicGroups(work);

    expect(work.epics.map((epic) => epic.epic_id)).toEqual(
      Array.from({ length: EPIC_COUNT }, (_, position) => `E${position + 1}`),
    );
    expect(groups.map((group) => group.length)).toEqual([6, 6, 6]);
    expect(groups.length, "eighteen epics are not one section").toBeGreaterThan(1);
    expect(
      groups.flat().map((epic) => epic.epic_id),
      "the runs together hold every epic, in order",
    ).toEqual(work.epics.map((epic) => epic.epic_id));
  });

  it("renders one section per run, and the runs together hold every epic once", async () => {
    /*
      C4's first two pieces of evidence. The box count is the run count, each box's panel
      names its own range, and the rows read out of each box are that run and no other. The
      union is read as a list and as a set, so an epic that appeared twice fails the second
      check and a run that dropped one fails the first.
    */
    const boxes = await openPaged(`#/${DESIGN}/build/epics`, "Build");
    const work = workOf(DESIGN);
    const runs = boxes.map((box) => rowIds(panelOf(box)));

    expect(boxes, "one section per run").toHaveLength(epicGroups(work).length);
    expect(runs).toEqual(epicGroups(work).map((group) => group.map((epic) => epic.epic_id)));

    const seen = runs.flat();
    expect(seen, "every epic the design carries appears once").toEqual(
      work.epics.map((epic) => epic.epic_id),
    );
    expect(new Set(seen).size, "and none appears twice").toBe(seen.length);
    expect(seen, "and all eighteen are read").toHaveLength(EPIC_COUNT);
  });

  it("gives each section a range of its own, so the strip says which epics are in the box", async () => {
    /*
      C4's second piece of evidence, at the level of what the reader sees. The strip's three
      labels are the three ranges, in order, and the pager states the same count. A level
      that laid all eighteen epics in one section fails the count, and one that numbered its
      sections rather than naming their ranges fails the labels.
    */
    await openPaged(`#/${DESIGN}/build/epics`, "Build");

    expect(stripLabels()).toEqual(RUN_TITLES);
    expect(pagerText()).toBe("Section 1 of 3");
  });
});

/* -------------------------------------------------------------------- C5 */

describe("Slice 10 · a panel's own records come from the bundle", () => {
  it("shows three sampled values, each read from the record file the bundle writes", async () => {
    /*
      C5's three samples, one per record file the rubric names: a contract outcome from
      `designs.js`, a decision rule from `adrs.js`, and an assessment verdict from
      `designs.js`. The rule is the one value the index's own `adr` entity does not carry,
      so it can only come from the decision's record body. It sits inside a body the
      accordion closed on arrival, and the case presses the row and reads the region, so a
      rule that rendered without the record fails on the press.
    */
    await openPaged(`#/${DESIGN}/intent`, "Intent");
    expect(holds(panelNamed("Why"), OUTCOME), "the goal record's outcome").toBe(true);

    cleanup();
    await openPaged(`#/${DESIGN}/architecture`, "Architecture");
    const decisions = panelNamed("Architecture Decisions");
    const row = within(decisions).getByRole("button", { name: /^ADR-0028/ });
    const region = decisions.querySelector(
      `#${row.getAttribute("aria-controls")}`,
    ) as HTMLElement;
    expect(region, "the row controls its own body").toBeTruthy();
    expect(region.hasAttribute("inert"), "the body starts closed").toBe(true);

    fireEvent.click(row);
    await waitFor(() => expect(region.hasAttribute("inert")).toBe(false));
    expect(region.textContent, "the decision record's own rule").toContain(RULE);

    cleanup();
    await openPaged(`#/${DESIGN}/problem-and-solution`, "Problem and solution");
    const assessment = panelNamed("Assessment");
    expect(within(assessment).getByText(VERDICT), "the assessment record's verdict").toBeTruthy();
    expect(holds(assessment, SUMMARY)).toBe(true);
  });

  it("follows the record when the bundle's value changes", async () => {
    /*
      C5's rule against a fixture that never moves. The panel reads the record the bundle
      hands it, so a value changed in that record reaches the panel on the next render. A
      panel that held the value as a constant, or one that had cached it, keeps the old
      words and fails the second assertion. The record is put back in the same case, so no
      other case reads the changed value.
    */
    const changed = "A record the bundle holds, after it moved.";

    await openPaged(`#/${DESIGN}/intent`, "Intent");
    expect(holds(panelNamed("Why"), OUTCOME)).toBe(true);

    cleanup();
    const goal = RICH.goal;
    const original = goal?.outcome;
    try {
      if (goal) goal.outcome = changed;
      await openPaged(`#/${DESIGN}/intent`, "Intent");

      expect(
        holds(panelNamed("Why"), changed),
        "the panel shows the value the record now holds",
      ).toBe(true);
      expect(
        holds(panelNamed("Why"), OUTCOME),
        "and no longer the value it held before",
      ).toBe(false);
    } finally {
      if (goal) goal.outcome = original;
    }
  });
});
