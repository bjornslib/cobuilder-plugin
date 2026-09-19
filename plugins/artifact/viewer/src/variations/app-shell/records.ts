/**
 * The two record files the shell reads, and the types it reads them through.
 *
 * `src/data/bundle.ts` wires `data/index.json` and stops there. The shell also needs
 * the per-design record bodies and the decision records, and neither one lives in the
 * index. So this file loads two more siblings, with the same access path the shipped
 * viewer uses:
 *
 *   `data/designs.js` → `window.DESIGNS`, one entry per design. Holds `goal`, `intent`,
 *                       `narrative`, `assessment`, `diagrams`, and `pr_draft`.
 *   `data/adrs.js`    → `window.ADRS`, one entry per decision. Holds `maps_to.rule`,
 *                       which the index's `adr` entity does not carry.
 *
 * Each loader appends a `<script src>` tag and reads the global that tag assigns. That
 * global is the same one a published Artifact inlines, so a surface that reads the
 * global works under both readers with no branch.
 *
 * Nothing here invents a value. A record file that did not load reads as absent, and
 * every panel says so rather than guessing.
 */

import { BUNDLE_DATA_URL } from "@/data/bundle";

export const DESIGNS_URL = `${BUNDLE_DATA_URL}designs.js`;
export const ADRS_URL = `${BUNDLE_DATA_URL}adrs.js`;

/* ------------------------------------------------------------------- designs */

/** One row of `goal.epics[]`. The index carries no epic outcome, so this is its source. */
export interface PlanEpicRow {
  id: string;
  slug?: string;
  branch: string | null;
  pr: number | null;
  state: string;
  outcome?: string;
  note?: string | null;
}

export interface DesignGoal {
  name: string;
  title: string;
  created: string;
  outcome: string;
  done_when?: string[];
  abort_if?: string[];
  epics?: PlanEpicRow[];
  stage: string;
  supersedes: string[] | null;
  /** Present when a later design closed this one. The authority for "superseded by". */
  superseded_by?: string;
  superseded_note?: string;
  adr: string | null;
  /** The decisions this design names. The shell's linked-decision join reads this. */
  adrs: string[];
}

export interface DesignIntent {
  problem?: string;
  approach?: string;
  alternatives?: Array<{ option: string; rejected_because: string }>;
  authorship?: string;
  captured?: string;
  out_of_scope?: string[];
  reviewer_focus?: string[];
  risks?: string[];
  unknowns?: string[];
  why_now?: string;
}

export interface AssessmentFinding {
  kind: string;
  id?: string;
  title: string;
  detail: string;
  severity?: string;
}

export interface DesignAssessment {
  verdict: string;
  findings?: AssessmentFinding[];
  constraint_introduced?: string;
  regret_risk?: string;
  risk_tier?: string;
  stage?: string;
  summary?: string;
}

/** One narrative beat. `kind` is `problem`, `constraint`, `decision`, or `risk`. */
export interface NarrativeBeat {
  kind: string;
  text: string;
}

export interface DesignNarrative {
  landscape?: { tagline?: string; narration?: string };
  problem_solution?: {
    problem?: string;
    solution?: string;
    narration?: string;
    beats?: NarrativeBeat[];
  };
  architecture?: { tagline?: string; narration?: string; beats?: NarrativeBeat[] };
}

export interface DesignRecord {
  goal: DesignGoal;
  intent?: DesignIntent;
  assessment?: DesignAssessment;
  narrative?: DesignNarrative;
  /** Mermaid source, keyed by level number as a string: `"1"`, `"2"`, `"3"`. */
  diagrams?: Record<string, string>;
  pr_draft?: string;
}

export type DesignRecords = Record<string, DesignRecord>;

function isDesignRecords(value: unknown): value is DesignRecords {
  if (typeof value !== "object" || value === null) return false;
  const first = Object.values(value as DesignRecords)[0];
  return typeof first === "object" && first !== null && "goal" in first;
}

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

let designsPending: Promise<DesignRecords> | null = null;
let adrsPending: Promise<AdrRecords> | null = null;

export function loadDesigns(): Promise<DesignRecords> {
  if (!designsPending) {
    designsPending = loadGlobal(DESIGNS_URL, "DESIGNS", isDesignRecords).catch(
      (error: unknown) => {
        designsPending = null;
        throw error;
      },
    );
  }
  return designsPending;
}

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

/** The first line of a Mermaid source names the grammar it is written in. */
export function diagramKind(source: string): string {
  return source.trim().split("\n")[0]?.trim() ?? "mermaid";
}

/** A one-line excerpt. Long authored prose is cut here rather than in a panel. */
export function excerpt(text: string, limit: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= limit) return flat;
  const cut = flat.slice(0, limit);
  const stop = cut.lastIndexOf(" ");
  return `${(stop > limit * 0.6 ? cut.slice(0, stop) : cut).trimEnd()}...`;
}
