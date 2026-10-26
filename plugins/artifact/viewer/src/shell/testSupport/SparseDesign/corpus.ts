import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

import type { DesignGoal } from "@/data/bundle";

function noRootError(): Error {
  return new Error(
    `No docs/architecture/designs above ${process.cwd()}, so this file cannot read ` +
      "this repository's own sparse designs.",
  );
}

/**
 * This repository's root: the nearest directory above the runner that carries the
 * authored designs.
 *
 * `import.meta.url` is not a file URL under this package's jsdom runner, so the path is
 * walked rather than computed. The walk also holds when the runner starts from the
 * repository root instead of from this package.
 */
function repoRoot(): string {
  let dir = process.cwd();
  for (;;) {
    if (existsSync(join(dir, "docs", "architecture", "designs"))) return dir;
    const above = dirname(dir);
    if (above === dir) throw noRootError();
    dir = above;
  }
}

/** This repository's authored designs. */
const DESIGNS_DIR = join(repoRoot(), "docs", "architecture", "designs");

/** One sparse design: the id its index entity carries, and its authored goal record. */
export interface SparseDesign {
  id: string;
  goal: DesignGoal;
}

/** The file names one design's own authored directory holds, sorted. */
export function authoredFiles(id: string): string[] {
  return readdirSync(join(DESIGNS_DIR, id))
    .filter((name) => statSync(join(DESIGNS_DIR, id, name)).isFile())
    .sort();
}

/**
 * Every design in this repository whose authored directory holds `goal.json` alone.
 *
 * This is the slice's own subject, read from disk rather than named here. The directory
 * name is the design id, which is the key the index's design entity and the route both use.
 */
export const SPARSE: SparseDesign[] = readdirSync(DESIGNS_DIR)
  .filter((name) => statSync(join(DESIGNS_DIR, name)).isDirectory())
  .filter((name) => {
    const files = authoredFiles(name);
    return files.length === 1 && files[0] === "goal.json";
  })
  .sort()
  .map((id) => ({
    id,
    goal: JSON.parse(readFileSync(join(DESIGNS_DIR, id, "goal.json"), "utf8")) as DesignGoal,
  }));
