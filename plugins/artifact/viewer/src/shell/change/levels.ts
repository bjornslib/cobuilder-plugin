/**
 * The change's own records, read once and derived once.
 *
 * WHAT THIS MODULE IS FOR. The change's account reads one pull request: its four narration
 * levels, the scene art behind each one, the narration audio, the diagrams, and the diff.
 * Every one of those comes from a bundle file, and this module is the one place the
 * account asks for them. `sections.tsx`, `Frame.tsx`, and `Diff.tsx` read the answers and
 * derive nothing themselves.
 *
 * THE FOUR LEVELS ARE THE BUNDLE'S OWN KEYS, IN THE BUNDLE'S OWN ORDER. ADR-0029 renamed
 * the first key, and that rename landed with this slice, so the key list here and the
 * bundle's `levels` object agree. `CHANGE_LEVEL_KEY` in `sections.tsx` is the one mapping
 * from a row's word to one of these keys.
 *
 * A LEVEL THE BUNDLE DOES NOT HOLD STILL APPEARS. `changeLevelsOf` answers four levels
 * whatever the entry carries, and a level with no record reads an empty narration and no
 * art, no audio, and no drawing. The row above it then states that absence in place rather
 * than dropping the row, because a reader who cannot see a level cannot tell an absent
 * record from a level the account never built.
 *
 * THE ASSET PATHS ARE RELATIVE, AND THEY STAY RELATIVE. `BUNDLE_MOUNT` and
 * `BUNDLE_DATA_URL` are `../`'s, so the shipped file requests
 * `../assets/pr-{N}/level-{L}.webp` and `../data/audio/pr{N}_{level_key}.wav` exactly as
 * the file it replaces did. One bundle therefore serves both readers.
 */

import { useEffect, useState } from "react";

import {
  BUNDLE_DATA_URL,
  BUNDLE_MOUNT,
  loadDiagrams,
  loadDiff,
  loadManifest,
  loadStory,
} from "@/data/bundle";
import type { Manifest, Story, StoryEntry, StoryLevel } from "@/data/bundle";

/* ------------------------------------------------------------------- levels */

/** The bundle's four narration level keys, in the order the bundle writes them. */
export const LEVEL_KEYS = [
  "intent",
  "problem_solution",
  "architecture",
  "file_changes",
] as const;

export type LevelKey = (typeof LEVEL_KEYS)[number];

/** The four levels, in the order a reader reads them. */
export const LEVEL_TITLE: Record<LevelKey, string> = {
  intent: "Intent",
  problem_solution: "Problem & Solution",
  architecture: "Architecture",
  file_changes: "File changes",
};

/**
 * One narration level of one change, as the account needs it.
 *
 * `art`, `audio`, and `diagram` are null when the bundle holds none for this level, and
 * `voice` is the authored script that says the level was voiced. A level may carry a
 * `voice` and no audio file, because a bundle can record the script and lose the file, so
 * the two are separate fields and the surface states them apart.
 */
export interface ChangeLevel {
  /** 1 to 4. The position of the level's key in `LEVEL_KEYS`. */
  number: 1 | 2 | 3 | 4;
  key: LevelKey;
  title: string;
  narration: string;
  voice: string | null;
  /** The scene art URL, or null when the bundle holds no picture for this level. */
  art: string | null;
  /** The narration audio URL, or null when this level carries no voice script. */
  audio: string | null;
  /** The Mermaid source, or null when the bundle holds no drawing for this level. */
  diagram: string | null;
}

/**
 * The art a level carries, read from the manifest's own hero list.
 *
 * THE MANIFEST IS THE RECORD, AND THE FILENAME IS NOT. A surface that guessed
 * `assets/pr-{N}/level-{L}.webp` for every level would ask for a picture the bundle does
 * not hold, and the browser would report a failed request rather than an absent record.
 * `manifest.js` names the levels that carry art, so this reads that list.
 */
function artFor(manifest: Manifest | null, pr: number, number: number): string | null {
  const wanted = `pr-${pr}/level-${number}.webp`;
  if (!manifest?.hero?.includes(wanted)) return null;
  return `${BUNDLE_MOUNT}assets/${wanted}`;
}

/**
 * The four narration levels of one change.
 *
 * THE AUDIO ADDRESS IS DERIVED FROM THE VOICE SCRIPT, and the file itself is a separate
 * question. `data/audio/pr{N}_{level_key}.wav` is the path the bundle serves, so the level
 * key reaches a filename. The script says the level was voiced; `useServedAudio` says
 * whether the bundle still answers at that path.
 */
export function changeLevelsOf(
  entry: StoryEntry | null,
  story: Story | null,
  manifest: Manifest | null,
  diagrams: Record<string, string>,
): ChangeLevel[] {
  if (entry === null) return [];
  return LEVEL_KEYS.map((key, index) => {
    const number = (index + 1) as ChangeLevel["number"];
    const held: StoryLevel | undefined = entry.levels?.[key];
    const voice = typeof held?.voice === "string" && held.voice.length > 0 ? held.voice : null;
    const title = story?.meta?.levels?.[index];
    return {
      number,
      key,
      title: typeof title === "string" && title.length > 0 ? title : LEVEL_TITLE[key],
      narration: typeof held?.narration === "string" ? held.narration : "",
      voice,
      art: artFor(manifest, entry.pr, number),
      /* The audio path is the level's key, so the rename moved a paid file and re-recorded nothing. */
      audio: voice === null ? null : `${BUNDLE_DATA_URL}audio/pr${entry.pr}_${key}.wav`,
      diagram: diagrams[String(number)] ?? null,
    };
  });
}

/** The pull request's own timeline entry, or null when the bundle holds none. */
export function entryOf(story: Story | null, pr: number): StoryEntry | null {
  return story?.timeline?.find((entry) => entry.pr === pr) ?? null;
}

/* --------------------------------------------------------------------- diff */

export interface DiffFile {
  path: string;
  adds: number;
  dels: number;
  /** True when the diff carries no hunk, only a binary notice or a mode change. */
  binary: boolean;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  /** The `@@ ... @@` line, verbatim. */
  header: string;
  lines: Array<{ kind: "add" | "del" | "context"; text: string }>;
}

/**
 * One diff text, split into its hunks and counted.
 *
 * The counts come from the diff's own `+` and `-` lines, so they cannot disagree with the
 * hunks the surface draws under them.
 */
export function diffFile(path: string, text: string): DiffFile {
  const hunks: DiffHunk[] = [];
  let adds = 0;
  let dels = 0;
  let binary = false;
  let current: DiffHunk | null = null;

  for (const line of text.split("\n")) {
    if (line.startsWith("@@")) {
      current = { header: line, lines: [] };
      hunks.push(current);
      continue;
    }
    if (line.startsWith("Binary files ") || line.startsWith("GIT binary patch")) {
      binary = true;
      continue;
    }
    if (line.startsWith("diff --git ") || line.startsWith("index ") || line.startsWith("--- ")) {
      continue;
    }
    if (line.startsWith("+++ ") || line.startsWith("new file") || line.startsWith("deleted file")) {
      continue;
    }
    if (current === null) continue;
    if (line.startsWith("+")) {
      adds += 1;
      current.lines.push({ kind: "add", text: line.slice(1) });
    } else if (line.startsWith("-")) {
      dels += 1;
      current.lines.push({ kind: "del", text: line.slice(1) });
    } else if (line.startsWith(" ")) {
      current.lines.push({ kind: "context", text: line.slice(1) });
    }
  }

  return { path, adds, dels, binary, hunks };
}

/** Every file a diff holds, largest change first. */
export function diffFiles(diff: Record<string, string>): DiffFile[] {
  return Object.entries(diff)
    .map(([path, text]) => diffFile(path, text))
    .sort((a, b) => b.adds + b.dels - (a.adds + a.dels) || a.path.localeCompare(b.path));
}

/* ------------------------------------------------------------------ reading */

/**
 * What the change's account reads, and why it is absent when it is.
 *
 * `diff` is the fourth row's whole content, and `diffMessage` states why it is not there:
 * a pull request the manifest does not list carries no diff, and a listed one whose file
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

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The change's records, read once per pull request.
 *
 * THE DIFF IS MANIFEST-GATED, AND THAT IS NOT AN OPTIMISATION. `diffs-pr{N}.js` is read by
 * appending a script tag, and a tag for a file the bundle does not hold fails loudly: the
 * browser reports the missing resource, and the reader meets a broken page rather than a
 * stated absence. `manifest.js` names the pull requests that carry a diff, so this asks
 * only for one it holds and states the absence for every other.
 *
 * A FAILED READ OF THE STORY OR THE MANIFEST IS A STATED FAILURE. The entry, the levels,
 * the art, and the audio all come from those two files, so a page that cannot read them
 * renders no change's account and says why.
 */
export function useChangeBundle(pr: number | null): ChangeBundle {
  const [bundle, setBundle] = useState<ChangeBundle>(IDLE);

  useEffect(() => {
    if (pr === null) {
      setBundle(IDLE);
      return;
    }

    let live = true;
    setBundle({ ...IDLE, state: "loading" });

    Promise.all([
      loadStory(),
      /* A manifest the bundle lacks costs the art and the diff gate, and nothing else. */
      loadManifest().catch(() => null),
    ])
      .then(async ([story, manifest]) => {
        const entry = entryOf(story, pr);
        const diagrams = await loadDiagrams(pr).catch(() => ({}));

        let diff: Record<string, string> | null = null;
        let diffMessage: string | null = null;
        if (!(manifest?.diff_prs ?? []).includes(pr)) {
          diffMessage = "The bundle records no diff for this pull request.";
        } else {
          try {
            diff = await loadDiff(pr);
          } catch (error) {
            diffMessage = `The bundle lists a diff for this pull request, and it did not load: ${describe(error)}`;
          }
        }

        if (!live) return;
        setBundle({
          state: "ready",
          entry,
          levels: changeLevelsOf(entry, story, manifest, diagrams),
          diff,
          diffMessage,
          message:
            entry === null
              ? "The bundle holds no story entry for this pull request, so the change has no recorded narration."
              : null,
        });
      })
      .catch((error: unknown) => {
        if (!live) return;
        setBundle({ ...IDLE, state: "failed", message: describe(error) });
      });

    return () => {
      live = false;
    };
  }, [pr]);

  return bundle;
}

/* -------------------------------------------------------------- the audio */

/*
 * THE VOICE SCRIPT IS A PROMISE AND NOT THE FILE. A level carries a `voice` string when
 * the bundle records that it was voiced, and no file in the bundle lists the audio it
 * holds. So the record cannot separate a level whose audio was recorded from a level whose
 * audio file the bundle no longer carries.
 *
 * THE ACCOUNT ASKS THE BUNDLE, ONCE PER ADDRESS. A `HEAD` request answers whether a file
 * sits at the address. The ask is cached in this module, so a reader who walks the four
 * rows asks once per voiced level rather than once per row.
 *
 * WHY NOT A PRELOADING MEDIA ELEMENT. `<audio preload="metadata">` on a missing file
 * reports the missing resource to the console, and a reader meets a broken page rather
 * than a stated absence. The account states the absence instead, and it draws the control
 * only where the bundle answered.
 */
const audioAnswers = new Map<string, Promise<boolean>>();

function asksForAudio(url: string): Promise<boolean> {
  const held = audioAnswers.get(url);
  if (held) return held;
  const pending = fetch(url, { method: "HEAD" })
    .then((response) => response.ok)
    .catch(() => false);
  audioAnswers.set(url, pending);
  return pending;
}

/**
 * The audio addresses the bundle answers, keyed by address.
 *
 * An address with no entry is one the bundle has not answered yet, and a level reads that
 * as a question still open rather than as an absence.
 */
export function useServedAudio(levels: ChangeLevel[]): Record<string, boolean> {
  const [served, setServed] = useState<Record<string, boolean>>({});
  const asked = levels
    .map((level) => level.audio)
    .filter((url): url is string => url !== null);
  const signature = asked.join("|");

  useEffect(() => {
    const urls = signature === "" ? [] : signature.split("|");
    if (urls.length === 0) {
      setServed({});
      return;
    }
    let live = true;
    Promise.all(urls.map((url) => asksForAudio(url).then((ok) => [url, ok] as const))).then(
      (rows) => {
        if (live) setServed(Object.fromEntries(rows));
      },
    );
    return () => {
      live = false;
    };
  }, [signature]);

  return served;
}
