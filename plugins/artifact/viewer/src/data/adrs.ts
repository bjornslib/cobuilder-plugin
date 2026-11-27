/**
 * The decision records, as `data/adrs.js` writes them: `window.ADRS`, keyed by ADR id.
 * It holds `maps_to.rule`, the enforceable part of a decision, which the index's `adr`
 * entity does not carry.
 *
 * A published Artifact inlines the same global, so a surface that reads it works under
 * both readers with no branch. `src/data/` is the one place under `src/` that names a
 * bundle global.
 *
 * A record file that did not load reads as absent, and every panel says so rather than
 * guessing.
 */

import { BUNDLE_DATA_URL, readScriptGlobal } from "./bundle";

export const ADRS_URL = `${BUNDLE_DATA_URL}adrs.js`;

export interface AdrMapsTo {
  context?: string;
  district?: string;
  modules?: string[];
  rule: string;
  unanchored?: boolean;
}

export interface AdrAlternative {
  option: string;
  rejected_because: string;
}

export interface AdrDelivers {
  capability: string;
  benefit: string;
  beneficiary: string[];
}

export interface AdrHistoryEntry {
  state: string;
  date: string;
  /** Present on a retro-extracted entry, and it names the file it read. */
  source?: string;
  note?: string;
  by?: string;
}

/**
 * The index's `entities.adr` row carries three fields. The record file carries
 * fourteen, and the Sheet shows all of them. `maps_to` is the only field the index
 * lacks, so a panel that shows the rule reads it here.
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
  const records = Object.values(value as AdrRecords);
  /* A bundle with no decision assigns an empty map, and that is a real answer. */
  if (records.length === 0) return true;
  const first = records[0];
  return typeof first === "object" && first !== null && "title" in first;
}

let adrsPending: Promise<AdrRecords> | null = null;

/**
 * Every decision, from the inlined global of a published file, or else from the served
 * sibling. The promise is cached because strict mode mounts twice, and two script tags
 * for one file would race.
 */
export function loadAdrs(): Promise<AdrRecords> {
  if (!adrsPending) {
    adrsPending = readScriptGlobal(ADRS_URL, "ADRS", isAdrRecords).catch(
      (error: unknown) => {
        adrsPending = null;
        throw error;
      },
    );
  }
  return adrsPending;
}
