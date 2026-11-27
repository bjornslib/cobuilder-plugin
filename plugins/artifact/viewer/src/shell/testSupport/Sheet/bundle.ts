import type { DesignRecord, DesignRecords } from "@/data/bundle";
import type { RecordIndex } from "@/data/types";

import { EMPTY_ENTITIES, EMPTY_JOINS } from "../emptyIndex";

import {
  ADR_ABSENT,
  ADR_ABSENT_TITLE,
  ADR_BODY,
  ADR_DECISION,
  ADR_FORCE,
  ADR_ID,
  ADR_MODULE,
  ADR_PROBLEM,
  ADR_RULE,
  ADR_STATE,
  ADR_TITLE,
  DESIGN,
  EPIC_DESIGN_BODY,
  EPIC_DESIGN_TITLE,
  OUTCOME,
  RULE_CONTEXT,
  RULE_EXTRA_KEY,
  RULE_EXTRA_VALUE,
  RULE_ID,
  RULE_KIND,
  RULE_TARGET,
  RULE_WHY,
} from "./names";

const BRANCH = "design/cobuilder-viewer/work-surface";

const EPICS = [
  {
    id: `${DESIGN}/E1`,
    design: DESIGN,
    epic_id: "E1",
    branch: BRANCH,
    pr: null,
    state: "planned",
    note: null,
    design_doc: `${DESIGN}/E1`,
  },
];

const CONTEXT = {
  id: RULE_CONTEXT,
  name: "The viewer's data module",
  path: "plugins/artifact/viewer/src/data",
  verifies: ["viewer"],
};

const BOUNDARY_RULE = {
  id: RULE_ID,
  context: RULE_CONTEXT,
  kind: RULE_KIND,
  detail: {
    target: RULE_TARGET,
    why: RULE_WHY,
    [RULE_EXTRA_KEY]: RULE_EXTRA_VALUE,
  },
};

const EPIC_DESIGN = {
  id: `${DESIGN}/E1`,
  epic_id: "E1",
  feature_slug: DESIGN,
  title: EPIC_DESIGN_TITLE,
  body_md: EPIC_DESIGN_BODY,
};

const ENTITIES: RecordIndex["entities"] = {
  ...EMPTY_ENTITIES,
  design: [{ id: DESIGN, name: DESIGN, outcome: OUTCOME, stage: "design" }],
  epic: EPICS,
  adr: [
    { id: ADR_ID, title: ADR_TITLE, state: ADR_STATE },
    { id: ADR_ABSENT, title: ADR_ABSENT_TITLE, state: ADR_STATE },
  ],
  context: [CONTEXT],
  district: [{ id: "viewer", label: "The viewer", paths: ["plugins/artifact/viewer"] }],
  boundary_rule: [BOUNDARY_RULE],
  epic_design: [EPIC_DESIGN],
};

const JOINS: RecordIndex["joins"] = {
  ...EMPTY_JOINS,
  adr_to_context: { [ADR_ID]: RULE_CONTEXT },
  adr_to_district: { [ADR_ID]: "viewer" },
};

export const INDEX: RecordIndex = {
  schema_version: "1.3",
  sources: { git_head: "0123456789abcdef", trees: {} },
  entities: ENTITIES,
  joins: JOINS,
};

const GOAL: DesignRecord["goal"] = {
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
      branch: BRANCH,
      pr: null,
      state: "planned",
      outcome: "The shell lands on the board.",
    },
  ],
  stage: "design",
  supersedes: null,
  adr: null,
  adrs: [ADR_ID, ADR_ABSENT],
};

const RECORD: DesignRecord = {
  goal: GOAL,
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

export const DESIGNS: DesignRecords = { [DESIGN]: RECORD };

/**
 * The decision's own record, as `data/adrs.js` carries it. It holds three anchored parts
 * that the index does not carry, so a Sheet that opened the index row alone would show none.
 */
export const ADRS = {
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
