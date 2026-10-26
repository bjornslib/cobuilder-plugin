import type { RecordIndex } from "../types";
import { cachedScript } from "./readers";
import type { DesignRecords } from "./designTypes";

declare global {
  interface Window {
    INDEX?: RecordIndex;
    /**
     * `data/designs.js` assigns this global.
     *
     * THE DECLARATION MOVED HERE IN SLICE 4 OF COBUILDER-VIEWER. Every variation that
     * read the record file used to declare this property for itself, and each one typed
     * it as its own copy of the record shape, so a declaration here collided with all of
     * them. No variation declares a bundle global now: each reads through the readers in
     * this module. So this is the one declaration, and it is the same shape `loadDesigns`
     * validates a value against.
     */
    DESIGNS?: DesignRecords;
  }
}

/*
 * `loadDesigns` still reads the global through a guard rather than through the
 * declaration above. The declaration says what a caller who writes the global may
 * assign, and the guard is the real check: it runs at read time against the value the
 * file assigned, which may be anything at all.
 */

function isDesignRecords(value: unknown): value is DesignRecords {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const first = Object.values(value as DesignRecords)[0];
  if (first === undefined) return true;
  return typeof first === "object" && first !== null && "goal" in first;
}

/**
 * Read every design's records, from the inlined global when a published file provided
 * one, and from the served sibling otherwise.
 *
 * `designs.js` assigns a global rather than holding JSON, so this reader appends a
 * script tag and reads what the tag assigns. The promise is cached, because React's
 * strict mode mounts twice and two tags for one file would race.
 */
export const loadDesigns = cachedScript("designs.js", "DESIGNS", isDesignRecords);
