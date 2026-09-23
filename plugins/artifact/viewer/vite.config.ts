import { createReadStream, existsSync, readlinkSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const viewerDir = fileURLToPath(new URL(".", import.meta.url));
/** plugins/artifact/viewer -> the repository root that holds .cobuilder-architect/. */
const repoRoot = resolve(viewerDir, "..", "..", "..");

/**
 * The bundle the dev server reads. `.cobuilder-architect/active` is a symlink that
 * holds the absolute path of the bundle in use, so it wins when it exists. The
 * self-bundle is the fallback, and it is the only bundle this repository needs.
 */
function bundleRoot(): string {
  const link = join(repoRoot, ".cobuilder-architect", "active");
  if (existsSync(link)) {
    try {
      return readlinkSync(link);
    } catch {
      /* A broken link falls through to the self-bundle below. */
    }
  }
  return join(repoRoot, ".cobuilder-architect", "self");
}

const MIME: Record<string, string> = {
  ".json": "application/json; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".wav": "audio/wav",
  ".yaml": "text/yaml; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mmd": "text/plain; charset=utf-8",
};

const MOUNT = "/bundle/";

/**
 * Serves one real bundle tree at /bundle/ during development.
 *
 * The served viewer reaches its data as sibling `<script src="../data/*.js">` tags,
 * because it is committed inside the bundle. This application lives outside every
 * bundle, so the dev server needs a reader. The mount is the bundle root, not the
 * data directory, so the same path also reaches `assets/pr-N/level-L.png` and the
 * narration audio under `data/audio/`.
 *
 * Read-only, serve-only, and there is no equivalent in the build: a published
 * Artifact inlines its data, per ADR-0001.
 */
function bundleData(): Plugin {
  return {
    name: "cobuilder-bundle-data",
    apply: "serve",
    configureServer(server) {
      const root = bundleRoot();
      server.config.logger.info(
        `  bundle-data  ${MOUNT} -> ${root}`,
      );
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith(MOUNT)) {
          next();
          return;
        }
        const rel = decodeURIComponent(url.slice(MOUNT.length).split("?")[0]);
        const target = normalize(join(root, rel));
        if (!target.startsWith(root + sep) || !existsSync(target)) {
          res.statusCode = 404;
          res.end(`no such bundle file: ${rel}`);
          return;
        }
        const stat = statSync(target);
        if (stat.isDirectory()) {
          res.statusCode = 404;
          res.end(`${rel} is a directory`);
          return;
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", MIME[extname(target)] ?? "application/octet-stream");
        res.setHeader("Content-Length", String(stat.size));
        res.setHeader("Cache-Control", "no-store");
        createReadStream(target).pipe(res);
      });
    },
  };
}

export default defineConfig({
  // The React sources live in src/ and the dev entry is src/index.html. The
  // packaged viewer at viewer/index.html is a shipped artifact and is not the
  // Vite entry, so no Vite command can overwrite it.
  root: "src",
  plugins: [react(), tailwindcss(), bundleData(), viteSingleFile()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5273,
    // `/@fs/` requests and any absolute path the app asks for must resolve inside
    // the repository, because the bundle sits above the Vite root.
    fs: {
      allow: [repoRoot],
    },
  },
  build: {
    // Not viewer/index.html. ADR-0023's output rule is under revision, and the
    // shipped file must keep working while that is settled. This output is a
    // scratch build, and it is not committed. `src/data/bundle.ts` holds the
    // note on how a published single file would read its data.
    outDir: "../dist",
    emptyOutDir: true,
    sourcemap: false,
    target: "es2022",
  },
});
