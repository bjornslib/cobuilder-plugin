/**
 * What the shell derives, and the two rules it derives from.
 *
 *   The shell renders. It never computes. Every count, state, and join comes from
 *   `data/index.json`, per interaction-design section 1.1 principle 6.
 *
 * So this file holds no new truth. It narrows the index's resolved work to one work
 * item and answers two questions the rail asks:
 *
 *   1. Which sections does this work fill? A section the work cannot fill is absent,
 *      not empty. Section 3.3 states each rule.
 *   2. Which levels does this work fill? A level whose record is absent stays in the
 *      rail and reads disabled, because the gap is a fact the reader needs in place.
 *
 * The one value that does not come from `index.json` is the linked-decision list. It
 * comes from `goal.adrs[]` in `designs.js`, and `WorkItem.adrSource` says so.
 *
 * THE JOINS RESOLVE IN THE DATA MODULE, NOT HERE. `buildWorkItems` and `WorkItem` live
 * at `@/data/works`, because building one reads the joins `data/index.json` carries.
 * This file re-exports both so this variation keeps one import path, and it names no
 * join key of its own. Slice 4 of cobuilder-viewer fixed that boundary: a join resolved
 * outside `src/data/` is a second source for one fact. `src/shell/model.ts` is the same
 * re-export, and it is the shape this one copies.
 *
 * WHY THE RECORD TYPE IS REWRITTEN HERE. This variation reads a record through its own
 * `./records` types, which promise the fields the corpus always writes. `@/data/works`
 * types every field of a derived record as possibly absent, because a file that did not
 * load can hold none of them. The runtime value is one object under either declaration,
 * so the `WorkItem` below swaps the one field whose type differs and changes nothing else.
 */

import type { GateStep, RecordIndex } from "@/data/types";
import type { DesignRecord as BundleRecord } from "@/data/bundle";
import { buildWorkItems as resolveWorkItems } from "@/data/works";
import type { WorkItem as ResolvedWorkItem } from "@/data/works";

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

/*
 * The resolved work item, and the function that builds one. Both live in the data
 * module, because building a work item reads the joins `data/index.json` carries.
 * `@/data/works` states what each field resolves from.
 */

/** One boundary rule, with the context it belongs to. Re-exported from the data module. */
export type { BoundaryRule } from "@/data/works";

/** The resolved work item, with this variation's own record type. See this file's header. */
export type WorkItem = Omit<ResolvedWorkItem, "record"> & {
  record: DesignRecord | undefined;
};

/**
 * Resolve one work item per design, from the index and the record file.
 *
 * The derivation lives at `@/data/works`. This wrapper states only the record type this
 * variation reads, which is the one field whose declaration differs.
 */
export function buildWorkItems(
  index: RecordIndex,
  records: Record<string, DesignRecord>,
): Map<string, WorkItem> {
  return resolveWorkItems(
    index,
    records as unknown as Record<string, BundleRecord>,
  ) as unknown as Map<string, WorkItem>;
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
 *
 * Two of the three rules are narrow on purpose, and the corpus is why. A work item
 * whose decisions reach pull requests has not thereby opened them:
 * `joins.adr_to_pull_request` never feeds the Pull requests group, and a publication
 * for somebody else's pull request is not evidence that this work shipped.
 */
export function gatesOf(work: WorkItem): Gates {
  const implemented = work.design.stage === "implemented";
  return {
    build: work.epics.length >= 1,
    /* One of this work's own epics carries a pull request. */
    pullRequests: work.pullRequests.length >= 1,
    /* The stage is implemented, or a publication exists for one of this work's own. */
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
  /**
   * The sub-view inside a section: `epics` with an optional epic id, `rubrics`,
   * `flightdeck`, or a pull request number.
   *
   * There is no `slices` sub-view, and `build/slices` is not a route. A slice belongs
   * to one epic and carries no meaning outside it, so it never becomes a destination.
   * Section 2.1 states the general rule this follows: a record that only exists
   * inside another one never gets a rail item.
   */
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
