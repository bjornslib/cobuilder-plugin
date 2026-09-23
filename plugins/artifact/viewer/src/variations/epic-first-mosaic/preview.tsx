import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../../index.css";
import EpicFirstMosaic from "./index";

/**
 * The development harness for this variation.
 *
 * Vite's root is `src/`, so `preview.html` serves this module at
 * `/variations/epic-first-mosaic/preview.html`. It exists so an engineer can open the
 * variation on its own, without the host application's shell around it.
 *
 * The shipped application renders `./index` directly and does not use this file. Both
 * read the same two bundle files, through the same loader, so the two agree.
 */
const container = document.getElementById("root");
if (!container) {
  throw new Error("#root is missing from preview.html");
}

createRoot(container).render(
  <StrictMode>
    <EpicFirstMosaic />
  </StrictMode>,
);
