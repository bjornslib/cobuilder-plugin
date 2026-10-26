import type { DesignRecord, DesignRecords } from "@/data/bundle";
import type { RecordIndex } from "@/data/types";

export const INDEX: RecordIndex = {
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
export const VIEWER: DesignRecord = {
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

export const DESIGNS: DesignRecords = {
  "cobuilder-viewer": VIEWER,
  "inflight-record-store": {
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
  },
};

export const ADRS = {
  "ADR-0028": {
    id: "ADR-0028",
    title: "One section on screen",
    state: "accepted",
  },
};

/*
 * The decision global is declared by no module, because `src/data/bundle.ts` leaves it
 * to whoever reads the file. The shell's `./records` reads it through a cast and so does
 * this line.
 *
 * It needs one entry. Its guard reads the first value's `title`, so an empty map reads
 * as a file that assigned nothing, and the loader then asks the dev server for one. One
 * entry keeps the whole bundle in memory, where a published file keeps it too.
 */
export function installAdrs(): void {
  (window as unknown as Record<string, unknown>).ADRS = ADRS;
}
