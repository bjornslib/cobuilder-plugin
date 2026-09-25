/**
 * Slice 12 — a record opens in the Sheet, stated as cases.
 *
 * The slice's end, from the ladder in `docs/plans/cobuilder-viewer/04-slices.md`: "Pressing
 * a decision, a boundary rule, or an epic's design opens the whole record, and a part link
 * scrolls the record and moves focus to that heading." The one case the E5 design names for
 * this slice is `test_record_opens_in_the_sheet`, and the three record kinds it names are
 * the decision, the boundary rule, and the epic's technical solution design.
 *
 * THE SUBJECT IS THE WHOLE PATH, NOT THE SHEET COMPONENT ALONE. A RecordSheet that renders
 * a fixture subject is not a reader's state. What a reader meets is a control inside a
 * panel, the pane that stays where it was, and the record that opens over it. So every case
 * below renders `Shell` at a real address, presses the control the panel itself rendered,
 * and reads the surface that arrived.
 *
 * WHERE THE CONTROLS LIVE, and the address each one answers to:
 *
 *   - the decision            `#/cobuilder-viewer/architecture`, Architecture Decisions
 *   - the boundary rule       `#/cobuilder-viewer/architecture`, Boundaries
 *   - the epic's design       `#/cobuilder-viewer/build`, an epic's disclosure
 *
 * WHAT A DOM CANNOT CARRY, SAID PLAINLY. jsdom has no layout engine, so every bounding
 * rect reads zero. The part link's own geometry — that the record lands with the heading
 * at the container's top — is therefore read as the call the sheet makes, not as a
 * position. The heading itself is a real element in this DOM, so its own offset is
 * read from a rect this file states, and the scroll request is asserted against it. The
 * focus move needs no layout and is read whole.
 *
 * jsdom implements neither `matchMedia` nor `ResizeObserver`, and the shell asks both
 * questions on its first render. The stubs answer the query false and observe nothing.
 *
 * ONE BRANCH OF THE JUMP IS OUT OF THIS FILE'S REACH. The design's call stack states
 * `behavior: reduce ? instant : smooth`, and the smooth branch is asserted below. The
 * instant branch cannot be reached from this file: `motion` reads the reduced-motion
 * query once and caches the answer in a module-level value on first use, so a stub
 * installed inside a case arrives after the first render has already read the default.
 * A case for it needs its own test file, where the stub sits in `beforeAll` and the file's
 * first render reads it. That is a case worth writing, and this file states the smoother
 * branch rather than pretending to state both.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { DesignRecord, DesignRecords } from "@/data/bundle";
import type { RecordIndex } from "@/data/types";

import Shell from "./App";

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
});

/* ---------------------------------------------------------------- fixtures */

const DESIGN = "cobuilder-viewer";
const OUTCOME = "One box is on screen at a time.";

const ADR_ID = "ADR-0028";
const ADR_TITLE = "One section on screen";
const ADR_STATE = "accepted";
/**
 * The second decision this work names, and the one the record file does not carry.
 *
 * `data/adrs.js` writes one entry per decision, and a bundle can name a decision its
 * record file did not write. The index still holds the row, so the panel lists it and
 * carries a `no body` chip, and the sheet is the surface that states the absence.
 */
const ADR_ABSENT = "ADR-0099";
const ADR_ABSENT_TITLE = "A decision with no body";
const ADR_PROBLEM = "A stacked level hides its last panel behind a scroll.";
const ADR_DECISION = "One box per section, on a track.";
const ADR_RULE = "One section is on screen at a time.";
const ADR_MODULE = "src/shell/Pager.tsx";
const ADR_BODY = "# The decision\n\nThe track holds one box per section.";
const ADR_FORCE = "The pane cannot scroll and hold a strip at once.";

const RULE_ID = "br-1";
const RULE_KIND = "dependency";
const RULE_TARGET = "src/data/";
const RULE_WHY = "One module names a bundle global.";
const RULE_CONTEXT = "viewer-data";
/** The one further field the record carries, which the tile does not show. */
const RULE_EXTRA_KEY = "rationale";
const RULE_EXTRA_VALUE = "The bundle is read in one place.";

const EPIC_DESIGN_TITLE = "Epic E1 — the shell lands";
const EPIC_DESIGN_BODY = "## Scope\n\nThe shell reads the index and derives no join.";

const EPICS = [
  {
    id: `${DESIGN}/E1`,
    design: DESIGN,
    epic_id: "E1",
    branch: "design/cobuilder-viewer/work-surface",
    pr: null,
    state: "planned",
    note: null,
    design_doc: `${DESIGN}/E1`,
  },
];

const INDEX: RecordIndex = {
  schema_version: "1.3",
  sources: { git_head: "0123456789abcdef", trees: {} },
  entities: {
    design: [{ id: DESIGN, name: DESIGN, outcome: OUTCOME, stage: "design" }],
    epic: EPICS,
    slice: [],
    adr: [
      { id: ADR_ID, title: ADR_TITLE, state: ADR_STATE },
      { id: ADR_ABSENT, title: ADR_ABSENT_TITLE, state: ADR_STATE },
    ],
    context: [
      {
        id: RULE_CONTEXT,
        name: "The viewer's data module",
        path: "plugins/artifact/viewer/src/data",
        verifies: ["viewer"],
      },
    ],
    district: [{ id: "viewer", label: "The viewer", paths: ["plugins/artifact/viewer"] }],
    boundary_rule: [
      {
        id: RULE_ID,
        context: RULE_CONTEXT,
        kind: RULE_KIND,
        detail: {
          target: RULE_TARGET,
          why: RULE_WHY,
          [RULE_EXTRA_KEY]: RULE_EXTRA_VALUE,
        },
      },
    ],
    pull_request: [],
    publication: [],
    program_design: [],
    epic_design: [
      {
        id: `${DESIGN}/E1`,
        epic_id: "E1",
        feature_slug: DESIGN,
        title: EPIC_DESIGN_TITLE,
        body_md: EPIC_DESIGN_BODY,
      },
    ],
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
    adr_to_context: { [ADR_ID]: RULE_CONTEXT },
    adr_to_district: { [ADR_ID]: "viewer" },
    feature_gates: {},
  },
};

const RECORD: DesignRecord = {
  goal: {
    name: DESIGN,
    title: "The Work surface",
    created: "2026-09-22",
    outcome: OUTCOME,
    done_when: ["Every level renders its own sections."],
    abort_if: [],
    min_work: { challenge_stage_run: true },
    epics: [
      {
        id: "E1",
        branch: "design/cobuilder-viewer/work-surface",
        pr: null,
        state: "planned",
        outcome: "The shell lands on the board.",
      },
    ],
    stage: "design",
    supersedes: null,
    adr: null,
    adrs: [ADR_ID, ADR_ABSENT],
  },
  intent: {
    problem: "A stacked level hides its last panel.",
    approach: "One box per section, on a track.",
    alternatives: [],
    risks: [],
    unknowns: [],
    out_of_scope: [],
  },
  narrative: { problem_solution: { narration: "One index, three controls." } },
};

const DESIGNS: DesignRecords = { [DESIGN]: RECORD };

/**
 * The decision's own record, as `data/adrs.js` carries it.
 *
 * The record holds three anchored parts the index does not carry at all, so a Sheet that
 * opened the index row alone would show none of them.
 */
const ADRS = {
  [ADR_ID]: {
    id: ADR_ID,
    title: ADR_TITLE,
    state: ADR_STATE,
    problem: ADR_PROBLEM,
    decision: ADR_DECISION,
    forces: [ADR_FORCE],
    body: ADR_BODY,
    maps_to: { rule: ADR_RULE, modules: [ADR_MODULE], context: RULE_CONTEXT, district: "viewer" },
    history: [{ state: "accepted", date: "2026-09-22" }],
  },
};

beforeEach(() => {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  (window as unknown as Record<string, unknown>).ADRS = ADRS;
  /* The pane and the sheet both scroll, and jsdom implements neither. */
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
});

afterEach(cleanup);

/* ----------------------------------------------------------------- helpers */

const HEADING_ID = "work-section-heading";

/** One level of one work item, settled before a case reads it. */
async function openLevel(hash: string, title: string): Promise<void> {
  window.location.hash = hash;
  render(<Shell />);
  await waitFor(() => expect(levelTitle()).toBe(title));
}

function levelTitle(): string {
  return (document.getElementById(HEADING_ID)?.textContent ?? "").trim();
}

/** One control the level rendered, by the label its own panel gave it. */
function control(label: string): HTMLButtonElement {
  return screen.getByRole("button", { name: label }) as HTMLButtonElement;
}

/** Press one control, and settle the surface it opens. */
async function press(label: string): Promise<void> {
  fireEvent.click(control(label));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeNull());
}

/** The record sheet, which is the dialog the shell opens over the pane. */
function sheet(): HTMLElement {
  return screen.getByRole("dialog");
}

/** The part-link row, or null when the record rendered no link row at all. */
function jumpRow(): HTMLElement | null {
  return screen.queryByRole("navigation", { name: "Parts of this record" });
}

/** The part links' own labels, in document order. */
function jumpLabels(): string[] {
  const row = jumpRow();
  if (row === null) return [];
  return Array.from(row.querySelectorAll("a")).map((link) => (link.textContent ?? "").trim());
}

/** The scroll container of the sheet, which is the record's own box. */
function sheetScroll(): HTMLElement {
  return sheet().querySelector(".overflow-auto") as HTMLElement;
}

/* ------------------------------------------------------------- fixtures read */

const OPEN_DECISION = `Open the whole record for ${ADR_ID}`;
const OPEN_RULE = `Open the whole boundary rule ${RULE_ID}`;
const OPEN_EPIC_DESIGN = "Open the technical solution design for epic E1";

/* -------------------------------------------------------------------- cases */

describe("a control opens the whole record", () => {
  /*
   * C1 — the decision. The panel shows the rule and the modules, and the record's whole
   * body is one press away. The record carries the problem, the decision, the rule, the
   * forces, and the authored body, and every one of them is in the sheet and not only in
   * the index row.
   */
  it("opens a decision's whole record", async () => {
    await openLevel(`#/${DESIGN}/architecture`, "Architecture");
    await press(OPEN_DECISION);

    const body = sheet().textContent ?? "";
    expect(sheet().textContent).toContain(ADR_TITLE);
    expect(body).toContain(ADR_PROBLEM);
    expect(body).toContain(ADR_DECISION);
    expect(body).toContain(ADR_RULE);
    expect(body).toContain(ADR_FORCE);
    expect(body).toContain("The track holds one box per section.");
  });

  /*
   * C1 — the boundary rule. The tile shows the kind, the target, and one line of the
   * reason. The sheet states the rule, the reason in full, and every other field the
   * record carries, which is the field the tile never shows.
   */
  it("opens a boundary rule's whole record", async () => {
    await openLevel(`#/${DESIGN}/architecture`, "Architecture");
    await press(OPEN_RULE);

    const body = sheet().textContent ?? "";
    expect(body).toContain(RULE_TARGET);
    expect(body).toContain(RULE_KIND);
    expect(body).toContain(RULE_WHY);
    expect(body).toContain(RULE_EXTRA_KEY);
    expect(body).toContain(RULE_EXTRA_VALUE);
  });

  /*
   * C1 — the epic's technical solution design. The Build level discloses the epic, and
   * the design opens beside it.
   */
  it("opens an epic's technical solution design", async () => {
    await openLevel(`#/${DESIGN}/build`, "Build");
    await press(OPEN_EPIC_DESIGN);

    const body = sheet().textContent ?? "";
    expect(body).toContain(EPIC_DESIGN_TITLE);
    expect(body).toContain("The shell reads the index and derives no join.");
  });

  /*
   * The pane does not move and the record does not exist before the press. A record that
   * rendered on arrival would leave the reader in a sheet they never asked for.
   */
  it("opens no record until a control is pressed", async () => {
    await openLevel(`#/${DESIGN}/architecture`, "Architecture");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  /*
   * C1 — the pane does not move when a record opens, so a reader keeps their place in the
   * work while they read. The record is a surface over the pane, not a route the pane
   * follows, so the address stays the one that opened the level.
   */
  it("leaves the pane and the address where they were", async () => {
    await openLevel(`#/${DESIGN}/architecture`, "Architecture");
    const pane = document.getElementById("work-scroll-pane") as HTMLElement;
    pane.scrollTop = 240;
    const before = window.location.hash;

    await press(OPEN_DECISION);

    expect(window.location.hash).toBe(before);
    expect(pane.scrollTop).toBe(240);
  });

  /*
   * C1 — the record's own absence. A bundle can name a decision whose record file wrote
   * no entry. The panel lists the row and says so, and the sheet states the absence rather
   * than failing to open or inventing a field.
   */
  it("opens a decision whose record did not resolve, and says so", async () => {
    await openLevel(`#/${DESIGN}/architecture`, "Architecture");
    await press(`Open the whole record for ${ADR_ABSENT}`);

    const body = sheet().textContent ?? "";
    expect(body).toContain(ADR_ABSENT_TITLE);
    expect(body).toContain("The whole record is absent");
    expect(body).not.toContain(ADR_PROBLEM);
  });
});

describe("the part links", () => {
  /*
   * C2 — the row names the record's own parts. The record decides the list, so a record
   * with different parts gets its own row with no list to keep in step.
   */
  it("lists one link per part of the record, in document order", async () => {
    await openLevel(`#/${DESIGN}/architecture`, "Architecture");
    await press(OPEN_DECISION);

    expect(jumpLabels()).toEqual([
      "Problem",
      "Decision",
      "The rule this decision enforces",
      "Forces",
      "Full record",
      "History",
    ]);
  });

  /*
   * C2 — a part link carries the heading's own id, so the link and the heading cannot
   * drift. The heading the link names is in the record's own box.
   */
  it("points each link at a heading the record rendered", async () => {
    await openLevel(`#/${DESIGN}/architecture`, "Architecture");
    await press(OPEN_DECISION);

    const row = jumpRow() as HTMLElement;
    const targets = Array.from(row.querySelectorAll("a")).map((link) =>
      link.getAttribute("href")?.replace(/^#/, "") ?? "",
    );
    expect(targets.length).toBeGreaterThan(0);
    for (const id of targets) {
      expect(id).not.toBe("");
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  /*
   * C2 — the press scrolls the record's own box, and not the document. The pane does not
   * move, and a hash write would move the document instead.
   */
  it("scrolls the record's own box to the heading", async () => {
    await openLevel(`#/${DESIGN}/architecture`, "Architecture");
    await press(OPEN_DECISION);

    const row = jumpRow() as HTMLElement;
    const first = row.querySelector("a") as HTMLAnchorElement;
    const id = first.getAttribute("href")?.replace(/^#/, "") ?? "";
    const heading = document.getElementById(id) as HTMLElement;
    const scroll = sheetScroll();

    /* jsdom states no rect, so the two the jump reads are stated here. */
    scroll.getBoundingClientRect = () => ({ top: 100 }) as DOMRect;
    heading.getBoundingClientRect = () => ({ top: 460 }) as DOMRect;
    const before = window.location.hash;

    fireEvent.click(first);

    const calls = (Element.prototype.scrollTo as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[calls.length - 1][0]).toEqual(
      expect.objectContaining({ top: scroll.scrollTop + 360, behavior: "smooth" }),
    );
    expect(window.location.hash).toBe(before);
  });

  /*
   * C2 — the heading keeps focus, so a keyboard reader lands where the pointer did. The
   * heading takes a tabindex of -1 so it can hold focus at all.
   */
  it("moves focus to the heading it scrolled to", async () => {
    await openLevel(`#/${DESIGN}/architecture`, "Architecture");
    await press(OPEN_DECISION);

    const row = jumpRow() as HTMLElement;
    const first = row.querySelector("a") as HTMLAnchorElement;
    const id = first.getAttribute("href")?.replace(/^#/, "") ?? "";
    const heading = document.getElementById(id) as HTMLElement;

    fireEvent.click(first);

    expect(heading.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(heading);
  });

  /*
   * C2 — the row re-reads when another record opens. The scroll container arrives with the
   * portal and the reader is a callback ref, so a row that only ever read the first record
   * would leave the second record with a stale list or none at all.
   */
  it("reads the parts again when a record opens a second time", async () => {
    await openLevel(`#/${DESIGN}/architecture`, "Architecture");
    await press(OPEN_DECISION);
    expect(jumpLabels().length).toBeGreaterThan(0);

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await press(OPEN_DECISION);
    expect(jumpLabels()).toEqual([
      "Problem",
      "Decision",
      "The rule this decision enforces",
      "Forces",
      "Full record",
      "History",
    ]);
  });

  /*
   * C2 — a record with no anchored part carries no link row. The boundary rule's own body
   * is one rule, one reason, and a field map, and no part of it takes a link.
   */
  it("carries no link row for a record with no part of its own", async () => {
    await openLevel(`#/${DESIGN}/architecture`, "Architecture");
    await press(OPEN_RULE);

    expect(jumpRow()).toBeNull();
    expect(sheet().textContent).toContain(RULE_TARGET);
  });
});

describe("the record closes", () => {
  /*
   * The sheet is a modal surface with one close control. A pointer reader closes it the
   * same way a keyboard reader does, and the record goes with it.
   */
  it("closes on its own Close control", async () => {
    await openLevel(`#/${DESIGN}/architecture`, "Architecture");
    await press(OPEN_DECISION);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByText(ADR_PROBLEM)).toBeNull();
  });

  /*
   * Focus comes home when the record closes. The Sheet is modal, so opening a record takes
   * focus into it, and a keyboard reader who closes the record must land on the control
   * they opened it from — in the list they were reading — rather than on the body. The
   * three record kinds share one close path, so all three are read here rather than one of
   * them standing for the rest.
   */
  it("returns focus to the control the record was opened from", async () => {
    const openers = [
      { hash: `#/${DESIGN}/architecture`, level: "Architecture", label: OPEN_DECISION },
      { hash: `#/${DESIGN}/architecture`, level: "Architecture", label: OPEN_RULE },
      { hash: `#/${DESIGN}/build`, level: "Build", label: OPEN_EPIC_DESIGN },
    ];

    for (const { hash, level, label } of openers) {
      await openLevel(hash, level);

      /* The reader has tabbed to the control, so it holds focus before the press. */
      const opener = control(label);
      opener.focus();
      expect(document.activeElement, `${label} holds focus before the press`).toBe(opener);

      fireEvent.click(opener);
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeNull());

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

      expect(
        document.activeElement,
        `${label} holds focus again once the record closes`,
      ).toBe(opener);
      expect(
        document.activeElement,
        "focus is not left on the body",
      ).not.toBe(document.body);

      /* The next record opens from its own control, on a level of its own. */
      cleanup();
    }
  });

  /*
   * The sheet is a modal surface. Escape closes it, and the reader is left where they were
   * in the work rather than on a stale record.
   */
  it("closes on Escape and leaves the level where it was", async () => {
    await openLevel(`#/${DESIGN}/architecture`, "Architecture");
    const pane = document.getElementById("work-scroll-pane") as HTMLElement;
    await press(OPEN_DECISION);

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.getElementById("work-scroll-pane")).toBe(pane);
    expect(levelTitle()).toBe("Architecture");
  });
});
