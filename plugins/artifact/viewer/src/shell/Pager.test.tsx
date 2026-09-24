/**
 * Slice 8 — the section model, stated as cases.
 *
 * The slice's end, from the ladder in `docs/plans/cobuilder-viewer/04-slices.md`: "One box
 * is on screen, the strip, the pager bar, and the two arrow keys move one index, and the
 * pane reports no scroll at all." The rubric that scores it is
 * `.cobuilder/rubrics/cobuilder-viewer/slice-8.md`, and its six criteria are the six
 * groups below.
 *
 * THE SUBJECT IS `Pager.tsx`, AND THE CASES RENDER THE SHELL. `useSectionPaging`,
 * `SectionStrip`, `SectionStage`, `SectionPager`, and `keyPressIsTaken` are that file's,
 * and `PagedLevel` in `App.tsx` is the one caller that mounts them. A section model with
 * no level around it is not a state a reader can meet, so every case below renders
 * `Shell` at a real address. The one exception is the last case in the arrow-key group,
 * which calls the guard directly.
 *
 * GEOMETRY IS BROWSER-ONLY, AND THIS FILE DOES NOT PRETEND OTHERWISE. jsdom has no layout
 * engine: it reports zero for `scrollHeight`, for `clientHeight`, and for every bounding
 * rect, so a case that compared the pane's scroll height against its client height would
 * pass here whatever the tree did. The rubric reaches those claims through the
 * ChromeDevTools MCP tools on a served bundle, and no runner in this package holds a
 * browser. What this file carries instead is the tree, the roles, the attributes, and the
 * class contract the layout rests on — each case below says which of those it reads, and
 * the ones that stand in for a geometry claim name the claim they stand in for. The three
 * claims left to the browser are stated in the report: the pane's own scroll range, the
 * box's rect inside the pane's, and the track's transform offset.
 *
 * THE TRACK'S TRANSFORM IS ONE OF THOSE THREE, and it was measured before these cases were
 * written: motion writes no inline transform under jsdom, so `track.style.transform` reads
 * `none` at every index. The step is therefore read from what the transform is derived from
 * — the index — and from the class contract that makes `-100%` one box.
 *
 * THE FIXTURE HOLDS SEVEN EPICS. Six fill one section of the paged Build level
 * (`EPICS_PER_SECTION` in `model.ts`), so seven give that level two sections and the case
 * for it is not a one-box special case. The other three paged levels are fixed lists of
 * four, and each is opened in its own right.
 *
 * `App.test.tsx` already carries two cases that touch this model — the arrow keys step the
 * pager and never move the rail, and the board draws none of the three controls. They are
 * its cases and this file does not restate them. What is here is the slice's own end: the
 * box, the index, the three controls, and the shape each level keeps.
 *
 * jsdom implements neither `matchMedia` nor `ResizeObserver`, and the shell asks both
 * questions on its first render. The stubs answer the query false and observe nothing,
 * which is the desktop rail and a diagram tile whose box is never measured.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { RecordIndex } from "@/data/types";
import type { DesignRecord, DesignRecords } from "@/data/bundle";

import Shell from "./App";
import { keyPressIsTaken } from "./Pager";

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

/** Seven epics, so the Build level pages two sections of its track. */
const EPIC_COUNT = 7;

const INDEX: RecordIndex = {
  schema_version: "1.3",
  sources: { git_head: "0123456789abcdef", trees: {} },
  entities: {
    design: [
      {
        id: DESIGN,
        name: DESIGN,
        outcome: "One work item, paged by its sections.",
        stage: "approved",
      },
    ],
    epic: Array.from({ length: EPIC_COUNT }, (_, position) => ({
      id: `${DESIGN}/E${position + 1}`,
      design: DESIGN,
      epic_id: `E${position + 1}`,
      branch: "design/cobuilder-viewer/work-surface",
      pr: null,
      state: "planned",
      note: null,
    })),
    slice: [],
    adr: [{ id: "ADR-0028", title: "One section on screen", state: "accepted" }],
    context: [],
    district: [],
    boundary_rule: [],
    pull_request: [],
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

/**
 * The one work item, and it fills every level the section model reads.
 *
 * The three fixed paged levels are lists of four, so Intent, Problem & Solution, and
 * Architecture each page four boxes with no help from this record. The Build level's
 * sections come from the epic count above. The record's three diagram levels are the
 * corpus's shape, and the container drawing is level 1.
 */
const VIEWER: DesignRecord = {
  goal: {
    name: DESIGN,
    title: "The Work surface",
    created: "2026-09-22",
    outcome: "One box is on screen at a time.",
    done_when: ["One box is on screen."],
    abort_if: ["Two boxes are on screen at once."],
    min_work: { challenge_stage_run: true },
    stage: "approved",
    supersedes: null,
    adr: null,
    adrs: ["ADR-0028"],
  },
  intent: {
    problem: "A stacked level hides its last panel.",
    approach: "One box per section, on a track.",
    risks: ["The strip and the boxes drift apart."],
    unknowns: ["How a long section reads inside its box."],
    out_of_scope: ["A shared link to one section."],
  },
  narrative: {
    problem_solution: { narration: "One index, three controls." },
  },
  assessment: {
    verdict: "proceed",
    summary: "The model is small and legible.",
    findings: [],
  },
  diagrams: {
    "1": "%% the container drawing\nC4Container\n    title cobuilder-viewer\n",
    "2": "sequenceDiagram\n  A->>B: step\n",
    "3": "classDiagram\n  class A\n",
  },
  pr_draft: "# The section model\n\n## What changes\n\nOne box on screen.\n",
};

const DESIGNS: DesignRecords = { [DESIGN]: VIEWER };

const ADRS = {
  "ADR-0028": { id: "ADR-0028", title: "One section on screen", state: "accepted" },
};

beforeEach(() => {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  /*
   * The decision global is declared by no module, because `src/data/bundle.ts` leaves it to
   * whoever reads the file. One entry is enough: its guard reads the first value's `title`,
   * so an empty map reads as a file that assigned nothing and the loader then asks the dev
   * server for one.
   */
  (window as unknown as Record<string, unknown>).ADRS = ADRS;
});

afterEach(cleanup);

/* ----------------------------------------------------------------- helpers */

const PANE_ID = "work-scroll-pane";
const HEADING_ID = "work-section-heading";
const STRIP_NAME = "Sections of this level";
const JUMP_BAR_NAME = "Sections on this page";

/** One press on the page's own arrow keys, at the body of the document. */
function press(key: string, init: Record<string, boolean> = {}): void {
  fireEvent.keyDown(document.body, { key, ...init });
}

/** The route, and a fresh render of the shell at it. */
async function open(hash: string): Promise<void> {
  window.location.hash = hash;
  render(<Shell />);
  await waitFor(() => expect(levelTitle()).not.toBe(""));
}

/** The level heading's own words. It is the one `h1` the level keeps. */
function levelTitle(): string {
  return (document.getElementById(HEADING_ID)?.textContent ?? "").trim();
}

/** The strip, once the level rendered one. */
function strip(): HTMLElement {
  return screen.getByRole("navigation", { name: STRIP_NAME });
}

function stripLinks(): HTMLElement[] {
  return Array.from(strip().querySelectorAll("a")) as HTMLElement[];
}

function hasStrip(): boolean {
  return screen.queryByRole("navigation", { name: STRIP_NAME }) !== null;
}

/** The pager's own words, or `null` when this level draws no pager. */
function pagerText(): string | null {
  const found = screen.queryByText(/^Section \d+ of \d+$/);
  return found === null ? null : (found.textContent ?? "").trim();
}

/** The number the pager states, for a level that draws one. */
function pagerIndex(): number {
  const text = pagerText();
  const match = text === null ? null : /^Section (\d+) of (\d+)$/.exec(text);
  expect(match, `the pager states a section and a count, and it read ${String(text)}`).not.toBeNull();
  return Number((match as RegExpExecArray)[1]);
}

function pagerCount(): number {
  const text = pagerText();
  const match = text === null ? null : /^Section (\d+) of (\d+)$/.exec(text);
  return Number((match as RegExpExecArray)[2]);
}

/**
 * The paged level's column, read from the strip by sibling order.
 *
 * The prototype's own comment says the DOM order here is not the paint order, so this
 * reads the tree the way the pager builds it and never by a class name: the strip's parent
 * is the column, the strip's next sibling is the stage, the stage's one child is the
 * track, and the track's children are the boxes. A change to any of those four steps
 * fails this helper rather than silently reading a different element.
 */
function columnOf(): HTMLElement {
  return strip().parentElement as HTMLElement;
}

function stageOf(): HTMLElement {
  return strip().nextElementSibling as HTMLElement;
}

function trackOf(): HTMLElement {
  return stageOf().firstElementChild as HTMLElement;
}

function boxesOf(): HTMLElement[] {
  return Array.from(trackOf().children) as HTMLElement[];
}

/**
 * Which box is on screen, read from the tree and not from the pager's own words.
 *
 * `SectionStage` marks every box but the active one `inert`, so the index is the position
 * of the one box that does not carry the attribute. This is the fact the pager's text only
 * states: a control could print the right number and move nothing.
 */
function onScreenIndex(): number {
  const inert = boxesOf().map((box) => box.hasAttribute("inert"));
  const showing = inert.map((isInert, position) => (isInert ? null : position)).filter(
    (position) => position !== null,
  );
  expect(showing, "exactly one box is on screen").toHaveLength(1);
  return showing[0] as number;
}

/** The one heading a box rendered, read from the panel the box holds. */
function boxHeadings(): string[] {
  return boxesOf().map((box) => {
    const panel = box.querySelector("[data-shell-panel]");
    expect(panel, "every box of a paged level holds one panel").not.toBeNull();
    return (panel as HTMLElement).getAttribute("data-shell-panel") ?? "";
  });
}

/** The box's own `<h2>`, which is the heading the panel rendered. */
function boxH2s(): string[] {
  return boxesOf().map((box) => {
    const heading = box.querySelector("h2");
    expect(heading, "every box of a paged level holds one h2").not.toBeNull();
    return (heading as HTMLElement).textContent ?? "";
  });
}

/** The strip link that reads as the active one. */
function activeLinkIndex(): number {
  return stripLinks().findIndex((link) => link.getAttribute("aria-current") === "step");
}

/** The element inside the pane that holds this section's content. */
function contentRootOf(pane: HTMLElement, inside: HTMLElement): HTMLElement {
  const found = Array.from(pane.children).find((child) => child.contains(inside));
  expect(found, "the pane holds one content root for this level").toBeTruthy();
  return found as HTMLElement;
}

/** The four addresses that page their sections, and the count each one lays down. */
const PAGED: Array<{ label: string; hash: string; count: number }> = [
  { label: "Intent", hash: `#/${DESIGN}/intent`, count: 4 },
  { label: "Problem & Solution", hash: `#/${DESIGN}/problem-and-solution`, count: 4 },
  { label: "Architecture", hash: `#/${DESIGN}/architecture`, count: 4 },
  { label: "Build's epics", hash: `#/${DESIGN}/build/epics`, count: 2 },
];

/* -------------------------------------------------------------------- C1 */

describe("Slice 8 · one box is on screen, and the pane does not scroll", () => {
  it("puts one box on screen on each of the four paged levels", async () => {
    /*
      C1's first evidence, at the level of the tree. The rubric counts boxes inside the
      pane's rect with a browser; this counts the boxes on the track and reads which one the
      stage left reachable. Both halves can fail: a track that rendered no box fails the
      count, and a stage that stopped marking the others `inert` reports four boxes on
      screen instead of one.
    */
    for (const level of PAGED) {
      cleanup();
      await open(level.hash);
      await waitFor(() => expect(hasStrip()).toBe(true));

      expect(boxesOf(), `${level.label} lays its sections on the track`).toHaveLength(
        level.count,
      );
      expect(stripLinks(), `${level.label} names one link per box`).toHaveLength(level.count);
      expect(
        boxesOf().filter((box) => box.hasAttribute("inert")),
        `${level.label} hides every box but the one on screen`,
      ).toHaveLength(level.count - 1);
      expect(onScreenIndex(), `${level.label} starts on its first box`).toBe(0);
    }

    /* The three fixed levels page four each, and the Build level pages its two epic runs. */
    expect(PAGED.map((level) => level.count)).toEqual([4, 4, 4, 2]);
  });

  it("bounds the level by the pane, clips at the stage, and lets each box scroll itself", async () => {
    /*
      C1's second and third evidence, as the class contract the layout rests on. jsdom
      measures nothing, so the pane's scroll height against its client height cannot be
      compared here. What can be read is the contract that makes those two equal: the
      level's column takes the pane's height and no more, the stage is the one clip box,
      and every box is its own scroll container. Break any one of the three and this case
      fails.
    */
    await open(PAGED[3].hash);
    await waitFor(() => expect(hasStrip()).toBe(true));

    const pane = document.getElementById(PANE_ID) as HTMLElement;
    const column = columnOf();
    const stage = stageOf();
    const root = contentRootOf(pane, column);

    expect(pane.contains(column), "the column sits inside the pane").toBe(true);
    expect(root.className, "the level's root takes the pane's own height").toContain("h-full");
    expect(root.className, "and may shrink, so nothing pushes the pane taller").toContain(
      "min-h-0",
    );
    expect(root.contains(column), "the column is built inside that root").toBe(true);
    expect(column.className, "the column takes the height the chrome left").toContain(
      "flex-1",
    );
    expect(column.className, "and never grows past it").toContain("min-h-0");
    expect(stage.className, "the stage is the one clip box").toContain("overflow-hidden");

    const clipped = boxesOf().filter((box) => box.className.includes("overflow-y-auto"));
    expect(clipped, "every box scrolls its own overflow").toHaveLength(boxesOf().length);
    expect(
      boxesOf().map((box) => box.className.includes("overscroll-contain")),
      "a box's scroll never chains to the pane",
    ).toEqual(boxesOf().map(() => true));
  });

  it("takes the document's scroll, so no page scroll sits behind the pane", async () => {
    /*
      C1's third evidence rests on the document owning no scroll. `useDocumentNoScroll` is
      the mechanism, and it is readable: the root and the body both carry `overflow: hidden`
      while the shell is mounted, and both are handed back on unmount. Remove the hook and
      the document scrolls behind a pane that cannot, which this case fails on.
    */
    const before = document.documentElement.style.overflow;

    await open(PAGED[0].hash);
    await waitFor(() => expect(hasStrip()).toBe(true));

    expect(document.documentElement.style.overflow, "the root owns no scroll").toBe("hidden");
    expect(document.body.style.overflow, "the body owns no scroll").toBe("hidden");

    cleanup();
    expect(document.documentElement.style.overflow, "the host gets its scroll back").toBe(
      before,
    );
  });
});

/* -------------------------------------------------------------------- C2 */

describe("Slice 8 · one index drives the strip, the pager, and the arrow keys", () => {
  it("moves one index on Next, and the strip, the pager, and the box agree", async () => {
    /*
      The three pieces of C2's first evidence, read at once. One press on Next moves the box
      the stage leaves reachable, the words the pager states, and the link the strip marks
      active. The case asserts all three rather than the pager's text alone, so a control
      that printed the right number while the track stood still would fail it.
    */
    await open(PAGED[3].hash);
    await waitFor(() => expect(hasStrip()).toBe(true));

    expect(pagerText()).toBe("Section 1 of 2");
    expect(onScreenIndex()).toBe(0);
    expect(activeLinkIndex()).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => expect(pagerText()).toBe("Section 2 of 2"));
    expect(onScreenIndex(), "the pager's next box is the one on screen").toBe(1);
    expect(activeLinkIndex(), "the strip marks the same section active").toBe(1);
    expect(
      boxesOf().filter((box) => box.hasAttribute("inert")),
      "the box the reader left is the one now hidden",
    ).toEqual([boxesOf()[0]]);
  });

  it("walks back one box per press, and clamps at each end", async () => {
    /*
      "One index, both directions, and each step exactly one box." Next walks the level to
      its last box, where the control is disabled and a further press moves nothing. Previous
      walks it back to the first, where the same holds. Every step is checked against the box
      on screen, so a step of two fails here as loudly as a step of none.
    */
    await open(PAGED[1].hash);
    await waitFor(() => expect(hasStrip()).toBe(true));

    const next = screen.getByRole("button", { name: "Next" });
    const previous = screen.getByRole("button", { name: "Previous" });

    expect(
      (previous as HTMLButtonElement).disabled,
      "the pager states that nothing precedes the first box",
    ).toBe(true);

    for (const wanted of [1, 2, 3]) {
      fireEvent.click(next);
      await waitFor(() => expect(onScreenIndex()).toBe(wanted));
      expect(pagerIndex(), "the pager counts the box the stage moved to").toBe(wanted + 1);
    }

    expect(
      (next as HTMLButtonElement).disabled,
      "the pager states that nothing follows the last box",
    ).toBe(true);
    fireEvent.click(next);
    expect(onScreenIndex(), "a press at the end moves nothing").toBe(3);

    for (const wanted of [2, 1, 0]) {
      fireEvent.click(previous);
      await waitFor(() => expect(onScreenIndex()).toBe(wanted));
      expect(activeLinkIndex(), "the strip follows the walk back").toBe(wanted);
    }
  });

  it("jumps the index when a heading three along is pressed, and writes no address", async () => {
    /*
      C2's second evidence. A press on the strip's fourth heading moves three boxes in one
      step, and the case reads it three ways: the box on screen, the pager's words, and the
      link the strip marks. It also reads the address, because the strip's links are
      anchors and a press that let the anchor act would move the document. That is the one
      half of this case a browser would see and jsdom would not, so it is asserted here
      rather than left to the served page.
    */
    const hash = PAGED[2].hash;
    await open(hash);
    await waitFor(() => expect(hasStrip()).toBe(true));

    const fourth = stripLinks()[3];
    expect(fourth.textContent, "the fourth link names the fourth box").toBe(boxHeadings()[3]);

    fireEvent.click(fourth);

    await waitFor(() => expect(onScreenIndex()).toBe(3));
    expect(pagerText()).toBe("Section 4 of 4");
    expect(activeLinkIndex(), "the strip moved with the press").toBe(3);
    expect(window.location.hash, "a section press never writes the route").toBe(hash);
  });

  it("steps one box per arrow press, forward and back, and returns to where it started", async () => {
    /*
      C2's third evidence. ArrowRight then ArrowLeft each move one box, and the level ends
      where it began. The route is read at each press, so a key that stepped the index by
      writing the hash would fail here rather than pass on the state alone.
    */
    const hash = PAGED[0].hash;
    await open(hash);
    await waitFor(() => expect(hasStrip()).toBe(true));

    press("ArrowRight");
    await waitFor(() => expect(onScreenIndex()).toBe(1));
    expect(pagerText()).toBe("Section 2 of 4");
    expect(window.location.hash, "an arrow press never writes the route").toBe(hash);

    press("ArrowRight");
    await waitFor(() => expect(onScreenIndex()).toBe(2));

    press("ArrowLeft");
    await waitFor(() => expect(onScreenIndex()).toBe(1));
    expect(activeLinkIndex(), "the strip follows the keys back").toBe(1);

    press("ArrowLeft");
    await waitFor(() => expect(onScreenIndex()).toBe(0));
    expect(pagerText(), "the level is back where it started").toBe("Section 1 of 4");
    expect(window.location.hash).toBe(hash);
  });

  it("keeps the track exactly one box wide, so a percentage step is a box step", async () => {
    /*
      "The track moves by exactly one box width." The transform itself is motion's, and
      jsdom holds no value for it, so the case reads the contract the offset is derived
      from: every box is the full width of the stage and refuses to shrink, so the track's
      own width is one box and `-100%` of the track is one step. A box given a fixed width,
      or one allowed to shrink, breaks that derivation and fails this case.
    */
    await open(PAGED[0].hash);
    await waitFor(() => expect(hasStrip()).toBe(true));

    const stage = stageOf();
    expect(stage.children, "the stage holds one child, the track").toHaveLength(1);
    expect(trackOf().children).toHaveLength(boxesOf().length);

    const widths = boxesOf().map((box) => box.className.includes("w-full"));
    expect(widths, "every box is the stage's own width").toEqual(
      boxesOf().map(() => true),
    );
    const shrink = boxesOf().map((box) => box.className.includes("shrink-0"));
    expect(shrink, "no box shrinks away from that width").toEqual(
      boxesOf().map(() => true),
    );

    /* One step moves the box on screen by one position on the track, never by two. */
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(pagerText()).toBe("Section 2 of 4"));
    expect(onScreenIndex()).toBe(1);
    expect(trackOf().children[onScreenIndex()]).toBe(boxesOf()[1]);
  });
});

/* -------------------------------------------------------------------- C3 */

describe("Slice 8 · the strip's labels come from the sections themselves", () => {
  it("names the strip with the boxes' own headings, in order, and counts the same boxes", async () => {
    /*
      The strip's list is the panels the boxes rendered, read by `useJumpTargets`, so the
      labels and the headings are one fact stated twice. This case reads both, in order, and
      the pager's count beside them. A strip that held a list of its own — the shape C3
      scores zero — fails on the first level whose headings it did not match.
    */
    for (const level of PAGED) {
      cleanup();
      await open(level.hash);
      await waitFor(() => expect(hasStrip()).toBe(true));

      const labels = stripLinks().map((link) => (link.textContent ?? "").trim());
      const headings = boxHeadings();

      expect(labels, `${level.label}: the strip names the boxes' own panels`).toEqual(headings);
      expect(
        labels,
        `${level.label}: the labels are the words the boxes' headings carry`,
      ).toEqual(boxH2s());
      expect(pagerCount(), `${level.label}: the count is the box count`).toBe(
        boxesOf().length,
      );
      expect(pagerCount(), `${level.label}: the count is the strip's own length`).toBe(
        labels.length,
      );
    }
  });

  it("follows a section that renames itself, because the strip holds no list of its own", async () => {
    /*
      C3's third evidence, and the one that separates a read list from a written one. One
      panel of the second box renames its heading in the DOM, which is what a record change
      looks like from the pane's side, and the strip's own link takes the new words. A strip
      built from a constant, or from anything but the pane, keeps the old label and fails
      here.
    */
    await open(PAGED[0].hash);
    await waitFor(() => expect(hasStrip()).toBe(true));
    await waitFor(() => expect(document.activeElement?.id).toBe(HEADING_ID));

    const box = boxesOf()[1];
    const panel = box.querySelector("[data-shell-panel]") as HTMLElement;
    const heading = box.querySelector("h2") as HTMLElement;
    expect(stripLinks()[1].textContent).toBe("Done when");

    panel.setAttribute("data-shell-panel", "Renamed part");
    /* Replacing the text node is the child-list mutation `useJumpTargets` observes. */
    heading.textContent = "Renamed part";

    await waitFor(() =>
      expect(stripLinks()[1].textContent, "the strip's link took the new words").toBe(
        "Renamed part",
      ),
    );
    expect(
      stripLinks().map((link) => (link.textContent ?? "").trim()),
      "and no other link moved",
    ).toEqual(["Why", "Renamed part", "Abort if", "Out of scope"]);
  });
});

/* -------------------------------------------------------------------- C4 */

describe("Slice 8 · the arrow keys are guarded, and they never write the route", () => {
  it("steps the index and leaves the address where it was", async () => {
    /*
      C4's first evidence, and it is read as a pair: the index moved AND the hash did not.
      Either half alone is vacuous — a key that did nothing would keep the address, and a
      key that wrote a route would move the reader without stepping the section.
    */
    const hash = PAGED[2].hash;
    await open(hash);
    await waitFor(() => expect(hasStrip()).toBe(true));

    expect(window.location.hash).toBe(hash);

    press("ArrowRight");
    await waitFor(() => expect(onScreenIndex()).toBe(1));
    expect(window.location.hash, "the step is view state and not a destination").toBe(hash);

    press("ArrowLeft");
    await waitFor(() => expect(onScreenIndex()).toBe(0));
    expect(window.location.hash).toBe(hash);
  });

  it("leaves a press inside a text field alone, and still steps outside one", async () => {
    /*
      C4's second evidence. The page carries one real text field: the work-item switcher's
      filter, inside its popover. The case opens that field, focuses it, presses the arrow
      key, and reads the section. It then presses the same key at the body, so a shell that
      had stopped stepping altogether would fail this case rather than pass it.
    */
    await open(PAGED[0].hash);
    await waitFor(() => expect(hasStrip()).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "Change work item" }));
    const field = await waitFor(() => screen.getByLabelText("Filter the work item list"));
    field.focus();
    expect(document.activeElement, "the field holds focus, so the guard is the live path").toBe(
      field,
    );

    /*
      ONE PRESS, AND ONLY FORWARD. A forward press and a backward press would cancel, and the
      case would read the same whether the guard held or not — a staged run of this file
      proved exactly that, and this is the fix. A single ArrowRight steps forward if anything
      lets it through.
    */
    fireEvent.keyDown(field, { key: "ArrowRight" });
    await waitFor(() => expect(pagerText()).toBe("Section 1 of 4"));
    expect(onScreenIndex(), "a field owns its own caret keys").toBe(0);

    press("ArrowRight");
    await waitFor(() => expect(onScreenIndex(), "the key still steps outside the field").toBe(1));
  });

  it("leaves a press with a modifier alone, and still steps without one", async () => {
    /*
      C4's third evidence, held to the same pair as the field's. Each modifier is pressed on
      its own and forward only, so a guard that let a modified press through would walk the
      level four boxes along and fail here. A plain press then steps, so the case cannot pass
      by the keys being broken.
    */
    await open(PAGED[0].hash);
    await waitFor(() => expect(hasStrip()).toBe(true));

    const modified: Array<Record<string, boolean>> = [
      { altKey: true },
      { ctrlKey: true },
      { metaKey: true },
      { shiftKey: true },
    ];
    for (const init of modified) {
      press("ArrowRight", init);
    }

    await waitFor(() => expect(pagerText()).toBe("Section 1 of 4"));
    expect(onScreenIndex(), "a modified press names a command, not a section").toBe(0);

    press("ArrowRight");
    await waitFor(() => expect(onScreenIndex(), "a plain press still steps").toBe(1));
  });

  it("takes a press from a field or a modifier, and leaves the two arrow keys to the shell", () => {
    /*
      The guard itself, called directly. It is one function shared by the pager's keys and
      the rail's traversal, and its rule is two lines: a field owns its caret keys, and a
      modifier names a command. Each branch is read in both directions, so a guard widened
      to swallow every key fails on the arrow keys below it.
    */
    const on = (key: string, target: EventTarget, init: KeyboardEventInit = {}) =>
      keyPressIsTaken({ key, target, ...init } as unknown as KeyboardEvent);

    for (const tag of ["INPUT", "TEXTAREA", "SELECT"]) {
      const field = document.createElement(tag);
      document.body.appendChild(field);
      expect(on("ArrowRight", field), `a press inside a ${tag} is the field's`).toBe(true);
      field.remove();
    }

    for (const init of [
      { altKey: true },
      { ctrlKey: true },
      { metaKey: true },
      { shiftKey: true },
    ]) {
      expect(on("ArrowLeft", document.body, init), "a modified press is a command").toBe(true);
    }

    expect(on("ArrowRight", document.body), "a plain arrow press is the shell's").toBe(false);
    expect(on("ArrowLeft", document.body), "both arrow keys belong to the shell").toBe(false);
  });
});

/* -------------------------------------------------------------------- C5 */

describe("Slice 8 · a paged level drops the band and keeps the heading element", () => {
  it("draws no band above the strip, and keeps one sr-only h1 carrying the level's title", async () => {
    /*
      C5's first two pieces of evidence. A paged level repeats nothing: the strip names the
      sections, so the banner above them is gone, and the level's one `h1` survives as
      `sr-only` for a screen reader and for the focus move. The case reads the heading's tag,
      its class, its words, and whether a `<header>` band still wraps it — the last of which
      is exactly the difference between a paged level and a stacked one.
    */
    await open(PAGED[0].hash);
    await waitFor(() => expect(hasStrip()).toBe(true));

    const heading = document.getElementById(HEADING_ID) as HTMLElement;
    expect(heading, "the level keeps one heading element").not.toBeNull();
    expect(heading.tagName).toBe("H1");
    expect(heading.className, "the heading is sr-only, so no band renders").toContain("sr-only");
    expect(heading.textContent?.trim()).toBe("Intent");
    expect(
      heading.closest("header"),
      "no band element renders above the strip",
    ).toBeNull();
    expect(document.querySelectorAll("h1"), "the document keeps one h1").toHaveLength(1);
  });

  it("keeps the band on a stacked level, where the strip does not say the words", async () => {
    /*
      The other half of C5's rule, and the reason the case above can fail. Pull requests
      stacks its panels in the pane's own scroll, so it draws the band the paged level drops
      and keeps its heading in the flow rather than out of it.
    */
    await open(`#/${DESIGN}/pull-requests`);
    await waitFor(() => expect(levelTitle()).toBe("Pull requests"));

    const heading = document.getElementById(HEADING_ID) as HTMLElement;
    expect(heading.closest("header"), "a stacked level draws its band").not.toBeNull();
    expect(heading.className, "and its heading is not sr-only").not.toContain("sr-only");
  });

  it("moves focus to the level heading when the level changes", async () => {
    /*
      C5's third piece of evidence. A level change is a section change in the shell's own
      vocabulary, and the shell moves focus to the level's heading for it. The address is
      opened first, so the case proves the move rather than the first paint.

      THIS CASE IS RED, AND THE TIMELINE SAYS WHY. Focus does move — to the heading of the
      level the reader is leaving. The shell schedules the move one animation frame after the
      route changes (`useFocusOnChange`), and `AnimatePresence mode="wait"` in `App.tsx`
      keeps the outgoing subtree mounted until its exit animation finishes. That subtree owns
      the `h1#work-section-heading` of the level being left, so the one id in the document at
      that moment is the old heading. When the exit completes, the subtree unmounts and focus
      falls to the body. The incoming heading never receives it.
    */
    await open(PAGED[0].hash);
    await waitFor(() => expect(document.activeElement?.id).toBe(HEADING_ID));

    fireEvent.click(screen.getByRole("link", { name: "Architecture" }));

    await waitFor(() => expect(levelTitle()).toBe("Architecture"));
    await waitFor(() =>
      expect(document.activeElement?.id, "focus lands on the level's heading").toBe(HEADING_ID),
    );
    expect(document.activeElement?.textContent?.trim()).toBe("Architecture");
    expect(
      document.activeElement?.className,
      "and the element it lands on is the sr-only one",
    ).toContain("sr-only");
  });
});

/* -------------------------------------------------------------------- C6 */

describe("Slice 8 · Rubrics keeps the stacking shape", () => {
  it("draws no strip, no pager, and no level progress bar", async () => {
    /*
      C6's first evidence. The Rubrics sub-view is not paged: it draws none of the three
      controls, and the one progress bar on the page is the pane's own reading strip, which
      sits beside the jump bar in the pane's sticky band rather than inside a paged column.
      A level progress bar is the only one of the two that a paged level draws, so its
      position in the tree is what tells them apart here.
    */
    await open(`#/${DESIGN}/build/rubrics`);
    await waitFor(() => expect(levelTitle()).toBe("Build"));

    expect(hasStrip(), "Rubrics draws no strip").toBe(false);
    expect(pagerText(), "Rubrics draws no pager bar").toBeNull();
    expect(screen.queryByRole("button", { name: "Previous" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    expect(screen.getByRole("region", { name: "Rubrics" })).toBeTruthy();

    const jumpBar = screen.getByRole("navigation", { name: JUMP_BAR_NAME });
    const bars = screen.queryAllByRole("progressbar");
    expect(bars, "one bar, and it is not a level's").toHaveLength(1);
    expect(
      bars[0].parentElement,
      "the bar sits beside the jump bar, so it measures the pane",
    ).toBe(jumpBar.parentElement);
  });

  it("keeps the pane's own scroll, with no bounded-height column under it", async () => {
    /*
      C6's second evidence. The pane owns its scroll, and the tree states why: the Rubrics
      content root carries no height of its own, so it may stand taller than the pane and the
      pane takes the overflow. The paged column does carry one, and its absence here is the
      difference. The scroll heights themselves are jsdom's zero and belong to the browser,
      which the report says.
    */
    await open(`#/${DESIGN}/build/rubrics`);
    await waitFor(() => expect(levelTitle()).toBe("Build"));

    const pane = document.getElementById(PANE_ID) as HTMLElement;
    const region = screen.getByRole("region", { name: "Rubrics" });
    const root = contentRootOf(pane, region);

    expect(pane.className, "the pane is the scrolling region").toContain("overflow-auto");
    expect(root.className, "the content root is not bounded by the pane's height").not.toContain(
      "h-full",
    );
    expect(
      Array.from(pane.querySelectorAll("nav")).map((nav) => nav.getAttribute("aria-label")),
      "the pane keeps the jump bar and draws no strip",
    ).toContain(JUMP_BAR_NAME);

    /* The contrast: a paged level's root is bounded, because its pane never scrolls. */
    cleanup();
    await open(PAGED[0].hash);
    await waitFor(() => expect(hasStrip()).toBe(true));
    const pagedRoot = contentRootOf(
      document.getElementById(PANE_ID) as HTMLElement,
      strip(),
    );
    expect(
      pagedRoot.className,
      "a paged level's root takes the pane's height and no more",
    ).toContain("h-full");
  });
});
