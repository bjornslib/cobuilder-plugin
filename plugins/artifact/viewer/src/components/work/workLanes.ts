import type { DesignRow } from "@/data/types";

/**
 * The lane rule is the one the approved Work board prototype fixes
 * (`docs/architecture/designs/cobuilder-viewer/prototypes/work-prototype.html`).
 * A superseded design belongs to no lane, and it stays reachable under All.
 */
export interface Lane {
  key: string;
  label: string;
  stages: string[];
  blurb: string;
}

export const LANES: Lane[] = [
  {
    key: "decision",
    label: "Needs a decision",
    stages: ["backlog", "decided"],
    blurb:
      "The design is not settled. Either design mode stopped after stage 1, or a decision is recorded and no approved design has followed.",
  },
  {
    key: "build",
    label: "Ready to build",
    stages: ["approved"],
    blurb: "The design is approved. No epic has left the plan, so the work can start.",
  },
  {
    key: "review",
    label: "In review",
    stages: ["review"],
    blurb: "The design reached design mode's review stage and waits on a reviewer.",
  },
  {
    key: "shipped",
    label: "Shipped",
    stages: ["implemented"],
    blurb: "The tracker holds the stage implemented.",
  },
];

export function laneRows(rows: DesignRow[], lane: Lane): DesignRow[] {
  return rows.filter((row) => lane.stages.includes(row.design.stage));
}
