/**
 * The dev-only entry for variation E, the sections shell.
 *
 * It exists for one reason: this variation is deliberately absent from the shipped
 * graph. `src/Variations.tsx` used to import every variation statically and
 * `src/shell/App.tsx` imported that harness, so the harness was what carried a variation
 * into the shipped `plugins/artifact/viewer/index.html`. Slice 4 of cobuilder-viewer
 * removes that route, so each variation gets a page of its own instead. The dev server
 * serves this one at:
 *
 *   http://localhost:5273/variations/sections-e/dev.html
 *
 * The dev server is Vite-rooted at `src/`, so this page's URL is its path below `src/`.
 * Nothing in the build reaches this file: `vite.config.ts` names no `rollupOptions.input`,
 * so the build's one entry stays `src/index.html`, and this page is served in development
 * and never packaged.
 *
 * THIS VARIATION OWNS THE WHOLE VIEWPORT, and the document never scrolls inside it. The
 * harness used to supply that frame, so the frame lives here now, with the same two
 * classes the harness gave it: `h-dvh` on the frame and a `min-h-0 flex-1 overflow-hidden`
 * box around the shell. The shell reads its own route from the hash, below its own name:
 *
 *   #/sections-e/<workId>/<section>   one work item at one level
 *   #/                               the board
 *
 * A work item the bundle holds is `cobuilder-viewer` or `inflight-record-store`.
 *
 * This page is a development aid. The surface is `./index`, and the shipped viewer is
 * `plugins/artifact/viewer/index.html`, which this file never touches.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../../index.css";
import SectionsE from "./index";

const container = document.getElementById("root");
if (!container) {
  throw new Error("#root is missing from dev.html");
}

createRoot(container).render(
  <StrictMode>
    <div className="relative flex h-dvh flex-col overflow-hidden bg-ground text-ink">
      <div className="min-h-0 flex-1 overflow-hidden">
        <SectionsE />
      </div>
    </div>
  </StrictMode>,
);
