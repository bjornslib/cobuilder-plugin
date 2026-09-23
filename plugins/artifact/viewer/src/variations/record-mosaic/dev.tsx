/**
 * A dev-only entry for variation C, so the mosaic renders in a browser without an
 * edit to `App.tsx`.
 *
 * `src/variations/record-mosaic/index.tsx` holds the variation and exports it as the
 * default component. This file only mounts that component on a page of its own, and
 * the dev server serves it at:
 *
 *   http://localhost:5273/variations/record-mosaic/dev.html
 *
 * Two query parameters make the load states reachable for review. They are declared
 * in the header of `index.tsx`:
 *
 *   ?records=slow    holds the loading state for three seconds
 *   ?records=error   fails the record read on purpose
 *
 * A note on the styles. A dev server that started before `src/variations/` existed
 * serves a stylesheet that Tailwind built from the files it had then, so every
 * utility class that appears only in a variation is missing from the page. A restart
 * of the dev server, or a change to any file the old scan covered, rebuilds it. To
 * check this variation's layout without a restart, append a link to the fresh
 * transform of the stylesheet and reload:
 *
 *   const link = document.createElement("link");
 *   link.rel = "stylesheet";
 *   link.href = "/index.css?direct";
 *   document.head.appendChild(link);
 *
 * This page is a development aid. The shipped surface is the component, not this file.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../../index.css";
import RecordMosaic from "./index";

const container = document.getElementById("root");
if (!container) {
  throw new Error("#root is missing from dev.html");
}

createRoot(container).render(
  <StrictMode>
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <div className="flex flex-col gap-1.5 px-4 pt-5">
        <h1 className="m-0 font-mono text-[26px] leading-[1.2] font-bold tracking-[-0.02em]">
          CoBuilder viewer <span className="text-ink-faint">&middot;</span> Work{" "}
          <span className="text-ink-faint">&middot;</span> Record mosaic
        </h1>
        <p className="m-0 max-w-[92ch] font-serif text-[17px] leading-[1.6] text-ink-mid">
          Variation C of the Work board detail view. The board lists every design behind
          five lane tabs, and a design opens into a mosaic of ten tiles, one per record
          kind. Every tile carries that record's own state, and an absent record keeps
          its tile and names what is missing.
        </p>
        <p className="m-0 max-w-[92ch] font-serif text-[15.5px] leading-[1.55] text-ink-dim">
          This page is a development aid for the variation. Add{" "}
          <code className="rounded bg-surface-2 px-1 font-mono text-[14px]">
            ?records=error
          </code>{" "}
          or{" "}
          <code className="rounded bg-surface-2 px-1 font-mono text-[14px]">
            ?records=slow
          </code>{" "}
          to the URL to see the two load states.
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <RecordMosaic />
      </div>
    </div>
  </StrictMode>,
);
