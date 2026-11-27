import { BUNDLE_DATA_URL, appendScript, readGlobal } from "./readers";

export type DiffByPr = Record<number, Record<string, string>>;

function isDiffByPr(value: unknown): value is DiffByPr {
  return typeof value === "object" && value !== null;
}

const diffPending = new Map<number, Promise<Record<string, string>>>();

async function readDiff(pr: number): Promise<Record<string, string>> {
  const existing = readGlobal("DIFFS_BY_PR", isDiffByPr)?.[pr];
  if (existing) return existing;

  const url = `${BUNDLE_DATA_URL}diffs-pr${pr}.js`;
  await appendScript(url);

  const written = readGlobal("DIFFS_BY_PR", isDiffByPr)?.[pr];
  if (written) return written;
  throw new Error(`${url} loaded but wrote no window.DIFFS_BY_PR[${pr}].`);
}

/**
 * One pull request's diff hunks, keyed by the path the diff names.
 *
 * Each `diffs-pr{N}.js` runs `window.DIFFS_BY_PR = window.DIFFS_BY_PR || {}` and then
 * assigns its own entry, so the object exists from the first file that loads. The reader
 * checks for this pull request's entry before it appends a tag, and again after the tag
 * has run. A reader that accepted the object alone could resolve with a map that lacks
 * the entry it was asked for.
 */
export function loadDiff(pr: number): Promise<Record<string, string>> {
  const held = diffPending.get(pr);
  if (held) return held;

  const pending = readDiff(pr).catch((error: unknown) => {
    diffPending.delete(pr);
    throw error;
  });
  diffPending.set(pr, pending);
  return pending;
}
