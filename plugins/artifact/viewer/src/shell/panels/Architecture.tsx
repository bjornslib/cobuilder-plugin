/**
 * The Architecture level: Diagrams, Architecture Decisions, Boundaries, Districts and
 * alternatives considered.
 *
 * The level pages four sections. Each section is its own box on the pager track, so no
 * panel names a span. The sections keep the order the engineer asked for.
 *
 * The envisioned pull request lives in the Pull requests level, as its first block. It
 * is the pull request this work will open, so it belongs beside the pull requests and
 * not beside the decisions that shaped it.
 *
 * The decision body comes from `../records`, which holds the one reader `@/data/bundle`
 * does not yet carry. The diagram tiles come from `../DiagramTiles`, the single home of
 * the runtime.
 */

export { BoundariesSection, DecisionsSection, DiagramsSection } from "./architecture/sections";
export { DistrictsAndAlternativesSection } from "./architecture/districts";
