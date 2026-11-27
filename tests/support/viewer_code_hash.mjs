// Usage: node viewer_code_hash.mjs <viewer-dir>
// Prints a JSON map from each viewer path to the sha256 of its minified output.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";

const viewer = resolve(process.argv[2]);
const { transformSync } = createRequire(join(viewer, "package.json"))("esbuild");

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function isViewerCode(path) {
  const rel = relative(viewer, path);
  const inSrc = rel.startsWith("src/") && /\.tsx?$/.test(rel);
  return inSrc || /^vite[^/]*\.ts$/.test(rel);
}

function minifiedHash(path) {
  const loader = path.endsWith(".tsx") ? "tsx" : "ts";
  const options = { loader, minify: true, legalComments: "none" };
  const { code } = transformSync(readFileSync(path, "utf8"), options);
  return createHash("sha256").update(code).digest("hex");
}

const files = [...walk(join(viewer, "src")), ...readdirSync(viewer).map((n) => join(viewer, n))]
  .filter((path) => statSync(path).isFile() && isViewerCode(path))
  .sort();
const hashes = Object.fromEntries(files.map((p) => [relative(viewer, p), minifiedHash(p)]));
console.log(JSON.stringify(hashes, null, 2));
