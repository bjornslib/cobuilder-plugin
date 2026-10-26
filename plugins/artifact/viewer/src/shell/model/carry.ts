import { CHANGE_KEYS } from "../change/sections";
import type { AccountId } from "./accounts";

/**
 * The section a level opens on when the reader carried a section name across.
 *
 * The match ignores case and surrounding space. No match, a null name, and an empty list
 * all give the first section. Of two sections with one name, the first wins.
 */
export function carriedSectionIndex(names: string[], carried: string | null): number {
  if (carried === null) return 0;
  const wanted = carried.trim().toLowerCase();
  const at = names.findIndex((name) => name.trim().toLowerCase() === wanted);
  return at < 0 ? 0 : at;
}

/**
 * The words of the link on a section heading that leads to the other account.
 *
 * The program account names the pull request, and it has no link when it has none. The
 * change account always leads back to the work item.
 */
export function readInLabel(from: AccountId, pr: number | null): string | null {
  if (from === "change") return "Read in the work item ›";
  return pr === null ? null : `Read in PR ${pr} ›`;
}

/**
 * The change row the route's appended segment names, as a position in `CHANGE_KEYS`.
 *
 * The segment is the row's own name, so `.../architecture` opens the change's
 * Architecture box and the bare address opens the first row. A segment that names no row
 * of the change lands on the first one, which is the row the bare address opens.
 */
export function changeRowIndex(subId: string | null): number {
  if (subId === null) return 0;
  const at = (CHANGE_KEYS as readonly string[]).indexOf(subId);
  return at < 0 ? 0 : at;
}
