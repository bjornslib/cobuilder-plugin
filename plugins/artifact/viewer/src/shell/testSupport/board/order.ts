import type { DesignRecords } from "@/data/bundle";
import type { DesignEntity, EpicEntity, RecordIndex } from "@/data/types";

import { EMPTY_ENTITIES, EMPTY_JOINS } from "../emptyIndex";

const design = (id: string): DesignEntity => ({ id, name: id, outcome: `The outcome of ${id}.`, stage: "approved" });

const ORDER_PROGRAMS: DesignEntity[] = [design("dog"), design("charlie"), design("baker"), design("able")];

const EPIC_STATUS: Record<string, string> = {
  "able/E1": "completed",
  "baker/E1": "completed",
  "baker/E2": "open",
  "baker/E3": "planned",
  "baker/E4": "no-pull-request",
  "charlie/E1": "merged",
  "charlie/E2": "open",
};

const epic = (id: string): EpicEntity => {
  const [owner, epicId] = id.split("/");
  return { id, design: owner, epic_id: epicId, branch: `feat/${owner}-${epicId}`, pr: null, state: "open", note: null };
};

export const ORDER_INDEX: RecordIndex = {
  schema_version: "1.5",
  sources: { git_head: "0123456789abcdef", trees: {} },
  entities: { ...EMPTY_ENTITIES, design: ORDER_PROGRAMS, epic: Object.keys(EPIC_STATUS).map(epic) },
  joins: { ...EMPTY_JOINS, epic_status: EPIC_STATUS },
};

export const ORDER_DESIGNS: DesignRecords = Object.fromEntries(
  ORDER_PROGRAMS.map((one) => [one.id, { goal: { name: one.name, outcome: one.outcome, stage: String(one.stage) } }]),
);

export const BY_NAME = ["able", "baker", "charlie", "dog"];
export const BY_OPEN_WORK = ["baker", "charlie", "able", "dog"];
export const BY_PROGRESS = ["able", "charlie", "baker", "dog"];

export function installOrderIndex(): void {
  window.INDEX = ORDER_INDEX;
  window.DESIGNS = ORDER_DESIGNS;
}
