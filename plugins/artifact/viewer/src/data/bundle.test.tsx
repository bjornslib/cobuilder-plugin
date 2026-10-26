/**
 * Slice 4's contract: one typed model reads the bundle. This file runs under two runners.
 * `npm test` runs the behaviour, and `npm run typecheck` runs the type guards. A type guard
 * is a no-op at runtime, so its state shows in the `tsc` output alone.
 *
 * Two criteria are about an absence: no join resolved outside the data module (C1), and no
 * global read outside it (C4). Only a look at the tree can fail an absence, so those cases
 * scan the source. A hit is reported as `path:line: text`.
 *
 * Each scan reads a projection of the source with comments blanked. It keeps or blanks the
 * text of literals, as the question of the criterion needs.
 *
 * The criterion says `window.DIFFS`, but the bundle does not write that name.
 * `data/diffs-pr{N}.js` writes `window.DIFFS_BY_PR[N]`. So the scan reads the six names the
 * bundle defines: STORY ODYSSEY DIFFS_BY_PR ADRS DESIGNS DIAGRAMS. It also matches a bare
 * `DIFFS`, so the old spelling still fires. `\bDIFFS\b` does not match inside
 * `DIFFS_BY_PR`, so one reader is reported once.
 *
 * The scan covers every `.ts` and `.tsx` under `src/`, except the test files with their
 * `testSupport` helpers, and `src/data/`, the one module the criteria name. Nothing else is
 * excluded. A file that resolved a join would be a second source for one fact whether or
 * not it ships, so a path exclusion would hide the defect the rule names.
 *
 * C3's own evidence is a served bundle read through the ChromeDevTools MCP tools. No runner
 * in this repository holds a browser, so the criterion stays partly unmet. The render case
 * in `bundle.render.test.tsx` keeps the half that a DOM can carry: the level renders the
 * records of the bundle, and jsdom's console reports nothing missing.
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
 * With the extension form, this is `never`. If the two types are declared apart and one
 * field is renamed on one side, the type checker names the missing field in its message.
 */
type FieldMissingFromOpen = Exclude<keyof PullRequest, keyof OpenPullRequest>;

function typeGuards(): void {
  expectTypeOf<FieldMissingFromOpen>().toBeNever();

  expectTypeOf<OpenPullRequest>().toExtend<PullRequest>();

  /* The brand: OpenPullRequest is not simply PullRequest under another name. */
  expectTypeOf<OpenPullRequest>().not.toEqualTypeOf<PullRequest>();
}

/*
  The shell reads the joins the index carries, so one fact keeps one source. The scan names
  two shapes of a second derivation: a line that resolves a join, and a line that falls
  back to an entity's own unrefined placeholder.

  It names resolution, not mention. A tooltip that holds `joins.slice_to_epic` as text, and
  a glossary that writes the join rules as prose, name the key and resolve nothing. The scan
  reads the `codeOnly` projection, which blanks comments and literal text but keeps an
  element-access key, so `joins["KEY"]` is still a read.

  The scope is every file under `src/` outside `src/data/`. The list is empty today.
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

/* Carries the type guard above. It runs under `npm run typecheck` and is a no-op here. */
function failsTypeCheckOnMissingField() {
  typeGuards();
  const missing = declarationsOf("OpenPullRequest", DATA_SOURCES);
  expect(
    missing.length,
    "the guard needs the two declarations before it can say anything (see npm run typecheck)",
  ).toBe(1);
}

/*
  The six script-tag globals, by the names the bundle writes. One module reads them all, so
  a surface never asks which reader a bundle came from.
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
