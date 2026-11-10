import type { RecordIndex } from "../types";
import { cachedScript } from "./readers";
import type { DesignRecords } from "./designTypes";

declare global {
  interface Window {
    INDEX?: RecordIndex;
    /**
     * `data/designs.js` assigns this global. This is the one declaration of it, with the
     * shape `loadDesigns` validates. No variation declares a bundle global, because each
     * reads through the readers in this module.
     */
    DESIGNS?: DesignRecords;
  }
}

/*
 * `loadDesigns` reads the global through a guard, not through the declaration above.
 * The declaration says what a writer may assign. The guard is the real check: it runs at
 * read time against the value the file assigned, which may be anything at all.
 */

function isDesignRecords(value: unknown): value is DesignRecords {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const first = Object.values(value as DesignRecords)[0];
  if (first === undefined) return true;
  return typeof first === "object" && first !== null && "goal" in first;
}

/**
 * `designs.js` assigns a global rather than holding JSON, so this reader appends a
 * script tag and reads what the tag assigns. The promise is cached because strict mode
 * mounts twice, and two tags for one file would race.
 */
export const loadDesigns = cachedScript("designs.js", "DESIGNS", isDesignRecords);
