import { STAGE_PUBLICATIONS_DEPLOY_LEAD, type Gates, type SectionKey, type WorkItem } from "../model";

export const SECTION_TITLE: Record<SectionKey, string> = {
  intent: "Intent",
  "problem-and-solution": "Problem and solution",
  architecture: "Architecture",
  build: "Build",
  "pull-requests": "Pull requests",
  shipped: "Shipped",
};

export const SECTION_LEAD: Record<SectionKey, (work: WorkItem, gates: Gates | null) => string> = {
  intent: (work) =>
    `The goal, the done-when condition, and the blockers of ${work.id}.`,
  "problem-and-solution": () =>
    "The problem, the solution, and the cost of the solution.",
  architecture: () =>
    "The decisions, the affected boundaries, and the diagrams of this work.",
  build: (work, gates) =>
    `${work.epics.length} epics, ${work.slices.length} slices, and ${
      gates?.rubrics ? "a gate record" : "no gate record"
    }.`,
  "pull-requests": (work) =>
    `${work.pullRequests.length} pull requests from this work's epics, and all open pull requests.`,
  shipped: () => STAGE_PUBLICATIONS_DEPLOY_LEAD,
};
