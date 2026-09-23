/**
 * How variation C reads the corpus, and how it decides what each tile shows.
 *
 * Two readers feed the mosaic, and both are already documented in
 * `src/data/bundle.ts`:
 *
 *   1. `loadIndex()` from `@/data/bundle` reads the record index. This variation
 *      never re-derives a join the index already carries, and it takes the design
 *      rows from `designRows()` for the same reason.
 *
 *   2. `loadDesigns()` here reads `data/designs.js`, the file that holds the six
 *      authored records per design. The shipped viewer loads it as a sibling
 *      `<script src="../data/designs.js">`, and that tag assigns `window.DESIGNS`.
 *      A published file inlines the same global. This loader prefers a global that
 *      already exists, and injects the tag when it does not, so both readers meet
 *      at one function exactly as `bundle.ts` describes.
 *
 * `buildBundleModel()` is the single place that derives a verdict. A tile renders
 * a verdict and decides nothing, so no two tiles can disagree about one design.
 */

import { BUNDLE_DATA_URL } from "@/data/bundle";
import type {
  AdrEntity,
  AdrToPullRequest,
  DesignEntity,
  DesignRow,
  EpicEntity,
  Joins,
  PublicationEntity,
  PullRequestEntity,
  SliceEntity,
} from "@/data/types";

import type { DesignRecordMap, DesignRecords, GoalEpic, NarrativeBeat, Readiness, RecordKind, TileKind, Verdict } from "./types";
import { RECORD_KINDS } from "./types";

declare global {
  interface Window {
    DESIGNS?: DesignRecordMap;
  }
}

/** The dev-server path of the record file, declared by `vite.config.ts`. */
export const DESIGNS_URL = `${BUNDLE_DATA_URL}designs.js`;

function isDesignRecordMap(value: unknown): value is DesignRecordMap {
  if (typeof value !== "object" || value === null) return false;
  const first = Object.values(value as Record<string, unknown>)[0];
  return typeof first === "object" && first !== null;
}

let pending: Promise<DesignRecordMap> | null = null;

/**
 * Read every design's authored records.
 *
 * The promise is cached while it is in flight. A failure clears the cache, so a
 * reader that retries after an error makes a fresh request rather than replaying
 * the rejection.
 */
export function loadDesigns(): Promise<DesignRecordMap> {
  if (isDesignRecordMap(window.DESIGNS)) {
    return Promise.resolve(window.DESIGNS);
  }
  if (!pending) {
    pending = injectDesignsScript().catch((error: unknown) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}

function injectDesignsScript(): Promise<DesignRecordMap> {
  return new Promise<DesignRecordMap>((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = DESIGNS_URL;
    tag.async = true;
    tag.onload = () => {
      if (isDesignRecordMap(window.DESIGNS)) resolve(window.DESIGNS);
      else reject(new Error(`${DESIGNS_URL} loaded and assigned no window.DESIGNS.`));
    };
    tag.onerror = () =>
      reject(new Error(`${DESIGNS_URL} did not load. Check that the dev server serves /bundle/.`));
    document.head.appendChild(tag);
  });
}

/* ------------------------------------------------------------------ verdicts */

function verdictOf(state: Readiness, missing: string[], note: string): Verdict {
  return { state, missing, note };
}

function hasText(value: string | undefined | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasItems(value: unknown[] | undefined | null): boolean {
  return Array.isArray(value) && value.length > 0;
}

/** The three narrative levels, in reading order. */
export const NARRATIVE_LEVELS: Array<{ key: string; label: string }> = [
  { key: "landscape", label: "Landscape" },
  { key: "problem_solution", label: "Problem and solution" },
  { key: "architecture", label: "Architecture" },
];

/** `review-flight-deck` authors its narrative under `levels`, so both are read. */
export function narrativeLevel(
  records: DesignRecords,
  key: string,
): { tagline?: string; narration?: string; problem?: string; solution?: string } | null {
  const narrative = records.narrative;
  if (!narrative) return null;
  const source = narrative.levels ?? narrative;
  const level = (source as Record<string, unknown>)[key];
  if (typeof level !== "object" || level === null) return null;
  return level as { tagline?: string; narration?: string; problem?: string; solution?: string };
}

/** The beats a narrative level lists, from either narrative shape. */
export function narrativeBeats(records: DesignRecords, key: string): NarrativeBeat[] {
  const narrative = records.narrative;
  if (!narrative) return [];
  const source = narrative.levels ?? narrative;
  const level = (source as Record<string, unknown>)[key];
  if (typeof level !== "object" || level === null) return [];
  const beats = (level as { beats?: NarrativeBeat[] }).beats;
  return Array.isArray(beats) ? beats : [];
}

/** The Mermaid block's first line names its kind: C4Container, sequenceDiagram, classDiagram. */
export function diagramKind(source: string): string {
  const line = source.split("\n").find((row) => row.trim().length > 0) ?? "";
  return line.trim().split(/[\s{]/)[0] || "diagram";
}

/** A Mermaid block records its own title on a `title` line. */
export function diagramTitle(source: string): string | null {
  const line = source.split("\n").find((row) => /^\s*title\s+\S/.test(row));
  return line ? line.replace(/^\s*title\s+/, "").trim() : null;
}

/** The first markdown heading of a draft, for a tile heading that reads as the draft reads. */
export function draftHeading(markdown: string): string | null {
  const line = markdown.split("\n").find((row) => /^#{1,2}\s+\S/.test(row));
  return line ? line.replace(/^#{1,2}\s+/, "").trim() : null;
}

/** Every `##` section of a draft, as a table of contents. */
export function draftSections(markdown: string): string[] {
  return markdown
    .split("\n")
    .filter((row) => /^##\s+\S/.test(row))
    .map((row) => row.replace(/^##\s+/, "").trim());
}

/** The first words of a draft, with its markdown marks removed. */
export function draftExcerpt(markdown: string, maxChars: number): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*#{1,6}\s+.*$/gm, " ")
    .replace(/^\s*\|.*$/gm, " ")
    .replace(/[*`_>|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trimEnd()}...`;
}

/* ------------------------------------------------------------- the six records */

function goalVerdict(records: DesignRecords): Verdict {
  const goal = records.goal;
  if (!goal) {
    return verdictOf("absent", [], "No goal.json. The design directory holds no goal record.");
  }
  const missing: string[] = [];
  if (!hasText(goal.outcome)) missing.push("outcome");
  if (!hasItems(goal.done_when)) missing.push("done_when");
  const groundingRan = goal.min_work?.challenge_stage_run !== false;
  if (!groundingRan) missing.push("design mode's stages 2 to 7");
  if (missing.length === 0) {
    return verdictOf(
      "present",
      [],
      `The goal names ${goal.epics?.length ?? 0} epics and ${goal.done_when?.length ?? 0} done-when statements.`,
    );
  }
  return verdictOf(
    "partial",
    missing,
    groundingRan
      ? "The goal is recorded and part of it is empty."
      : "The goal is the only record. Design mode stopped after stage 1, and the backlog state is deliberate.",
  );
}

function intentVerdict(records: DesignRecords): Verdict {
  const intent = records.intent;
  if (!intent) {
    return verdictOf("absent", [], "No intent.json. Design mode stage 2 has not run for this design.");
  }
  const missing: string[] = [];
  if (!hasText(intent.problem)) missing.push("problem");
  if (!hasText(intent.approach)) missing.push("approach");
  if (!hasItems(intent.risks)) missing.push("risks");
  if (!hasItems(intent.unknowns)) missing.push("unknowns");
  if (missing.length === 0) {
    return verdictOf(
      "present",
      [],
      `The intent names ${intent.risks?.length ?? 0} risks and ${intent.unknowns?.length ?? 0} unknowns.`,
    );
  }
  return verdictOf("partial", missing, "The intent is recorded and part of it is empty.");
}

function narrativeVerdict(records: DesignRecords): Verdict {
  if (!records.narrative) {
    return verdictOf("absent", [], "No narrative.json. The four-level story has not been written.");
  }
  const missing = NARRATIVE_LEVELS.filter((level) => !hasText(narrativeLevel(records, level.key)?.narration)).map(
    (level) => level.label,
  );
  if (missing.length === 0) {
    return verdictOf("present", [], "All three levels carry narration.");
  }
  return verdictOf("partial", missing, "The narrative is recorded and at least one level is empty.");
}

function assessmentVerdict(records: DesignRecords): Verdict {
  const assessment = records.assessment;
  if (!assessment) {
    return verdictOf("absent", [], "No assessment.json. Nothing has judged this design yet.");
  }
  const missing: string[] = [];
  if (!hasText(assessment.verdict)) missing.push("verdict");
  if (!hasText(assessment.summary)) missing.push("summary");
  if (!hasItems(assessment.findings)) missing.push("findings");
  if (missing.length === 0) {
    return verdictOf(
      "present",
      [],
      `Verdict ${assessment.verdict}, with ${assessment.findings?.length ?? 0} findings.`,
    );
  }
  if (!hasText(assessment.verdict)) {
    return verdictOf("partial", missing, "The assessment is recorded and carries no verdict.");
  }
  return verdictOf(
    "partial",
    missing,
    `Verdict ${assessment.verdict}. The record leaves part of the assessment empty.`,
  );
}

function draftVerdict(records: DesignRecords): Verdict {
  const draft = records.pr_draft;
  if (!hasText(draft)) {
    return verdictOf("absent", [], "No pr-draft.md. This design has not written its pull request.");
  }
  const sections = draftSections(draft);
  if (sections.length === 0) {
    return verdictOf("partial", ["sections"], "The draft is recorded and carries no section heading.");
  }
  return verdictOf("present", [], `The draft carries ${sections.length} sections.`);
}

function diagramVerdict(records: DesignRecords): Verdict {
  const diagrams = records.diagrams;
  if (!diagrams || Object.keys(diagrams).length === 0) {
    return verdictOf("absent", [], "No diagrams. This design has drawn nothing.");
  }
  const missing = ["1", "2", "3"].filter((level) => !hasText(diagrams[level])).map((level) => `level ${level}`);
  if (missing.length === 0) {
    return verdictOf("present", [], "All three levels are drawn.");
  }
  return verdictOf("partial", missing, "The design is drawn at some levels only.");
}

function decisionVerdict(linked: string[], primary: string | null, unresolved: string[]): Verdict {
  if (linked.length === 0) {
    return verdictOf("absent", [], "The goal links no decision. No ADR names this design.");
  }
  if (unresolved.length > 0) {
    return verdictOf(
      "partial",
      unresolved,
      "The goal names a decision the index holds no record for.",
    );
  }
  if (!primary) {
    return verdictOf(
      "partial",
      ["primary decision"],
      `${linked.length} ${linked.length === 1 ? "decision is" : "decisions are"} linked and the goal marks no primary decision.`,
    );
  }
  return verdictOf(
    "present",
    [],
    `${linked.length} linked ${linked.length === 1 ? "decision" : "decisions"}, primary ${primary}.`,
  );
}

function epicVerdict(count: number, unresolved: number): Verdict {
  if (count === 0) {
    return verdictOf("absent", [], "The goal lists no epic. This design has no planned work.");
  }
  if (unresolved > 0) {
    return verdictOf(
      "partial",
      [`${unresolved} unresolved ${unresolved === 1 ? "state" : "states"}`],
      "The index refines no state for part of this design's epics.",
    );
  }
  return verdictOf("present", [], `All ${count} epics resolve a state through joins.epic_status.`);
}

function sliceVerdict(unresolved: SliceEntity[]): Verdict {
  if (unresolved.length === 0) {
    return verdictOf(
      "absent",
      [],
      "No slice in this bundle belongs to no epic. joins.slice_to_epic resolves every one.",
    );
  }
  return verdictOf("present", [], `${unresolved.length} slices belong to no epic.`);
}

function pullRequestVerdict(reached: number[], missing: number[]): Verdict {
  if (reached.length === 0) {
    return verdictOf("absent", [], "No pull request reaches this design, through an epic or a decision.");
  }
  if (missing.length > 0) {
    return verdictOf(
      "partial",
      missing.map((pr) => `PR ${pr}`),
      "A join reaches a pull request the index holds no entity for.",
    );
  }
  return verdictOf(
    "present",
    [],
    `${reached.length} ${reached.length === 1 ? "pull request reaches" : "pull requests reach"} this design.`,
  );
}

/* ---------------------------------------------------------------- the model */

export interface SliceModel {
  slice: SliceEntity;
  /** The score as a number, or null when the slice records none. */
  score: number | null;
  attempts: number;
}

export interface EpicModel {
  epic: EpicEntity;
  /** The refined state from `joins.epic_status`. The entity's own field is a placeholder. */
  status: string;
  resolved: boolean;
  goalEpic: GoalEpic | null;
  slices: SliceModel[];
  designDoc: boolean;
  pullRequest: number | null;
}

export interface DecisionModel {
  id: string;
  adr: AdrEntity | null;
  primary: boolean;
  reach: AdrToPullRequest | null;
}

export interface PullRequestModel {
  pr: number;
  entity: PullRequestEntity | null;
  /** How the design reaches this pull request, named rather than implied. */
  routes: string[];
  publication: PublicationEntity | null;
}

export interface DesignModel {
  design: DesignEntity;
  records: DesignRecords;
  supersededBy: string | null;
  supersedes: string[];
  /** A verdict per authored record kind, and per join tile. */
  verdicts: Record<TileKind, Verdict>;
  /** How many of the six authored records exist, in full or in part. */
  presentCount: number;
  /** How many of the six authored records are complete. */
  completeCount: number;
  /** The authored records that exist and carry an empty part. */
  partialKinds: RecordKind[];
  epics: EpicModel[];
  epicStatusCounts: Array<{ status: string; count: number }>;
  epicDesignDocs: number;
  slices: SliceModel[];
  decisions: DecisionModel[];
  pullRequests: PullRequestModel[];
}

export interface BundleModel {
  designs: DesignModel[];
  byId: Map<string, DesignModel>;
  unresolvedSlices: SliceEntity[];
  counts: {
    designs: number;
    epics: number;
    slices: number;
    decisions: number;
    pullRequests: number;
    unresolvedSlices: number;
  };
}

function asNumber(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function uniqueSorted(numbers: number[]): number[] {
  return [...new Set(numbers)].sort((a, b) => a - b);
}

/**
 * Derive one model per design. This is the only place that reads a join, decides a
 * verdict, or nests a slice under its epic.
 */
export function buildBundleModel(
  index: { entities: { adr: AdrEntity[]; pull_request: PullRequestEntity[]; publication: PublicationEntity[]; slice: SliceEntity[] }; joins: Joins },
  rows: DesignRow[],
  records: DesignRecordMap,
): BundleModel {
  const adrById = new Map(index.entities.adr.map((adr) => [adr.id, adr]));
  const prById = new Map(index.entities.pull_request.map((pr) => [pr.id, pr]));
  const sliceById = new Map(index.entities.slice.map((slice) => [slice.id, slice]));

  const slicesByEpic = new Map<string, SliceEntity[]>();
  for (const slice of index.entities.slice) {
    const epicId = index.joins.slice_to_epic[slice.id];
    if (!epicId) continue;
    const list = slicesByEpic.get(epicId);
    if (list) list.push(slice);
    else slicesByEpic.set(epicId, [slice]);
  }

  const unresolvedSlices = Object.keys(index.joins.slice_to_epic_unresolved)
    .map((id) => sliceById.get(id))
    .filter((slice): slice is SliceEntity => Boolean(slice));

  const designs = rows.map((row) => {
    const designRecords = records[row.design.id] ?? {};
    const goal = designRecords.goal;

    const epics: EpicModel[] = row.epics.map((epic) => {
      const joined = index.joins.epic_status[epic.id];
      const goalEpic = (goal?.epics ?? []).find((entry) => entry.id === epic.epic_id) ?? null;
      const slices = (slicesByEpic.get(epic.id) ?? [])
        .slice()
        .sort((a, b) => a.n - b.n)
        .map((slice) => ({ slice, score: asNumber(slice.score), attempts: slice.attempts }));
      const pr = index.joins.epic_to_pull_request[epic.id] ?? epic.pr ?? null;
      return {
        epic,
        status: joined ?? epic.state,
        resolved: joined !== undefined,
        goalEpic,
        slices,
        designDoc: Boolean(epic.design_doc),
        pullRequest: typeof pr === "number" ? pr : null,
      };
    });

    const statusTally = new Map<string, number>();
    for (const epic of epics) {
      statusTally.set(epic.status, (statusTally.get(epic.status) ?? 0) + 1);
    }
    const epicStatusCounts = [...statusTally.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    const linkedAdrIds = [...new Set([...(goal?.adrs ?? []), ...(goal?.adr ? [goal.adr] : [])])];
    const primary = goal?.adr ?? null;
    const unresolvedAdrs = linkedAdrIds.filter((id) => !adrById.has(id));
    const decisions: DecisionModel[] = linkedAdrIds.map((id) => ({
      id,
      adr: adrById.get(id) ?? null,
      primary: id === primary,
      reach: index.joins.adr_to_pull_request[id] ?? null,
    }));

    const routes = new Map<number, string[]>();
    for (const epic of epics) {
      if (epic.pullRequest === null) continue;
      const list = routes.get(epic.pullRequest) ?? [];
      list.push(`epic ${epic.epic.epic_id}`);
      routes.set(epic.pullRequest, list);
    }
    for (const decision of decisions) {
      const pr = decision.reach?.pr;
      if (typeof pr !== "number") continue;
      const list = routes.get(pr) ?? [];
      list.push(
        decision.reach?.via === "epic"
          ? `decision ${decision.id}, through ${decision.reach.path.length} epics`
          : `decision ${decision.id}, direct`,
      );
      routes.set(pr, list);
    }
    const reachedPrs = uniqueSorted([...routes.keys()]);
    const pullRequests: PullRequestModel[] = reachedPrs.map((pr) => ({
      pr,
      entity: prById.get(pr) ?? null,
      routes: routes.get(pr) ?? [],
      publication: index.entities.publication.find((entry) => entry.pull_request === pr) ?? null,
    }));

    const slices = epics.flatMap((epic) => epic.slices);
    const verdicts: Record<TileKind, Verdict> = {
      goal: goalVerdict(designRecords),
      intent: intentVerdict(designRecords),
      narrative: narrativeVerdict(designRecords),
      assessment: assessmentVerdict(designRecords),
      "pr-draft": draftVerdict(designRecords),
      decisions: decisionVerdict(linkedAdrIds, primary, unresolvedAdrs),
      diagrams: diagramVerdict(designRecords),
      epics: epicVerdict(epics.length, epics.filter((epic) => !epic.resolved).length),
      slices: sliceVerdict(unresolvedSlices),
      "pull-requests": pullRequestVerdict(
        reachedPrs,
        reachedPrs.filter((pr) => !prById.has(pr)),
      ),
    };

    const presentKinds = RECORD_KINDS.filter((kind) => verdicts[kind].state !== "absent");

    return {
      design: row.design,
      records: designRecords,
      supersededBy: goal?.superseded_by ?? null,
      supersedes: goal?.supersedes ?? [],
      verdicts,
      presentCount: presentKinds.length,
      completeCount: presentKinds.filter((kind) => verdicts[kind].state === "present").length,
      partialKinds: presentKinds.filter((kind) => verdicts[kind].state === "partial"),
      epics,
      epicStatusCounts,
      epicDesignDocs: epics.filter((epic) => epic.designDoc).length,
      slices,
      decisions,
      pullRequests,
    } satisfies DesignModel;
  });

  return {
    designs,
    byId: new Map(designs.map((model) => [model.design.id, model])),
    unresolvedSlices,
    counts: {
      designs: rows.length,
      epics: rows.reduce((total, row) => total + row.epics.length, 0),
      slices: index.entities.slice.length,
      decisions: index.entities.adr.length,
      pullRequests: index.entities.pull_request.length,
      unresolvedSlices: unresolvedSlices.length,
    },
  };
}
