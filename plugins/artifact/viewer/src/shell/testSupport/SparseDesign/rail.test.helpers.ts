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

export function rowsOfShell(design: SparseDesign): RailRow[] {
  return railGroups(sourceOf(design)).flatMap((group) => group.rows);
}

/**
 * The label a rail row carries, in either state.
 *
 * `Rail.tsx` names an available row `<label>, the <account> account · <count>` and a
 * disabled row `<label> is disabled. Absent: <records>`. Both open with the label, so this
 * drops the rest.
 *
 * That is unambiguous here. A sparse design's work carries no pull request, so no two rows
 * share a label. `Board.test.tsx` names the same collision.
 */
export function labelOf(row: HTMLElement): string {
  const name = row.getAttribute("aria-label") ?? "";
  return name
    .replace(/,? is disabled.*$/, "")
    .split(", the ")[0]
    .trim();
}

export function rowNamed(label: string): HTMLElement {
  const row = railRows().find((candidate) => labelOf(candidate) === label);
  expect(row, `the rail holds a row named ${label}`).toBeTruthy();
  return row as HTMLElement;
}

export function saidOn(row: HTMLElement): string {
  const words = `${row.textContent ?? ""} ${row.getAttribute("aria-label") ?? ""}`;
  return words.replace(/\s+/g, " ").trim().toLowerCase();
}

export function accessibleNameOf(row: RailRow): string {
  const who = row.account === "change" ? "the pull request" : "the work item";
  return row.count === "" ? `${row.label}, ${who}` : `${row.label}, ${who}, ${row.count}`;
}
