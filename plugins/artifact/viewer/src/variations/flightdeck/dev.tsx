/**
 * The dev-only entry for the FlightDeck prototype, and it now serves two surfaces.
 *
 * WHY THIS FILE EXISTS AT ALL. This variation is deliberately absent from the shipped
 * graph. `src/shell/App.tsx` is the entry the build reaches, and no file below it imports
 * this variation, so none of this prototype's code travels into the shipped
 * `plugins/artifact/viewer/index.html`. Slice 14 of cobuilder-viewer gives the prototype a
 * page of its own for exactly that reason, and slice 4 gave every other variation the same
 * treatment. The dev server serves this one at:
 *
 *   http://localhost:5273/variations/flightdeck/dev.html
 *
 * The dev server is Vite-rooted at `src/`, so this page's URL is its path below `src/`.
 * Nothing in the build reaches this file: `vite.config.ts` names no `rollupOptions.input`,
 * so the build's one entry stays `src/index.html`, and this page is served in development
 * and never packaged.
 *
 * TWO SURFACES BEHIND ONE ADDRESS, AND THE NEW ONE IS THE DEFAULT. `dev.html` is the
 * engineer's review address and it stays the address they open:
 *
 *   dev.html                     the two-account prototype, which is the new work
 *   dev.html?surface=single      the reviewed one-pull-request prototype
 *
 * Three query parameters are read:
 *
 *   ?surface=accounts|single   which prototype to render. Its default is `accounts`.
 *
 *   ?work=<design-id>          points the two-account prototype at another work item of
 *                              the bundle. Its default is `cobuilder-implement`.
 *
 *   ?pr=11                     points either prototype at another pull request. The
 *                              two-account surface takes the first pull request the work's
 *                              own epics carry unless this names one of them, and it
 *                              ignores a number outside that set. The single surface's
 *                              default is 2.
 *
 * WHY `cobuilder-implement` AND PULL REQUEST 11 ARE THE PAIR THIS OPENS ON. The two-account
 * prototype needs a work item whose design carries records and whose pull request carries
 * narration. No work item in this bundle carries both a full design record and a pull
 * request that also holds an intent and an assessment block. `cobuilder-implement` is the
 * closest: its design carries all six record kinds, three decisions, two epics, and three
 * diagrams, and pull request 11 is one of the two its own epics carry, with four narrated
 * levels, three diagrams, five decisions, and a diff. What that pull request does not carry
 * is an intent block and an assessment block, and the change's account states both
 * absences in place rather than hiding them.
 *
 * `?pr=2` is the reviewed single-pull-request surface's default, because pull request 2 is
 * the first entry in `.cobuilder-architect/self/` to carry both an intent block and an
 * assessment block. Every other pull request in this bundle carries neither.
 *
 * This page is a development aid. The shipped viewer is
 * `plugins/artifact/viewer/index.html`, which this file never touches.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../../index.css";
import Accounts, { DEFAULT_WORK } from "./Accounts";
import FlightDeck from "./index";

const container = document.getElementById("root");
if (!container) {
  throw new Error("#root is missing from dev.html");
}

const query = new URLSearchParams(window.location.search);

function askedNumber(name: string, fallback: number): number {
  const asked = query.get(name);
  return asked !== null && Number.isInteger(Number(asked)) ? Number(asked) : fallback;
}

const surface = query.get("surface") === "single" ? "single" : "accounts";
const workId = query.get("work") ?? DEFAULT_WORK;
/* Passing nothing lets the work item's own join choose the change. */
const asked = query.get("pr") === null ? null : askedNumber("pr", 2);

createRoot(container).render(
  <StrictMode>
    {surface === "single" ? (
      <FlightDeck pr={asked ?? 2} />
    ) : (
      <Accounts workId={workId} pr={asked ?? undefined} />
    )}
  </StrictMode>,
);
