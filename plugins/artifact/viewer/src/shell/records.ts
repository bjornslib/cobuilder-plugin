/**
 * The decision records the shell reads, and the one text helper it shares.
 *
 * THE READER MOVED TO THE DATA MODULE, AND THIS FILE RE-EXPORTS IT. Until slice 4 of
 * cobuilder-viewer, this file appended the sibling script tag for `data/adrs.js` itself,
 * because `src/data/bundle.ts` read only the index and the designs and no shipped surface
 * needed a decision's body before this shell. Slice 4 makes `src/data/` the one place
 * under `src/` that names a bundle global, so the reader lives at `@/data/adrs` now and
 * this file holds the shell's own import path for it.
 *
 *   `data/adrs.js` → `window.ADRS`, one entry per decision. It holds `maps_to.rule`,
 *                     which the index's `adr` entity does not carry.
 *
 * The global is the same one a published Artifact inlines, so a surface that reads the
 * global works under both readers with no branch.
 *
 * Nothing here invents a value. A record file that did not load reads as absent, and
 * every panel says so rather than guessing.
 */

export type {
  AdrAlternative,
  AdrDelivers,
  AdrHistoryEntry,
  AdrMapsTo,
  AdrRecord,
  AdrRecords,
} from "@/data/adrs";
export { ADRS_URL, loadAdrs } from "@/data/adrs";

/* -------------------------------------------------------------------- text */

/** A one-line excerpt. Long authored prose is cut here rather than in a panel. */
export function excerpt(text: string, limit: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= limit) return flat;
  const cut = flat.slice(0, limit);
  const stop = cut.lastIndexOf(" ");
  return `${(stop > limit * 0.6 ? cut.slice(0, stop) : cut).trimEnd()}...`;
}
