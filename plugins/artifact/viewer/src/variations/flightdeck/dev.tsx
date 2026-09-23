/**
 * The dev-only entry for the FlightDeck prototype.
 *
 * It exists for one reason: this variation is deliberately absent from the shipped
 * graph. `src/shell/App.tsx` is the entry the build reaches, and no file below it imports
 * this variation, so none of this prototype's code travels into the shipped
 * `plugins/artifact/viewer/index.html`. Slice 14 of cobuilder-viewer gives the prototype
 * a page of its own for exactly that reason, and slice 4 gave every other variation the
 * same treatment. The dev server serves this one at:
 *
 *   http://localhost:5273/variations/flightdeck/dev.html
 *
 * The dev server is Vite-rooted at `src/`, so this page's URL is its path below `src/`.
 * Nothing in the build reaches this file: `vite.config.ts` names no `rollupOptions.input`,
 * so the build's one entry stays `src/index.html`, and this page is served in development
 * and never packaged.
 *
 * One query parameter is read:
 *
 *   ?pr=6   points the single mode at another pull request in the bundle. Its default is
 *           PR 2, which is the first entry in `.cobuilder-architect/self/` to carry both
 *           an intent block and an assessment block. Every other pull request in this
 *           bundle carries neither, so the sheet states that absence rather than opening
 *           empty.
 *
 * This page is a development aid. The surface is `./index`, and the shipped viewer is
 * `plugins/artifact/viewer/index.html`, which this file never touches.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../../index.css";
import FlightDeck from "./index";

const container = document.getElementById("root");
if (!container) {
  throw new Error("#root is missing from dev.html");
}

const asked = new URLSearchParams(window.location.search).get("pr");
const pr = asked !== null && Number.isInteger(Number(asked)) ? Number(asked) : 2;

createRoot(container).render(
  <StrictMode>
    <FlightDeck pr={pr} />
  </StrictMode>,
);
