/**
 * What the shell derives, and the two rules it derives from.
 *
 *   The shell renders. It never computes. Every count, state, and join comes from
 *   `data/index.json`, per interaction-design section 1.1 principle 6.
 *
 * So this file holds no new truth. It reads the joins the index already resolved,
 * narrows them to one work item, and answers two questions the rail asks:
 *
 *   1. Which sections does this work fill? A section the work cannot fill is absent,
 *      not empty. Section 3.3 states each rule.
 *   2. Which levels does this work fill? A level whose record is absent stays in the
 *      rail and reads disabled, because the gap is a fact the reader needs in place.
 *
 * The one value that does not come from `index.json` is the linked-decision list. It
 * comes from `goal.adrs[]` in `designs.js`, and `WorkItem.adrSource` says so.
 */

import type {
  AdrEntity,
  BoundaryRuleEntity,
  ContextEntity,
  DesignEntity,
  DistrictEntity,
  EpicEntity,
  GateStep,
  PublicationEntity,
  PullRequestEntity,
  RecordIndex,
  SliceEntity,
} from "@/data/types";
import { entitiesOf, joinsOf } from "@/data/bundle";

import type { DesignRecord, NarrativeBeat } from "./records";

export const SECTION_KEYS = [
  "intent",
  "problem-and-solution",
  "architecture",
  "build",
  "pull-requests",
  "shipped",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const LEVEL_KEYS = ["intent", "problem-and-solution", "architecture"] as const;
export type LevelKey = (typeof LEVEL_KEYS)[number];

export function isSectionKey(value: string): value is SectionKey {
  return (SECTION_KEYS as readonly string[]).includes(value);
}

/** The rail's label for a section. One name for one thing, used everywhere. */
export const SECTION_LABEL: Record<SectionKey, string> = {
  intent: "Intent",
  "problem-and-solution": "Problem & Solution",
  architecture: "Architecture",
  build: "Build",
  "pull-requests": "Pull requests",
  shipped: "Shipped",
};

/* ------------------------------------------------------------------ the work */

export interface BoundaryRule {
  id: string;
  kind: string;
  target: string;
  why: string;
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
  /** The resolved pull request for an epic, read from the join. */
  epicPr: (epic: EpicEntity) => number | null;
  /** The decisions this work names. `goal.adrs[]` is the source, and the shell says so. */
  linkedAdrs: AdrEntity[];
  /** Where the linked-decision list came from. */
  adrSource: "record" | "index" | "none";
  pullRequests: PullRequestEntity[];
  /** Which join named each pull request. */
  pullRequestVia: Map<number, string[]>;
  publications: PublicationEntity[];
  /** The planning slug this work's gates are keyed by. */
  planSlug: string;
  planSlugVia: "slice" | "design";
  gateSteps: GateStep[] | null;
  /** Every feature slug the gate join holds. The Rubrics panel names what it did not read. */
  gateSlugs: Record<string, GateStep[]>;
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

  /* A plan slug is accepted only when the index holds a plan record under it. */
  const knownSlugs = new Set<string>([
    ...Object.keys(joins.feature_gates),
    ...entities.epic_design.map((doc) => doc.feature_slug),
    ...entities.program_design.map((doc) => doc.feature_slug),
  ]);

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

    const named = record?.goal.adrs ?? [];
    const linkedIds = named.length > 0 ? named : record?.goal.adr ? [record.goal.adr] : [];
    const linkedAdrs = linkedIds
      .map((id) => adrById.get(id))
      .filter((adr): adr is AdrEntity => adr !== undefined);
    const adrSource: WorkItem["adrSource"] =
      named.length > 0 ? "record" : linkedIds.length > 0 ? "record" : "none";

    /* The pull-request set. Two joins can name one, and both are recorded. */
    const via = new Map<number, string[]>();
    const addVia = (n: number, how: string) => {
      const list = via.get(n);
      if (list) list.push(how);
      else via.set(n, [how]);
    };
    for (const epic of epics) {
      const pr = joins.epic_to_pull_request[epic.id];
      if (typeof pr === "number") addVia(pr, `epic ${epic.epic_id}`);
    }
    for (const adr of linkedAdrs) {
      const link = joins.adr_to_pull_request[adr.id];
      if (link && typeof link.pr === "number") addVia(link.pr, `${adr.id} (${link.via})`);
    }
    const pullRequests = [...via.keys()]
      .sort((a, b) => a - b)
      .map((n) => prById.get(n))
      .filter((pr): pr is PullRequestEntity => pr !== undefined);

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
        return { id: rule.id, kind: rule.kind, target, why };
      });

    const plan = planSlugFor(design.id, slices, knownSlugs);
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
      epicPr: (epic) => {
        const joined = joins.epic_to_pull_request[epic.id];
        if (typeof joined === "number") return joined;
        return typeof epic.pr === "number" ? epic.pr : null;
      },
      linkedAdrs,
      adrSource,
      pullRequests,
      pullRequestVia: via,
      publications,
      planSlug: plan.slug,
      planSlugVia: plan.via,
      gateSteps: joins.feature_gates[plan.slug] ?? null,
      gateSlugs: joins.feature_gates,
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

/* ------------------------------------------------------------------- gating */

export interface Gates {
  build: boolean;
  pullRequests: boolean;
  shipped: boolean;
  rubrics: boolean;
  /** The gate steps the index holds for this feature, or null when it holds none. */
  gateSteps: GateStep[] | null;
}

/**
 * The section rules of section 3.3, each stated once and nowhere else.
 *
 * A section that fails its rule is absent from the rail. It is never disabled,
 * because an empty section wastes a click.
 */
export function gatesOf(work: WorkItem): Gates {
  const implemented = work.design.stage === "implemented";
  return {
    build: work.epics.length >= 1,
    pullRequests: work.pullRequests.length >= 1,
    shipped: implemented || work.publications.length >= 1,
    /*
     * The Rubrics item always renders, and it states that no gate record exists when
     * the join is empty. A missing record must not read as a pass, so the flag below
     * means "the join holds a record", never "the gate passed".
     */
    rubrics: work.gateSteps !== null && work.gateSteps.length > 0,
    gateSteps: work.gateSteps,
  };
}

/* ------------------------------------------------------------------- levels */

export interface LevelState {
  key: LevelKey;
  /** True when the work fills the level. False turns the rail item disabled. */
  available: boolean;
  /** The records the level could not read. Empty when the level is available. */
  missing: string[];
}

/** Which beats belong in which column of the Problem and solution panel. */
export const PROBLEM_KINDS = ["problem", "constraint"] as const;
export const SOLUTION_KINDS = ["decision", "risk"] as const;

export function splitBeats(beats: NarrativeBeat[] | undefined) {
  const list = beats ?? [];
  return {
    problem: list.filter((beat) => (PROBLEM_KINDS as readonly string[]).includes(beat.kind)),
    solution: list.filter((beat) => (SOLUTION_KINDS as readonly string[]).includes(beat.kind)),
    other: list.filter(
      (beat) =>
        !(PROBLEM_KINDS as readonly string[]).includes(beat.kind) &&
        !(SOLUTION_KINDS as readonly string[]).includes(beat.kind),
    ),
  };
}

/**
 * Which levels this work fills, and what each one could not read.
 *
 * Intent reads the goal record, so it is available whenever the record file loaded.
 * Its contract columns carry their own absences, and `abort_if` is empty in much of
 * the corpus. Problem and solution needs one of five authored fields. Architecture
 * needs one linked decision, one diagram, or one named district.
 */
export function levelsOf(work: WorkItem): Record<LevelKey, LevelState> {
  const record = work.record;

  const ps = record?.narrative?.problem_solution;
  const psPresent = Boolean(
    record?.intent?.problem ||
      record?.intent?.approach ||
      (record?.intent?.risks ?? []).length > 0 ||
      (record?.intent?.unknowns ?? []).length > 0 ||
      (record?.intent?.alternatives ?? []).length > 0 ||
      (ps?.beats ?? []).length > 0 ||
      record?.assessment?.verdict,
  );

  const archPresent =
    work.linkedAdrs.length > 0 ||
    work.diagramLevels.length > 0 ||
    work.districts.length > 0 ||
    work.boundaryRules.length > 0;

  const recordFile = "designs.js";

  return {
    intent: {
      key: "intent",
      available: record !== undefined,
      missing: record === undefined ? [recordFile] : [],
    },
    "problem-and-solution": {
      key: "problem-and-solution",
      available: psPresent,
      missing: psPresent
        ? []
        : [
            ...(record?.intent ? [] : ["intent.json"]),
            ...(record?.narrative ? [] : ["narrative.json"]),
            ...(record?.assessment ? [] : ["assessment.json"]),
          ],
    },
    architecture: {
      key: "architecture",
      available: archPresent,
      missing: archPresent
        ? []
        : [
            "no linked decision in goal.adrs[]",
            "no diagram level",
            "no district named by a linked decision",
          ],
    },
  };
}

/* ------------------------------------------------------------- work switcher */

export interface SwitcherDesign {
  id: string;
  name: string;
  stage: string;
  epicCount: number;
}

export interface SwitcherEpic {
  id: string;
  design: string;
  epicId: string;
  state: string;
}

export function switcherList(works: Map<string, WorkItem>) {
  const designs: SwitcherDesign[] = [];
  const epics: SwitcherEpic[] = [];
  for (const work of works.values()) {
    designs.push({
      id: work.id,
      name: work.design.name,
      stage: work.design.stage,
      epicCount: work.epics.length,
    });
    for (const epic of work.epics) {
      epics.push({
        id: epic.id,
        design: epic.design,
        epicId: epic.epic_id,
        state: work.epicState(epic),
      });
    }
  }
  designs.sort((a, b) => a.id.localeCompare(b.id));
  return { designs, epics };
}

/* ------------------------------------------------------------------- routes */

export interface Route {
  workId: string | null;
  section: SectionKey;
  /** `build/epics/:epicId`, `build/slices/:sliceId`, or `pull-requests/:n`. */
  sub: string | null;
  subId: string | null;
}

const ROUTE_PREFIX = "#/shell";

export function readRoute(): Route {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  const rest = parts[0] === "shell" ? parts.slice(1) : [];
  const [workId, section, sub, subId] = rest;
  return {
    workId: workId ?? null,
    section: section && isSectionKey(section) ? section : "intent",
    sub: sub ?? null,
    subId: subId ?? null,
  };
}

export function routeHref(workId: string, section: SectionKey, tail?: string): string {
  return `${ROUTE_PREFIX}/${workId}/${section}${tail ? `/${tail}` : ""}`;
}
