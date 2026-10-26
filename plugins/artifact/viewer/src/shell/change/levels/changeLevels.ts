import {
  BUNDLE_DATA_URL,
  BUNDLE_MOUNT,
  type Manifest,
  type Story,
  type StoryEntry,
  type StoryLevel,
} from "@/data/bundle";

import { LEVEL_KEYS, LEVEL_TITLE, type ChangeLevel, type LevelKey } from "./keys";

/**
 * The art a level carries, read from the manifest's own hero list.
 *
 * The manifest is the record, and the filename is not. A surface that guessed
 * `assets/pr-{N}/level-{L}.webp` for every level would ask for a picture the bundle does
 * not hold, and the browser would report a failed request rather than an absent record.
 */
function artFor(manifest: Manifest | null, pr: number, number: number): string | null {
  const wanted = `pr-${pr}/level-${number}.webp`;
  if (!manifest?.hero?.includes(wanted)) return null;
  return `${BUNDLE_MOUNT}assets/${wanted}`;
}

function voiceOf(held: StoryLevel | undefined): string | null {
  return typeof held?.voice === "string" && held.voice.length > 0 ? held.voice : null;
}

function titleOf(story: Story | null, key: LevelKey, index: number): string {
  const title = story?.meta?.levels?.[index];
  return typeof title === "string" && title.length > 0 ? title : LEVEL_TITLE[key];
}

function audioFor(voice: string | null, pr: number, key: LevelKey): string | null {
  /* The audio path is the level's key, so the rename moved a paid file and re-recorded nothing. */
  return voice === null ? null : `${BUNDLE_DATA_URL}audio/pr${pr}_${key}.wav`;
}

interface LevelSource {
  entry: StoryEntry;
  story: Story | null;
  manifest: Manifest | null;
  diagrams: Record<string, string>;
}

function assetsOf(source: LevelSource, key: LevelKey, voice: string | null) {
  const { entry, manifest, diagrams } = source;
  const number = LEVEL_KEYS.indexOf(key) + 1;
  return {
    art: artFor(manifest, entry.pr, number),
    audio: audioFor(voice, entry.pr, key),
    diagram: diagrams[String(number)] ?? null,
  };
}

function levelAt(source: LevelSource, key: LevelKey, index: number): ChangeLevel {
  const held: StoryLevel | undefined = source.entry.levels?.[key];
  const voice = voiceOf(held);
  const number = (index + 1) as ChangeLevel["number"];
  const title = titleOf(source.story, key, index);
  const narration = typeof held?.narration === "string" ? held.narration : "";
  return { number, key, title, narration, voice, ...assetsOf(source, key, voice) };
}

/**
 * The four narration levels of one change.
 *
 * The audio address derives from the voice script, and the file is a separate question.
 * The script says the level was voiced, and `useServedAudio` says whether the bundle
 * still answers at `data/audio/pr{N}_{level_key}.wav`.
 */
export function changeLevelsOf(
  ...[entry, story, manifest, diagrams]: [
    StoryEntry | null,
    Story | null,
    Manifest | null,
    Record<string, string>,
  ]
): ChangeLevel[] {
  if (entry === null) return [];
  const source = { entry, story, manifest, diagrams };
  return LEVEL_KEYS.map((key, index) => levelAt(source, key, index));
}

export function entryOf(story: Story | null, pr: number): StoryEntry | null {
  return story?.timeline?.find((entry) => entry.pr === pr) ?? null;
}
