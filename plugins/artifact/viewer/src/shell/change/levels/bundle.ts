import { useEffect, useState } from "react";

import { loadDiagrams, loadDiff, loadManifest, loadStory, type Manifest, type StoryEntry } from "@/data/bundle";

import { changeLevelsOf, entryOf } from "./changeLevels";
import type { ChangeLevel } from "./keys";

/**
 * What the change's account reads, and why it is absent when it is.
 *
 * `diff` is the fourth row's whole content, and `diffMessage` states why it is not there.
 * A pull request the manifest does not list carries no diff, and a listed one whose file
 * did not load carries an unreadable one. The two are different facts, so they are two
 * fields.
 */
export interface ChangeBundle {
  state: "idle" | "loading" | "ready" | "failed";
  entry: StoryEntry | null;
  levels: ChangeLevel[];
  diff: Record<string, string> | null;
  diffMessage: string | null;
  message: string | null;
}

const IDLE: ChangeBundle = {
  state: "idle",
  entry: null,
  levels: [],
  diff: null,
  diffMessage: null,
  message: null,
};

const NO_ENTRY_MESSAGE =
  "The bundle holds no story entry for this pull request, so the change has no recorded narration.";

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type DiffRead = Pick<ChangeBundle, "diff" | "diffMessage">;

async function readDiff(pr: number, manifest: Manifest | null): Promise<DiffRead> {
  if (!(manifest?.diff_prs ?? []).includes(pr)) {
    return { diff: null, diffMessage: "The bundle records no diff for this pull request." };
  }
  try {
    return { diff: await loadDiff(pr), diffMessage: null };
  } catch (error) {
    const diffMessage = `The bundle lists a diff for this pull request, and it did not load: ${describe(error)}`;
    return { diff: null, diffMessage };
  }
}

/* A manifest the bundle lacks costs the art and the diff gate, and nothing else. */
const loadManifestOrNull = () => loadManifest().catch(() => null);

async function loadChange(pr: number): Promise<ChangeBundle> {
  const [story, manifest] = await Promise.all([loadStory(), loadManifestOrNull()]);
  const entry = entryOf(story, pr);
  const diagrams = await loadDiagrams(pr).catch(() => ({}));
  const levels = changeLevelsOf(entry, story, manifest, diagrams);
  const diffRead = await readDiff(pr, manifest);
  const message = entry === null ? NO_ENTRY_MESSAGE : null;
  return { ...diffRead, state: "ready", entry, levels, message };
}

type Setter = (bundle: ChangeBundle) => void;

function failedBundle(error: unknown): ChangeBundle {
  return { ...IDLE, state: "failed", message: describe(error) };
}

function startReading(pr: number, setBundle: Setter): () => void {
  let live = true;
  const set = (bundle: ChangeBundle) => {
    if (live) setBundle(bundle);
  };
  setBundle({ ...IDLE, state: "loading" });
  loadChange(pr).then(set).catch((error: unknown) => set(failedBundle(error)));
  return () => {
    live = false;
  };
}

function readChange(pr: number | null, setBundle: Setter): (() => void) | undefined {
  if (pr === null) {
    setBundle(IDLE);
    return undefined;
  }
  return startReading(pr, setBundle);
}

/**
 * The change's records, read once per pull request.
 *
 * The diff is manifest-gated, and that is not an optimisation. `diffs-pr{N}.js` is read by
 * appending a script tag, and a tag for a file the bundle does not hold fails loudly: the
 * browser reports the missing resource, and the reader meets a broken page rather than a
 * stated absence. `manifest.js` names the pull requests that carry a diff, so this asks
 * only for one it holds and states the absence for every other.
 *
 * A failed read of the story or the manifest is a stated failure. The entry, the levels,
 * the art, and the audio all come from those two files, so a page that cannot read them
 * renders no change's account and says why.
 */
export function useChangeBundle(pr: number | null): ChangeBundle {
  const [bundle, setBundle] = useState<ChangeBundle>(IDLE);
  useEffect(() => readChange(pr, setBundle), [pr]);
  return bundle;
}
