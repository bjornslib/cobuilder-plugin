import type { RecordIndex } from "@/data/types";

export const EMPTY_ENTITIES: RecordIndex["entities"] = {
  design: [],
  epic: [],
  slice: [],
  adr: [],
  context: [],
  district: [],
  boundary_rule: [],
  pull_request: [],
  publication: [],
  program_design: [],
  epic_design: [],
  interaction_design: [],
};

export const EMPTY_JOINS: RecordIndex["joins"] = {
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
};
