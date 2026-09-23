/**
 * The lane rule, one lane per tab.
 *
 * The rule comes from the approved Work board prototype
 * (`docs/architecture/designs/cobuilder-viewer/prototypes/work-prototype.html`).
 * The index records no lane, so this table is a UI rule and the header of each tab
 * says so.
 *
 * A superseded design belongs to no lane. It stays reachable under All, in its own
 * group, and the group states which design closed it.
 */

export interface Lane {
  key: string;
  label: string;
  stages: string[];
  blurb: string;
  empty: string;
}

export const LANES: Lane[] = [
  {
    key: "decision",
    label: "Needs a decision",
    stages: ["backlog", "decided"],
    blurb:
      "The design is not settled. Design mode stopped after stage 1, or a decision is recorded and no approved design has followed.",
    empty: "No design waits on a decision in this bundle.",
  },
  {
    key: "build",
    label: "Ready to build",
    stages: ["approved"],
    blurb:
      "The design is approved and no epic has left the plan, so the build can start.",
    empty: "No approved design is waiting on a build in this bundle.",
  },
  {
    key: "review",
    label: "In review",
    stages: ["review"],
    blurb:
      "The design reached design mode's review stage. A reviewer reads it against the epics it records.",
    empty: "No design sits at the review stage in this bundle.",
  },
  {
    key: "shipped",
    label: "Shipped",
    stages: ["implemented"],
    blurb:
      "Design mode recorded the design as implemented. A shipped design may still carry an epic that an open pull request holds.",
    empty: "No design has shipped in this bundle.",
  },
];

/** The lane a stage belongs to, or null when the stage owns no lane. */
export function laneOf(stage: string): Lane | null {
  return LANES.find((lane) => lane.stages.includes(stage)) ?? null;
}

/** The lane label for a stage, so a card can say why it sits in no lane. */
export function laneLabelFor(stage: string): string {
  return laneOf(stage)?.label ?? "No lane";
}
