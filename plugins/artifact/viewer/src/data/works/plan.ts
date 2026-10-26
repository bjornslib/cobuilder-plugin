import type { EpicDesignEntity, EpicEntity, Entities, SliceEntity } from "@/data/types";
import type { Sources } from "./sources";
import type { PlanDocs, WorkPart } from "./types";

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

function planDocsFor(slug: string, entities: Entities): PlanDocs {
  return {
    product: (entities.product_doc ?? []).find((d) => d.feature_slug === slug) ?? null,
    architecture: (entities.architecture_doc ?? []).find((d) => d.feature_slug === slug) ?? null,
    program: entities.program_design.find((d) => d.feature_slug === slug) ?? null,
  };
}

type PlanRecords = WorkPart<"planDocs" | "gateSteps" | "gateSlugs" | "rubrics" | "rubricBySlice">;

function planRecordsOf(slug: string, sources: Sources): PlanRecords {
  const rubrics = sources.rubricsBySlug.get(slug) ?? [];
  return {
    planDocs: planDocsFor(slug, sources.entities),
    gateSteps: sources.joins.feature_gates[slug] ?? null,
    gateSlugs: sources.joins.feature_gates,
    rubrics,
    rubricBySlice: new Map(rubrics.map((rubric) => [rubric.id, rubric])),
  };
}

type PlanPart = WorkPart<"planSlug" | "planSlugVia" | "hasPlan"> & PlanRecords;

export function planPartOf(designId: string, slices: SliceEntity[], sources: Sources): PlanPart {
  const plan = planSlugFor(designId, slices, sources.knownSlugs);
  return {
    planSlug: plan.slug,
    planSlugVia: plan.via,
    hasPlan: sources.knownSlugs.has(plan.slug),
    ...planRecordsOf(plan.slug, sources),
  };
}

interface DesignMatch {
  epic: EpicEntity;
  doc: EpicDesignEntity;
}

function matchOf(epic: EpicEntity, designById: Map<string, EpicDesignEntity>): DesignMatch[] {
  const key = epic.design_doc;
  const doc = key ? designById.get(key) : undefined;
  return doc ? [{ epic, doc }] : [];
}

type EpicDesignPart = WorkPart<"epicDesigns" | "epicDesignVia">;

/*
 * The Gate 4b technical solution design for each epic of this work. The index resolves
 * the document id onto the epic, and this reads the answer. Which id space matched is
 * kept, because the panel that shows a document states its source.
 */
export function epicDesignPartOf(
  epics: EpicEntity[],
  designById: Map<string, EpicDesignEntity>,
): EpicDesignPart {
  const matches = epics.flatMap((epic) => matchOf(epic, designById));
  const last = matches.at(-1);
  return {
    epicDesigns: new Map(matches.map((m): [string, EpicDesignEntity] => [m.epic.id, m.doc])),
    epicDesignVia: last ? (last.epic.design_doc === last.epic.id ? "id" : "plan slug") : "none",
  };
}
