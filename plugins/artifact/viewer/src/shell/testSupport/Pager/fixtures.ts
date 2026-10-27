import type { DesignRecord, DesignRecords } from "@/data/bundle";
import type { RecordIndex } from "@/data/types";

import { EMPTY_ENTITIES, EMPTY_JOINS } from "../emptyIndex";

export const DESIGN = "cobuilder-viewer";

/** Seven epics, so the Build level pages two sections of its track. */
const EPIC_COUNT = 7;

const epicAt = (position: number) => ({
  id: `${DESIGN}/E${position + 1}`,
  design: DESIGN,
  epic_id: `E${position + 1}`,
  branch: "design/cobuilder-viewer/work-surface",
  pr: null,
  state: "planned",
  note: null,
});

const ENTITIES: RecordIndex["entities"] = {
  ...EMPTY_ENTITIES,
  design: [
    {
      id: DESIGN,
      name: DESIGN,
      outcome: "One work item, paged by its sections.",
      stage: "approved",
    },
  ],
  epic: Array.from({ length: EPIC_COUNT }, (_, position) => epicAt(position)),
  adr: [{ id: "ADR-0028", title: "One section on screen", state: "accepted" }],
};

const INDEX: RecordIndex = {
  schema_version: "1.3",
  sources: { git_head: "0123456789abcdef", trees: {} },
  entities: ENTITIES,
  joins: EMPTY_JOINS,
};

const GOAL: DesignRecord["goal"] = {
  name: DESIGN,
  title: "The Work surface",
  created: "2026-09-22",
  outcome: "One box is on screen at a time.",
  done_when: ["One box is on screen."],
  abort_if: ["Two boxes are on screen at once."],
  min_work: { challenge_stage_run: true },
  stage: "approved",
  supersedes: null,
  adr: null,
  adrs: ["ADR-0028"],
};

/**
 * The one work item. The three fixed paged levels are lists of four, so Intent, Problem &
 * Solution, and Architecture each page four boxes with no help from this record. The Build
 * level's sections come from the epic count above. The three diagram levels have the shape
 * of the corpus, and the container drawing is level 1.
 */
const VIEWER: DesignRecord = {
  goal: GOAL,
  intent: {
    problem: "A stacked level hides its last panel.",
    approach: "One box per section, on a track.",
    risks: ["The strip and the boxes drift apart."],
    unknowns: ["How a long section reads inside its box."],
    out_of_scope: ["A shared link to one section."],
  },
  narrative: {
    problem_solution: { narration: "One index, three controls." },
  },
  assessment: {
    verdict: "proceed",
    summary: "The model is small and legible.",
    findings: [],
  },
  diagrams: {
    "1": "%% the container drawing\nC4Container\n    title cobuilder-viewer\n",
    "2": "sequenceDiagram\n  A->>B: step\n",
    "3": "classDiagram\n  class A\n",
  },
  pr_draft: "# The section model\n\n## What changes\n\nOne box on screen.\n",
};

const DESIGNS: DesignRecords = { [DESIGN]: VIEWER };

const ADRS = {
  "ADR-0028": { id: "ADR-0028", title: "One section on screen", state: "accepted" },
};

export function installFixtures(): void {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  /*
   * No module declares the decision global, because `src/data/bundle.ts` leaves it to
   * whoever reads the file. One entry is enough. Its guard reads the `title` of the first
   * value, so an empty map reads as a file that assigned nothing, and the loader would then
   * ask the dev server for one.
   */
  (window as unknown as Record<string, unknown>).ADRS = ADRS;
}
