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
 * item the bundle holds. The comparison harness stays reachable at `#/variations`, so
 * the prototype can still be read beside the arrangement it argued for.
 */
createRoot(container).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
);
