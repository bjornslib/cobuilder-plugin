import type { DesignRecord, DesignRecords } from "@/data/bundle";
import type { RecordIndex } from "@/data/types";

export const WORK = "review-link";
/** A plan that is not this work's own, so a second work's rubric stays off the page. */
const OTHER_SLUG = "other-plan";

export const SLICE_TITLES = [
  "Tracer bullet: a checked deep link",
  "Plan documents in the index",
  "Present for review procedure",
];

export const RUBRIC_TITLES = ["Slice 1 — Tracer bullet", "Slice 2 — Plan documents"];
export const RUBRIC_BODIES = [
  "The rubric body of slice one.",
  "The rubric body of slice two.",
];
export const OTHER_RUBRIC_BODY = "The rubric body of another plan.";

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

export function installRecords(): void {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  (window as unknown as Record<string, unknown>).ADRS = {};
}
