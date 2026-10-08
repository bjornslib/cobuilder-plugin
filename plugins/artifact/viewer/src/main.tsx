import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import Shell from "./shell/App";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("#root is missing from src/index.html");
}

/*
 * The shell is the shipped surface. It answers `#/` with the Work board and every work
 * item the bundle holds. The prototypes that once sat under `src/variations/` were
 * removed on 2026-10-08. None of them reached the built file.
 */
createRoot(container).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
);
