import { CHANGE_KEYS } from "../change/sections";
import type { AccountId } from "./accounts";

export function carriedSectionIndex(names: string[], carried: string | null): number {
  if (carried === null) return 0;
  const wanted = carried.trim().toLowerCase();
  const at = names.findIndex((name) => name.trim().toLowerCase() === wanted);
  return at < 0 ? 0 : at;
}

export function readInLabel(from: AccountId, pr: number | null): string | null {
  if (from === "change") return "Read in the work item ›";
  return pr === null ? null : `Read in PR ${pr} ›`;
}

/**
 * The change row the route's appended segment names, as a position in `CHANGE_KEYS`.
 *
 * The segment is the row's own name. A segment that names no row lands on the first
 * row, which is the row the bare address opens.
 */
export function changeRowIndex(subId: string | null): number {
  if (subId === null) return 0;
  const at = (CHANGE_KEYS as readonly string[]).indexOf(subId);
  return at < 0 ? 0 : at;
}
