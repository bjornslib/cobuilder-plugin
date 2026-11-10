/**
 * The dev server mounts one bundle tree at `/bundle/`, declared in `vite.config.ts`. The
 * shipped file is committed inside a bundle at `viewer/index.html`, so its bundle root is
 * the directory above it and its data sits at `../data/`.
 *
 * `import.meta.env.DEV` is resolved while the build runs, so the build ships one path and
 * drops the other, and no runtime guess decides which reader is in play.
 */
export const BUNDLE_MOUNT = import.meta.env.DEV ? "/bundle/" : "../";
export const BUNDLE_DATA_URL = `${BUNDLE_MOUNT}data/`;

const SERVER_HINT =
  "Check that the bundle exists at .cobuilder-architect/self/ and that " +
  "npm run dev is the server you are reading.";

type Check<T> = (value: unknown) => value is T;

/**
 * The name is a parameter, and every caller passes a literal on purpose: a caller that
 * writes the name states which global it reads, so one search for a name finds every
 * reader of it. No file outside `src/data/` names a global.
 *
 * The value is checked rather than trusted. A file that loaded and assigned nothing
 * useful reads as absent, and the reader that needed it says so.
 */
export function readGlobal<T>(
  globalName: string,
  looksRight: Check<T>,
): T | undefined {
  const value = (window as unknown as Record<string, unknown>)[globalName];
  return looksRight(value) ? value : undefined;
}

/**
 * The tag below is the served path, and it reaches outside the built file for a sibling.
 * A published Artifact inlines the global as a literal, so `export_artifact.py` deletes
 * this code. The pair that names it sits in `src/index.html`'s seam block, because no
 * `.ts` module here can carry a `//` comment through the build.
 *
 * A file the server does not serve rejects with the path and the likely cause, so a
 * surface states the reason rather than showing an empty panel.
 */
export function appendScript(url: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = url;
    tag.async = true;
    tag.onload = () => resolve();
    tag.onerror = () => reject(new Error(missingScriptMessage(url)));
    document.head.appendChild(tag);
  });
}

export function missingScriptMessage(url: string): string {
  return `The dev server did not serve ${url}. ${SERVER_HINT}`;
}

export function missingIndexMessage(status: number): string {
  return `The dev server returned ${status} for ${BUNDLE_DATA_URL}index.json. ${SERVER_HINT}`;
}

function assignedGlobal<T>(url: string, globalName: string, looksRight: Check<T>): T {
  const loaded = readGlobal(globalName, looksRight);
  if (loaded) return loaded;
  throw new Error(
    `${url} loaded but assigned no window.${globalName}. The file is a ` +
      `sibling under data/, and it assigns exactly one global.`,
  );
}

export function readScriptGlobal<T>(
  url: string,
  globalName: string,
  looksRight: Check<T>,
): Promise<T> {
  const inlined = readGlobal(globalName, looksRight);
  if (inlined) return Promise.resolve(inlined);
  return appendScript(url).then(() => assignedGlobal(url, globalName, looksRight));
}

export function cachedReader<T>(read: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () => {
    if (!pending) {
      pending = read().catch((error: unknown) => {
        pending = null;
        throw error;
      });
    }
    return pending;
  };
}

export function cachedScript<T>(
  file: string,
  globalName: string,
  looksRight: Check<T>,
): () => Promise<T> {
  return cachedReader(() => readScriptGlobal(`${BUNDLE_DATA_URL}${file}`, globalName, looksRight));
}
