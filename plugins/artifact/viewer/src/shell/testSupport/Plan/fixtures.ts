import type { DesignRecords } from "@/data/bundle";
import type { RecordIndex } from "@/data/types";

import { EMPTY_ENTITIES, EMPTY_JOINS } from "../emptyIndex";

export const ALPHA = "alpha";
export const BETA = "beta";
/** A work with no plan documents at all. */
export const GAMMA = "gamma";

export const PRODUCT_HEADING = "Product requirements for alpha";
export const ARCH_HEADING = "Architecture of alpha";
export const PROGRAM_HEADING = "Program design of alpha";
export const BETA_ARCH_HEADING = "Architecture of beta";

interface DocSpec {
  slug: string;
  gate: number;
  file: string;
  heading: string;
}

function doc({ slug, gate, file, heading }: DocSpec) {
  return {
    id: slug,
    feature_slug: slug,
    gate,
    title: heading,
    body_md: `# ${heading}\n\n## Body section ${gate}\n\nSome text.\n`,
    approved_date: null,
    source_path: `docs/plans/${slug}/${file}`,
  };
}

const GATES = (slug: string) =>
  [
    { n: "1", name: "Product", state: "APPROVED 2026-09-01" },
    { n: "2", name: "Architecture", state: "APPROVED 2026-09-01" },
    { n: "3", name: "Program Design", state: "APPROVED 2026-09-01" },
  ].map((g) => ({ ...g, feature: slug }));

const designOf = (id: string, outcome: string) => ({ id, name: id, outcome, stage: "approved" });

const epicOf = (design: string) => ({
  id: `${design}/E1`,
  design,
  epic_id: "E1",
  branch: null,
  pr: null,
  state: "planned",
  note: null,
});

const ENTITIES = {
  ...EMPTY_ENTITIES,
  design: [
    designOf(ALPHA, "Alpha ships."),
    designOf(BETA, "Beta ships."),
    designOf(GAMMA, "Gamma ships."),
  ],
  epic: [epicOf(ALPHA), epicOf(BETA), epicOf(GAMMA)],
  product_doc: [doc({ slug: ALPHA, gate: 1, file: "01-product.md", heading: PRODUCT_HEADING })],
  architecture_doc: [
    doc({ slug: ALPHA, gate: 2, file: "02-architecture.md", heading: ARCH_HEADING }),
    doc({ slug: BETA, gate: 2, file: "02-architecture.md", heading: BETA_ARCH_HEADING }),
  ],
  program_design: [doc({ slug: ALPHA, gate: 3, file: "03-program-design.md", heading: PROGRAM_HEADING })],
};

const JOINS = {
  ...EMPTY_JOINS,
  feature_gates: { [ALPHA]: GATES(ALPHA), [BETA]: GATES(BETA) },
};

export const INDEX = {
  schema_version: "1.3",
  sources: { git_head: "0123456789abcdef", trees: {} },
  entities: ENTITIES,
  joins: JOINS,
} as unknown as RecordIndex;

const EPIC_GOAL = { id: "E1", branch: null, pr: null, state: "planned", outcome: "One step." };

const GOAL_BASE = {
  created: "2026-09-22",
  done_when: [],
  abort_if: [],
  min_work: { challenge_stage_run: true },
  epics: [EPIC_GOAL],
  stage: "approved",
  supersedes: null,
  adr: null,
  adrs: [],
};

function record(name: string) {
  return { goal: { ...GOAL_BASE, name, title: `The ${name} work`, outcome: `${name} ships.` } };
}

export const DESIGNS = {
  [ALPHA]: record(ALPHA),
  [BETA]: record(BETA),
  [GAMMA]: record(GAMMA),
} as unknown as DesignRecords;
