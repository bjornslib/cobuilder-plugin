/**
 * The dev-only entry for the Work drawer, prototype A.
 *
 * This page exists so the prototype is reviewable without wiring it into the
 * shell. The dev server is Vite-rooted at `src/`, so the page serves at:
 *
 *   http://localhost:5273/variations/work-drawer/dev.html
 *
 * Nothing in the shipped graph imports this directory, and the build's one
 * entry stays `src/index.html`. This page is a development aid; the shipped
 * viewer is `plugins/artifact/viewer/index.html`.
 *
 * The prototype carries its own `h-dvh` frame, because the harness renders it
 * in a fixed frame rather than a page-scrolling one. So this file mounts it
 * and adds nothing.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import WorkDrawer from "./index";
import "../../index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("#root is missing from dev.html");
}

createRoot(container).render(
  <StrictMode>
    <WorkDrawer />
  </StrictMode>,
);