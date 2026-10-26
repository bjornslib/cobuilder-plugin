/**
 * The change's own records, read once and derived once.
 *
 * This module is the one place the change's account asks the bundle for its four
 * narration levels, the scene art, the audio, the diagrams, and the diff. `sections.tsx`,
 * `Frame.tsx`, and `Diff.tsx` read the answers and derive nothing themselves.
 *
 * The four levels use the bundle's own keys in the bundle's own order. ADR-0029 renamed
 * the first key, so the key list here and the bundle's `levels` object agree.
 * `CHANGE_LEVEL_KEY` in `sections.tsx` is the one mapping from a row's word to a key.
 *
 * A level the bundle does not hold still appears. `changeLevelsOf` answers four levels
 * whatever the entry carries, and a missing level reads an empty narration and no art,
 * audio, or drawing. The row states that absence in place rather than dropping the row,
 * because a reader who cannot see a level cannot tell an absent record from a level the
 * account never built.
 *
 * The asset paths stay relative. `BUNDLE_MOUNT` and `BUNDLE_DATA_URL` are `../`, so the
 * shipped file requests `../assets/pr-{N}/level-{L}.webp` and
 * `../data/audio/pr{N}_{level_key}.wav`, exactly as the file it replaces did. One bundle
 * therefore serves both readers.
 */

export { LEVEL_KEYS, LEVEL_TITLE } from "./levels/keys";
export type { ChangeLevel, LevelKey } from "./levels/keys";
export { changeLevelsOf, entryOf } from "./levels/changeLevels";
export { diffFile, diffFiles } from "./levels/diff";
export type { DiffFile, DiffHunk } from "./levels/diff";
export { useChangeBundle } from "./levels/bundle";
export type { ChangeBundle } from "./levels/bundle";
export { useServedAudio } from "./levels/audio";
