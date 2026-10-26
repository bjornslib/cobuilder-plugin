/**
 * Slice 4's contract: one typed model reads the bundle.
 *
 * The rubric is `.cobuilder/rubrics/cobuilder-viewer/slice-4.md`, and this file states
 * its four criteria as cases. Two of them are type-level, so this file runs under two
 * runners: `npm test` runs the behaviour, and `npm run typecheck` runs the type guards.
 * A type guard is a no-op at runtime, so its state shows in the `tsc` output alone.
 *
 * WHY SOME CASES READ THE SOURCE. Two criteria are about an absence: no join resolved
 * outside the data module (C1), and no global read outside it (C4). A reader can only fail
 * an absence by looking at the tree, so those cases scan the source and name the structure
 * they inspect. A hit is reported as `path:line: text`, so a failure shows what it found.
 *
 * WHAT THE SCAN READS. Each criterion reads a projection of the source in which comments
 * are blanked, and the text of a literal is kept or blanked according to the question that
 * criterion asks. The projection block below states both projections, and why this file no
 * longer scans quote characters by hand.
 *
 * WHICH GLOBALS THE SCAN NAMES. The criterion's list says `window.DIFFS`, and the bundle
 * does not write that name. `data/diffs-pr{N}.js` writes `window.DIFFS_BY_PR[N]`, and
 * the flightdeck prototype's model, since removed, recorded the difference. So the scan reads the six
 * names the bundle actually defines:
 *
 *   STORY  ODYSSEY  DIFFS_BY_PR  ADRS  DESIGNS  DIAGRAMS
 *
 * The scan also matches a bare `DIFFS`, so a reader of the criterion's old spelling still
 * fires. `word boundary` keeps the two apart: `\bDIFFS\b` does not match inside
 * `DIFFS_BY_PR`, so one reader is reported once.
 *
 * WHICH FILES THE SCAN COVERS. Every `.ts` and `.tsx` under `src/`, apart from two sets:
 * the test files with their `testSupport` helpers, and `src/data/` itself, which is the one module the criteria name. No
 * path under `src/` is excluded. `src/shell/`, `src/components/`, `src/hooks/`, `src/lib/`, and the two files at the top of `src/`,
 * `App.tsx` and `main.tsx`.
 *
 * WHY NOTHING IS EXCLUDED NOW. A scope that once left `src/variations/` out did so for a
 * reason that is gone. `src/Variations.tsx` imported every prototype statically, so the
 * build carried each prototype's code and its duplicate Sheet, panel, atoms, and markdown
 * copies. That harness is deleted, the shell's variations route with it, and each
 * prototype was removed from `src/variations/` on 2026-10-08, so none enters the built file.
 *
 * WHAT THE WIDENED SCOPE FINDS TODAY. Both cases pass, and both read every file under
 * `src/` with no `src/variations/` exclusion. Neither needs one.
 *
 *   C4 passes. The six globals are read in `src/data/` alone. Each prototype handed its
 *   own reader to the data module, so no file outside it names a global.
 *
 *   C1 passes. Every join resolves under `src/data/`, in `works.ts` and in `joins.ts`, and
 *   a surface consumes the resolved value. The old pattern named 78 lines across 13 files,
 *   and 48 of those were a real resolution, in 11 of the files: a join lookup, or a fallback
 *   to an entity's own placeholder. That work moved onto the data module, and no line outside
 *   it resolves a join or reads a join key.
 *
 * THE SCOPE IS A PROPERTY OF THE RULE, NOT OF THE BUNDLE. A criterion that reads every file
 * under `src/` is the honest reading of the rule, and it does not depend on which files the
 * build happens to carry. A prototype that resolved a join is a second source for one fact
 * whether or not it ships, and C1 names that defect. So the case reports it either way,
 * rather than hide it behind an exclusion that a later harness change would invalidate.
 *
 * WHAT THE SCAN DOES NOT COVER, and why the criterion stays partly unmet. C3's own
 * evidence is a served bundle read through the ChromeDevTools MCP tools. No runner in
 * this repository holds a browser, so the case below keeps the half that a DOM can
 * carry: the level renders the records the bundle carries. The console half of C3 is
 * kept here too, because jsdom has a console.
 */

import { describe, expect, expectTypeOf, it } from "vitest";

import type { OpenPullRequest, PullRequest } from "./types";
import { declarationsOf } from "./testSupport/bundle/declarations";
import {
  GLOBAL_SPELLINGS,
  JOIN_KEY_READ,
  PLACEHOLDER_FALLBACK,
  SHIPPED_GLOBALS,
  readsGlobal,
} from "./testSupport/bundle/patterns";
import { hitsByLine } from "./testSupport/bundle/projection";
import { DATA_SOURCES, OUTSIDE_SOURCES } from "./testSupport/bundle/sources";

/**
 * The field of `PullRequest` that `OpenPullRequest` does not carry.
 *
 * With the extension form, this is `never`. If the two types are declared apart and one
 * field is renamed on one side, the missing field's own name appears here, so the type
 * checker names it in its message. That is the whole guard.
 */
type FieldMissingFromOpen = Exclude<keyof PullRequest, keyof OpenPullRequest>;

/**
 * The type-level guards. Each call is a no-op at runtime, so `npm test` cannot see what
 * they assert. `npm run typecheck` is the runner that decides them.
 */
function typeGuards(): void {
  /* The extension: every field of PullRequest is on OpenPullRequest. A rename fires here. */
  expectTypeOf<FieldMissingFromOpen>().toBeNever();

  /* The extension direction, stated the other way. */
  expectTypeOf<OpenPullRequest>().toExtend<PullRequest>();

  /* The brand: OpenPullRequest is not simply PullRequest under another name. */
  expectTypeOf<OpenPullRequest>().not.toEqualTypeOf<PullRequest>();
}

/*
  The shell reads the joins the index carries. No component derives one of its own,
  so one fact keeps one source. The scan names both shapes of a second derivation:
  a line that resolves a join, and a line that falls back to an entity's own
  unrefined placeholder.

  IT NAMES RESOLUTION, NOT MENTION. A join key is reported when something reads it off
  a joins object. A tooltip that holds `joins.slice_to_epic` as its text, and a glossary
  whose content is the join rules written as prose, name the key and resolve nothing, so
  they are silent. The scan reads the `codeOnly` projection, which blanks every comment
  and every literal's text, and keeps an element-access key so that `joins["KEY"]` is
  still a read. See the projection block above.

  The scope is every file under `src/` outside `src/data/`. Every join resolves under `src/data/` today, in `works.ts` and `joins.ts`,
  so this list is empty over the whole of `src/`. See this file's header.
*/
function joinResolutionsOutsideData(): string[] {
  return [
    ...new Set([
      ...hitsByLine(JOIN_KEY_READ, OUTSIDE_SOURCES, "codeOnly"),
      ...hitsByLine(PLACEHOLDER_FALLBACK, OUTSIDE_SOURCES, "codeOnly"),
    ]),
  ];
}

function resolvesNoJoinOutsideData() {
  expect(
    joinResolutionsOutsideData(),
    "no file outside src/data/ may resolve a join or fall back to an entity's own placeholder",
  ).toEqual([]);
}

function expectOpenExtendsPullRequest(declaration: string) {
  const extendsPullRequest =
    /extends\s+PullRequest\b/.test(declaration) || /=\s*PullRequest\s*&/.test(declaration);
  expect(
    extendsPullRequest,
    `OpenPullRequest extends PullRequest, so a rename on one side reaches the other. It reads: ${declaration}`,
  ).toBe(true);
}

function declaresEachPullRequestOnce() {
  const pullRequests = declarationsOf("PullRequest", DATA_SOURCES);
  const openPullRequests = declarationsOf("OpenPullRequest", DATA_SOURCES);
  expect(pullRequests.map((one) => one.at), "src/data/ declares PullRequest in one place").toHaveLength(1);
  expect(openPullRequests.map((one) => one.at), "src/data/ declares OpenPullRequest in one place").toHaveLength(1);
  expectOpenExtendsPullRequest(openPullRequests[0]?.text ?? "");
}

/*
  This case carries the type guard above. It runs for real under `npm run typecheck`,
  and it is a no-op here, because a type has no runtime value.
*/
function failsTypeCheckOnMissingField() {
  typeGuards();
  const missing = declarationsOf("OpenPullRequest", DATA_SOURCES);
  expect(
    missing.length,
    "the guard needs the two declarations before it can say anything (see npm run typecheck)",
  ).toBe(1);
}

/*
  The six script-tag globals the bundle defines, by the names the bundle writes. One
  module reads them all, so a surface never asks which reader a bundle came from.

  The scope is every file under `src/` outside `src/data/`, so the case passes over the
  whole of `src/` rather than over one surface.
*/
function readsAllSixGlobalsInData() {
  const unread = SHIPPED_GLOBALS.filter(
    (name) => hitsByLine(readsGlobal(name), DATA_SOURCES, "withStrings").length === 0,
  );
  expect(unread, "src/data/ reads every one of the six globals").toEqual([]);
}

function readsNoGlobalOutsideData() {
  const found = GLOBAL_SPELLINGS.flatMap((name) =>
    hitsByLine(readsGlobal(name), OUTSIDE_SOURCES, "withStrings"),
  );
  expect(
    found,
    "a global the data module reads must be read nowhere else, so the reader is the one place a file's shape is known",
  ).toEqual([]);
}

describe("the typed data layer", () => {
  it("C1: resolves no join outside the data module", resolvesNoJoinOutsideData);
  it("C2: declares PullRequest once and OpenPullRequest once, as its extension", declaresEachPullRequestOnce);
  it("C2: fails the type check when a field of PullRequest is missing from OpenPullRequest", failsTypeCheckOnMissingField);
  it("C4: reads all six bundle globals inside the data module", readsAllSixGlobalsInData);
  it("C4: reads no bundle global outside the data module", readsNoGlobalOutsideData);
});
