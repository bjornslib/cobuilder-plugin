import type { DesignRecords } from "@/data/bundle";
import type { DesignEntity, EpicEntity, RecordIndex, SliceEntity } from "@/data/types";
import type { BoardEpic, BoardRows } from "@/data/types/board";

import type { BoardAddress } from "../../board/address";
import { EMPTY_ENTITIES, EMPTY_JOINS } from "../emptyIndex";

const design = (id: string, stage: string): DesignEntity => ({ id, name: id, outcome: `The outcome of ${id}.`, stage });

export const PROGRAMS: DesignEntity[] = [
  design("alpha", "backlog"),
  design("beta", "approved"),
  design("gamma", "review"),
  design("delta", "implemented"),
  design("old-one", "superseded"),
  design("old-two", "superseded"),
];

const epic = (id: string, state: string, pr: number | null = null): EpicEntity => {
  const [owner, epicId] = id.split("/");
  return { id, design: owner, epic_id: epicId, branch: `feat/${owner}-${epicId}`, pr, state, note: null };
};

const EPICS: EpicEntity[] = [
  epic("beta/E1", "closed"),
  epic("beta/E2", "open"),
  epic("beta/E3", "open"),
  epic("beta/E4", "open"),
  epic("gamma/E1", "planned"),
  epic("delta/E1", "closed", 42),
  epic("old-one/E1", "closed"),
];

const EPIC_STATUS: Record<string, string> = {
  "beta/E1": "completed",
  "beta/E2": "open",
  "beta/E3": "planned",
  "beta/E4": "no-pull-request",
  "delta/E1": "merged",
  "old-one/E1": "superseded",
};

const slice = (id: string, state: string): SliceEntity => {
  const [feature, n] = id.split("/");
  return { id, feature, n: Number(n), title: `Slice ${id}`, ends_with: "", score: null, attempts: 0, state };
};

export const SLICES: SliceEntity[] = [
  slice("beta/1", "completed"),
  slice("beta/2", "completed"),
  slice("beta/3", "completed"),
  slice("beta/4", "planned"),
  slice("beta/5", "in_progress"),
  slice("beta/6", "planned"),
  slice("gamma-plan/1", "planned"),
  slice("alpha/1", "planned"),
  slice("lost-plan/1", "planned"),
  slice("lost-plan/2", "completed"),
];

const SLICE_TO_EPIC: Record<string, string> = {
  "beta/1": "beta/E1",
  "beta/2": "beta/E1",
  "beta/3": "beta/E1",
  "beta/4": "beta/E2",
  "beta/5": "beta/E2",
  "beta/6": "beta/E3",
  "gamma-plan/1": "gamma/E1",
};

const tracker = (nextReady: string | null) => ({ stage_source: "tracker" as const, next_ready: nextReady, pull_requests: [] });

export const BOARD_INDEX: RecordIndex = {
  schema_version: "1.5",
  sources: { git_head: "0123456789abcdef", trees: {} },
  entities: { ...EMPTY_ENTITIES, design: PROGRAMS, epic: EPICS, slice: SLICES },
  joins: {
    ...EMPTY_JOINS,
    epic_status: EPIC_STATUS,
    epic_to_pull_request: { "delta/E1": 42 },
    slice_to_epic: SLICE_TO_EPIC,
    slice_to_epic_unresolved: {
      "alpha/1": "no epic in the plan",
      "lost-plan/1": "no design for the plan",
      "lost-plan/2": "no design for the plan",
    },
    tracker: { adapter: "beads", read: true },
    design_tracker: { beta: tracker("beta/4"), gamma: tracker("gamma-plan/1"), delta: tracker(null) },
  },
};

export const BOARD_DESIGNS: DesignRecords = Object.fromEntries(
  PROGRAMS.map((one) => [one.id, { goal: { name: one.name, outcome: one.outcome, stage: String(one.stage) } }]),
);

const BOARD_EPICS: BoardEpic[] = EPICS.map((entity) => ({
  id: entity.id,
  epicId: entity.epic_id,
  design: entity.design,
  title: null,
  branch: entity.branch,
  pr: entity.pr,
  status: EPIC_STATUS[entity.id] ?? entity.state,
  lifecycle: entity.state,
}));

const sliceNamed = (id: string): SliceEntity => SLICES.find((one) => one.id === id) as SliceEntity;

export const BOARD_ROWS: BoardRows = {
  programs: PROGRAMS,
  epics: BOARD_EPICS,
  slices: SLICES,
  epicOfSlice: new Map(Object.entries(SLICE_TO_EPIC)),
  orphanSlices: [sliceNamed("lost-plan/1"), sliceNamed("lost-plan/2")],
  nextReady: new Map<string, SliceEntity | null>(PROGRAMS.map((one) => [one.id, null]))
    .set("beta", sliceNamed("beta/4"))
    .set("gamma", sliceNamed("gamma-plan/1")),
  builtAt: null,
};

export const PROGRAM_BOARD: BoardAddress = {
  level: "programs",
  program: null,
  q: "",
  order: "name",
  cards: "epics",
  hide: ["superseded"],
};

export const STAGE_KEYS = ["decision", "build", "review", "shipped", "superseded"] as const;

export const EPIC_TITLES: Record<string, string> = {
  "beta/E1": "Ship the first cut",
  "beta/E2": "Wire the drawer",
  "beta/E3": "Polish the board",
  "beta/E4": "Close the gaps",
};

const unjoined = (id: string, state: string): SliceEntity => ({ ...slice(id, state), ends_with: `The end state of ${id}.` });

export const UNJOINED_SLICES: SliceEntity[] = [unjoined("beta/7", "planned"), unjoined("beta/8", "completed")];

export const EPIC_BOARD_INDEX: RecordIndex = {
  ...BOARD_INDEX,
  entities: {
    ...BOARD_INDEX.entities,
    epic: EPICS.map((entity) => ({ ...entity, title: EPIC_TITLES[entity.id] ?? null })),
    slice: [...SLICES, ...UNJOINED_SLICES],
  },
  joins: {
    ...BOARD_INDEX.joins,
    slice_to_epic_unresolved: { ...BOARD_INDEX.joins.slice_to_epic_unresolved, "beta/7": "no epic in the plan", "beta/8": "no epic in the plan" },
  },
};

export const EPIC_BOARD_ROWS: BoardRows = {
  ...BOARD_ROWS,
  epics: BOARD_EPICS.map((one) => ({ ...one, title: EPIC_TITLES[one.id] ?? null })),
  slices: [...SLICES, ...UNJOINED_SLICES],
};

export const EPIC_BOARD: BoardAddress = { ...PROGRAM_BOARD, level: "epics", program: "beta", hide: [] };
