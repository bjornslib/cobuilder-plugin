/**
 * The Problem and Solution level: Problem and solution, Risks, Assessment, Unknowns.
 *
 * THE LEVEL IS FOUR SECTIONS, NOT ONE GRID. It used to be a `Bento` holding four
 * `Panel`s, and each panel named a span inside a twelve-column grid. The level is a
 * horizontal pager now, so each section is its own box on the track and takes the whole
 * width of the stage it sits in. Every panel keeps its heading, icon, lead, absence
 * rule, count, and body; the only change is that a section returns one `Panel` rather
 * than a grid wrapper, and no panel names a span.
 *
 * A section is never reordered. The order here is the order the reader walks with Next:
 * Problem and solution, Risks, Assessment, Unknowns.
 *
 * PROBLEM AND SOLUTION IS TWO CARDS, AND THE POINTS ARE THEIR ROWS. Each point used to
 * sit in its own outlined box, and the authored problem and approach prose sat in two
 * more boxes below, painted amber and green. That is two treatments for one thing, and
 * the colour was doing work the words already did. Now each column is one shadcn `Card`.
 * The authored prose is the card's unboxed lead, and the points are striped rows under
 * it. `PointCard` in `../atoms` is that shape.
 *
 * THIS FILE IS THE PORTED PROTOTYPE at `src/variations/sections-e/panels.tsx`, split by
 * level so `panels/` holds one file per level. The record type comes from
 * `@/data/bundle`, which declares every assessment field and finding field possibly
 * absent, so the two reads below coalesce a missing value to an empty string rather than
 * passing undefined. The rendered pixels are the same either way.
 */

export {
  ProblemSolutionSection,
  RisksSection,
  UnknownsSection,
} from "./problemSolution/sections";
export { AssessmentSection } from "./problemSolution/assessment";
