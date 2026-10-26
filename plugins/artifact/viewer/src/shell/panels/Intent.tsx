/**
 * The Intent level: Why, Done when, Abort if, Out of scope.
 *
 * Intent is four sections, one per part of the contract. As one panel with four parts
 * the level ran to 4.2 pages. Each part is now its own box on the pager track and
 * carries the whole width of the box, which is the room the contract's lists deserve.
 *
 * Each part carries its own absence gate. A single gate on the goal record alone would
 * show an "Abort if" part with nothing under it and no pill to say why. A part that
 * fails its own rule is absent, as in every other panel in this shell.
 *
 * The four sections carry no lead. A lead that named all four parts would state the
 * other three each time, and four new sentences would invent prose the record does not
 * hold. The panel's own title and its ColumnHead name the part between them.
 *
 * The Why panel holds the container drawing, and this level renders no section named
 * Diagrams. The tiles sit at the end of the panel body, after the outcome, so a reader
 * meets the reason before the drawing.
 *
 * A drawing the record lacks is not an absence. A record with no level "1" gives the
 * panel its prose and no tile, because a reader who never asked about a drawing does
 * not need to read about a missing one.
 *
 * The shipped record type declares every goal field possibly absent, so the one excerpt
 * below coalesces a missing outcome to an empty string rather than passing undefined.
 */

export { AbortIfSection, DoneWhenSection, OutOfScopeSection, WhySection } from "./intent/sections";
