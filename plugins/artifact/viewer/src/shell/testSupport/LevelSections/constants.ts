export const DESIGN = "cobuilder-viewer";
export const OTHER = "cobuilder-viewer-other";

/** Eighteen epics, so the Build level's cut has more than one section to page. */
export const EPIC_COUNT = 18;

/**
 * `EPICS_PER_SECTION` in `model.ts` is 6 and is not exported, so this case restates the
 * number the design gives. `epic-E5-design.md` states the cut: "the epics in delivery
 * order, six to a section". A change to the cut is a design change, so the assertions
 * fail loudly on it rather than follow it.
 */
export const EPICS_PER_SECTION = 6;

export const OUTCOME = "One box is on screen at a time.";
export const DONE_WHEN = [
  "Every level renders its own sections.",
  "The strip names the box on screen.",
];
export const ABORT_IF = ["Two boxes are on screen at once."];
export const OUT_OF_SCOPE = ["A shared link to one section."];
export const PROBLEM = "A stacked level hides its last panel.";
export const APPROACH = "One box per section, on a track.";
export const RISKS = ["The strip and the boxes drift apart."];
export const UNKNOWNS = ["How a long section reads inside its box."];
export const VERDICT = "concerns";
export const SUMMARY = "The model is small and legible.";
export const ALTERNATIVE_OPTION = "A stacked column";
export const ALTERNATIVE_REASON = "It hides the fourth panel behind a scroll.";
export const BOUNDARY_TARGET = "src/data/";
export const RULE = "One section is on screen at a time.";
export const PR_TITLE = "The pager lands on the bundle";
export const DRAFT = "# The section model\n\n## What changes\n\nOne box on screen.\n";
/** `excerpt` flattens the draft: the panel shows one line, not the markdown. */
export const DRAFT_FLAT = "# The section model ## What changes One box on screen.";
export const DRAFT_TITLE = "The pull request this work will open";
/** The count in the title is this work's own pull-request count, which is 1. */
export const WORK_PR_TITLE = `This work's pull requests · 1`;
export const FLIGHTDECK_TITLE = "An open pull request";
export const OTHER_PR_TITLE = "A real pull request";
export const OTHER_PROBLEM = "The board lists every design and no work item opens.";
export const OTHER_APPROACH = "A row opens the work item's own surface.";
export const SHIPPED_STAGE = "implemented";

/** The panel titles use an en dash. */
export const RUN_TITLES = ["Epics E1–E6", "Epics E7–E12", "Epics E13–E18"];

export const GATE_STEPS = [
  { n: "4a", name: "The slice plan is approved", state: "approved" },
  { n: "4b", name: "The technical solution design is approved", state: "pending" },
];

export const PAGED: Array<{ label: string; hash: string; title: string }> = [
  { label: "Intent", hash: `#/${DESIGN}/intent`, title: "Intent" },
  {
    label: "Problem & Solution",
    hash: `#/${DESIGN}/problem-and-solution`,
    title: "Problem and solution",
  },
  { label: "Architecture", hash: `#/${DESIGN}/architecture`, title: "Architecture" },
  { label: "Build's epics", hash: `#/${DESIGN}/build/epics`, title: "Build" },
];
