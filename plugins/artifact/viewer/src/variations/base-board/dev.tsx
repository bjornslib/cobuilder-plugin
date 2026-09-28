/**
 * The dev-only entry for the base board, the first Work board prototype.
 *
 * THE PROTOTYPE ITSELF IS `src/App.tsx`, one directory above this one. The comparison
 * harness used to render it as its `Base` option, and the harness is gone: slice 4 of
 * cobuilder-viewer removes the harness route from `src/shell/App.tsx`, so nothing in the
 * shipped graph imports this board and nothing imports the harness. This page is what
 * keeps the prototype reachable for review. The dev server serves it at:
 *
 *   http://localhost:5273/variations/base-board/dev.html
 *
 * The dev server is Vite-rooted at `src/`, so this page's URL is its path below `src/`.
 * Nothing in the build reaches this file: `vite.config.ts` names no `rollupOptions.input`,
 * so the build's one entry stays `src/index.html`, and this page is served in development
 * and never packaged.
 *
 * The board brings its own `h-dvh` frame, because the harness rendered it in a
 * page-scrolling frame rather than a fixed one. So this file mounts it and adds nothing.
 *
 * This page is a development aid. The shipped viewer is
 * `plugins/artifact/viewer/index.html`, which this file never touches.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../../index.css";
import Board from "../../App";

const container = document.getElementById("root");
if (!container) {
  throw new Error("#root is missing from dev.html");
}

createRoot(container).render(
  <StrictMode>
    <Board />
  </StrictMode>,
);
