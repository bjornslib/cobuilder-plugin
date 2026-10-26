import { describe, expect, it } from "vitest";

import { railGroups, routeHref, type RailGroup, type RailRow } from "./model";
import { recordOf } from "./testSupport/SparseDesign/bundle";
import { SPARSE, type SparseDesign } from "./testSupport/SparseDesign/corpus";
import { useSparseFixture } from "./testSupport/SparseDesign/hooks";
import { promised } from "./testSupport/SparseDesign/promise";
import {
  disabledOf,
  hrefOf,
  railRows,
  rowsOfShell,
  saidOn,
  sourceOf,
} from "./testSupport/SparseDesign/rail.test.helpers";
import { openAt, pageText } from "./testSupport/SparseDesign/surface.test.helpers";

useSparseFixture();

function changeRowOf(groups: RailGroup[]): RailRow {
  const changeRows = groups
    .flatMap((group) => group.rows)
    .filter((row) => row.account === "change");
  expect(changeRows.map((row) => row.label)).toEqual(["File Diffs"]);
  const [diffs] = changeRows;
  expect(diffs.available).toBe(false);
  expect(diffs.href).toBe("#");
  expect(diffs.shared).toBeNull();
  expect(Array.isArray(diffs.absent) && diffs.absent.length > 0).toBe(true);
  return diffs;
}

function expectRowNotEntry(groups: RailGroup[]): void {
  /* It is a row, and not an entry. */
  const entries = groups.flatMap((group) => group.entries);
  expect(entries.map((entry) => entry.label)).not.toContain("File Diffs");
}

function expectDrawnDisabled(diffs: RailRow): void {
  /* It is drawn disabled, names its account, then states its reason. */
  const rendered = railRows().find((row) =>
    (row.getAttribute("aria-label") ?? "").startsWith("File Diffs, the pull request"),
  );
  expect(rendered, "the rail draws a File Diffs row for the pull request").toBeTruthy();
  expect(disabledOf(rendered as HTMLElement)).toBe(true);
  expect(hrefOf(rendered as HTMLElement)).toBe("#");
  for (const reason of diffs.absent ?? []) {
    expect(saidOn(rendered as HTMLElement)).toContain(reason.toLowerCase());
  }
}

async function holdsDisabledFileDiffsRow(): Promise<void> {
  const design = SPARSE[0];
  await openAt(design, "intent");

  /* No epic names a pull request, so the File Diffs row is disabled, with a reason. */
  const groups = railGroups(sourceOf(design));
  expect(groups.map((group) => group.key)).toEqual(["levels", "also", "review"]);
  const diffs = changeRowOf(groups);
  expectRowNotEntry(groups);
  expectDrawnDisabled(diffs);
}

function expectProblemGated(design: SparseDesign): void {
  const gated = rowsOfShell(design).find((row) => row.key === "program-problem-and-solution");
  expect(gated, "the shell holds a Problem & Solution row").toBeTruthy();
  expect(promised(gated as RailRow, design, recordOf(design)).available).toBe(false);
}

function expectRedirectedToIntent(design: SparseDesign): void {
  /* The shell lands on a level the design fills, and it states the move. */
  expect(window.location.hash).toBe(routeHref(design.id, "intent"));
  expect(pageText()).toContain("The route named problem-and-solution");
  expect(pageText()).toMatch(/redirected to intent\./i);
}

async function redirectsGatedRoute(): Promise<void> {
  /* Problem & Solution is gated for every sparse design: no backing record is authored. */
  const design = SPARSE[0];
  expectProblemGated(design);
  await openAt(design, "problem-and-solution");
  expectRedirectedToIntent(design);
}

describe("a goal.json-only design's Work surface", () => {
  it(
    "holds a disabled File Diffs row and no change level row for a sparse design's work",
    holdsDisabledFileDiffsRow,
  );

  it(
    "sends a route that names a gated level to one the design fills, and says so",
    redirectsGatedRoute,
  );
});
