/**
 * What the shell derives, and the two rules it derives from.
 *
 *   The shell renders. It never computes. Every count, state, and join comes from
 *   `data/index.json`, per interaction-design section 1.1 principle 6.
 *
 * So this file holds no new truth. It reads the joins the index already resolved,
 * narrows them to one work item, and answers three questions the rail asks:
 *
 *   1. Which sections does this work fill? A section the work cannot fill is absent,
 *      not empty. Section 3.3 states each rule.
 *   2. Which levels does this work fill? A level whose record is absent stays in the
 *      rail and reads disabled, because the gap is a fact the reader needs in place.
 *   3. Which rows does the rail hold, grouped how? `railGroups` is the one list, and
 *      `rowsOf` flattens it. The rail renders it and the arrow-key traversal steps it,
 *      so the two cannot drift. One copy of the order is the point: a second copy lost
 *      every entry below Architecture.
 *
 * The one value that does not come from `index.json` is the linked-decision list. It
 * comes from `goal.adrs[]` in `designs.js`, and `WorkItem.adrSource` says so.
 *
 * THE JOINS RESOLVE IN THE DATA MODULE, NOT HERE. `buildWorkItems`, `WorkItem`, and the
 * record shape a work item carries live at `@/data/works`, because building one reads
 * the joins `data/index.json` carries. This file re-exports them so the shell keeps one
 * import path, and it names no join key of its own. Slice 4 of cobuilder-viewer fixed
 * that boundary: a join resolved outside `src/data/` is a second source for one fact.
 *
 * THIS FILE IS THE PORTED PROTOTYPE at `src/variations/sections-e/model.ts`, with two
 * changes. The record types come from `@/data/bundle` rather than from the variation's
 * own copy, and the route prefix is the bare `#/` rather than `#/sections-e`, because
 * the shell is now the shipped surface rather than one variation among several.
 */

import type { EpicEntity, GateStep, PullRequest } from "@/data/types";
import type { NarrativeBeat } from "@/data/bundle";
import type { WorkItem } from "@/data/works";

/*
 * The change's own four rows, and the table from a row's word to the bundle's level key.
 * Slice 15 declared both in `./change/sections`, and this file reads them rather than
 * copying them: two lists of the same four names would let the row the rail opens and
 * the row the pager renders disagree.
 */
import { CHANGE_KEYS, CHANGE_LEVEL_KEY, CHANGE_LABEL } from "./change/sections";
import type { ChangeKey } from "./change/sections";
import type { ChangeLevel } from "./change/levels";

export { buildWorkItems } from "@/data/works";
export type { WorkItem } from "@/data/works";

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

/* ------------------------------------------------------------ the resolved work */

/*
 * The resolved work item, and the function that builds one. Both live in the data
 * module, because building a work item reads the joins `data/index.json` carries.
 * `@/data/works` states what each field resolves from.
 */
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
    /*
     * One of this work's own epics carries a pull request, or the work states the pull
     * request it will open. A design's `pr-draft.md` is authored before the code exists,
     * and it is the only pull-request record a work in the design stage has. Excluding
     * it left the level absent and the route silently redirected to Intent, which is the
     * shell stating that a level holds nothing while its first block was waiting to be
     * read.
     */
    pullRequests: work.pullRequests.length >= 1 || Boolean(work.record?.pr_draft),
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

/* -------------------------------------------------------------------- epics */

/**
 * How many epics one section of the paged Build level holds.
 *
 * ONE SECTION IS ONE SCREEN. The box is about 530 px and a collapsed epic row about
 * 50 px, so six rows fill a box and the seventh would make the reader scroll before
 * they had read anything. The same number keeps the level's spine short: thirty-six
 * epics would give exactly six sections, and no plausible work gives more than six.
 */
const EPICS_PER_SECTION = 6;

/**
 * The epics, cut into the sections the Build level pages.
 *
 * THE CUT FOLLOWS THE DELIVERY ORDER, and that is a deliberate second choice. The seam
 * a reader would want is the epic's state, and this corpus does not carry one: all
 * eighteen of this work's epics read `no-pull-request` in the join and `planned` in the
 * entity, all eighteen name the same branch, none names a pull request, and the design
 * records no slices and no epic solution designs. One state over eighteen epics is not
 * a spine. The epic order is the delivery order, so a cut of it keeps the sequence a
 * reader follows and invents no grouping the bundle does not hold.
 *
 * The panel that renders one group states the same thing to the reader, in its own lead.
 */
export function epicGroups(work: WorkItem): EpicEntity[][] {
  const groups: EpicEntity[][] = [];
  for (let start = 0; start < work.epics.length; start += EPICS_PER_SECTION) {
    groups.push(work.epics.slice(start, start + EPICS_PER_SECTION));
  }
  return groups;
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

/**
 * The route prefix. The shell is the shipped surface now, so it owns the root address.
 *
 * `#/variations` and the variation ids are the comparison harness's own addresses. They
 * are read before this parser runs, so no work item id can collide with one of them.
 */
const ROUTE_PREFIX = "#/";

export function readRoute(): Route {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [workId, section, sub, subId] = raw.split("/").filter(Boolean);
  return {
    workId: workId ?? null,
    section: section && isSectionKey(section) ? section : "intent",
    sub: sub ?? null,
    subId: subId ?? null,
  };
}

export function routeHref(workId: string, section: SectionKey, tail?: string): string {
  return `${ROUTE_PREFIX}${workId}/${section}${tail ? `/${tail}` : ""}`;
}

/**
 * The board: the route that names no work item.
 *
 * `readRoute()` already answers this address with a null `workId`, so the board needs no
 * field of its own in `Route`. It is the one destination in the shell that states no
 * section, because a reader who has chosen no work item has chosen no level either.
 */
export function boardHref(): string {
  return ROUTE_PREFIX;
}

/* ------------------------------------------------------------ the two accounts */

/**
 * Which account a group and its rows read.
 *
 * `program` reads the work's own design records. `change` reads the pull request the
 * work's own epics carry. ADR-0029 fixed both ids, and the rail's two groups pair with
 * them one to one.
 */
export type AccountId = "program" | "change";

/** The rail's two groups. The engineer named them on 2026-09-25, and there are two. */
export type GroupKey = "build" | "review";

/**
 * The three section names both accounts carry.
 *
 * The repetition is what makes the same section reachable on either account, and it is
 * why a row is matched by its address and never by its name: a name match would light
 * more than one row at once.
 */
export const SHARED_KEYS = ["intent", "problem-and-solution", "architecture"] as const;
export type SharedKey = (typeof SHARED_KEYS)[number];

/** Build's five rows, in the order the rail renders them. One list, read by everything. */
export const PROGRAM_KEYS = [
  "intent",
  "problem-and-solution",
  "architecture",
  "epics",
  "rubrics",
] as const;

/**
 * The Plan row sits after Architecture, the order the gate sequence names: the plan
 * documents approve after the architecture review, before the epics and rubrics. It
 * always shows. For a work with no plan directory, it is disabled with the reason
 * "no plan", so it is kept apart from the list of five.
 */
export const PLAN_KEY = "plan" as const;
const BUILD_ROW_KEYS = [
  ...PROGRAM_KEYS.slice(0, 3),
  PLAN_KEY,
  ...PROGRAM_KEYS.slice(3),
];
export type ProgramKey = (typeof PROGRAM_KEYS)[number] | typeof PLAN_KEY;

/**
 * One name for one row, so the rail and the section it opens read the same word.
 *
 * The three shared names come from `SECTION_LABEL`, which is the shell's one name for one
 * section. Epics and Rubrics are rows of the Build group and not sections of a level, so
 * their names live only here.
 */
const PROGRAM_LABEL: Record<ProgramKey, string> = {
  intent: SECTION_LABEL.intent,
  "problem-and-solution": SECTION_LABEL["problem-and-solution"],
  architecture: SECTION_LABEL.architecture,
  epics: "Epics",
  rubrics: "Rubrics",
  plan: "Plan",
};

/**
 * One row of the rail: what it is called, where it opens, and which account it reads.
 *
 * `account` and `shared` are the two facts a reader needs to tell the groups apart. The
 * two groups repeat three section names, so a reader who cannot tell the groups apart
 * cannot tell the accounts apart either, and the account is a field of the row and not a
 * fact to infer.
 *
 * `href` comes from the account's own builder, so no row invents an address. A row whose
 * record is absent carries `available: false`, its address reads `#`, and `absent` names
 * the records it could not read.
 */
export interface RailRow {
  key: string;
  label: string;
  href: string;
  account: AccountId;
  shared: SharedKey | null;
  /**
   * How much the section holds, as a short string: `6 records`, `7 of 7 fields`,
   * `558 files`. An empty string states that the rail has not read this section's records,
   * which is a different fact from a section that holds none.
   */
  count: string;
  /** False renders the row disabled, and a disabled row is not a step. */
  available: boolean;
  /** The records the row could not read, when `available` is false. */
  absent?: string[];
}

/** One group of rows, and the account all of them read. */
export interface RailGroup {
  key: GroupKey;
  label: string;
  account: AccountId;
  /** Every row the group renders, in reading order, absent records included. */
  rows: RailRow[];
  /**
   * The rows a press can reach, in the same order.
   *
   * A row whose record is absent carries `#`, so a step onto it would send the reader to
   * the board. The walk therefore steps this list rather than `rows`, and the rule lives
   * here so that the rail and the walk cannot disagree about what a press can reach.
   */
  entries: RailRow[];
}

/**
 * The address of one row of the program's account.
 *
 * Epics and Rubrics are sub-views of the Build section, so they carry a tail. The three
 * level rows are the shell's own section addresses.
 */
export function programHref(workId: string, section: ProgramKey): string {
  if (section === "epics") return routeHref(workId, "build", "epics");
  if (section === "rubrics") return routeHref(workId, "build", "rubrics");
  if (section === "plan") return routeHref(workId, "build", "plan");
  return routeHref(workId, section);
}

/**
 * The address of one row of the change's account.
 *
 * ADR-0029 fixes the change's address as `#/<work>/pull-requests/<pr>`, and that address
 * is the change's Intent row. Every other row appends exactly one segment, which is the
 * row's own name and rides the shell's existing `subId` field, so no second parser exists.
 */
export function changeHref(workId: string, pr: number, section: ChangeKey): string {
  if (section === "intent") return routeHref(workId, "pull-requests", String(pr));
  return routeHref(workId, "pull-requests", `${pr}/${section}`);
}

/**
 * The address of a pull request that no design carries.
 *
 * A pull request with no design has no work item, so no id names one. That case is not an
 * address that resolved to nothing, and it must not end in the unknown-id error. The rule
 * is therefore stated once, here, beside the two account builders: the address's work
 * segment carries the pull request's own number, and `changeHref` builds the rest. A row
 * that assembled this address where it is drawn would be a second address scheme beside
 * the ones this file fixes.
 *
 * `worklessPullRequest` below reads the same rule backwards, so the builder and the
 * resolver cannot disagree about which address belongs to which pull request.
 */
export function pullRequestHref(pr: number, section: ChangeKey): string {
  return changeHref(String(pr), pr, section);
}

/**
 * The pull request a workless route's work segment names, or null.
 *
 * The inverse of `pullRequestHref`. The shell resolves a route's work segment among the
 * index's designs first, because a design owns that segment when one carries the id. Only
 * a segment no design carries is read here, and then the pull request whose own number the
 * segment states is the one the address names.
 */
export function worklessPullRequest(
  pullRequests: PullRequest[],
  workId: string,
): PullRequest | null {
  return pullRequests.find((pull) => String(pull.id) === workId) ?? null;
}

/**
 * The other account's address for one shared section name. The jump reads this.
 *
 * ONE BUILDER CROSSES BETWEEN THE ACCOUNTS, AND IT CALLS BOTH ADDRESS BUILDERS. A jump
 * whose address were assembled where the control is drawn would be a second address
 * scheme beside the two this file fixes, and a change to the route shape would reach the
 * rail and miss the jump. The crossing therefore reads the two builders and invents
 * nothing: the program's row lands on the change's own address, and the change's row lands
 * on the program's.
 *
 * `shared` is the section name both accounts carry, so it is a `SharedKey` and never a row
 * of one account alone. A caller with no counterpart passes null and builds no jump.
 */
export function counterpartHref(
  workId: string,
  pr: number,
  from: AccountId,
  shared: SharedKey,
): string {
  return from === "program" ? changeHref(workId, pr, shared) : programHref(workId, shared);
}

/**
 * The section a level opens on when the reader carried a section name across.
 *
 * The match ignores case and surrounding space. No match, a null name, and an empty list
 * all give the first section. Of two sections with one name, the first wins.
 */
export function carriedSectionIndex(names: string[], carried: string | null): number {
  if (carried === null) return 0;
  const wanted = carried.trim().toLowerCase();
  const at = names.findIndex((name) => name.trim().toLowerCase() === wanted);
  return at < 0 ? 0 : at;
}

/**
 * The words of the link on a section heading that leads to the other account.
 *
 * The program account names the pull request, and it has no link when it has none. The
 * change account always leads back to the work item.
 */
export function readInLabel(from: AccountId, pr: number | null): string | null {
  if (from === "change") return "Read in the work item ›";
  return pr === null ? null : `Read in PR ${pr} ›`;
}

/**
 * The change row the route's appended segment names, as a position in `CHANGE_KEYS`.
 *
 * The segment is the row's own name, so `.../architecture` opens the change's
 * Architecture box and the bare address opens the first row. A segment that names no row
 * of the change lands on the first one, which is the row the bare address opens.
 */
export function changeRowIndex(subId: string | null): number {
  if (subId === null) return 0;
  const at = (CHANGE_KEYS as readonly string[]).indexOf(subId);
  return at < 0 ? 0 : at;
}

/* ------------------------------------------------------------------ the rail */

/**
 * Everything the rail's two groups are built from, and nothing else.
 *
 * This is the whole input to `railGroups`. The rail takes it as its own props and the
 * arrow-key traversal takes the same object, so both read one derivation. The change's own
 * records join it so that the Review group's rows can state what each one holds; they are
 * absent while no change is read, and the rows then state no count rather than a number
 * nobody read.
 */
export interface RailSource {
  work: WorkItem | null;
  gates: Gates | null;
  levels: Record<string, LevelState> | null;
  /**
   * The change the Review group addresses: the pull request the route names, or the one
   * this work's own epics carry. Absent when the work carries none, and then the Review
   * group states that absence rather than showing four rows that open nothing.
   */
  changePr?: number | null;
  /** The change's four narration levels, or absent while no change is read. */
  changeLevels?: ChangeLevel[];
  /** How many files the change's diff holds, or absent when the bundle holds none. */
  diffFiles?: number | null;
  /** The audio addresses the bundle answered, keyed by the address, or absent. */
  servedAudio?: Record<string, boolean>;
}

/**
 * The rail's two groups, in the order a reader reads down them.
 *
 * TWO ACCOUNTS, ONE ROW LIST. Build reads the program's account, and its five rows are
 * that account's sections in reading order. Review reads the change's account, and its
 * four rows are the change's own four. One function returns both, and the rail and the
 * arrow walk read the same answer, so the two cannot drift.
 *
 * THE REVIEW GROUP IS RETURNED EVEN WHEN THE WORK'S OWN EPICS CARRY NO PULL REQUEST. The
 * change's absence is then a state the reader sees, stated in place by `Rail.tsx`, rather
 * than a group that is simply missing. A row a reader cannot fill is worse than a group
 * that says why.
 *
 * THE BOARD IS NOT ONE OF THE TWO GROUPS. It reads no account, so it is not a row of
 * either one, and `Rail.tsx` draws its own row above the groups from `boardHref()`.
 */
export function railGroups(source: RailSource): RailGroup[] {
  const { work, gates, levels, changePr = null, changeLevels = [], servedAudio = {} } = source;
  const diffFiles = source.diffFiles ?? null;

  /* No work item, no account. The board's own row belongs to the rail, not to this list. */
  if (work === null) return [];

  /** The section name this row shares with the other account, or null when it shares none. */
  const shared = (section: string): SharedKey | null =>
    (SHARED_KEYS as readonly string[]).includes(section) ? (section as SharedKey) : null;

  /** The change's own narration level behind one of its four rows. */
  const levelOf = (section: ChangeKey): ChangeLevel | null => {
    const key = CHANGE_LEVEL_KEY[section];
    return changeLevels.find((level) => level.key === key) ?? null;
  };

  const programRows: RailRow[] = BUILD_ROW_KEYS.map((section) => {
    const row: RailRow = {
      key: `program-${section}`,
      label: PROGRAM_LABEL[section],
      href: programHref(work.id, section),
      account: "program",
      shared: shared(section),
      count: programCount(work, section),
      available: true,
    };

    /* Epics and Rubrics are sections of the work, and the work always states both. */
    if (section === "rubrics") return row;
    /* A work with no plan directory keeps the row, disabled, so the gap reads in place. */
    if (section === "plan") {
      return work.hasPlan ? row : { ...row, href: "#", available: false, absent: ["no plan"] };
    }
    if (section === "epics") {
      return gates?.build
        ? row
        : { ...row, href: "#", available: false, absent: ["the work carries no epic"] };
    }

    /*
     * A level's record is absent rather than empty, and the row states it in place: the
     * reader needs the gap where they would have clicked, not a click that leads nowhere.
     */
    const state = levels?.[section];
    const available = state?.available ?? true;
    return {
      ...row,
      href: available ? row.href : "#",
      available,
      absent: available ? undefined : (state?.missing ?? ["no work item is selected"]),
    };
  });

  const changeRows: RailRow[] =
    changePr === null
      ? []
      : CHANGE_KEYS.map((section) => ({
          key: `change-${section}`,
          label: CHANGE_LABEL[section],
          href: changeHref(work.id, changePr, section),
          account: "change",
          shared: shared(section),
          count: changeCount(
            levelOf(section),
            diffFiles,
            section,
            servedAudio,
            changeLevels.length > 0,
          ),
          /* Slice 15 renders all four rows, and each states in place what it could not read. */
          available: true,
        }));

  return [
    { key: "build", label: "Build", account: "program", rows: programRows, entries: reached(programRows) },
    { key: "review", label: "Review", account: "change", rows: changeRows, entries: reached(changeRows) },
  ];
}

/** The rows a press can reach: the ones whose record the rail could read. */
function reached(rows: RailRow[]): RailRow[] {
  return rows.filter((row) => row.available);
}

/**
 * Every row a press can reach, in the order the rail renders them.
 *
 * ONE FLAT LIST SERVES THE WALK. The arrow-key traversal steps this list, so a folded
 * group is a display choice and never a gap: the walk reaches every reachable row of both
 * groups whether a group is open or closed. The list carries the rows of both accounts, so
 * a group boundary is one step.
 */
export function rowsOf(groups: RailGroup[]): RailRow[] {
  return groups.flatMap((group) => group.entries);
}

/**
 * How many records one program row reads, in the row's own terms.
 *
 * The count is the section's own list length, and never a number this file picks: a row
 * whose record is absent reads zero, and the body under the row states the absence in
 * place.
 */
function programCount(work: WorkItem, section: ProgramKey): string {
  const record = work.record;

  if (section === "epics") return `${work.epics.length} epics`;
  if (section === "plan") {
    const docs = work.planDocs;
    const held = [docs.product, docs.architecture, docs.program].filter(Boolean).length;
    return `${held} of 3 documents`;
  }
  if (section === "rubrics") {
    /*
     * The row names the rubric documents the page reads. A work that holds none keeps
     * an absence word, because a zero would read as a count of records the rail read
     * and the row below states the absence per slice in place.
     */
    return work.rubrics.length > 0 ? `${work.rubrics.length} rubrics` : "none";
  }
  if (section === "intent") {
    const parts = [
      record?.goal,
      record?.intent,
      record?.narrative,
      record?.assessment,
      record?.diagrams,
      record?.pr_draft,
      record?.contracts,
    ].filter((part) => part !== undefined).length;
    return `${parts} records`;
  }
  if (section === "problem-and-solution") {
    const held = [
      record?.intent?.problem,
      record?.intent?.approach,
      (record?.intent?.risks ?? []).length > 0,
      (record?.intent?.unknowns ?? []).length > 0,
      (record?.intent?.alternatives ?? []).length > 0,
      (record?.narrative?.problem_solution?.beats ?? []).length > 0,
      record?.assessment?.verdict,
    ].filter(Boolean).length;
    return `${held} of 7 fields`;
  }

  const held =
    work.linkedAdrs.length + work.diagramLevels.length + work.districts.length + work.boundaryRules.length;
  return `${held} records`;
}

/**
 * How many records one change row reads.
 *
 * A COUNT THE RAIL HAS NOT READ IS NO COUNT. The change's records load when the route
 * names the change's account, and the rail addresses the change's rows from a program row
 * too. There the rail holds no level and no diff, and a row that said `0 of 4 parts` would
 * state a number nobody read. So it states nothing, and the row's own name still says what
 * it opens.
 *
 * WHEN IT HAS READ THEM, the count names the level's own parts and every part it cannot
 * reach counts zero. The audio is the one part no record can settle on its own: a level's
 * `voice` script says the level was voiced and names the address, and only the browser can
 * say whether a file answers there. So the audio counts only once `servedAudio` has
 * confirmed it.
 */
function changeCount(
  level: ChangeLevel | null,
  diffFiles: number | null,
  section: ChangeKey,
  servedAudio: Record<string, boolean>,
  read: boolean,
): string {
  if (!read) return "";
  if (section === "file-diffs") {
    return diffFiles === null ? "no diff" : `${diffFiles} files`;
  }
  if (level === null) return "no level";
  const held = [
    level.narration.length > 0,
    level.art !== null,
    level.audio !== null && servedAudio[level.audio] === true,
    level.diagram !== null,
  ].filter(Boolean).length;
  return `${held} of 4 parts`;
}

/** The lead line for the stage, the publications, and the deploy status. Shared by the work-item Shipped section and the pull-request level line. */
export const STAGE_PUBLICATIONS_DEPLOY_LEAD =
  "The stage, the publications, and the deploy status.";
