/**
 * The index's joins, read as answers rather than as tables.
 *
 * ADR-0018 computes every join in `data/index.json`, and `src/data/works.ts` turns them
 * into per-work values for the shell. This module is the same idea one level down: it
 * answers the questions a reader asks about the joins, so no file outside `src/data/`
 * consults a join table. Slice 4 of cobuilder-viewer states the rule as C1: one fact has
 * one source, and a second derivation in a component is how the index and the surface
 * come to disagree.
 *
 * WHY THE ANSWERS AND NOT THE TABLES. Two of the values below carry a fallback. An epic's
 * state is the index's refined value when the join holds one, and the entity's own field
 * otherwise, because that field is the unrefined placeholder. A join table handed to a
 * component leaves that choice at the call site, and a call site that answers it is a
 * second source for the same fact. So `epicState` and `epicPullRequest` decide here and
 * report which of the two answered, and the caller renders what it is told.
 *
 * THE COUNTS ARE THE JOIN'S OWN SIZE, not a count of rows a surface holds. They are what
 * a panel states when it has nothing to show: the join was consulted, and this is how much
 * it carries.
 */

import type { AdrToPullRequest, DesignTracker, EpicEntity, GateStep, RecordIndex } from "./types";
import { joinsOf } from "./bundle";
import { adrAnswers, epicAnswers, gateAnswers, sliceAnswers, trackerAnswers } from "./joins/answers";

/**
 * One index's joins, resolved once, as answers.
 *
 * Build one of these per index and hold it: `resolvedJoinsOf` reads every table the
 * index carries, so a call inside a loop would re-read them all.
 */
export interface ResolvedJoins {
  /** The epic a slice resolves to, or undefined when the index joined none. */
  epicOfSlice(sliceId: string): string | undefined;
  /** Every slice id the index resolved to an epic. */
  resolvedSliceIds(): Set<string>;
  /** How many slice-to-epic entries the index holds. */
  sliceToEpicCount(): number;
  /**
   * The slices the index could not resolve, keyed by slice id.
   *
   * The value is the reason the index recorded, which a panel shows when it lists an
   * unresolved slice. A slice the index holds and the join does not name is a separate
   * case, and `resolvedSliceIds` is what answers that one.
   */
  unresolvedSlices(): Map<string, string>;
  /**
   * The epic's state, and whether the index's join answered it.
   *
   * `refined` is false when the join held no entry and the entity's own `state` field
   * answered, which is the unrefined placeholder. The fallback is decided here rather
   * than at the call site, so no surface holds a second rule for the same fact.
   */
  epicState(epic: EpicEntity): { state: string; refined: boolean };
  /**
   * The pull request the index resolved for an epic, or the entity's own `pr` field.
   *
   * Null when neither answered, which is an epic the index records no pull request for.
   */
  epicPullRequest(epic: EpicEntity): number | null;
  /** How many epic-to-pull-request entries the index holds. */
  epicToPullRequestCount(): number;
  /**
   * The pull request a decision reached, or null when the index resolved none.
   *
   * The entry is the index's whole record of the path: the number, the route the join
   * took, and the ids it passed through. A surface shows all three.
   */
  adrPullRequest(adrId: string): AdrToPullRequest | null;
  /** Every decision-to-pull-request entry the index holds, keyed by decision id. */
  adrPullRequests(): Map<string, AdrToPullRequest>;
  /**
   * Every decision the index joined to one pull request, in decision-id order.
   *
   * The answer to "which decisions did this change land". The index's own
   * `adr_to_pull_request` is the only source, so a surface that reads this answer and the
   * index cannot disagree about the set. A decision the join reaches through an epic and
   * one it reaches directly are both the change's own, so both are here.
   */
  adrIdsForPullRequest(pr: number): string[];
  /** The gate steps a plan slug holds, or null when the index holds no record for it. */
  featureGates(slug: string): GateStep[] | null;
  /** Every plan slug the gate join holds. */
  featureGateSlugs(): string[];
  /** What the tracker holds for one design, or null for an older index. */
  designTracker(designId: string): DesignTracker | null;
  /** True when the index build read the tracker. False for an older index. */
  trackerRead(): boolean;
  /** The tracker adapter name, or null for an older index. */
  trackerAdapter(): string | null;
}

/** Resolve one index's joins. See the interface above for what each answer means. */
export function resolvedJoinsOf(index: RecordIndex): ResolvedJoins {
  const joins = joinsOf(index);
  return {
    ...sliceAnswers(joins),
    ...epicAnswers(joins),
    ...adrAnswers(joins),
    ...gateAnswers(joins),
    ...trackerAnswers(joins),
  };
}
