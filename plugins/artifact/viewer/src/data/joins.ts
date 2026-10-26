/**
 * The index's joins, read as answers rather than as tables.
 *
 * ADR-0018 computes every join in `data/index.json`, and `src/data/works.ts` turns them
 * into per-work values for the shell. This module answers the questions a reader asks
 * about the joins, so no file outside `src/data/` consults a join table. The rule is C1
 * of slice 4 of cobuilder-viewer: one fact has one source, and a second derivation in a
 * component is how the index and the surface come to disagree.
 *
 * Two answers carry a fallback. An epic's state is the index's refined value when the
 * join holds one, and the entity's own field otherwise, because that field is the
 * unrefined placeholder. A join table handed to a component leaves that choice at the
 * call site, which would be a second source for the same fact. So `epicState` and
 * `epicPullRequest` decide here and report which of the two answered.
 *
 * The counts are the join's own size, not a count of rows a surface holds. A panel
 * states them when it has nothing to show: the join was consulted, and this is how much
 * it carries.
 */

import type { AdrToPullRequest, DesignTracker, EpicEntity, GateStep, RecordIndex } from "./types";
import { joinsOf } from "./bundle";
import { adrAnswers, epicAnswers, gateAnswers, sliceAnswers, trackerAnswers } from "./joins/answers";

/**
 * Build one of these per index and hold it: `resolvedJoinsOf` reads every table the
 * index carries, so a call inside a loop would re-read them all.
 */
export interface ResolvedJoins {
  epicOfSlice(sliceId: string): string | undefined;
  resolvedSliceIds(): Set<string>;
  sliceToEpicCount(): number;
  /**
   * The slices the index could not resolve, keyed by slice id. The value is the reason
   * the index recorded. A slice the index holds and the join does not name is a separate
   * case, which `resolvedSliceIds` answers.
   */
  unresolvedSlices(): Map<string, string>;
  /**
   * The epic's state, and whether the index's join answered it. `refined` is false when
   * the join held no entry and the entity's own `state` field answered, which is the
   * unrefined placeholder.
   */
  epicState(epic: EpicEntity): { state: string; refined: boolean };
  /** The pull request for an epic: the join's, else the entity's own `pr`. Null when neither answered. */
  epicPullRequest(epic: EpicEntity): number | null;
  epicToPullRequestCount(): number;
  /**
   * The pull request a decision reached, or null when the index resolved none. The entry
   * is the index's whole record of the path: the number, the route, and the ids passed.
   */
  adrPullRequest(adrId: string): AdrToPullRequest | null;
  adrPullRequests(): Map<string, AdrToPullRequest>;
  /**
   * Every decision the index joined to one pull request, in decision-id order. The
   * index's own `adr_to_pull_request` is the only source, so a surface that reads this
   * answer and the index cannot disagree. A decision reached through an epic and one
   * reached directly are both the change's own, so both are here.
   */
  adrIdsForPullRequest(pr: number): string[];
  /** The gate steps a plan slug holds, or null when the index holds no record for it. */
  featureGates(slug: string): GateStep[] | null;
  featureGateSlugs(): string[];
  /** What the tracker holds for one design, or null for an older index. */
  designTracker(designId: string): DesignTracker | null;
  /** True when the index build read the tracker. False for an older index. */
  trackerRead(): boolean;
  /** The tracker adapter name, or null for an older index. */
  trackerAdapter(): string | null;
}

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
