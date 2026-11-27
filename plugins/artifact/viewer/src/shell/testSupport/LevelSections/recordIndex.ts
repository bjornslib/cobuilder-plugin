import type { EpicEntity, RecordIndex } from "@/data/types";

import { EMPTY_ENTITIES, EMPTY_JOINS } from "../emptyIndex";
import {
  BOUNDARY_TARGET,
  DESIGN,
  EPIC_COUNT,
  FLIGHTDECK_TITLE,
  GATE_STEPS,
  OTHER,
  OTHER_PROBLEM,
  OTHER_PR_TITLE,
  OUTCOME,
  PR_TITLE,
  SHIPPED_STAGE,
} from "./constants";

/** One `goal.epics[]` row per epic, so a row shows the record's own outcome. */
export const EPIC_ROWS = Array.from({ length: EPIC_COUNT }, (_, position) => ({
  id: `E${position + 1}`,
  branch: "design/cobuilder-viewer/work-surface",
  pr: null,
  state: "planned",
  outcome: `Epic ${position + 1} takes the work one step further.`,
}));

const EPICS: EpicEntity[] = Array.from({ length: EPIC_COUNT }, (_, position) => ({
  id: `${DESIGN}/E${position + 1}`,
  design: DESIGN,
  epic_id: `E${position + 1}`,
  branch: "design/cobuilder-viewer/work-surface",
  pr: null,
  state: "planned",
  note: null,
}));

export const INDEX: RecordIndex = {
  schema_version: "1.3",
  sources: { git_head: "0123456789abcdef", trees: {} },
  entities: {
    ...EMPTY_ENTITIES,
    design: [
      { id: DESIGN, name: DESIGN, outcome: OUTCOME, stage: SHIPPED_STAGE },
      { id: OTHER, name: OTHER, outcome: OTHER_PROBLEM, stage: "approved" },
    ],
    epic: [
      ...EPICS,
      {
        id: `${OTHER}/E1`,
        design: OTHER,
        epic_id: "E1",
        branch: "design/cobuilder-viewer/work-surface",
        pr: null,
        state: "planned",
        note: null,
      },
    ],
    adr: [
      { id: "ADR-0028", title: "One section on screen", state: "accepted" },
      { id: "ADR-0029", title: "The strip reads the DOM", state: "accepted" },
      { id: "ADR-0030", title: "Another work's decision", state: "accepted" },
    ],
    context: [
      {
        id: "viewer-data",
        name: "The viewer's data module",
        path: "plugins/artifact/viewer/src/data",
        verifies: ["viewer"],
      },
    ],
    district: [{ id: "viewer", label: "The viewer", paths: ["plugins/artifact/viewer"] }],
    boundary_rule: [
      {
        id: "br-1",
        context: "viewer-data",
        kind: "dependency",
        detail: { target: BOUNDARY_TARGET, why: "One module names a bundle global." },
      },
    ],
    pull_request: [
      {
        id: 3,
        title: PR_TITLE,
        state: "merged",
        commit: "0123456789abcdef",
        date: "2026-09-22",
      },
      { id: 5, title: OTHER_PR_TITLE, state: "merged", commit: null, date: null },
      {
        id: 7,
        title: FLIGHTDECK_TITLE,
        state: "open",
        commit: "abcdef0123456",
        date: "2026-09-23",
      },
    ],
  },
  joins: {
    ...EMPTY_JOINS,
    epic_to_pull_request: { [`${DESIGN}/E1`]: 3, [`${OTHER}/E1`]: 5 },
    adr_to_context: { "ADR-0028": "viewer-data" },
    adr_to_district: { "ADR-0028": "viewer" },
    feature_gates: { [DESIGN]: GATE_STEPS },
  },
};
