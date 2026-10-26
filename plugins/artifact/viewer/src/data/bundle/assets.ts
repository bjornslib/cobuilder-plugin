import { cachedScript } from "./readers";

/* ------------------------------------------------------------- manifest.js */

/**
 * `manifest.js`, which the bundle writes as `window.ODYSSEY`.
 *
 * The hero list is the record of which pull request levels carry scene art. A surface
 * that assumed `assets/pr-{N}/level-{L}.webp` for every level would ask for a picture
 * the bundle does not hold, so the list is read rather than assumed.
 */
export interface Manifest {
  schema_version?: string;
  excluded_prs?: number[];
  hero?: string[];
  diff_prs?: number[];
  diagrams?: string[];
}

function isManifest(value: unknown): value is Manifest {
  return typeof value === "object" && value !== null;
}

/** The hero art list, the diff pull requests, and the excluded ones. */
export const loadManifest = cachedScript("manifest.js", "ODYSSEY", isManifest);

/* -------------------------------------------------------------- diagrams.js */

/** Every diagram, keyed by pull request number and then by level number, both as strings. */
export type DiagramsByPr = Record<string, Record<string, string>>;

function isDiagramsByPr(value: unknown): value is DiagramsByPr {
  return typeof value === "object" && value !== null;
}

const loadAllDiagrams = cachedScript("diagrams.js", "DIAGRAMS", isDiagramsByPr);


/**
 * One pull request's Mermaid source, keyed by level number as a string.
 *
 * `diagrams.js` assigns one global holding every pull request, so one reader serves
 * them all and the promise is cached once rather than once per pull request.
 */
export async function loadDiagrams(pr: number): Promise<Record<string, string>> {
  return (await loadAllDiagrams())[String(pr)] ?? {};
}
