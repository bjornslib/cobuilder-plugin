import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import Shell from "./shell/App";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("#root is missing from src/index.html");
}

createRoot(container).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
);
