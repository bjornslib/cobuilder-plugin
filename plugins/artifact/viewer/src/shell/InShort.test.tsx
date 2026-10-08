/**
 * The In Short strip: a level's short summary above the section tabs.
 *
 * The fixtures are the Shell test's own work item, `cobuilder-viewer`, and a pull request 11
 * whose level records come from a stub of the change bundle hook.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { RecordIndex } from "@/data/types";
import type { DesignRecord, DesignRecords } from "@/data/bundle";

import Shell from "./App";
import type { ChangeLevel } from "./change/levels";

const AUDIO = "../data/audio/pr11_intent.wav";

function level(number: 1 | 2 | 3 | 4, key: ChangeLevel["key"], narration: string): ChangeLevel {
  return {
    number,
    key,
    title: key,
    narration,
    voice: "A voice script.",
    art: null,
    audio: `../data/audio/pr11_${key}.wav`,
    diagram: null,
  };
}

const state = vi.hoisted(() => ({
  served: {} as Record<string, boolean>,
  narrations: true,
}));

vi.mock("./change/levels", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./change/levels")>();
  return {
    ...actual,
    useServedAudio: () => state.served,
    useChangeBundle: (pr: number | null) =>
      pr === null
        ? { state: "idle", entry: null, levels: [], diff: null, diffMessage: null, message: null }
        : {
            state: "ready",
            entry: { pr, status: "merged", intent: { problem: "A problem." } },
            levels: [
              level(1, "intent", state.narrations ? "PR intent in short." : ""),
              level(2, "problem_solution", state.narrations ? "PR problem in short." : ""),
              level(3, "architecture", state.narrations ? "PR architecture in short." : ""),
              level(4, "file_changes", state.narrations ? "PR diff in short." : ""),
            ],
            diff: null,
            diffMessage: null,
            message: null,
          },
  };
});

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

const INDEX: RecordIndex = {
  schema_version: "1.3",
  sources: { git_head: "0123456789abcdef", trees: {} },
  entities: {
    design: [
      {
        id: "cobuilder-viewer",
        name: "cobuilder-viewer",
        outcome: "The shell lands on a board of every design in the bundle.",
        stage: "approved",
      },
      {
        id: "inflight-record-store",
        name: "inflight-record-store",
        outcome: "An open pull request becomes an entity in the index.",
        stage: "superseded",
      },
    ],
    epic: [
      {
        id: "cobuilder-viewer/E19",
        design: "cobuilder-viewer",
        epic_id: "E19",
        branch: "design/cobuilder-viewer/work-prototype",
        pr: 11,
        state: "planned",
        note: null,
      },
      {
        id: "inflight-record-store/E1",
        design: "inflight-record-store",
        epic_id: "E1",
        branch: null,
        pr: null,
        state: "planned",
        note: null,
      },
    ],
    slice: [],
    adr: [],
    context: [],
    district: [],
    boundary_rule: [],
    pull_request: [
      {
        id: 11,
        title: "The board lands",
        state: "open",
        commit: "0123456789abcdef",
        date: "2026-09-23",
      },
    ],
    publication: [
      {
        id: "publish-11",
        pull_request: 11,
        artifact_url: "https://example.invalid/artifact/11",
        published_at: "2026-09-23",
      },
    ],
    program_design: [],
    epic_design: [],
    interaction_design: [],
  },
  joins: {
    adr_to_pull_request: {},
    epic_to_pull_request: { "cobuilder-viewer/E19": 11 },
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
 * The one rich work item, `cobuilder-viewer` itself.
 *
 * It holds every record the bundle writes for a design, and its epic reaches one pull
 * request that one publication names. So all three levels of its Work surface fill, every
 * group of the rail appears, and the whole rail is nine entries from Work to Release
 * status. Its three diagram levels are the corpus's own, and the container drawing is
 * level 1.
 */
const VIEWER: DesignRecord = {
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
    adrs: [],
  },
  intent: {
    problem: "The shell had no landing surface.",
    approach: "One flat row per design.",
    risks: ["Two boards disagree about one bundle."],
    unknowns: ["What sixty designs read like."],
    out_of_scope: ["The comparison harness."],
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
  diagrams: {
    "1": "%% the container drawing\nC4Container\n    title cobuilder-viewer\n",
    "2": "sequenceDiagram\n  A->>B: go\n",
    "3": "classDiagram\n  class A\n",
  },
};

const DESIGNS: DesignRecords = { "cobuilder-viewer": VIEWER };

beforeEach(() => {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  (window as unknown as Record<string, unknown>).ADRS = {
    "ADR-0028": { id: "ADR-0028", title: "One section on screen", state: "accepted" },
  };
  state.served = {};
  state.narrations = true;
  window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = vi.fn();
});

afterEach(cleanup);

function at(hash: string): void {
  window.location.hash = hash;
}

function strip(): HTMLElement | null {
  return screen.queryByRole("region", { name: "In Short" });
}

describe("In Short on the work item", () => {
  it("shows the design's narration for the level, labelled In Short", async () => {
    at("#/cobuilder-viewer/problem-and-solution");
    render(<Shell />);
    const region = await screen.findByRole("region", { name: "In Short" });
    expect(region.textContent).toContain("The board is the landing surface.");
    expect(within(region).getByText("In Short").textContent).toBe("In Short");
    expect(within(region).queryByRole("button")).toBeNull();
    expect(region.querySelector("audio")).toBeNull();
  });

  it("follows the level", async () => {
    at("#/cobuilder-viewer/architecture");
    render(<Shell />);
    const region = await screen.findByRole("region", { name: "In Short" });
    expect(region.textContent).toContain("One derivation, one row each.");
  });

  it("sits above the section tabs", async () => {
    at("#/cobuilder-viewer/architecture");
    render(<Shell />);
    const region = await screen.findByRole("region", { name: "In Short" });
    const tabs = screen.getByRole("navigation", { name: "Sections of this level" });
    expect(region.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("draws no strip on Build's epics view", async () => {
    at("#/cobuilder-viewer/build/epics");
    render(<Shell />);
    await waitFor(() => expect(document.getElementById("work-section-heading")?.textContent).toBe("Build"));
    expect(strip()).toBeNull();
  });
});

describe("In Short on the pull request", () => {
  it("shows the level's narration, and keeps it when the section changes", async () => {
    at("#/cobuilder-viewer/pull-requests/11/intent");
    render(<Shell />);
    const region = await screen.findByRole("region", { name: "In Short" });
    expect(region.textContent).toContain("PR intent in short.");
    expect(within(region).getByText("In Short").textContent).toBe("In Short");
    const before = region.textContent;
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(screen.getByText("Section 2 of 4")).toBeTruthy());
    expect(strip()?.textContent).toBe(before);
    /* The narration is not repeated as the lead of a section. */
    expect(screen.getAllByText("PR intent in short.")).toHaveLength(1);
  });

  it("takes the current level's text", async () => {
    at("#/cobuilder-viewer/pull-requests/11/architecture");
    render(<Shell />);
    const region = await screen.findByRole("region", { name: "In Short" });
    expect(region.textContent).toContain("PR architecture in short.");
  });

  it("draws no strip on File Diffs", async () => {
    at("#/cobuilder-viewer/pull-requests/11/file-diffs");
    render(<Shell />);
    await waitFor(() => expect(screen.getByText("Section 1 of 2")).toBeTruthy());
    expect(strip()).toBeNull();
    expect(screen.queryByText("PR diff in short.")).toBeNull();
  });

  it("draws no strip and no sentence for a level without narration", async () => {
    state.narrations = false;
    at("#/cobuilder-viewer/pull-requests/11/intent");
    render(<Shell />);
    await waitFor(() => expect(screen.getByText("Section 1 of 4")).toBeTruthy());
    expect(strip()).toBeNull();
    expect(document.body.textContent).not.toMatch(/narration record|no narration text/);
  });

  it("draws no Listen when the file is not served", async () => {
    state.served = { [AUDIO]: false };
    at("#/cobuilder-viewer/pull-requests/11/intent");
    render(<Shell />);
    await screen.findByRole("region", { name: "In Short" });
    expect(screen.queryByRole("button", { name: "Listen" })).toBeNull();
    expect(document.body.textContent).not.toContain("pr11_intent");
  });

  it("draws Listen when the file is served, and toggles to Pause and back", async () => {
    state.served = { [AUDIO]: true };
    at("#/cobuilder-viewer/pull-requests/11/intent");
    render(<Shell />);
    const region = await screen.findByRole("region", { name: "In Short" });
    fireEvent.click(within(region).getByRole("button", { name: "Listen" }));
    await waitFor(() => expect(within(region).getByRole("button", { name: "Pause" })).toBeTruthy());
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
    fireEvent.click(within(region).getByRole("button", { name: "Pause" }));
    expect(within(region).getByRole("button", { name: "Listen" })).toBeTruthy();
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });
});
