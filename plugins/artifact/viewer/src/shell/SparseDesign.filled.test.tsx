import { describe, expect, it } from "vitest";

import type { RailRow } from "./model";
import { recordOf } from "./testSupport/SparseDesign/bundle";
import { SPARSE, type SparseDesign } from "./testSupport/SparseDesign/corpus";
import { useSparseFixture } from "./testSupport/SparseDesign/hooks";
import { promised } from "./testSupport/SparseDesign/promise";
import {
  accessibleNameOf,
  disabledOf,
  hrefOf,
  rowNamed,
  rowsOfShell,
} from "./testSupport/SparseDesign/rail.test.helpers";
import {
  levelHeading,
  openAt,
  pageText,
  workItemName,
} from "./testSupport/SparseDesign/surface.test.helpers";

useSparseFixture();

function filledRows(design: SparseDesign): RailRow[] {
  const rows = rowsOfShell(design);
  const filled = rows.filter((row) => promised(row, design, recordOf(design)).available);
  expect(filled.length, `${design.id} fills a row`).toBeGreaterThan(0);
  return filled;
}

function expectOpensAddress(row: RailRow, rendered: HTMLElement): void {
  expect(disabledOf(rendered), `${row.label} is a row this design fills`).toBe(false);
  expect(hrefOf(rendered), `${row.label} opens a real address`).not.toBe("#");
  expect(hrefOf(rendered), `${row.label} opens its own address`).toBe(row.href);
}

function expectFilledRow(row: RailRow): void {
  const rendered = rowNamed(row.label);
  expectOpensAddress(row, rendered);

  expect(rendered.getAttribute("aria-label"), `${row.label} states what it holds`).toBe(
    accessibleNameOf(row),
  );
}

function expectIntentCount(design: SparseDesign, filled: RailRow[]): void {
  const intent = filled.find((row) => row.key === "program-intent");
  expect(intent, `${design.id} fills its Intent row`).toBeTruthy();
  expect(
    accessibleNameOf(intent as RailRow),
    "the Intent row counts the one record the sparse design carries",
  ).toContain("1 records");
}

function expectEpicsCount(design: SparseDesign, filled: RailRow[]): void {
  const epics = filled.find((row) => row.key === "program-epics");
  const planned = (design.goal.epics ?? []).length;
  if (planned > 0) {
    expect(epics, `${design.id} fills its Epics row`).toBeTruthy();
    expect(accessibleNameOf(epics as RailRow)).toContain(`${planned} epics`);
  }
}

function expectSurfaceOpensOnIntent(design: SparseDesign): void {
  expect(workItemName(), "the surface names the sparse design").toBe(design.id);
  expect(levelHeading(), "the surface opens on Intent").toBe("Intent");
}

function expectOutcomeShown(design: SparseDesign): void {
  const outcome = (design.goal.outcome ?? "").replace(/\s+/g, " ").trim();
  expect(outcome.length, `${design.id} records an outcome`).toBeGreaterThan(0);
  expect(pageText(), "the Intent level shows the goal record's own outcome").toContain(
    outcome.slice(0, 120),
  );
}

async function rendersFillableRows(design: SparseDesign): Promise<void> {
  await openAt(design, "intent");
  const filled = filledRows(design);
  for (const row of filled) expectFilledRow(row);
  expectIntentCount(design, filled);
  expectEpicsCount(design, filled);
  expectSurfaceOpensOnIntent(design);
  expectOutcomeShown(design);
}

describe("a goal.json-only design's Work surface", () => {
  for (const design of SPARSE) {
    it(`renders the rows ${design.id} can fill, with the record's own content`, () =>
      rendersFillableRows(design));
  }
});
