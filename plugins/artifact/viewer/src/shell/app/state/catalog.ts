import { useMemo } from "react";

import { designRowsOf, entitiesOf } from "@/data/bundle";
import { resolvedJoinsOf } from "@/data/joins";
import type { DesignRow } from "@/data/types";

import type { IndexLoad } from "../../hooks";
import { buildWorkItems, switcherList, type WorkItem } from "../../model";

/*
 * The board's own rows, resolved by the data layer. The work drawer reads
 * one row per design, and `designRowsOf` is the one derivation of that row.
 *
 * THE INDEX'S JOINS, RESOLVED ONCE AND HELD. The change's own rows read the decisions it
 * landed from the index's `adr_to_pull_request` and never from a second list, so the
 * account and the index cannot disagree about that set. The hook sits above the loading
 * and error returns, because a hook that runs on one render and not the next is the
 * defect the rules of hooks exist to prevent.
 *
 * The index's own pull request entities. They are the second row source the board reads,
 * and the set a workless route resolves against. The value is the index's answer or an
 * empty list, so a route read before the index lands resolves to nothing and keeps its
 * error until the index answers.
 */
export function useCatalog(load: IndexLoad) {
  const ready = load.state === "ready";
  const works = useMemo(() => (load.state === "ready" ? buildWorkItems(load.index, load.designs) : new Map<string, WorkItem>()), [load]);
  const workList = useMemo(() => (load.state === "ready" ? switcherList(works) : { designs: [], epics: [] }), [load, works]);
  const boardRows = useMemo((): DesignRow[] => (load.state === "ready" ? designRowsOf(load.index) : []), [load]);
  const resolvedJoins = useMemo(() => (load.state === "ready" ? resolvedJoinsOf(load.index) : null), [load]);
  const allPullRequests = load.state === "ready" ? entitiesOf(load.index).pull_request : [];
  return { ready, works, workList, boardRows, resolvedJoins, allPullRequests };
}

export type Catalog = ReturnType<typeof useCatalog>;
