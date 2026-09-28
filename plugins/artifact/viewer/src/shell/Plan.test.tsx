/**
 * review-link slice 2 — the plan page at `#/<work>/build/plan`.
 *
 * The page shows the three plan documents of one work, in gate order: product (Gate 1),
 * architecture (Gate 2), and program design (Gate 3). A present document shows its
 * source path and its own markdown body. An absent document shows an empty state.
 *
 * THE CONTRACT THESE CASES READ. The prose is not pinned. Each block carries
 * `data-plan-block="<product|architecture|program>"`. An absent document's block holds
 * one element with `data-testid="plan-empty"`. The page is reached through `Shell`, at a
 * real address, so a missing page fails on an assertion and not on an import.
 *
 * The fixture holds two works in one index, because the data module caches its answer
 * for the whole file. `alpha` has all three documents. `beta` has the architecture
 * document only.
 */

import { cleanup, render, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { DesignRecords } from "@/data/bundle";
import type { RecordIndex } from "@/data/types";

import Shell from "./App";

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

const ALPHA = "alpha";
const BETA = "beta";
/** A work with no plan documents at all. */
const GAMMA = "gamma";

const PRODUCT_HEADING = "Product requirements for alpha";
const ARCH_HEADING = "Architecture of alpha";
const PROGRAM_HEADING = "Program design of alpha";
const BETA_ARCH_HEADING = "Architecture of beta";

function doc(slug: string, gate: number, file: string, heading: string) {
  return {
    id: slug,
    feature_slug: slug,
    gate,
    title: heading,
    body_md: `# ${heading}\n\n## Body section ${gate}\n\nSome text.\n`,
    approved_date: null,
    source_path: `docs/plans/${slug}/${file}`,
  };
}

const GATES = (slug: string) => [
  { n: "1", name: "Product", state: "APPROVED 2026-09-01" },
  { n: "2", name: "Architecture", state: "APPROVED 2026-09-01" },
  { n: "3", name: "Program Design", state: "APPROVED 2026-09-01" },
].map((g) => ({ ...g, feature: slug }));

const INDEX = {
  schema_version: "1.3",
  sources: { git_head: "0123456789abcdef", trees: {} },
  entities: {
    design: [
      { id: ALPHA, name: ALPHA, outcome: "Alpha ships.", stage: "approved" },
      { id: BETA, name: BETA, outcome: "Beta ships.", stage: "approved" },
      { id: GAMMA, name: GAMMA, outcome: "Gamma ships.", stage: "approved" },
    ],
    epic: [
      { id: `${ALPHA}/E1`, design: ALPHA, epic_id: "E1", branch: null, pr: null, state: "planned", note: null },
      { id: `${BETA}/E1`, design: BETA, epic_id: "E1", branch: null, pr: null, state: "planned", note: null },
      { id: `${GAMMA}/E1`, design: GAMMA, epic_id: "E1", branch: null, pr: null, state: "planned", note: null },
    ],
    slice: [],
    adr: [],
    context: [],
    district: [],
    boundary_rule: [],
    pull_request: [],
    publication: [],
    product_doc: [doc(ALPHA, 1, "01-product.md", PRODUCT_HEADING)],
    architecture_doc: [
      doc(ALPHA, 2, "02-architecture.md", ARCH_HEADING),
      doc(BETA, 2, "02-architecture.md", BETA_ARCH_HEADING),
    ],
    program_design: [doc(ALPHA, 3, "03-program-design.md", PROGRAM_HEADING)],
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
    feature_gates: { [ALPHA]: GATES(ALPHA), [BETA]: GATES(BETA) },
  },
} as unknown as RecordIndex;

function record(name: string) {
  return {
    goal: {
      name,
      title: `The ${name} work`,
      created: "2026-09-22",
      outcome: `${name} ships.`,
      done_when: [],
      abort_if: [],
      min_work: { challenge_stage_run: true },
      epics: [{ id: "E1", branch: null, pr: null, state: "planned", outcome: "One step." }],
      stage: "approved",
      supersedes: null,
      adr: null,
      adrs: [],
    },
  };
}

const DESIGNS = { [ALPHA]: record(ALPHA), [BETA]: record(BETA), [GAMMA]: record(GAMMA) } as unknown as DesignRecords;

beforeEach(() => {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  (window as unknown as Record<string, unknown>).ADRS = {};
});

afterEach(cleanup);

/* ----------------------------------------------------------------- helpers */

function blocks(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-plan-block]"));
}

function blockOf(kind: string): HTMLElement {
  const found = blocks().find((b) => b.getAttribute("data-plan-block") === kind);
  expect(found, `the page renders a ${kind} block`).toBeTruthy();
  return found as HTMLElement;
}

async function openPlan(hash: string): Promise<void> {
  window.location.hash = hash;
  render(<Shell />);
  await waitFor(() => expect(blocks().length, "the plan page renders its blocks").toBe(3));
}

/* ------------------------------------------------------------------- cases */

describe("the plan page", () => {
  it("renders three blocks in gate order: product, architecture, program", async () => {
    await openPlan(`#/${ALPHA}/build/plan`);
    expect(blocks().map((b) => b.getAttribute("data-plan-block"))).toEqual([
      "product",
      "architecture",
      "program",
    ]);
  });

  it("names the gate of each block", async () => {
    await openPlan(`#/${ALPHA}/build/plan`);
    expect(blockOf("product").textContent).toMatch(/Gate 1/);
    expect(blockOf("architecture").textContent).toMatch(/Gate 2/);
    expect(blockOf("program").textContent).toMatch(/Gate 3/);
  });

  it("renders each present document's own heading and source path", async () => {
    await openPlan(`#/${ALPHA}/build/plan`);
    const cases: [string, string, string][] = [
      ["product", PRODUCT_HEADING, "docs/plans/alpha/01-product.md"],
      ["architecture", ARCH_HEADING, "docs/plans/alpha/02-architecture.md"],
      ["program", PROGRAM_HEADING, "docs/plans/alpha/03-program-design.md"],
    ];
    for (const [kind, heading, path] of cases) {
      const block = blockOf(kind);
      expect(within(block).queryAllByText(heading).length, `${kind} heading`).toBeGreaterThan(0);
      expect(block.textContent, `${kind} source path`).toContain(path);
      expect(within(block).queryByTestId("plan-empty"), `${kind} is present`).toBeNull();
    }
  });

  it("renders the markdown body through the markdown renderer", async () => {
    await openPlan(`#/${ALPHA}/build/plan`);
    const block = blockOf("architecture");
    const h2 = Array.from(block.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((h) =>
      (h.textContent ?? "").trim(),
    );
    expect(h2).toContain("Body section 2");
  });

  it("shows an empty state for each absent document and the body of the present one", async () => {
    await openPlan(`#/${BETA}/build/plan`);
    expect(within(blockOf("product")).queryByTestId("plan-empty")).not.toBeNull();
    expect(within(blockOf("program")).queryByTestId("plan-empty")).not.toBeNull();
    const arch = blockOf("architecture");
    expect(within(arch).queryByTestId("plan-empty")).toBeNull();
    expect(within(arch).queryAllByText(BETA_ARCH_HEADING).length).toBeGreaterThan(0);
  });

  it("does not show another work's documents", async () => {
    await openPlan(`#/${BETA}/build/plan`);
    const text = blocks().map((b) => b.textContent ?? "").join("\n");
    expect(text).not.toContain(PRODUCT_HEADING);
    expect(text).not.toContain(ARCH_HEADING);
    expect(text).not.toContain(PROGRAM_HEADING);
  });

  it("renders the same page at a gate tail route", async () => {
    await openPlan(`#/${ALPHA}/build/plan/program`);
    expect(blocks().map((b) => b.getAttribute("data-plan-block"))).toEqual([
      "product",
      "architecture",
      "program",
    ]);
  });

  it("puts a plan row in the rail that opens the plan route", async () => {
    window.location.hash = `#/${ALPHA}/intent`;
    render(<Shell />);
    await waitFor(() =>
      expect(
        document.querySelector(`a[href="#/${ALPHA}/build/plan"]`),
        "the rail links to the plan page",
      ).not.toBeNull(),
    );
  });

  it("scrolls the named block into view at a gate tail route", async () => {
    const spy = vi.spyOn(Element.prototype, "scrollIntoView");
    try {
      await openPlan(`#/${ALPHA}/build/plan/architecture`);
      const target = blockOf("architecture");
      await waitFor(() =>
        expect(
          spy.mock.contexts.some((ctx) => ctx === target || target.contains(ctx as Node)),
          "the page scrolls the architecture block into view",
        ).toBe(true),
      );
      /* The spec scrolls with no animation. */
      const call = spy.mock.calls[spy.mock.contexts.findIndex((ctx) => ctx === target)];
      const arg = call?.[0];
      if (arg && typeof arg === "object") expect(arg.behavior ?? "auto").not.toBe("smooth");
    } finally {
      spy.mockRestore();
    }
  });
});

/*
 * The Plan rail row, per ui-spec.jsonc `planRow`: a 44 px minimum height, and a work with
 * no plan documents shows the row disabled with the reason "no plan", not hidden.
 *
 * THE 44 PX FLOOR. The rail's shared row frame sets `min-h-9` (36 px) for an expanded row
 * and reaches 44 px only in icon mode. No class sets 44 px for an expanded row today, so
 * this case asserts Tailwind's `min-h-11` (44 px) on the Plan row itself.
 */
describe("the plan rail row", () => {
  function planRow(): HTMLElement | undefined {
    const nav = document.querySelector('nav[aria-label="Work sections"]');
    if (!nav) return undefined;
    return Array.from(nav.querySelectorAll<HTMLElement>('[role="link"], a')).find((row) =>
      /^Plan\b/.test(row.getAttribute("aria-label") ?? (row.textContent ?? "").trim()),
    );
  }

  it("shows a disabled Plan row with the reason 'no plan' for a work with no plan", async () => {
    window.location.hash = `#/${GAMMA}/intent`;
    render(<Shell />);
    await waitFor(() => expect(planRow(), "the rail holds a Plan row").toBeTruthy());
    const row = planRow() as HTMLElement;
    expect(row.getAttribute("aria-disabled")).toBe("true");
    expect(row.getAttribute("href") ?? "#").toBe("#");
    expect(document.querySelector(`a[href="#/${GAMMA}/build/plan"]`)).toBeNull();
    expect(`${row.getAttribute("aria-label") ?? ""} ${row.textContent ?? ""}`).toContain("no plan");
  });

  it("gives the Plan row a 44 px minimum height", async () => {
    window.location.hash = `#/${ALPHA}/intent`;
    render(<Shell />);
    await waitFor(() => expect(planRow(), "the rail holds a Plan row").toBeTruthy());
    expect((planRow() as HTMLElement).className.split(/\s+/)).toContain("min-h-11");
  });
});
