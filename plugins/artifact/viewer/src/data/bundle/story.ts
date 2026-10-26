import { cachedScript } from "./readers";
import type { Story } from "./storyTypes";

/* ---------------------------------------------- the remaining four globals */

/*
 * WHAT THESE FOUR READERS ARE FOR, AND WHO CONSUMES THEM TODAY.
 *
 * No shipped surface reads a narration, a diagram, a hero picture, or a diff hunk yet.
 * `docs/plans/cobuilder-viewer/04-slices.md` gives those to slices 15 and 16, which add
 * the pull request's art, audio, and diffs. The four readers live here because the data
 * module is the one place under `src/` that names a bundle global: a second reader
 * beside the surface that needs one is how two files come to disagree about a file's
 * shape.
 *
 * Each type below is narrowed to what its reader validates, and a slice that needs more
 * widens the type where the record is declared.
 */

function isStory(value: unknown): value is Story {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as Story).timeline)
  );
}

/** The narrated timeline, and the world districts beside it. */
export const loadStory = cachedScript("story.js", "STORY", isStory);
