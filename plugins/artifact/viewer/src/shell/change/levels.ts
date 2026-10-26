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

export { LEVEL_KEYS, LEVEL_TITLE } from "./levels/keys";
export type { ChangeLevel, LevelKey } from "./levels/keys";
export { changeLevelsOf, entryOf } from "./levels/changeLevels";
export { diffFile, diffFiles } from "./levels/diff";
export type { DiffFile, DiffHunk } from "./levels/diff";
export { useChangeBundle } from "./levels/bundle";
export type { ChangeBundle } from "./levels/bundle";
export { useServedAudio } from "./levels/audio";
