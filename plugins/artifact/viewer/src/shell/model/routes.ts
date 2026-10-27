import type { PullRequest } from "@/data/types";
import type { ChangeKey } from "../change/sections";
import type { AccountId, ProgramKey, SharedKey } from "./accounts";
import { isSectionKey, type SectionKey } from "./sections";

export interface Route {
  workId: string | null;
  section: SectionKey;
  /**
   * The sub-view inside a section: `epics` with an optional epic id, `rubrics`,
   * `flightdeck`, or a pull request number.
   *
   * There is no `slices` sub-view. A slice belongs to one epic and carries no meaning
   * outside it, so it never becomes a destination. Section 2.1 states the general rule:
   * a record that only exists inside another one never gets a rail item.
   */
  sub: string | null;
  subId: string | null;
}

/** The route prefix. The shell is the shipped surface, so it owns the root address. */
const ROUTE_PREFIX = "#/";

export function readRoute(): Route {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [workId, section, sub, subId] = raw.split("/").filter(Boolean);
  return {
    workId: workId ?? null,
    section: section && isSectionKey(section) ? section : "intent",
    sub: sub ?? null,
    subId: subId ?? null,
  };
}

export function routeHref(workId: string, section: SectionKey, tail?: string): string {
  return `${ROUTE_PREFIX}${workId}/${section}${tail ? `/${tail}` : ""}`;
}

/**
 * The board: the route that names no work item.
 *
 * `readRoute()` already answers this address with a null `workId`, so `Route` needs no
 * field for the board. It is the one destination that states no section, because a
 * reader who has chosen no work item has chosen no level either.
 */
export function boardHref(): string {
  return ROUTE_PREFIX;
}

export function programHref(workId: string, section: ProgramKey): string {
  if (section === "epics") return routeHref(workId, "build", "epics");
  if (section === "rubrics") return routeHref(workId, "build", "rubrics");
  if (section === "plan") return routeHref(workId, "build", "plan");
  return routeHref(workId, section);
}

/**
 * The address of one row of the change's account.
 *
 * ADR-0029 fixes the change's address as `#/<work>/pull-requests/<pr>`, and that address
 * is the change's Intent row. Every other row appends one segment, its own name, which
 * rides the existing `subId` field, so no second parser exists.
 */
export function changeHref(workId: string, pr: number, section: ChangeKey): string {
  if (section === "intent") return routeHref(workId, "pull-requests", String(pr));
  return routeHref(workId, "pull-requests", `${pr}/${section}`);
}

/**
 * The address of a pull request that no design carries.
 *
 * A pull request with no design has no work item, so no id names one. That case must
 * not end in the unknown-id error. So the address's work segment carries the pull
 * request's own number, and `changeHref` builds the rest. An address assembled where a
 * row is drawn would be a second address scheme beside the ones this file fixes.
 *
 * `worklessPullRequest` reads the same rule backwards, so the builder and the resolver
 * cannot disagree about which address belongs to which pull request.
 */
export function pullRequestHref(pr: number, section: ChangeKey): string {
  return changeHref(String(pr), pr, section);
}

/**
 * The pull request a workless route's work segment names, or null.
 *
 * The shell resolves the work segment among the index's designs first, because a design
 * owns that segment when one carries the id. Only a segment no design carries is read
 * here, as a pull request number.
 */
export function worklessPullRequest(
  pullRequests: PullRequest[],
  workId: string,
): PullRequest | null {
  return pullRequests.find((pull) => String(pull.id) === workId) ?? null;
}

/**
 * The other account's address for one shared section name. The jump reads this.
 *
 * One builder crosses between the accounts, and it calls both address builders. An
 * address assembled where the control is drawn would be a second address scheme, and a
 * change to the route shape would reach the rail and miss the jump.
 *
 * `shared` is a `SharedKey` and never a row of one account alone. A caller with no
 * counterpart passes null and builds no jump.
 */
type CounterpartArgs = [workId: string, pr: number, from: AccountId, shared: SharedKey];

export function counterpartHref(...[workId, pr, from, shared]: CounterpartArgs): string {
  return from === "program" ? changeHref(workId, pr, shared) : programHref(workId, shared);
}
