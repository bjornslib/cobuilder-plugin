import { railGroups, type AccountId, type RailGroup, type RailSource, type WorkItem } from "../../model";

/** A work item with the fields `railGroups` reads, and nothing else. */
export const WORK = {
  id: "demo",
  record: null,
  epics: [],
  planDocs: { product: null, architecture: null, program: null },
  rubrics: [],
  linkedAdrs: [],
  diagramLevels: [],
  districts: [],
  boundaryRules: [],
  hasPlan: true,
} as unknown as WorkItem;

export const GATES = {
  build: true,
  pullRequests: true,
  shipped: false,
  rubrics: true,
  gateSteps: null,
};

export function source(extra: Partial<RailSource> & { account?: AccountId } = {}): RailSource {
  return {
    work: WORK,
    gates: GATES,
    levels: null,
    changePr: 7,
    changeLevels: [],
    diffFiles: null,
    servedAudio: {},
    ...extra,
  } as RailSource;
}

export const LEVEL_LABELS = ["Intent", "Problem & Solution", "Architecture"];
export const SHARED = ["intent", "problem-and-solution", "architecture"] as const;

export function groupOf(key: string, from: RailSource = source()): RailGroup | undefined {
  return railGroups(from).find((group) => group.key === key);
}

export const withoutPlan = (): RailSource =>
  source({ work: { ...WORK, hasPlan: false } as unknown as WorkItem });
