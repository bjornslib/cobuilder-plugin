import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import Variations from "./Variations";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("#root is missing from src/index.html");
}

// The Work board is under structural review. Variations is the comparison
// shell for that decision. When one arrangement is chosen, this becomes the
// Work surface and the shell goes.
createRoot(container).render(
  <StrictMode>
    <Variations />
  </StrictMode>,
);
