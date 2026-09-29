/**
 * The dev-only entry for the Work drawer, prototype B: the day deck.
 *
 * This page exists so the prototype is reviewable without wiring it into the
 * shell. The dev server is Vite-rooted at `src/`, so the page serves at:
 *
 *   http://localhost:5273/variations/work-drawer-deck/dev.html
 *
 * Nothing in the shipped graph imports this directory, and the build's one
 * entry stays `src/index.html`. This page is a development aid; the shipped
 * viewer is `plugins/artifact/viewer/index.html`.
 *
 * The page ships light, so the comparison with prototype A is a comparison of
 * arrangements and not of themes: the deck differs from A in its dense rows,
 * its state filter, and its collapsible lanes, and a reader should see those
 * against the same ground. `data-theme="light"` on `<html>` is the one switch.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import WorkDeck from "./index";
import "../../index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("#root is missing from dev.html");
}

createRoot(container).render(
  <StrictMode>
    <WorkDeck />
  </StrictMode>,
);