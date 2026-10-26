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

/*
  The one rich work item. It holds every record kind and its epic reaches one pull request
  that one publication names, so every level fills and every rail group appears. Its
  diagram levels are the corpus's own, and level 1 is the container drawing.
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
  No module declares the decision global, so the read goes through a cast, as the shell's
  `./records` does. It needs one entry: the guard reads the first value's `title`, and an
  empty map looks like a file that assigned nothing, so the loader would ask the dev server.
*/
export function installAdrs(): void {
  (window as unknown as Record<string, unknown>).ADRS = ADRS;
}
