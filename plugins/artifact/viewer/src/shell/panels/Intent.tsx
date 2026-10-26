/**
 * The Intent level: Why, Done when, Abort if, Out of scope.
 *
 * INTENT IS FOUR SECTIONS, ONE PER PART OF THE CONTRACT. The level was one panel with
 * four parts and ran to 4.2 pages, so a reader met the plan a screen at a time only if
 * they scrolled. Each part is now its own box on the pager track and each carries the
 * whole width of the box, which is the room the contract's lists deserve.
 *
 * THE BODY OF EVERY PART IS UNCHANGED. Its `ColumnHead`, its `Box`, its `TextList`, and
 * its absence line are the ones the single panel rendered; only the container around
 * them changed.
 *
 * Each part also carries its own absence gate now. The single panel gated all four on
 * the goal record alone, so a work with a goal and no abort condition showed an "Abort
 * if" part with nothing under it and no pill to say why. A part that fails its own rule
 * is absent, which is the rule every other panel in this shell already follows.
 *
 * The four sections carry no lead. The single panel's lead named all four parts, so
 * repeating it four times would state the other three, and writing four new sentences
 * would invent prose the record does not hold. The panel's own title and its ColumnHead
 * name the part between them.
 *
 * THE WHY PANEL HOLDS THE CONTAINER DRAWING. This level used to render a Diagrams section
 * of its own beside the four parts of the contract, and the engineer moved the drawing
 * inside Why. The panel therefore draws the tiles for the level numbers its caller hands
 * it, and this level renders no section named Diagrams at all. The tiles sit at the END of
 * the panel body, after the outcome, so a reader meets the reason before the drawing.
 *
 * A DRAWING THE RECORD LACKS IS NOT AN ABSENCE. A record that carries no level "1" gives
 * this panel its prose and no tile. The panel states no gap for one, because a reader who
 * never asked about a drawing does not need to read about a missing one.
 *
 * THIS FILE IS THE PORTED PROTOTYPE at `src/variations/sections-e/panels.tsx`, split by
 * level so `panels/` holds one file per level. It reads the shipped record type from
 * `@/data/bundle`, which declares every goal field possibly absent, so the one excerpt
 * below coalesces a missing outcome to an empty string rather than passing undefined.
 */

export { AbortIfSection, DoneWhenSection, OutOfScopeSection, WhySection } from "./intent/sections";
