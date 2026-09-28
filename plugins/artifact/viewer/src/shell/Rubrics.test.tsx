/**
 * review-link slice 3 — the rubrics page at `#/<work>/build/rubrics`.
 *
 * The page keeps the gate-steps panel and gains the rubric reading surface: one row per
 * slice, in slice order. A row with a rubric is a button that opens the whole document in
 * the Sheet, the same way an epic's technical solution design opens. A slice with no
 * rubric keeps its row and states the absence in place, and it is not a button, so a
 * press cannot open an empty Sheet.
 *
 * THE CONTRACT THESE CASES READ. The prose is not pinned. A row that opens a rubric
 * carries `aria-label="Open the acceptance rubric for slice <n>"`. An absent rubric's
 * row carries `data-testid="rubric-empty"`. The Sheet is the dialog the shell opens over
 * the pane, found by role, the way `Sheet.test.tsx` finds it. The page is reached
 * through `Shell`, at a real address, so a missing page fails on an assertion and not on
 * an import.
 *
 * The fixture holds one work, `review-link`, with three slices. Slices 1 and 2 carry
 * rubrics. Slice 3 carries none, so the absent case reads on the same page as the two
 * present ones.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

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
  Element.prototype.scrollTo = () => undefined;
  Element.prototype.scrollIntoView = () => undefined;
});

/* ---------------------------------------------------------------- fixtures */

const WORK = "review-link";
/** A plan that is not this work's own, so a second work's rubric stays off the page. */
const OTHER_SLUG = "other-plan";

const SLICE_TITLES = [
  "Tracer bullet: a checked deep link",
  "Plan documents in the index",
  "Present for review procedure",
];

const RUBRIC_TITLES = ["Slice 1 — Tracer bullet", "Slice 2 — Plan documents"];
const RUBRIC_BODIES = [
  "The rubric body of slice one.",
  "The rubric body of slice two.",
];
/** A rubric that belongs to another plan, which this page must not show. */
const OTHER_RUBRIC_BODY = "The rubric body of another plan.";

function slice(n: number) {
  return {
    id: `${WORK}/${n}`,
    feature: WORK,
    n,
    title: SLICE_TITLES[n - 1],
    ends_with: `A working state for slice ${n}`,
    score: n === 3 ? null : "0.92",
    attempts: n === 3 ? 0 : 1,
    state: n === 3 ? "planned" : "completed",
  };
}

function rubric(n: number) {
  return {
    id: `${WORK}/${n}`,
    feature_slug: WORK,
    n,
    title: RUBRIC_TITLES[n - 1],
    body_md: `# Rubric: ${RUBRIC_TITLES[n - 1]}\n\n${RUBRIC_BODIES[n - 1]}\n\n## Criterion one\n\nThe work meets the criterion.\n`,
    source_path: `.cobuilder/rubrics/${WORK}/slice-${n}.md`,
  };
}

const INDEX = {
  schema_version: "1.4",
  sources: { git_head: "0123456789abcdef", trees: {} },
  entities: {
    design: [{ id: WORK, name: WORK, outcome: "Every rubric reaches the viewer.", stage: "approved" }],
    epic: [
      { id: `${WORK}/E1`, design: WORK, epic_id: "E1", branch: null, pr: null, state: "planned", note: null },
    ],
    slice: [slice(1), slice(2), slice(3)],
    adr: [],
    context: [],
    district: [],
    boundary_rule: [],
    pull_request: [],
    publication: [],
    program_design: [],
    epic_design: [],
    interaction_design: [],
    rubric: [
      rubric(1),
      rubric(2),
      {
        id: `${OTHER_SLUG}/9`,
        feature_slug: OTHER_SLUG,
        n: 9,
        title: "Slice 9 — Another plan",
        body_md: `# Rubric: Slice 9 — Another plan\n\n${OTHER_RUBRIC_BODY}\n`,
        source_path: `.cobuilder/rubrics/${OTHER_SLUG}/slice-9.md`,
      },
    ],
  },
  joins: {
    adr_to_pull_request: {},
    epic_to_pull_request: {},
    epic_status: {},
    slice_to_epic: {
      [`${WORK}/1`]: `${WORK}/E1`,
      [`${WORK}/2`]: `${WORK}/E1`,
      [`${WORK}/3`]: `${WORK}/E1`,
    },
    slice_to_epic_unresolved: {},
    context_verifies_district: {},
    district_uncovered: [],
    adr_to_context: {},
    adr_to_district: {},
    feature_gates: {
      [WORK]: [
        { n: "4a", name: "The slice plan is approved", state: "approved" },
        { n: "4b", name: "The technical solution design is approved", state: "pending" },
      ],
    },
  },
} as unknown as RecordIndex;

const RECORD: DesignRecord = {
  goal: {
    name: WORK,
    title: "The rubrics page",
    created: "2026-09-28",
    outcome: "Every rubric reaches the viewer.",
    done_when: ["The page reads each slice's rubric."],
    abort_if: [],
    min_work: { challenge_stage_run: true },
    epics: [{ id: "E1", branch: null, pr: null, state: "planned", outcome: "One step." }],
    stage: "approved",
    supersedes: null,
    adr: null,
    adrs: [],
  },
};

const DESIGNS = { [WORK]: RECORD } as unknown as DesignRecords;

beforeEach(() => {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  (window as unknown as Record<string, unknown>).ADRS = {};
});

afterEach(cleanup);

/* ----------------------------------------------------------------- helpers */

/** The button that opens one slice's rubric, by the label the row carries. */
function rubricRow(n: number): HTMLElement {
  return screen.getByRole("button", { name: `Open the acceptance rubric for slice ${n}` });
}

/** The row that states a slice's absent rubric. */
function absentRow(): HTMLElement {
  const found = screen.queryByTestId("rubric-empty");
  expect(found, "the page renders one absent-rubric row").toBeTruthy();
  return found as HTMLElement;
}

/** The record sheet, which is the dialog the shell opens over the pane. */
async function openSheet(): Promise<HTMLElement> {
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeNull());
  return screen.getByRole("dialog");
}

async function openPage(hash: string): Promise<void> {
  window.location.hash = hash;
  render(<Shell />);
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Rubrics" })).toBeTruthy(),
  );
}

/* ------------------------------------------------------------------- cases */

describe("the rubrics page", () => {
  it("renders one row per slice, in slice order, beside the gate record", async () => {
    await openPage(`#/${WORK}/build/rubrics`);

    /* The gate-steps panel keeps its own rows, unchanged. */
    expect(screen.getByText("The slice plan is approved")).toBeTruthy();
    expect(screen.getByText("The technical solution design is approved")).toBeTruthy();

    /* Two rows open a rubric; the third slice states its absence in place. */
    expect(rubricRow(1).textContent).toContain(SLICE_TITLES[0]);
    expect(rubricRow(2).textContent).toContain(SLICE_TITLES[1]);
    expect(absentRow().textContent).toContain("No rubric document exists for slice 3");
    expect(
      within(absentRow()).queryByRole("button"),
      "an absent rubric is not a button, so a press opens no empty sheet",
    ).toBeNull();

    /*
     * The rows read in slice order: 1, 2, then the absent 3. jsdom has no layout
     * engine, so the order is read from the document, not from any position.
     */
    const first = rubricRow(1);
    const second = rubricRow(2);
    const third = absentRow();
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(second.compareDocumentPosition(third) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps another plan's rubrics off this page", async () => {
    await openPage(`#/${WORK}/build/rubrics`);

    expect(screen.queryByText(OTHER_RUBRIC_BODY)).toBeNull();
    expect(screen.queryByRole("button", { name: /slice 9/ })).toBeNull();
  });

  it("opens the rubric in the Sheet when a row is pressed", async () => {
    await openPage(`#/${WORK}/build/rubrics`);

    fireEvent.click(rubricRow(1));
    const sheet = await openSheet();

    expect(within(sheet).getAllByText(RUBRIC_TITLES[0]).length).toBeGreaterThan(0);
    expect(within(sheet).getByText(RUBRIC_BODIES[0])).toBeTruthy();
    expect(within(sheet).getByText("slice 1")).toBeTruthy();
    /* The sheet holds one rubric, and the page's other rubric stays off it. */
    expect(within(sheet).queryByText(RUBRIC_BODIES[1])).toBeNull();

    fireEvent.click(within(sheet).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("opens the named rubric's Sheet at a slice tail route", async () => {
    window.location.hash = `#/${WORK}/build/rubrics/2`;
    render(<Shell />);

    const sheet = await openSheet();
    expect(within(sheet).getAllByText(RUBRIC_TITLES[1]).length).toBeGreaterThan(0);
    expect(within(sheet).getByText(RUBRIC_BODIES[1])).toBeTruthy();
  });

  it("names the rubric documents in the rail row", async () => {
    await openPage(`#/${WORK}/build/rubrics`);

    const row = document.querySelector(`a[href="#/${WORK}/build/rubrics"]`);
    expect(row, "the rail links to the rubrics page").toBeTruthy();
    expect(`${row?.getAttribute("aria-label") ?? ""} ${row?.textContent ?? ""}`).toContain(
      "2 rubrics",
    );
  });
});