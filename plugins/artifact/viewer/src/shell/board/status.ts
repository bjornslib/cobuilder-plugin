export type StatusColumnKey = "planned" | "in_progress" | "done";
export type StatusShape = "circle" | "half" | "filled";

export interface StatusColumn {
  key: StatusColumnKey;
  label: string;
  shape: StatusShape;
}

export const STATUS_COLUMNS: readonly StatusColumn[] = [
  { key: "planned", label: "Planned", shape: "circle" },
  { key: "in_progress", label: "In progress", shape: "half" },
  { key: "done", label: "Done", shape: "filled" },
];

export const SHAPE_GLYPH: Record<StatusShape, string> = { circle: "○", half: "◐", filled: "●" };

const PLANNED_EPIC = new Set(["unstarted", "planned"]);
const DONE_EPIC = new Set(["completed", "merged", "superseded"]);
const DONE_SLICE = new Set(["completed", "skipped", "escalated"]);

export function epicColumnOf(status: string | null | undefined): StatusColumnKey {
  if (status && PLANNED_EPIC.has(status)) return "planned";
  if (status && DONE_EPIC.has(status)) return "done";
  return "in_progress";
}

export function isDoneSlice(state: string | null | undefined): boolean {
  return Boolean(state && DONE_SLICE.has(state));
}

export function epicStatusWord(status: string | null | undefined): string {
  return status || "no status";
}

export function sliceColumnOf(state: string | null | undefined): StatusColumnKey {
  if (state === "planned") return "planned";
  return isDoneSlice(state) ? "done" : "in_progress";
}
