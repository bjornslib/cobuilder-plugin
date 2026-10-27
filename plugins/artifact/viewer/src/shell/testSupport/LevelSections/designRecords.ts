import type { DesignRecord, DesignRecords } from "@/data/bundle";

import {
  ABORT_IF,
  ALTERNATIVE_OPTION,
  ALTERNATIVE_REASON,
  APPROACH,
  DESIGN,
  DONE_WHEN,
  DRAFT,
  OTHER,
  OTHER_APPROACH,
  OTHER_PROBLEM,
  OUTCOME,
  OUT_OF_SCOPE,
  PROBLEM,
  RISKS,
  SHIPPED_STAGE,
  SUMMARY,
  UNKNOWNS,
  VERDICT,
} from "./constants";
import { EPIC_ROWS } from "./recordIndex";

/**
 * The rich work item: every level fills.
 *
 * Two linked decisions carry the index's own ids, so the Architecture list can be compared
 * with the index's `adr` entities and `goal.adrs[]`. `goal.epics[]` holds one row per epic,
 * because a row's outcome comes from the plan record, and the panel's only fallback is a
 * sentence about a missing one. The stage is implemented, so the Shipped level fills.
 */
export const RICH: DesignRecord = {
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
 * The other work item: the same shape with four records missing (no assessment, risk,
 * unknown, or drafted pull request). Its epic carries a real merged pull request, so the
 * Pull requests level fills without a draft. Its one linked decision is one the rich work
 * does not name, which makes the "no other design's records" case bite.
 */
export const SPARSE: DesignRecord = {
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

export const DESIGNS: DesignRecords = { [DESIGN]: RICH, [OTHER]: SPARSE };
