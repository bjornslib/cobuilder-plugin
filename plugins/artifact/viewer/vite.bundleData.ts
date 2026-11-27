import { createReadStream, existsSync, readlinkSync, statSync, type Stats } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const viewerDir = fileURLToPath(new URL(".", import.meta.url));
export const repoRoot = resolve(viewerDir, "..", "..", "..");

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

function reply(res: ServerResponse, status: number, body: string): void {
  res.statusCode = status;
  res.end(body);
}

function existingTarget(root: string, rel: string): string | null {
  const target = normalize(join(root, rel));
  return target.startsWith(root + sep) && existsSync(target) ? target : null;
}

function sendFile(res: ServerResponse, target: string, stat: Stats): void {
  res.statusCode = 200;
  res.setHeader("Content-Type", MIME[extname(target)] ?? "application/octet-stream");
  res.setHeader("Content-Length", String(stat.size));
  res.setHeader("Cache-Control", "no-store");
  createReadStream(target).pipe(res);
}

function serveFile(res: ServerResponse, root: string, rel: string): void {
  const target = existingTarget(root, rel);
  if (target === null) return reply(res, 404, `no such bundle file: ${rel}`);
  const stat = statSync(target);
  if (stat.isDirectory()) return reply(res, 404, `${rel} is a directory`);
  sendFile(res, target, stat);
}

function bundleHandler(root: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const url = req.url ?? "";
    if (!url.startsWith(MOUNT)) {
      next();
      return;
    }
    const rel = decodeURIComponent(url.slice(MOUNT.length).split("?")[0]);
    serveFile(res, root, rel);
  };
}

/**
 * Serves one real bundle tree at /bundle/ during development.
 *
 * The committed viewer reaches its data as sibling `<script src="../data/*.js">` tags
 * inside the bundle, but this application lives outside every bundle, so the dev server
 * needs a reader. The mount is the bundle root, not the data directory, so the path also
 * reaches `assets/pr-N/level-L.png` and the narration audio under `data/audio/`.
 *
 * Serve-only: the build has no equivalent, because a published Artifact inlines its
 * data, per ADR-0001.
 */
export function bundleData(): Plugin {
  return {
    name: "cobuilder-bundle-data",
    apply: "serve",
    configureServer(server) {
      const root = bundleRoot();
      server.config.logger.info(`  bundle-data  ${MOUNT} -> ${root}`);
      server.middlewares.use(bundleHandler(root));
    },
  };
}
