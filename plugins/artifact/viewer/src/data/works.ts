/**
 * The work items an index resolves to: every join the shell consumes, computed once.
 *
 * ADR-0018 built the joins into `data/index.json`, and this module reads them. It derives
 * no join of its own, and no file outside `src/data/` names one. That is the rule slice 4
 * of cobuilder-viewer fixes: one fact has one source, and a second derivation in a
 * component is how the index and the shell come to disagree.
 *
 * THIS FILE HELD THE SHELL'S OWN MODEL UNTIL SLICE 4. `src/shell/model.ts` still holds
 * everything a level decides about a resolved work item: which sections it fills, which
 * entries the rail draws, and which route it answers. Those are the shell's rules and
 * they stay there. What moved here is the reading of the index.
 *
 * `planSlug` and `hasPlan` are the two values that are not a field of the index. A
 * design id is not always the plan directory's slug, so the slug is derived from the ids
 * of the design's own slices, and it counts as a plan only when the index also holds a
 * record under it. `planSlugVia` says which of the two it was.
 */

import type { DesignEntity, RecordIndex } from "@/data/types";
import type { DesignRecord } from "@/data/bundle";
import { decisionPartOf } from "./works/decisions";
import { epicDesignPartOf, planPartOf } from "./works/plan";
import { pullRequestPartOf, scopeOf } from "./works/scope";
import { sourcesOf, type Sources } from "./works/sources";
import { architectureTileLevels } from "./works/diagrams";
import type { WorkItem } from "./works/types";

export { architectureTileLevels } from "./works/diagrams";
export type { BoundaryRule, PlanDocs, WorkItem } from "./works/types";

function workOf(design: DesignEntity, sources: Sources): WorkItem {
  const scope = scopeOf(design, sources);
  return {
    ...scope,
    ...decisionPartOf(scope.record, sources),
    ...pullRequestPartOf(scope.epics, sources),
    ...planPartOf(design.id, scope.slices, sources),
    ...epicDesignPartOf(scope.epics, sources.designById),
    diagramLevels: architectureTileLevels(scope.record),
  };
}

export function buildWorkItems(
  index: RecordIndex,
  records: Record<string, DesignRecord>,
): Map<string, WorkItem> {
  const sources = sourcesOf(index, records);
  return new Map(
    sources.entities.design.map((design): [string, WorkItem] => [design.id, workOf(design, sources)]),
  );
}
