/**
 * The Problem and Solution level: Problem and solution, Risks, Assessment, Unknowns.
 *
 * The level is four sections, not one grid. The level is a horizontal pager, so each
 * section is its own box on the track and takes the whole width of the stage. A section
 * returns one `Panel`, and no panel names a span.
 *
 * A section is never reordered. The order here is the order the reader walks with Next.
 *
 * Problem and solution is two cards, and the points are their rows. Boxed points with
 * amber and green prose boxes were two treatments for one thing, and the colour did
 * work the words already did. Each column is one shadcn `Card`. The authored prose is
 * the card's unboxed lead, and the points are striped rows under it. `PointCard` in
 * `../atoms` is that shape.
 *
 * The shipped record type declares every assessment field and finding field possibly
 * absent, so the two reads below coalesce a missing value to an empty string rather
 * than passing undefined.
 */

export {
  ProblemSolutionSection,
  RisksSection,
  UnknownsSection,
} from "./problemSolution/sections";
export { AssessmentSection } from "./problemSolution/assessment";
