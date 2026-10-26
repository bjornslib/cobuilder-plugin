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
 * `import.meta.url` is not a file URL under this package's jsdom runner, so the code walks
 * up the path. The walk also holds when the runner starts from the repository root.
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

const DESIGNS_DIR = join(repoRoot(), "docs", "architecture", "designs");

export interface SparseDesign {
  id: string;
  goal: DesignGoal;
}

export function authoredFiles(id: string): string[] {
  return readdirSync(join(DESIGNS_DIR, id))
    .filter((name) => statSync(join(DESIGNS_DIR, id, name)).isFile())
    .sort();
}

/**
 * The directory name is the design id, the key that the index entity and the route both
 * use. The list comes from disk, not from names in this file.
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
