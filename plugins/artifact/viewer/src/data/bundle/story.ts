import { cachedScript } from "./readers";
import type { Story } from "./storyTypes";

/*
 * The readers of the narration, the diagrams, the hero art, and the diffs live in the
 * data module because it is the one place under `src/` that names a bundle global. A
 * second reader beside the surface that needs one is how two files come to disagree
 * about a file's shape.
 *
 * Each type is narrowed to what its reader validates, and a slice that needs more
 * widens the type where the record is declared.
 */

function isStory(value: unknown): value is Story {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as Story).timeline)
  );
}

export const loadStory = cachedScript("story.js", "STORY", isStory);
