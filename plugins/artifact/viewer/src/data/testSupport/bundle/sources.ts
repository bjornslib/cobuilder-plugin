import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import type { SourceFile } from "./ranges";

/**
 * This file's own directory, as a plain path. `new URL("..", import.meta.url)` is not used,
 * because Vite rewrites that exact shape into an asset reference that is not a file URL.
 */
const HERE = decodeURIComponent(import.meta.url.replace(/^file:\/\//, "")).replace(/\/[^/]+$/, "");
/** This file sits at `src/data/testSupport/bundle/`, so three steps up is `src/`. */
export const SRC_ROOT = join(HERE, "..", "..", "..");
const VIEWER_ROOT = join(SRC_ROOT, "..");
/** The committed self bundle, the corpus the app reads. */
export const BUNDLE_DATA = join(VIEWER_ROOT, "..", "..", "..", ".cobuilder-architect", "self", "data");

function walk(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(full));
    else if (/\.tsx?$/.test(entry.name)) found.push(full);
  }
  return found;
}

export const ALL_SOURCES: SourceFile[] = walk(SRC_ROOT)
  .filter((file) => !/\.test\.tsx?$|[\\/]testSupport[\\/]/.test(file))
  .map((file) => ({ path: relative(join(SRC_ROOT, ".."), file), text: readFileSync(file, "utf8") }));

export const DATA_SOURCES = ALL_SOURCES.filter((file) => file.path.startsWith("src/data/"));

/** Every source file under `src/` that is not the data module. */
export const OUTSIDE_SOURCES = ALL_SOURCES.filter((file) => !file.path.startsWith("src/data/"));
