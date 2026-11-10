/**
 * The Pull requests level: the envisioned pull request first, then the real ones, then
 * FlightDeck.
 *
 * The section is defined in `../sections.tsx`, so one definition serves both paths.
 *
 * `PullRequestsSection` renders the work's envisioned draft when the design wrote one,
 * then only the pull requests this work's own epics carry, then the whole open set. A
 * route that names a pull request number opens that one instead, which is the detail
 * sub-view.
 */

export { PullRequestsSection } from "../sections";
