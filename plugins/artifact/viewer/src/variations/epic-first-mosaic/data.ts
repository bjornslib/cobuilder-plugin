/**
 * What this variation reads, and where each value comes from.
 *
 * Two readers feed the board, and both follow the sibling access path that
 * `src/data/bundle.ts` documents:
 *
 *   `index.json` → `loadIndex()` from `@/data/bundle`. Every entity and every join.
 *   `designs.js` → `loadDesigns()` here. `window.DESIGNS`, one record per design,
 *                  holding the goal, intent, narrative, assessment, diagrams, and
 *                  the pull-request draft that a reader would otherwise open by hand.
 *
 * `bundle.ts` wires `index.json` and deliberately stops there, and this variation may
 * not edit it. So `loadDesigns()` lives here. It inlines nothing and derives nothing:
 * it appends the same `<script src>` tag the shipped viewer appends, and reads the
 * global that tag assigns, which is also the global a published Artifact inlines.
 *
 * A design whose record file did not load reads as an empty record, and every surface
 * that shows a missing record says so. Nothing here invents a value to fill a gap.
 */

import { BUNDLE_DATA_URL } from "@/data/bundle";
import type {
  Entities,
  EpicDesignEntity,
  EpicEntity,
  Joins,
  ProgramDesignEntity,
  PullRequestEntity,
  SliceEntity,
} from "@/data/types";

export const DESIGNS_URL = `${BUNDLE_DATA_URL}designs.js`;

/* ------------------------------------------------------------------ records */

export interface EpicPlanRow {
  id: string;
  slug?: string;
  branch: string | null;
  pr: number | null;
  state: string;
  note?: string | null;
  outcome?: string;
}

export interface DesignGoal {
  name: string;
  title: string;
  created: string;
  outcome: string;
  done_when?: string[];
  abort_if?: string[];
  min_work?: {
    derived_from?: string;
    alternatives_explored?: number;
    boundary_rules_checked?: boolean;
    challenge_stage_run?: boolean;
    note?: string;
  };
  limits?: { warn_after_rounds?: number; cutoff_rounds?: number };
  epics?: EpicPlanRow[];
  stage: string;
  supersedes: string[] | null;
  /** Present when a later design closed this one. The authority for "superseded by". */
  superseded_by?: string;
  superseded_note?: string;
  adr: string | null;
  adrs: string[];
  rounds?: Array<{ n: number; changed: boolean; feedback_class: string }>;
}

export interface DesignIntent {
  problem?: string;
  approach?: string;
  alternatives?: Array<{ option: string; rejected_because: string }>;
  authorship?: string;
  captured?: string;
  design_name?: string;
  out_of_scope?: string[];
  reviewer_focus?: string[];
  risks?: string[];
  testing?: string;
  unknowns?: string[];
  why_now?: string;
  doubts?: string[];
}

export interface AssessmentFinding {
  kind: string;
  id?: string;
  title: string;
  detail: string;
  severity?: string;
  cites?: string;
  rule?: string;
  result?: string;
  note?: string;
}

export interface DesignAssessment {
  verdict: string;
  findings?: AssessmentFinding[];
  boundary_checks?: AssessmentFinding[];
  drift?: AssessmentFinding[];
  constraint_introduced?: string;
  regret_risk?: string;
  risk_tier?: string;
  stage?: string;
  summary?: string;
  captured?: string;
  assessed?: string;
  design_name?: string;
}

export interface NarrativeBlock {
  tagline?: string;
  narration?: string;
}

export interface DesignNarrative {
  landscape?: NarrativeBlock;
  problem_solution?: { problem?: string; solution?: string };
  architecture?: NarrativeBlock;
  /** `review-flight-deck` carries this shape instead of the three above. */
  levels?: Record<string, NarrativeBlock>;
  design_name?: string;
}

export interface DesignRecord {
  goal: DesignGoal;
  intent?: DesignIntent;
  assessment?: DesignAssessment;
  narrative?: DesignNarrative;
  /** Mermaid source, keyed by level number as a string: `"1"`, `"2"`, `"3"`. */
  diagrams?: Record<string, string>;
  pr_draft?: string;
}

export type DesignRecords = Record<string, DesignRecord>;

function isDesignRecords(value: unknown): value is DesignRecords {
  if (typeof value !== "object" || value === null) return false;
  const first = Object.values(value as DesignRecords)[0];
  return typeof first === "object" && first !== null && "goal" in first;
}

function readInlined(): DesignRecords | undefined {
  const holder = window as unknown as { DESIGNS?: unknown };
  return isDesignRecords(holder.DESIGNS) ? holder.DESIGNS : undefined;
}

let pending: Promise<DesignRecords> | null = null;

/** Read the per-design records, from the inlined global or from the served bundle. */
export function loadDesigns(): Promise<DesignRecords> {
  const inlined = readInlined();
  if (inlined) return Promise.resolve(inlined);
  if (pending) return pending;

  pending = new Promise<DesignRecords>((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = DESIGNS_URL;
    tag.async = true;
    tag.onload = () => {
      const loaded = readInlined();
      if (loaded) resolve(loaded);
      else {
        pending = null;
        reject(
          new Error(
            `${DESIGNS_URL} loaded but assigned no window.DESIGNS. The file is a ` +
              `sibling under data/, and it assigns one global.`,
          ),
        );
      }
    };
    tag.onerror = () => {
      pending = null;
      reject(
        new Error(
          `The dev server did not serve ${DESIGNS_URL}. Check that the bundle ` +
            `exists at .cobuilder-architect/self/ and that npm run dev is the ` +
            `server you are reading.`,
        ),
      );
    };
    document.head.appendChild(tag);
  });

  return pending;
}

/* -------------------------------------------------------------------- slots */

export const RECORD_SLOTS = [
  "goal",
  "intent",
  "narrative",
  "assessment",
  "diagrams",
  "pr-draft",
] as const;

export type RecordSlot = (typeof RECORD_SLOTS)[number];

export interface SlotState {
  /** The slot's short name: `goal`, `intent`, `design document`, `slices`, and so on. */
  slot: string;
  present: boolean;
  detail: string;
}

const SLOT_ABSENT: Record<RecordSlot, string> = {
  goal: "The index lists a design only when a goal.json exists, so this slot is always present.",
  intent: "No intent.json in this design's directory.",
  narrative: "No narrative.json in this design's directory.",
  assessment: "No assessment.json in this design's directory.",
  diagrams: "No diagrams/ directory, or it holds no level-N.mmd file.",
  "pr-draft": "No pr-draft.md in this design's directory.",
};

function countLabel(n: number, one: string): string {
  return `${n} ${n === 1 ? one : `${one}s`}`;
}

/** Which of the six authored records this design carries. */
export function recordSlots(record: DesignRecord | undefined): SlotState[] {
  const levels = record?.diagrams ? Object.keys(record.diagrams) : [];
  const draft = record?.pr_draft ?? "";

  return RECORD_SLOTS.map((slot) => {
    let present = false;
    let detail = SLOT_ABSENT[slot];
    if (slot === "goal") {
      present = record !== undefined;
      detail = record
        ? `goal.json, created ${record.goal.created}.`
        : "The index lists this design, and no record file loaded for it.";
    } else if (slot === "intent") {
      present = record?.intent !== undefined;
      if (present) detail = "intent.json. The problem, the approach, and the alternatives.";
    } else if (slot === "narrative") {
      present = record?.narrative !== undefined;
      if (present) detail = "narrative.json. The three narrated levels.";
    } else if (slot === "assessment") {
      present = record?.assessment !== undefined;
      if (present) {
        const n = (record?.assessment?.findings ?? []).length;
        detail = `assessment.json, verdict ${record?.assessment?.verdict}, ${countLabel(n, "finding")}.`;
      }
    } else if (slot === "diagrams") {
      present = levels.length > 0;
      if (present) detail = `diagrams/, ${countLabel(levels.length, "level")}.`;
    } else {
      present = draft.trim().length > 0;
      if (present) {
        const lines = draft.trim().split("\n").length;
        detail = `pr-draft.md, ${countLabel(lines, "line")}.`;
      }
    }
    return { slot, present, detail };
  });
}

/* ------------------------------------------------------------------- joins */

/**
 * A design's plan slug, and where the slug came from.
 *
 * `docs/plans/<slug>/` names the plan directory, and the design id is not always the
 * slug: `plugin-split` owns `docs/plans/cobuilder-family/`. The index carries no
 * design-to-slug field, so the slug is derived from the ids of the design's own
 * slices, which carry the plan slug as their id prefix. A derived slug is accepted
 * only when the index also holds a plan record under it. When nothing derives, the
 * board falls back to the design id and says so.
 */
export interface PlanSlug {
  slug: string;
  via: "slice" | "design";
}

export function planSlugs(entities: Entities, joins: Joins): Map<string, PlanSlug> {
  const designOfEpic = new Map<string, string>();
  for (const epic of entities.epic) designOfEpic.set(epic.id, epic.design);

  const candidates = new Map<string, Set<string>>();
  for (const slice of entities.slice) {
    const epicId = joins.slice_to_epic[slice.id];
    if (!epicId) continue;
    const designId = designOfEpic.get(epicId);
    if (!designId) continue;
    const prefix = slice.id.split("/")[0];
    if (prefix === designId) continue;
    const set = candidates.get(designId) ?? new Set<string>();
    set.add(prefix);
    candidates.set(designId, set);
  }

  const known = new Set<string>([
    ...Object.keys(joins.feature_gates),
    ...entities.epic_design.map((doc) => doc.feature_slug),
    ...entities.program_design.map((doc) => doc.feature_slug),
  ]);

  const out = new Map<string, PlanSlug>();
  for (const design of entities.design) {
    const found = [...(candidates.get(design.id) ?? [])].filter((slug) =>
      known.has(slug),
    );
    out.set(
      design.id,
      found.length === 1
        ? { slug: found[0], via: "slice" }
        : { slug: design.id, via: "design" },
    );
  }
  return out;
}

/** The epic's refined state. The join is the refined value; `epic.state` is not. */
export function refinedStatus(epic: EpicEntity, joins: Joins): string {
  return joins.epic_status[epic.id] ?? epic.state;
}

/** The epic's pull request. The join is the resolved value; `epic.pr` is not. */
export function epicPr(epic: EpicEntity, joins: Joins): number | null {
  const joined = joins.epic_to_pull_request[epic.id];
  if (typeof joined === "number") return joined;
  return typeof epic.pr === "number" ? epic.pr : null;
}

const ADR_CITE = /ADR-\d{4}/g;

/** The decision ids the epic design document names in its own text. */
export function citedAdrs(doc: EpicDesignEntity | null): string[] {
  if (!doc) return [];
  const found = doc.body_md.match(ADR_CITE) ?? [];
  return [...new Set(found)].sort();
}

export interface EpicDetail {
  epic: EpicEntity;
  status: string;
  pr: number | null;
  pullRequest: PullRequestEntity | null;
  slices: SliceEntity[];
  /** The Gate 4b document, matched on the epic id and the design's plan slug. */
  doc: EpicDesignEntity | null;
  /** What the index's own `design_doc` field says. Shown when the two disagree. */
  indexPath: string | null;
  cited: string[];
  /**
   * The goal record's own row for this epic: its outcome line and its slug.
   *
   * The index's epic entity carries no outcome. The goal record does, and `designs.js`
   * is where the bundle projects it. A null here means the record file did not load, or
   * the goal carries no row for this epic id. The two cases read differently on screen.
   */
  planRow: EpicPlanRow | null;
}

export function epicDetail(
  epic: EpicEntity,
  joins: Joins,
  slicesByEpic: Map<string, SliceEntity[]>,
  pullRequests: Map<number, PullRequestEntity>,
  docsByFeature: Map<string, EpicDesignEntity[]>,
  plan: PlanSlug,
  planRow: EpicPlanRow | null,
): EpicDetail {
  const pr = epicPr(epic, joins);
  const doc =
    (docsByFeature.get(plan.slug) ?? []).find(
      (candidate) => candidate.epic_id === epic.epic_id,
    ) ?? null;
  return {
    epic,
    status: refinedStatus(epic, joins),
    pr,
    pullRequest: pr === null ? null : (pullRequests.get(pr) ?? null),
    slices: slicesByEpic.get(epic.id) ?? [],
    doc,
    indexPath: epic.design_doc ?? null,
    cited: citedAdrs(doc),
    planRow,
  };
}

/**
 * Which of the four records an epic can carry are present.
 *
 * The design strip answers "six of six". This answers the same question one level
 * down, and it is what makes an epic with no design document a visible state rather
 * than an empty box. `indexPath` is the index's own `design_doc` field, which the
 * board shows when it disagrees with the resolved document.
 */
export function epicSlots(detail: EpicDetail, plan: PlanSlug): SlotState[] {
  const docPath = `docs/plans/${plan.slug}/epic-${detail.epic.epic_id}-design.md`;
  const slices = detail.slices;

  return [
    {
      slot: "goal row",
      present: true,
      detail: `${detail.epic.id} in the record index, recorded as ${detail.epic.epic_id}.`,
    },
    {
      slot: "design document",
      present: detail.doc !== null,
      detail:
        detail.doc !== null
          ? `${docPath}. ${detail.doc.title}`
          : `No Gate 4b document. ${docPath} is not in the index for this epic.`,
    },
    {
      slot: "slices",
      present: slices.length > 0,
      detail:
        slices.length > 0
          ? `${countLabel(slices.length, "slice")} resolve to this epic through joins.slice_to_epic.`
          : "No slice in the index resolves to this epic through joins.slice_to_epic.",
    },
    {
      slot: "pull request",
      present: detail.pr !== null,
      detail:
        detail.pr !== null
          ? `Pull request ${detail.pr}, through joins.epic_to_pull_request.`
          : "No pull request reaches this epic through joins.epic_to_pull_request.",
    },
  ];
}

export function groupSlicesByEpic(  slices: SliceEntity[],
  joins: Joins,
): Map<string, SliceEntity[]> {
  const out = new Map<string, SliceEntity[]>();
  for (const slice of slices) {
    const epicId = joins.slice_to_epic[slice.id];
    if (!epicId) continue;
    const list = out.get(epicId);
    if (list) list.push(slice);
    else out.set(epicId, [slice]);
  }
  for (const list of out.values()) {
    list.sort((a, b) => a.n - b.n);
  }
  return out;
}

export function groupDocsByFeature(
  docs: EpicDesignEntity[],
): Map<string, EpicDesignEntity[]> {
  const out = new Map<string, EpicDesignEntity[]>();
  for (const doc of docs) {
    const list = out.get(doc.feature_slug);
    if (list) list.push(doc);
    else out.set(doc.feature_slug, [doc]);
  }
  return out;
}

/** The plan's program design, matched on the plan slug. Null when the plan holds none. */
export function programDesignFor(
  plan: PlanSlug,
  docs: ProgramDesignEntity[],
): ProgramDesignEntity | null {
  return docs.find((doc) => doc.feature_slug === plan.slug) ?? null;
}

/** Who closed this design, from `goal.superseded_by`, and who it says it closed. */
export interface SupersedeLink {
  /** The design that closed this one, when the record names it. */
  by: string | null;
  byNote: string | null;
  /** The designs this design says it closed, from `goal.supersedes`. */
  supersedes: string[];
  /**
   * True when a live design names this one in its own `goal.supersedes`, and this
   * design carries no `superseded_by` of its own. A record gap worth showing.
   */
  onlyInbound: boolean;
}

export function supersedeLink(
  designId: string,
  records: DesignRecords,
): SupersedeLink {
  const own = records[designId]?.goal;
  const by = own?.superseded_by ?? null;
  const inbound = Object.entries(records)
    .filter(([, record]) => (record.goal.supersedes ?? []).includes(designId))
    .map(([id]) => id);
  return {
    by,
    byNote: own?.superseded_note ?? null,
    supersedes: own?.supersedes ?? inbound,
    onlyInbound: by === null && inbound.length > 0,
  };
}

/* --------------------------------------------------------------- diagrams */

const MERMAID_KINDS: Array<[RegExp, string]> = [
  [/^\s*C4Container/m, "C4Container"],
  [/^\s*C4Context/m, "C4Context"],
  [/^\s*sequenceDiagram/m, "sequenceDiagram"],
  [/^\s*classDiagram/m, "classDiagram"],
  [/^\s*stateDiagram/m, "stateDiagram"],
  [/^\s*erDiagram/m, "erDiagram"],
  [/^\s*flowchart/m, "flowchart"],
  [/^\s*graph /m, "graph"],
  [/^\s*gantt/m, "gantt"],
  [/^\s*mindmap/m, "mindmap"],
];

export function diagramKind(source: string): string {
  for (const [pattern, name] of MERMAID_KINDS) {
    if (pattern.test(source)) return name;
  }
  return "unknown";
}

export function diagramLevels(record: DesignRecord | undefined): Array<{
  level: string;
  source: string;
  kind: string;
}> {
  const diagrams = record?.diagrams;
  if (!diagrams) return [];
  return Object.keys(diagrams)
    .sort((a, b) => Number(a) - Number(b))
    .map((level) => ({
      level,
      source: diagrams[level],
      kind: diagramKind(diagrams[level]),
    }));
}

/* ------------------------------------------------------ markdown sections */

export interface MarkdownSection {
  heading: string;
  body: string;
}/** Split a document on its `##` headings. Text above the first heading is dropped. */
export function sections(body: string): MarkdownSection[] {
  const lines = body.split("\n");
  const out: MarkdownSection[] = [];
  let heading: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (heading !== null) {
      out.push({ heading, body: buffer.join("\n").trim() });
    }
    buffer = [];
  };

  for (const line of lines) {
    const match = /^##\s+(.*)$/.exec(line);
    if (match) {
      flush();
      heading = match[1].trim();
      continue;
    }
    if (heading !== null) buffer.push(line);
  }
  flush();

  return out.filter((section) => section.body.length > 0);
}

/** The section this board opens first: the scope, or the first one written. */
export function preferredSection(list: MarkdownSection[]): MarkdownSection | null {
  if (list.length === 0) return null;
  return (
    list.find((section) => /scope|intent/i.test(section.heading)) ?? list[0]
  );
}
