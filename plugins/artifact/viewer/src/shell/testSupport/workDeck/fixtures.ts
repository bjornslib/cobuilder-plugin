import type { DesignRow } from "@/data/types";

import { LANES } from "../../workDeck";
import { ROW_BASE } from "../designRow";

type RowExtra = { outcome?: string; pullRequests?: number[] };

export const row = (id: string, stage: string, extra: RowExtra = {}): DesignRow => ({
  design: { id, name: id, outcome: extra.outcome ?? "", stage },
  ...ROW_BASE,
  pullRequests: extra.pullRequests ?? [],
});

export const DECK: DesignRow[] = [
  row("gate-doc-surfacing", "decided", {
    outcome: "Gate documents are readable from the viewer's Builds view.",
  }),
  row("interaction-design-gate", "decided", {
    outcome: "A session writes an interaction design before implementation starts.",
  }),
  row("gate-state-resolution", "approved", {
    outcome: "A gate line reads as approved, as not applicable, or as open.",
  }),
  row("cobuilder-viewer", "review", {
    outcome: "A reader opens the bundle on three goal-shaped surfaces.",
  }),
  row("book-index-tiering", "review", {
    outcome: "book-index.md offers nano, mini, and full tiers, judgment-gated.",
  }),
  row("plugin-split", "implemented", {
    outcome: "A user installs one stage without the other three.",
    pullRequests: [11],
  }),
];

export const idsOf = (rows: DesignRow[]): string[] => rows.map((r) => r.design.id);

export function laneNamed(key: string): (typeof LANES)[number] {
  const lane = LANES.find((candidate) => candidate.key === key);
  if (!lane) throw new Error(`no lane named ${key}`);
  return lane;
}
