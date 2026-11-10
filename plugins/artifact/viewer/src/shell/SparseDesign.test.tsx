/**
 * A `goal.json`-only design's Work surface, and the rail that gates what it cannot fill.
 *
 * Cobuilder-viewer slice 13, epic `cobuilder-viewer/E5`. `04-slices.md` writes the slice's
 * end as one sentence: "One of the seven sparse designs shows every level it can fill, and
 * the rail gates the levels it cannot." The rail carries two accounts now, and a "level" is
 * one of its rows, so this file holds the same claim against the row list the shell builds.
 *
 * The slice's end has two parts, and one case holds each:
 *
 *   1. Every row the design can fill renders, and it renders the record's own content. A
 *      row that fills and shows nothing is the defect this part exists to find.
 *   2. Every row it cannot fill stays in the rail, reads disabled, and states the records
 *      it could not read in place. An absence must read as a state, never as a blank box.
 *
 * The fixture is the repository's own. A design directory under
 * `docs/architecture/designs/` that holds `goal.json` alone is a sparse design, and this
 * file reads every one of them from disk. Nothing about a design is written by hand here:
 * the id, the goal record, the epics it plans, and the decisions it names all come from the
 * authored file. A design that stops being sparse, or a corpus that loses its last sparse
 * design, fails the first case rather than passing in silence.
 *
 * The row set comes from the shell, not from this file. `railGroups` in `./model` is the
 * one list, and this file asks it for the rows rather than naming them. A row added to the
 * program's account reaches the cases below without an edit here. Only the promise each row
 * keeps is written down, and `promised` states it from the fixture's own facts: the record
 * body decides whether Problem & Solution is backed, and `goal.adrs[]` decides whether
 * Architecture is.
 *
 * That split is what lets a case fail. A case that compared the rail against `railGroups`
 * alone would move with the code it measures, so a rule that stopped gating a row would
 * carry its own expectation along with it. The promise here is derived from the authored
 * design, and the rail is read through a browser-shaped DOM, so a change to either side is
 * visible.
 *
 * What this file does not measure: jsdom holds no layout engine, so the disabled row's 45
 * percent opacity, the tooltip's placement, and the strip's geometry are browser readings
 * and belong to the Gate 4c rubrics. The rule and the markup that produce them are here.
 * The browser reading was taken on 2026-09-25, on the built bundle served at
 * `.cobuilder-architect/self`: `lean-bundle-diffs` and `ubiquitous-language` gate Problem &
 * Solution and Architecture, `gate-state-resolution` and `inflight-record-store` fill
 * Architecture from a linked decision, and every one of the eight rendered no error state.
 *
 * Run with: npm test -- src/shell/SparseDesign.test.tsx
 */

import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { RailRow } from "./model";
import { recordOf } from "./testSupport/SparseDesign/bundle";
import { SPARSE, authoredFiles, type SparseDesign } from "./testSupport/SparseDesign/corpus";
import { useSparseFixture } from "./testSupport/SparseDesign/hooks";
import { promised } from "./testSupport/SparseDesign/promise";
import {
  disabledOf,
  hrefOf,
  labelOf,
  railRows,
  rowNamed,
  rowsOfShell,
  saidOn,
} from "./testSupport/SparseDesign/rail.test.helpers";
import { openAt } from "./testSupport/SparseDesign/surface.test.helpers";

useSparseFixture();

function expectCorpusIsSparse(): void {
  expect(
    SPARSE.length,
    "the corpus holds no design whose authored directory is goal.json alone, so this " +
      "slice has no subject. docs/architecture/designs/ is where one lives.",
  ).toBeGreaterThan(0);

  for (const design of SPARSE) {
    expect(authoredFiles(design.id), `${design.id} is a sparse design`).toEqual(["goal.json"]);
  }
}

function expectShellRows(design: SparseDesign): RailRow[] {
  const rows = rowsOfShell(design);
  expect(rows.length, "the rail holds rows for a sparse design").toBeGreaterThan(0);
  expect(railRows().map(labelOf)).toEqual(rows.map((row) => row.label));
  return rows;
}

function expectDisabled(row: RailRow, rendered: HTMLElement): void {
  expect(disabledOf(rendered), `${row.label} reads disabled`).toBe(true);
  expect(hrefOf(rendered), `${row.label} opens no address`).toBe("#");
}

function expectAbsenceStated(row: RailRow, rendered: HTMLElement, absent: string[]): void {
  /* The row states the absence itself, and not only in a tooltip. */
  const said = saidOn(rendered);
  expect(
    (rendered.textContent ?? "").trim().length,
    `${row.label} is not drawn as an empty box`,
  ).toBeGreaterThan(row.label.length);
  for (const record of absent) {
    expect(said, `${row.label} names ${record}`).toContain(record.toLowerCase());
  }
}

function expectPressStaysPut(row: RailRow, rendered: HTMLElement, design: SparseDesign): void {
  fireEvent.click(rendered);
  expect(window.location.hash, `a press on ${row.label} stays put`).toBe(`#/${design.id}/intent`);
}

function expectGatedRow(row: RailRow, design: SparseDesign): void {
  const { absent } = promised(row, design, recordOf(design));
  const rendered = rowNamed(row.label);
  expectDisabled(row, rendered);
  expectAbsenceStated(row, rendered, absent);
  expectPressStaysPut(row, rendered, design);
}

async function gatesUnfillableRows(design: SparseDesign): Promise<void> {
  await openAt(design, "intent");
  const rows = expectShellRows(design);
  const gated = rows.filter((row) => !promised(row, design, recordOf(design)).available);
  expect(gated.length, `${design.id} gates a row, so the gate itself is exercised`).toBeGreaterThan(
    0,
  );
  for (const row of gated) expectGatedRow(row, design);
}

describe("a goal.json-only design's Work surface", () => {
  it("reads its subject from this repository's own sparse designs", expectCorpusIsSparse);

  for (const design of SPARSE) {
    it(`gates every row ${design.id} cannot fill, and states each absence in place`, () =>
      gatesUnfillableRows(design));
  }
});
