/**
 * The Pull requests level: the envisioned pull request first, then the real ones, then
 * FlightDeck.
 *
 * This module is the level's entry point, so `panels/` reads as one file per level. The
 * section it names is defined in `../sections.tsx`, which the port's file map keeps as
 * its own file. One definition serves both paths.
 *
 * `PullRequestsSection` holds all three blocks in that order. It renders the work's
 * envisioned draft when the design wrote one, then only the pull requests this work's own
 * epics carry, then the whole open set. A route that names a pull request number opens
 * that one instead, which is the detail sub-view.
 */

export { PullRequestsSection } from "../sections";
