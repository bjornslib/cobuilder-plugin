/**
 * The development harness for this variation. It is not part of the variation, and
 * nothing in the application imports it.
 *
 * It exists for one reason: `src/App.tsx` belongs to another workstream and may not
 * be wired to this variation yet, so a reviewer needs a way to open it. It serves at
 * `/variations/lens-mosaic/preview.html` under the running dev server, which is
 * Vite-rooted at `src/`. It writes no file outside this directory.
 *
 * It adds three things a product surface should not carry:
 *
 *   Jump buttons, so the three named states open in one click.
 *   A load simulator, so the loading and error states are visible without stopping
 *     the server or renaming the bundle.
 *   A note that says all of the above is harness-only.
 */

import { useState } from "react";
import { createRoot } from "react-dom/client";

import LensMosaic from "./index";
import "../../index.css";

const JUMPS: Array<[string, string]> = [
  ["cobuilder-viewer", "Populated: 18 epics, six of six lenses"],
  ["inflight-record-store", "Sparse: four of six lenses disabled"],
  ["react-viewer", "Superseded: says what replaced it"],
  ["plugin-split", "Slices: 8 epics, 14 slices with scores"],
];

type Simulation = "none" | "slow" | "error";

function Harness() {
  const [design, setDesign] = useState<string | null>("cobuilder-viewer");
  const [simulation, setSimulation] = useState<Simulation>("none");

  return (
    <div className="flex h-dvh flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface-3 px-4 py-2.5">
        <span className="font-mono text-[12px] font-bold tracking-[0.08em] text-warn uppercase">
          preview harness
        </span>
        <span className="font-mono text-[12.5px] text-ink-dim">
          not part of the variation
        </span>

        <span className="flex flex-wrap items-center gap-1.5">
          {JUMPS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              title={label}
              onClick={() => {
                setSimulation("none");
                setDesign(id);
              }}
              className={`cursor-pointer rounded-md border px-2 py-1 font-mono text-[12.5px] font-bold transition-colors duration-150 ease-house focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                design === id
                  ? "border-primary bg-accent-wash text-accent-deep"
                  : "border-line bg-card text-ink-mid hover:bg-surface-2"
              }`}
            >
              {id}
            </button>
          ))}
        </span>

        <span className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[12.5px] text-ink-dim">load state:</span>
          {(
            [
              ["none", "real"],
              ["slow", "slow"],
              ["error", "error"],
            ] as Array<[Simulation, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSimulation(value)}
              className={`cursor-pointer rounded-md border px-2 py-1 font-mono text-[12.5px] font-bold transition-colors duration-150 ease-house focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                simulation === value
                  ? "border-primary bg-accent-wash text-accent-deep"
                  : "border-line bg-card text-ink-mid hover:bg-surface-2"
              }`}
            >
              {label}
            </button>
          ))}
        </span>

        <button
          type="button"
          onClick={() => {
            setSimulation("none");
            setDesign(null);
          }}
          className="cursor-pointer rounded-md border border-line bg-card px-2 py-1 font-mono text-[12.5px] font-bold text-ink-mid transition-colors duration-150 ease-house hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          the lane board
        </button>
      </div>

      <div className="min-h-0 flex-1">
        <LensMosaic
          initialDesignId={design}
          loadOverride={simulation === "none" ? null : simulation}
        />
      </div>
    </div>
  );
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("#root is missing from preview.html");
}

createRoot(container).render(<Harness />);
