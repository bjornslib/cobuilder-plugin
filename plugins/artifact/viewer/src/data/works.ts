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

import type {
  AdrEntity,
  BoundaryRuleEntity,
  ContextEntity,
  DesignEntity,
  DistrictEntity,
  EpicDesignEntity,
  EpicEntity,
  GateStep,
  ProgramDesignEntity,
  PublicationEntity,
  PullRequest,
  RecordIndex,
  SliceEntity,
} from "@/data/types";
import type { DesignRecord } from "@/data/bundle";
import { entitiesOf, joinsOf } from "@/data/bundle";

/* ------------------------------------------------------------------ the work */

export interface BoundaryRule {
  id: string;
  kind: string;
  target: string;
  why: string;
  /** Every other field the boundary record carries, so a Sheet can show them all. */
  detail: Record<string, unknown>;
  /** The context this rule belongs to. */
  context: string;
}

/**
 * One work item, and everything the index resolves about it.
 *
 * `adr_to_pull_request` is deliberately absent from the joins read below. The shell
 * shows no pull request beside a decision, so a decision's carrier has nothing to
 * feed. Do not add it back without a surface that shows one.
 */
/** A work's three plan documents, in gate order. */
export interface PlanDocs {
  product: ProgramDesignEntity | null;
  architecture: ProgramDesignEntity | null;
  program: ProgramDesignEntity | null;
}

export interface WorkItem {
  /** The design id. It is the route's `:workId`. */
  id: string;
  design: DesignEntity;
  /** The record bodies, or undefined when `designs.js` carried no entry. */
  record: DesignRecord | undefined;
  epics: EpicEntity[];
  slices: SliceEntity[];
  /** The slices of one epic, read from the `slice_to_epic` join. */
  slicesByEpic: Map<string, SliceEntity[]>;
  /** Refined epic state, read from the join and never from the entity. */
  epicState: (epic: EpicEntity) => string;
  /** The decisions this work names. `goal.adrs[]` is the source, and the shell says so. */
  linkedAdrs: AdrEntity[];
  /** Where the linked-decision list came from. */
  adrSource: "record" | "index" | "none";
  /**
   * The pull requests this work's own epics carry. This is the work's own set, and
   * `joins.epic_to_pull_request` is its only source. Section 3.3.
   */
  pullRequests: PullRequest[];
  /** Which epic named each pull request. */
  pullRequestVia: Map<number, string[]>;
  /** Publications for a pull request this work's own epics carry. Never another work's. */
  publications: PublicationEntity[];
  /** The planning slug this work's gates are keyed by. */
  planSlug: string;
  planSlugVia: "slice" | "design";
  /**
   * True when a plan directory exists for this work.
   *
   * The index carries no design-to-plan field, so the shell reads the three record kinds
   * that only a plan can carry, and it treats a slug as a real plan only when one of them
   * names it. An epic's design panel reads this to tell a work with no plan from a work
   * whose plan is simply missing one epic's document. The two need different sentences.
   */
  hasPlan: boolean;
  /** The Gates 1, 2, and 3 documents of this work's plan, or null for an absent one. */
  planDocs: PlanDocs;
  gateSteps: GateStep[] | null;
  /** Every feature slug the gate join holds. The Rubrics panel names what it did not read. */
  gateSlugs: Record<string, GateStep[]>;
  /** The Gate 4b technical solution design per epic, keyed by the epic's own id. */
  epicDesigns: Map<string, EpicDesignEntity>;
  /** How an epic design resolved. The panel that shows one names this. */
  epicDesignVia: "id" | "plan slug" | "none";
  contexts: ContextEntity[];
  districts: DistrictEntity[];
  boundaryRules: BoundaryRule[];
  /** Districts no context verifies. The index computes this list once. */
  districtsUncovered: DistrictEntity[];
  diagramLevels: string[];
}

/**
 * The planning slug, and where it came from.
 *
 * `docs/plans/<slug>/` names the plan directory, and a design id is not always that
 * slug. The index carries no design-to-slug field, so this derives the slug from the
 * ids of the design's own slices, and accepts it only when the index also holds a
 * plan record under it.
 */
function planSlugFor(
  designId: string,
  slices: SliceEntity[],
  knownSlugs: Set<string>,
): { slug: string; via: "slice" | "design" } {
  const found = new Set(
    slices.map((slice) => slice.id.split("/")[0]).filter((slug) => knownSlugs.has(slug)),
  );
  if (found.size === 1) return { slug: [...found][0], via: "slice" };
  return { slug: designId, via: "design" };
}

export function buildWorkItems(index: RecordIndex, records: Record<string, DesignRecord>) {
  const entities = entitiesOf(index);
  const joins = joinsOf(index);

  /*
   * A plan slug is a real plan only when the index holds a plan record under it. Three
   * record kinds are written only for a plan directory: a gate record, an epic's technical
   * solution design, a program design, and a plan's interaction design. A slug that none
   * of them names is a design with no plan directory.
   */
  const knownSlugs = new Set<string>([
    ...Object.keys(joins.feature_gates),
    ...entities.epic_design.map((doc) => doc.feature_slug),
    ...entities.program_design.map((doc) => doc.feature_slug),
    ...(entities.product_doc ?? []).map((doc) => doc.feature_slug),
    ...(entities.architecture_doc ?? []).map((doc) => doc.feature_slug),
    ...(entities.interaction_design ?? []).map((doc) => doc.feature_slug),
  ]);

  /*
   * The technical solution design per epic, keyed by the document's own id.
   *
   * The epic entity carries `design_doc`, and the index resolves it. Two id spaces meet
   * there: the epic's own id is design-scoped, and the document's id is plan-scoped, so
   * `plugin-split/E1` and `cobuilder-family/E1` name one document between them. The join
   * is done upstream, in the index, and the shell reads its answer rather than rebuilding
   * a key of its own.
   */
  const designById = new Map(entities.epic_design.map((doc) => [doc.id, doc]));

  const byDesign = new Map<string, EpicEntity[]>();
  for (const epic of entities.epic) {
    const list = byDesign.get(epic.design);
    if (list) list.push(epic);
    else byDesign.set(epic.design, [epic]);
  }

  const slicesByEpic = new Map<string, SliceEntity[]>();
  for (const slice of entities.slice) {
    const epicId = joins.slice_to_epic[slice.id];
    if (!epicId) continue;
    const list = slicesByEpic.get(epicId);
    if (list) list.push(slice);
    else slicesByEpic.set(epicId, [slice]);
  }

  const adrById = new Map(entities.adr.map((adr) => [adr.id, adr]));
  const prById = new Map(entities.pull_request.map((pr) => [pr.id, pr]));
  const contextById = new Map(entities.context.map((c) => [c.id, c]));
  const districtById = new Map(entities.district.map((d) => [d.id, d]));

  const works = new Map<string, WorkItem>();

  for (const design of entities.design) {
    const record = records[design.id];
    const epics = (byDesign.get(design.id) ?? [])
      .slice()
      .sort((a, b) => a.epic_id.localeCompare(b.epic_id, undefined, { numeric: true }));
    const slices: SliceEntity[] = [];
    for (const epic of epics) slices.push(...(slicesByEpic.get(epic.id) ?? []));
    slices.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

    /*
     * The goal is optional on the shipped record type, because a derived record file may
     * omit it. The corpus always writes one, so the chain below changes no corpus read.
     */
    const named = record?.goal?.adrs ?? [];
    const linkedIds = named.length > 0 ? named : record?.goal?.adr ? [record.goal.adr] : [];
    const linkedAdrs = linkedIds
      .map((id) => adrById.get(id))
      .filter((adr): adr is AdrEntity => adr !== undefined);
    const adrSource: WorkItem["adrSource"] =
      named.length > 0 ? "record" : linkedIds.length > 0 ? "record" : "none";

    /*
     * The work's own pull-request set. Section 3.3 states the rule: this reads
     * `epic_to_pull_request` for this work's own epics, and nothing else. A pull
     * request a decision reached is not the work's pull request, so
     * `adr_to_pull_request` never feeds this map.
     */
    const via = new Map<number, string[]>();
    for (const epic of epics) {
      const pr = joins.epic_to_pull_request[epic.id];
      if (typeof pr !== "number") continue;
      const list = via.get(pr);
      if (list) list.push(epic.epic_id);
      else via.set(pr, [epic.epic_id]);
    }
    const pullRequests = [...via.keys()]
      .sort((a, b) => a - b)
      .map((n) => prById.get(n))
      .filter((pr): pr is PullRequest => pr !== undefined);

    /* The contexts and districts the linked decisions land in. */
    const contextIds = new Set<string>();
    const districtIds = new Set<string>();
    for (const adr of linkedAdrs) {
      const context = joins.adr_to_context[adr.id];
      if (context) contextIds.add(context);
      const district = joins.adr_to_district[adr.id];
      if (district) districtIds.add(district);
    }
    const contexts = [...contextIds]
      .map((id) => contextById.get(id))
      .filter((c): c is ContextEntity => c !== undefined);
    const districts = [...districtIds]
      .map((id) => districtById.get(id))
      .filter((d): d is DistrictEntity => d !== undefined);

    const boundaryRules: BoundaryRule[] = entities.boundary_rule
      .filter((rule) => contextIds.has(rule.context))
      .map((rule: BoundaryRuleEntity) => {
        const detail = rule.detail as Record<string, unknown>;
        const target = typeof detail.target === "string" ? detail.target : rule.id;
        const why = typeof detail.why === "string" ? detail.why : "";
        return { id: rule.id, kind: rule.kind, target, why, detail, context: rule.context };
      });

    const plan = planSlugFor(design.id, slices, knownSlugs);

    /*
     * The Gate 4b technical solution design for each epic of this work. The index resolves
     * the document id onto the epic, and this reads the answer. Which id space matched is
     * kept, because the panel that shows a document states its source.
     */
    let epicDesignVia: WorkItem["epicDesignVia"] = "none";
    const epicDesigns = new Map<string, EpicDesignEntity>();
    for (const epic of epics) {
      const key = epic.design_doc;
      if (!key) continue;
      const doc = designById.get(key);
      if (!doc) continue;
      epicDesigns.set(epic.id, doc);
      epicDesignVia = key === epic.id ? "id" : "plan slug";
    }

    /* Publications for this work's own pull requests, and never for another work's. */
    const publications = entities.publication.filter(
      (p) => typeof p.pull_request === "number" && via.has(p.pull_request),
    );

    works.set(design.id, {
      id: design.id,
      design,
      record,
      epics,
      slices,
      slicesByEpic,
      epicState: (epic) => joins.epic_status[epic.id] ?? epic.state,
      linkedAdrs,
      adrSource,
      pullRequests,
      pullRequestVia: via,
      publications,
      planSlug: plan.slug,
      planSlugVia: plan.via,
      hasPlan: knownSlugs.has(plan.slug),
      planDocs: {
        product: (entities.product_doc ?? []).find((d) => d.feature_slug === plan.slug) ?? null,
        architecture:
          (entities.architecture_doc ?? []).find((d) => d.feature_slug === plan.slug) ?? null,
        program: entities.program_design.find((d) => d.feature_slug === plan.slug) ?? null,
      },
      gateSteps: joins.feature_gates[plan.slug] ?? null,
      gateSlugs: joins.feature_gates,
      epicDesigns,
      epicDesignVia,
      contexts,
      districts,
      boundaryRules,
      districtsUncovered: joins.district_uncovered
        .map((id) => districtById.get(id))
        .filter((d): d is DistrictEntity => d !== undefined),
      diagramLevels: record?.diagrams
        ? Object.keys(record.diagrams).sort((a, b) => Number(a) - Number(b))
        : [],
    });
  }

  return works;
}
