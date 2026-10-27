export const DESIGN = "cobuilder-viewer";
export const OUTCOME = "One box is on screen at a time.";

export const ADR_ID = "ADR-0028";
export const ADR_TITLE = "One section on screen";
export const ADR_STATE = "accepted";
/**
 * The second decision this work names, and the one the record file does not carry.
 * `data/adrs.js` writes one entry per decision, and a bundle can name a decision that its
 * record file did not write. The index still holds the row, so the panel lists it with a
 * `no body` chip, and the sheet is the surface that states the absence.
 */
export const ADR_ABSENT = "ADR-0099";
export const ADR_ABSENT_TITLE = "A decision with no body";
export const ADR_PROBLEM = "A stacked level hides its last panel behind a scroll.";
export const ADR_DECISION = "One box per section, on a track.";
export const ADR_RULE = "One section is on screen at a time.";
export const ADR_MODULE = "src/shell/Pager.tsx";
export const ADR_BODY = "# The decision\n\nThe track holds one box per section.";
export const ADR_FORCE = "The pane cannot scroll and hold a strip at once.";

export const RULE_ID = "br-1";
export const RULE_KIND = "dependency";
export const RULE_TARGET = "src/data/";
export const RULE_WHY = "One module names a bundle global.";
export const RULE_CONTEXT = "viewer-data";
/** The one further field the record carries, which the tile does not show. */
export const RULE_EXTRA_KEY = "rationale";
export const RULE_EXTRA_VALUE = "The bundle is read in one place.";

export const EPIC_DESIGN_TITLE = "Epic E1 — the shell lands";
export const EPIC_DESIGN_BODY = "## Scope\n\nThe shell reads the index and derives no join.";

export const OPEN_DECISION = `Open the whole record for ${ADR_ID}`;
export const OPEN_RULE = `Open the whole boundary rule ${RULE_ID}`;
export const OPEN_EPIC_DESIGN = "Open the technical solution design for epic E1";
