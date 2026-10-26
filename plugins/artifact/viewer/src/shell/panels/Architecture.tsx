/**
 * The Architecture level: Diagrams, Architecture Decisions, Boundaries, Districts and
 * alternatives considered.
 *
 * ARCHITECTURE IS FOUR SECTIONS, AND THE LEVEL PAGES THEM. It used to be one `Bento` of
 * six panels: diagrams, the decisions, the reach, the rules, the alternatives, and the
 * envisioned pull request. The engineer regrouped it, and each section is now its own
 * box on the pager track, so no panel names a span.
 *
 * The envisioned pull request left this level for the Pull requests level, where it is
 * the first block. It is the pull request this work will open, so it belongs beside the
 * pull requests rather than beside the decisions that shaped it.
 *
 * The four sections keep the order the engineer asked for: Diagrams, Architecture
 * Decisions, Boundaries, Districts and alternatives considered.
 *
 * THIS FILE IS THE PORTED PROTOTYPE at `src/variations/sections-e/panels.tsx`, split by
 * level so `panels/` holds one file per level. The decision body comes from `../records`,
 * which holds the one reader `@/data/bundle` does not yet carry, and the diagram tiles
 * come from `../DiagramTiles`, which the port made the single home of the runtime.
 */

export { BoundariesSection, DecisionsSection, DiagramsSection } from "./architecture/sections";
export { DistrictsAndAlternativesSection } from "./architecture/districts";
