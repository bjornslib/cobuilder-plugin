/**
 * The decision records the shell reads, through the shipped data layer's access path.
 *
 * `src/data/bundle.ts` owns the readers for `data/index.json` and `data/designs.js`. It
 * does not read `data/adrs.js`, because no shipped surface needed a decision's body until
 * this shell. The program design places that reader at `src/data/adrs.ts`, a module the
 * shell does not ship yet, so this file holds it in the meantime. It imports
 * `BUNDLE_DATA_URL` from `@/data/bundle` and appends the same sibling script tag that
 * reader would, so the file moves there without a rewrite.
 *
 *   `data/adrs.js` → `window.ADRS`, one entry per decision. It holds `maps_to.rule`,
 *                     which the index's `adr` entity does not carry.
 *
 * The global is the same one a published Artifact inlines, so a surface that reads the
 * global works under both readers with no branch.
 *
 * THIS FILE IS THE PORTED PROTOTYPE at `src/variations/sections-e/records.ts`, narrowed
 * to the decisions. The prototype's design-record reader is gone: `@/data/bundle`'s
 * `loadDesigns` replaces it, and its `DesignRecord` is the one declaration of that shape.
 * The prototype's `diagramKind` helper is gone with it, because no surface ever read one.
 *
 * Nothing here invents a value. A record file that did not load reads as absent, and
 * every panel says so rather than guessing.
 */

import { BUNDLE_DATA_URL } from "@/data/bundle";

export const ADRS_URL = `${BUNDLE_DATA_URL}adrs.js`;

/* ----------------------------------------------------------------- decisions */

export interface AdrMapsTo {
  context?: string;
  district?: string;
  modules?: string[];
  /** The enforceable part of the decision. The shell shows this, not only the title. */
  rule: string;
  unanchored?: boolean;
}

/** One rejected option, with the reason the record gives. */
export interface AdrAlternative {
  option: string;
  rejected_because: string;
}

export interface AdrDelivers {
  capability: string;
  benefit: string;
  beneficiary: string[];
}

/** One state change in the decision's own history. */
export interface AdrHistoryEntry {
  state: string;
  date: string;
  /** Present on a retro-extracted entry, and it names the file it read. */
  source?: string;
  note?: string;
  by?: string;
}

/**
 * One decision record, as `adrs.js` writes it.
 *
 * The index's `entities.adr` row carries three fields. The record file carries
 * fourteen, and the Sheet in this shell shows all of them. `maps_to` is the one
 * field the index does not carry at all, so a panel that shows the rule reads it
 * here.
 */
export interface AdrRecord {
  id: string;
  title: string;
  state: string;
  /** The pull request the record itself names. `joins.adr_to_pull_request` is the join. */
  source_pr?: number | null;
  problem?: string;
  decision?: string;
  alternatives?: AdrAlternative[];
  /** Why the decision was forced, one line each. */
  forces?: string[];
  delivers?: AdrDelivers | null;
  /** The full authored record, as markdown. */
  body?: string;
  maps_to?: AdrMapsTo;
  approved_by?: string | null;
  history?: AdrHistoryEntry[];
  /** `authored`, `inferred`, or null. */
  provenance?: string | null;
}

export type AdrRecords = Record<string, AdrRecord>;

function isAdrRecords(value: unknown): value is AdrRecords {
  if (typeof value !== "object" || value === null) return false;
  const first = Object.values(value as AdrRecords)[0];
  return typeof first === "object" && first !== null && "title" in first;
}

/* ------------------------------------------------------------------ loaders */

/**
 * Append one sibling script tag and resolve with the global it assigns.
 *
 * A missing file rejects with the path and the likely cause, so a panel can state
 * both. The promise is cached, because React's strict mode mounts twice and two
 * script tags for one file would work but would also race.
 *
 * The tag below is the served path: it reaches outside the built file for a sibling.
 * A published Artifact inlines `window.ADRS` as a literal instead, so this is the
 * code `export_artifact.py` deletes at that point. The pair that names it lives in
 * `src/index.html`'s seam block, because no `.ts` module here can carry a `//`
 * comment through the build.
 *
 * Nothing under `src/` reads a diff hunk or a diagram source yet.
 * `docs/plans/cobuilder-viewer/04-slices.md` records that slices 15 and 16 add the
 * pull request's art, audio, and diffs; those two globals reach no reader at all.
 */
function loadGlobal<T>(url: string, globalName: string, looksRight: (v: unknown) => v is T) {
  const holder = window as unknown as Record<string, unknown>;

  const read = (): T | undefined => {
    const value = holder[globalName];
    return looksRight(value) ? value : undefined;
  };

  const inlined = read();
  if (inlined) return Promise.resolve(inlined);

  return new Promise<T>((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = url;
    tag.async = true;
    tag.onload = () => {
      const loaded = read();
      if (loaded) resolve(loaded);
      else {
        reject(
          new Error(
            `${url} loaded but assigned no window.${globalName}. The file is a ` +
              `sibling under data/, and it assigns exactly one global.`,
          ),
        );
      }
    };
    tag.onerror = () => {
      reject(
        new Error(
          `The dev server did not serve ${url}. Check that the bundle exists at ` +
            `.cobuilder-architect/self/ and that npm run dev is the server you are reading.`,
        ),
      );
    };
    document.head.appendChild(tag);
  });
}

let adrsPending: Promise<AdrRecords> | null = null;

export function loadAdrs(): Promise<AdrRecords> {
  if (!adrsPending) {
    adrsPending = loadGlobal(ADRS_URL, "ADRS", isAdrRecords).catch((error: unknown) => {
      adrsPending = null;
      throw error;
    });
  }
  return adrsPending;
}

/* -------------------------------------------------------------------- text */

/** A one-line excerpt. Long authored prose is cut here rather than in a panel. */
export function excerpt(text: string, limit: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= limit) return flat;
  const cut = flat.slice(0, limit);
  const stop = cut.lastIndexOf(" ");
  return `${(stop > limit * 0.6 ? cut.slice(0, stop) : cut).trimEnd()}...`;
}
