import { expect } from "vitest";

import {
  buildWorkItems,
  gatesOf,
  levelsOf,
  railGroups,
  type RailRow,
  type RailSource,
} from "../../model";
import { railRows } from "../App/queries";
import { DESIGNS, INDEX } from "./bundle";
import type { SparseDesign } from "./corpus";

export { disabledOf, hrefOf, railRows } from "../App/queries";

/** The rail's own input, built the way `App.tsx` builds it, from the fixture above. */
export function sourceOf(design: SparseDesign): RailSource {
  const work = buildWorkItems(INDEX, DESIGNS).get(design.id) ?? null;
  return {
    work,
    gates: work === null ? null : gatesOf(work),
    levels: work === null ? null : levelsOf(work),
    changePr: null,
    changeLevels: [],
    diffFiles: null,
    servedAudio: {},
  };
}

/** The rows the shell holds for one sparse design, in the rail's own order. */
export function rowsOfShell(design: SparseDesign): RailRow[] {
  return railGroups(sourceOf(design)).flatMap((group) => group.rows);
}

/**
 * The label a rail row carries, whichever state it is in.
 *
 * `Rail.tsx` writes an available row's accessible name as `<label>, the <account> account ·
 * <count>`, and a disabled row's as `<label> is disabled. Absent: <records>`. Both open with
 * the row's own label, so this reads the label and drops the rest.
 *
 * This is unambiguous here because a sparse design's work carries no pull request, so the
 * change's account draws no row and no two rows share a label. `Board.test.tsx` names the
 * same collision for the same reason.
 */
export function labelOf(row: HTMLElement): string {
  const name = row.getAttribute("aria-label") ?? "";
  return name
    .replace(/,? is disabled.*$/, "")
    .split(", the ")[0]
    .trim();
}

/** One rail row, by the label it carries, or a failure naming it. */
export function rowNamed(label: string): HTMLElement {
  const row = railRows().find((candidate) => labelOf(candidate) === label);
  expect(row, `the rail holds a row named ${label}`).toBeTruthy();
  return row as HTMLElement;
}

/** Everything a reader meets on one row: its visible words and its accessible name. */
export function saidOn(row: HTMLElement): string {
  const words = `${row.textContent ?? ""} ${row.getAttribute("aria-label") ?? ""}`;
  return words.replace(/\s+/g, " ").trim().toLowerCase();
}

/** The rail's own name for an available row, read the way `Rail.tsx` writes it. */
export function accessibleNameOf(row: RailRow): string {
  const who = row.account === "change" ? "the pull request" : "the work item";
  return row.count === "" ? `${row.label}, ${who}` : `${row.label}, ${who}, ${row.count}`;
}
