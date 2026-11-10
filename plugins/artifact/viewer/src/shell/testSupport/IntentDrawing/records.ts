import type { DesignRecords } from "@/data/bundle";
import type { RecordIndex } from "@/data/types";

import { EMPTY_ENTITIES, EMPTY_JOINS } from "../emptyIndex";

/*
  `whole-work` carries the three levels the corpus writes. `mechanisms-only` has levels 2
  and 3 and no container drawing. `no-drawings` has no diagram level, as a design that
  stopped at stage 1 does.
*/
export const DESIGNS: DesignRecords = {
  "whole-work": {
    goal: {
      name: "whole-work",
      title: "A work with every drawing",
      created: "2026-09-22",
      outcome: "A reader meets the container drawing inside the Why panel.",
      done_when: ["The Why panel holds level 1."],
      min_work: { challenge_stage_run: true },
      stage: "approved",
      supersedes: null,
      adr: null,
      adrs: [],
    },
    diagrams: {
      "1": "%% the container drawing\nC4Container\n    title whole-work\n",
      "2": "sequenceDiagram\n  A->>B: go\n",
      "3": "classDiagram\n  class A\n",
    },
  },
  "mechanisms-only": {
    goal: {
      name: "mechanisms-only",
      title: "A work with its mechanism drawings alone",
      created: "2026-09-22",
      outcome: "A reader meets no container drawing inside the Why panel.",
      done_when: ["The Why panel holds no drawing."],
      min_work: { challenge_stage_run: true },
      stage: "approved",
      supersedes: null,
      adr: null,
      adrs: [],
    },
    diagrams: {
      "2": "sequenceDiagram\n  A->>B: go\n",
      "3": "classDiagram\n  class A\n",
    },
  },
  "no-drawings": {
    goal: {
      name: "no-drawings",
      title: "A work with no drawing level",
      created: "2026-09-22",
      outcome: "A reader meets no drawing section at all.",
      done_when: ["The Why panel states no absence."],
      min_work: { challenge_stage_run: false },
      stage: "backlog",
      supersedes: null,
      adr: null,
      adrs: [],
    },
  },
} satisfies DesignRecords;

const INDEX: RecordIndex = {
  schema_version: "1.3",
  sources: { git_head: "0123456789abcdef", trees: {} },
  entities: {
    ...EMPTY_ENTITIES,
    design: [
      {
        id: "whole-work",
        name: "whole-work",
        outcome: "A work with every drawing.",
        stage: "approved",
      },
      {
        id: "mechanisms-only",
        name: "mechanisms-only",
        outcome: "A work with its mechanism drawings alone.",
        stage: "approved",
      },
      {
        id: "no-drawings",
        name: "no-drawings",
        outcome: "A work with no drawing level.",
        stage: "backlog",
      },
    ],
  },
  joins: EMPTY_JOINS,
};

export function installRecords(): void {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  /* `./records` reads the first value's `title` to tell an empty file from a map, so the global needs one entry. */
  (window as unknown as Record<string, unknown>).ADRS = {
    "ADR-0028": { id: "ADR-0028", title: "One section on screen", state: "accepted" },
  };
}
