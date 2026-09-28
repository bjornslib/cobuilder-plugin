/**
 * The Shipped level: the stage, the publications, and the deploy gap.
 *
 * This module is the level's entry point, so `panels/` reads as one file per level. The
 * section it names is defined in `../sections.tsx`, which the port's file map keeps as
 * its own file. One definition serves both paths.
 *
 * The section states the stage the record carries and the publications the bundle holds,
 * and it states the deploy record that does not exist rather than implying a release.
 */

export { ShippedSection } from "../sections";
