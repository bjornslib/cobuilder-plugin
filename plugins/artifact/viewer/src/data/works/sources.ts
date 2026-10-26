import type {
  AdrEntity,
  ContextEntity,
  DistrictEntity,
  Entities,
  EpicDesignEntity,
  EpicEntity,
  Joins,
  PullRequest,
  RecordIndex,
  RubricEntity,
  SliceEntity,
} from "@/data/types";
import { entitiesOf, joinsOf, type DesignRecord } from "@/data/bundle";
import { groupBy } from "../grouping";

export interface Sources {
  entities: Entities;
  joins: Joins;
  records: Record<string, DesignRecord>;
  knownSlugs: Set<string>;
  designById: Map<string, EpicDesignEntity>;
  rubricsBySlug: Map<string, RubricEntity[]>;
  epicsByDesign: Map<string, EpicEntity[]>;
  slicesByEpic: Map<string, SliceEntity[]>;
  adrById: Map<string, AdrEntity>;
  prById: Map<number, PullRequest>;
  contextById: Map<string, ContextEntity>;
  districtById: Map<string, DistrictEntity>;
}

/*
 * A plan slug is a real plan only when the index holds a plan record under it. Three
 * record kinds are written only for a plan directory: a gate record, an epic's technical
 * solution design, a program design, and a plan's interaction design. A slug that none
 * of them names is a design with no plan directory.
 */
function knownSlugsOf(entities: Entities, joins: Joins): Set<string> {
  return new Set<string>([
    ...Object.keys(joins.feature_gates),
    ...entities.epic_design.map((doc) => doc.feature_slug),
    ...entities.program_design.map((doc) => doc.feature_slug),
    ...(entities.product_doc ?? []).map((doc) => doc.feature_slug),
    ...(entities.architecture_doc ?? []).map((doc) => doc.feature_slug),
    ...(entities.interaction_design ?? []).map((doc) => doc.feature_slug),
  ]);
}

type Groups = Pick<Sources, "rubricsBySlug" | "epicsByDesign" | "slicesByEpic">;

/*
 * The rubric documents of each plan slug, in slice order. One map for every work,
 * because each work reads the slice of it its own plan slug names, the same way
 * `planDocs` resolves below.
 */
function groupsOf(entities: Entities, joins: Joins): Groups {
  const rubricsBySlug = groupBy(entities.rubric ?? [], (rubric) => rubric.feature_slug);
  for (const list of rubricsBySlug.values()) list.sort((a, b) => a.n - b.n);
  return {
    rubricsBySlug,
    epicsByDesign: groupBy(entities.epic, (epic) => epic.design),
    slicesByEpic: groupBy(entities.slice, (slice) => joins.slice_to_epic[slice.id] || undefined),
  };
}

type Lookups = Pick<Sources, "designById" | "adrById" | "prById" | "contextById" | "districtById">;

/*
 * The technical solution design per epic, keyed by the document's own id.
 *
 * The epic entity carries `design_doc`, and the index resolves it. Two id spaces meet
 * there: the epic's own id is design-scoped, and the document's id is plan-scoped, so
 * `plugin-split/E1` and `cobuilder-family/E1` name one document between them. The join
 * is done upstream, in the index, and the shell reads its answer rather than rebuilding
 * a key of its own.
 */
function lookupsOf(entities: Entities): Lookups {
  return {
    designById: new Map(entities.epic_design.map((doc) => [doc.id, doc])),
    adrById: new Map(entities.adr.map((adr) => [adr.id, adr])),
    prById: new Map(entities.pull_request.map((pr) => [pr.id, pr])),
    contextById: new Map(entities.context.map((c) => [c.id, c])),
    districtById: new Map(entities.district.map((d) => [d.id, d])),
  };
}

export function sourcesOf(index: RecordIndex, records: Record<string, DesignRecord>): Sources {
  const entities = entitiesOf(index);
  const joins = joinsOf(index);
  return {
    entities,
    joins,
    records,
    knownSlugs: knownSlugsOf(entities, joins),
    ...groupsOf(entities, joins),
    ...lookupsOf(entities),
  };
}
