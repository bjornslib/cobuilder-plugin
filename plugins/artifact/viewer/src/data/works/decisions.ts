import type { AdrEntity, BoundaryRuleEntity, DistrictEntity } from "@/data/types";
import type { DesignGoal, DesignRecord } from "@/data/bundle";
import { presentOf } from "../grouping";
import type { Sources } from "./sources";
import type { BoundaryRule, WorkPart } from "./types";

/*
 * The goal is optional on the shipped record type, because a derived record file may
 * omit it. The corpus always writes one, so the chain below changes no corpus read.
 */
function linkedIdsOf(goal: DesignGoal | undefined): string[] {
  const own = goal?.adr ? [goal.adr] : [];
  const fromEpics = (goal?.epics ?? []).flatMap((row) => (row.adr ? [row.adr] : []));
  return [...new Set([...(goal?.adrs ?? []), ...own, ...fromEpics])];
}

function joinedIds(adrs: AdrEntity[], table: Record<string, string>): Set<string> {
  const ids = new Set<string>();
  for (const adr of adrs) {
    const id = table[adr.id];
    if (id) ids.add(id);
  }
  return ids;
}

function boundaryRuleOf(rule: BoundaryRuleEntity): BoundaryRule {
  const detail = rule.detail as Record<string, unknown>;
  const target = typeof detail.target === "string" ? detail.target : rule.id;
  const why = typeof detail.why === "string" ? detail.why : "";
  return { id: rule.id, kind: rule.kind, target, why, detail, context: rule.context };
}

type Landing = WorkPart<"contexts" | "districts" | "boundaryRules">;

/* The contexts and districts the linked decisions land in. */
function landingOf(linkedAdrs: AdrEntity[], sources: Sources): Landing {
  const contextIds = joinedIds(linkedAdrs, sources.joins.adr_to_context);
  const districtIds = joinedIds(linkedAdrs, sources.joins.adr_to_district);
  return {
    contexts: presentOf(contextIds, sources.contextById),
    districts: presentOf(districtIds, sources.districtById),
    boundaryRules: sources.entities.boundary_rule
      .filter((rule) => contextIds.has(rule.context))
      .map(boundaryRuleOf),
  };
}

type DecisionPart = WorkPart<
  "linkedAdrs" | "adrSource" | "districtsUncovered" | "contexts" | "districts" | "boundaryRules"
>;

export function decisionPartOf(record: DesignRecord | undefined, sources: Sources): DecisionPart {
  const linkedIds = linkedIdsOf(record?.goal);
  const linkedAdrs = presentOf(linkedIds, sources.adrById);
  return {
    linkedAdrs,
    adrSource: linkedIds.length > 0 ? "record" : "none",
    districtsUncovered: sources.joins.district_uncovered
      .map((id) => sources.districtById.get(id))
      .filter((d): d is DistrictEntity => d !== undefined),
    ...landingOf(linkedAdrs, sources),
  };
}
