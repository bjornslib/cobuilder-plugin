/**
 * The two accounts of one work item, and the rail that reads them.
 *
 * WHAT THIS FILE IS FOR. The reviewed FlightDeck prototype reads one pull request and
 * nothing else. This prototype reads one work item two ways at once, which is the shape
 * ADR-0029 decided: the work's own records are the program's account, and the pull
 * request its epics carry is the change's account. Both accounts cover the same three
 * section names, so a reader can put one beside the other.
 *
 * THE ENGINEER'S GROUPING, AND ONLY THE ENGINEER'S GROUPING. The rail holds two groups.
 * Build reads Intent, Problem & Solution, Architecture, Epics, and Rubrics from the
 * program's account. Review reads Intent, Problem & Solution, Architecture, and File
 * Diffs from the change's account.
 *
 * THE DEPLOY GROUP IS GONE. The engineer named it, gave it no items, and then asked for
 * it to be removed. The shipped shell's own two delivery entries went with it, and the
 * rows, the account, and the body member that fed them are gone rather than hidden.
 *
 * THE PROGRAM'S ADDRESSES FOLLOW THE SHELL'S OWN ROUTE SHAPE, and this file invents no
 * second scheme. `@/shell/model` holds the parser and the builder, and this file calls
 * them:
 *
 *   #/<work>/intent                     the program's Intent section
 *   #/<work>/problem-and-solution        the program's Problem & Solution section
 *   #/<work>/architecture                the program's Architecture section
 *   #/<work>/build/epics                 the work's epics
 *   #/<work>/build/rubrics               the work's rubrics
 *
 * THE CHANGE'S ADDRESSES FOLLOW ADR-0029, AND ITS SECTION RIDES THE SHELL'S OWN SLOT.
 * ADR-0029 fixes the change's address as `#/<work>/pull-requests/<pr>`. That address is
 * the change's Intent section, which is the first of its four. A named section appends
 * one segment, which is the shell's own `subId` field and needs no second parser:
 *
 *   #/<work>/pull-requests/11                          the change's Intent section
 *   #/<work>/pull-requests/11/problem-and-solution     the change's Problem & Solution
 *   #/<work>/pull-requests/11/architecture             the change's Architecture
 *   #/<work>/pull-requests/11/file-diffs               the change's File Diffs
 *
 * THE LEVEL KEY UNDER THE WORD INTENT IS STILL `landscape`. ADR-0029 decided the rename
 * to `intent` and states that it runs with the parity slice, never immediately, because
 * the key reaches a paid audio filename. This prototype shows the engineer's own word on
 * the screen and reads the bundle's key underneath, and `CHANGE_LEVEL_KEY` is that one
 * mapping. This is the label ADR-0029 rejects for the shipped surface, and the prototype
 * is not the shipped surface.
 *
 * NO COLOUR, NO SIZE, AND NO LAYOUT LIVES HERE. This file holds the two accounts, their
 * rows, their addresses, and their record counts. `AccountRail.tsx` and `AccountMark.tsx`
 * decide appearance, and `accountProgram.tsx` and `accountChange.tsx` decide the bodies.
 */

import type { DesignRecords } from "@/data/bundle";
import type { AdrRecords } from "@/data/adrs";
import type { RecordIndex } from "@/data/types";
import type { WorkItem } from "@/data/works";
import {
  epicGroups,
  gatesOf,
  levelsOf as programLevelsOf,
  readRoute,
  routeHref,
} from "@/shell/model";
import type { Gates, LevelState } from "@/shell/model";

import { diffFiles, levelsOf as storyLevelsOf } from "./model";
import type { Level, LevelKey, Manifest, Story, StoryEntry } from "./model";

/* ------------------------------------------------------------------ accounts */

/**
 * Which account a group reads.
 *
 * `program` reads the work's own design records. `change` reads the pull request the
 * work's own epics carry.
 */
export type AccountId = "program" | "change";

/**
 * The mark's first part: the word a reader sees on every section of this account.
 *
 * THE GLYPH IS THE MARK'S SECOND PART AND IT IS NOT HERE. `AccountMark.tsx` holds it in
 * `ACCOUNT_GLYPH`, because a Lucide component is a value this data module has no reason
 * to import. A word and a glyph are the whole mark.
 */
export interface AccountMark {
  word: string;
}

/**
 * THE MARK IS A WORD AND A GLYPH, AND NOTHING ELSE.
 *
 * ADR-0029 records the debt: a reader must be able to tell what the program intended
 * from what the change did, and the slice that builds the addition owns the mark. This
 * prototype carries a mark so the engineer can judge one, and the mark is a proposal
 * rather than a decision.
 *
 * THE MARK CARRIES NO FILL, AND THE ENGINEER ASKED FOR THAT. It had three parts, and the
 * third was a fill: the shell's selected-row wash for the program's account and the
 * shell's heading band for the change's. The engineer dropped it, so two parts remain and
 * neither is a colour. `AccountMark.tsx` and `AccountRail.tsx` draw them.
 *
 * THE MARK ALSO CARRIED A LINE PER ACCOUNT, AND THE ENGINEER DROPPED IT. The line said
 * whose record the account reads, and it stood on every section of both accounts. The
 * engineer asked for both lines to go, so the rule now says the account's own word, whose
 * record it is, and the way across to the other account.
 */
export const ACCOUNT_MARK: Record<AccountId, AccountMark> = {
  program: { word: "Program" },
  change: { word: "Change" },
};

/* ------------------------------------------------------------------ the keys */

/** The three section names both accounts carry, in the order the engineer listed them. */
export const SHARED_KEYS = ["intent", "problem-and-solution", "architecture"] as const;
export type SharedKey = (typeof SHARED_KEYS)[number];

export const PROGRAM_KEYS = [
  "intent",
  "problem-and-solution",
  "architecture",
  "epics",
  "rubrics",
] as const;
export type ProgramKey = (typeof PROGRAM_KEYS)[number];

export const CHANGE_KEYS = [
  "intent",
  "problem-and-solution",
  "architecture",
  "file-diffs",
] as const;
export type ChangeKey = (typeof CHANGE_KEYS)[number];

/** The two groups the engineer kept, after the Deploy group was removed. */
export type GroupKey = "build" | "review";

/** Which account each group reads. The engineeer named the groups and fixed this pairing. */
export const GROUP_ACCOUNT: Record<GroupKey, AccountId> = {
  build: "program",
  review: "change",
};

/**
 * The bundle's own narration level key behind each of the change's four sections.
 *
 * ADR-0029 renames `landscape` to `intent`, and the rename travels with the parity slice
 * rather than landing here. Until it does, the bundle's key is `landscape` and the
 * section's word is Intent. This table is the whole of that difference.
 */
export const CHANGE_LEVEL_KEY: Record<ChangeKey, LevelKey> = {
  intent: "landscape",
  "problem-and-solution": "problem_solution",
  architecture: "architecture",
  "file-diffs": "file_changes",
};

/** One line per section: what the reader is about to read, and whose record it is. */
export const PROGRAM_LEAD: Record<ProgramKey, string> = {
  intent: "Why this work exists, what tells it is done, and where it must stop.",
  "problem-and-solution": "The gap the design answers, the shape it chose, and the assessment written against it.",
  architecture: "The mechanism drawings, the decisions this work names, and the boundaries they set.",
  epics: "The units the work is delivered in, and the slices each one holds.",
  rubrics: "The gate records, one per accepted slice.",
};

export const CHANGE_LEAD: Record<ChangeKey, string> = {
  intent: "What the change is, in one breath: its narration, its picture, its drawing, and the intent captured before it opened.",
  "problem-and-solution": "The gap the diff closes and the shape it closes it with, beside the assessment written against the merged diff.",
  architecture: "The mechanism as a drawing, the narration that reads it, and the decisions the change landed.",
  "file-diffs": "The diff itself, file by file.",
};

/* ------------------------------------------------------------------ the rail */

export type BodyRef =
  | { kind: "program"; section: ProgramKey }
  | { kind: "change"; section: ChangeKey };

export interface RailRow {
  /** Stable row key. One per address, because two rows never share an address. */
  key: string;
  label: string;
  /** The address a press opens. It is the shell's own builder, so no row invents one. */
  href: string;
  account: AccountId;
  /** The shared section name this row carries, or null when it carries none. */
  shared: SharedKey | null;
  body: BodyRef;
  /** How many records the section reads, as a short string. */
  count: string;
}

export interface RailGroup {
  key: GroupKey;
  label: string;
  account: AccountId;
  rows: RailRow[];
}

/** What the rail needs. `work` is null while the index is in flight or names no design. */
export interface AccountRailSource {
  work: WorkItem | null;
  gates: Gates | null;
  levels: Record<string, LevelState> | null;
  /** The change this work's own epics carry, or null when the bundle holds none. */
  entry: StoryEntry | null;
  /** Every narration level of that change, in the bundle's order. */
  changeLevels: Level[];
  /** How many files the change's diff holds, or null when the bundle holds no diff. */
  diffFiles: number | null;
  /**
   * The audio addresses the bundle serves, read once by `servedAudioOf`. A level whose
   * audio is not in this set reads as an absent part, not as a record.
   */
  servedAudio: ReadonlySet<string>;
}

/** The address of one shared section on the change's account. */
export function changeHref(workId: string, pr: number, section: ChangeKey): string {
  /* ADR-0029's own address. The change's Intent section is the bare pull-request route. */
  if (section === "intent") return routeHref(workId, "pull-requests", String(pr));
  return routeHref(workId, "pull-requests", `${pr}/${section}`);
}

/** The address of one shared section on the program's account. */
export function programHref(workId: string, section: ProgramKey): string {
  if (section === "epics") return routeHref(workId, "build", "epics");
  if (section === "rubrics") return routeHref(workId, "build", "rubrics");
  return routeHref(workId, section);
}

/** The other account's address for one shared section name. The jump reads this. */
export function counterpartHref(
  workId: string,
  pr: number,
  from: AccountId,
  shared: SharedKey,
): string {
  return from === "program" ? changeHref(workId, pr, shared) : programHref(workId, shared);
}

/**
 * How many records one program section reads.
 *
 * A record is a part of the design the section renders, and the count is the section's
 * own list length rather than a number this file picks. A section whose record is absent
 * reads zero, and the body states the absence in place.
 */
function programCount(work: WorkItem, gates: Gates | null, section: ProgramKey): string {
  const record = work.record;
  if (section === "intent") {
    const parts = [
      record?.goal,
      record?.intent,
      record?.narrative,
      record?.assessment,
      record?.diagrams,
      record?.pr_draft,
    ].filter((part) => part !== undefined).length;
    return `${parts} records`;
  }
  if (section === "problem-and-solution") {
    const n = [
      record?.intent?.problem,
      record?.intent?.approach,
      (record?.intent?.risks ?? []).length > 0,
      (record?.intent?.unknowns ?? []).length > 0,
      (record?.intent?.alternatives ?? []).length > 0,
      (record?.narrative?.problem_solution?.beats ?? []).length > 0,
      record?.assessment?.verdict,
    ].filter(Boolean).length;
    return `${n} of 7 fields`;
  }
  if (section === "architecture") {
    const n =
      work.linkedAdrs.length +
      work.diagramLevels.length +
      work.districts.length +
      work.boundaryRules.length;
    return `${n} records`;
  }
  if (section === "epics") return `${work.epics.length} epics`;
  return gates?.gateSteps && gates.gateSteps.length > 0
    ? `${gates.gateSteps.length} steps`
    : "none";
}

/**
 * How many records one change section reads. The seven parts ADR-0029 lists, split up.
 *
 * THE COUNT IS THE PARTS A READER CAN REACH, AND NEVER A PART THE BUNDLE ONLY PROMISES.
 * The program's own count answers the section's list length, and a part the record does
 * not hold reads zero: a reader who cannot reach a record reads its absence stated in
 * place instead. The change's count answers the same question the same way, and it takes
 * `servedAudio` for the one part no record can settle. A level's `voice` script says the
 * level was voiced and names the audio address, and `manifest.js` holds no audio list, so
 * the script alone cannot say whether a file sits at that address. See `servedAudioOf`.
 *
 * EVERY TERM NAMES ITS LEVEL. A section whose level the bundle does not hold counts zero
 * rather than reading four absent fields as four records.
 */
function changeCount(
  level: Level | null,
  entry: StoryEntry,
  diffCount: number | null,
  section: ChangeKey,
  servedAudio: ReadonlySet<string>,
): string {
  if (section === "file-diffs") {
    return diffCount === null ? "no diff" : `${diffCount} files`;
  }
  const n = [
    level !== null && Boolean(level.narration),
    level !== null && level.art !== null,
    level !== null && level.audio !== null && servedAudio.has(level.audio),
    level !== null && level.diagram !== null,
    section === "intent" ? Boolean(entry.intent) : false,
    section === "problem-and-solution" ? Boolean(entry.assessment) : false,
    section === "architecture" ? (entry.adrs ?? []).length > 0 : false,
  ].filter(Boolean).length;
  return `${n} records`;
}

/**
 * The rail, as the engineer grouped it.
 *
 * BUILD AND REVIEW SHARE THREE SECTION NAMES AND READ DIFFERENT ACCOUNTS. That is the
 * whole point of the grouping, so the two groups are built from one list and the account
 * decides the address and the body.
 *
 * THE DEPLOY GROUP WAS HERE AND IS GONE. The engineer named it, gave it no items, and
 * then asked for it to be removed. Its two rows were the shipped shell's own `Shipped`
 * entry and its `Pull requests` entry. Both rows, the group that held them, the delivery
 * account, and the body member that drew them are deleted rather than hidden, so nothing
 * in this prototype reaches the delivery stage any more.
 */
export function railGroups(source: AccountRailSource): RailGroup[] {
  const { work, gates, entry, changeLevels, diffFiles: diffCount, servedAudio } = source;

  if (work === null) return [];

  const levelOf = (section: ChangeKey): Level | null => {
    const key = CHANGE_LEVEL_KEY[section];
    return changeLevels.find((level) => level.key === key) ?? null;
  };

  const programRows: RailRow[] = PROGRAM_KEYS.map((section) => {
    const shared = (SHARED_KEYS as readonly string[]).includes(section)
      ? (section as SharedKey)
      : null;
    return {
      key: `program-${section}`,
      label:
        section === "intent"
          ? "Intent"
          : section === "problem-and-solution"
            ? "Problem & Solution"
            : section === "architecture"
              ? "Architecture"
              : section === "epics"
                ? "Epics"
                : "Rubrics",
      href: programHref(work.id, section),
      account: "program" as AccountId,
      shared,
      body: { kind: "program", section } as BodyRef,
      count: programCount(work, gates, section),
    };
  });

  const changeRows: RailRow[] =
    entry === null
      ? []
      : CHANGE_KEYS.map((section) => {
          const shared = (SHARED_KEYS as readonly string[]).includes(section)
            ? (section as SharedKey)
            : null;
          return {
            key: `change-${section}`,
            label:
              section === "intent"
                ? "Intent"
                : section === "problem-and-solution"
                  ? "Problem & Solution"
                  : section === "architecture"
                    ? "Architecture"
                    : "File Diffs",
            href: changeHref(work.id, entry.pr, section),
            account: "change" as AccountId,
            shared,
            body: { kind: "change", section } as BodyRef,
            count: changeCount(levelOf(section), entry, diffCount, section, servedAudio),
          };
        });

  const groups: RailGroup[] = [
    { key: "build", label: "Build", account: "program", rows: programRows },
  ];

  /*
    A WORK WHOSE OWN EPICS CARRY NO PULL REQUEST HAS NO CHANGE ACCOUNT. The Review group
    then states that absence rather than showing four rows that open nothing, because a
    row a reader cannot fill is worse than a group that says why.
  */
  groups.push({ key: "review", label: "Review", account: "change", rows: changeRows });

  return groups;
}

/** Every row the rail holds, in the order it renders them. The jump and the marks read it. */
export function rowsOf(groups: RailGroup[]): RailRow[] {
  return groups.flatMap((group) => group.rows);
}

/* ------------------------------------------------------------------- the bundle */

/**
 * Everything both accounts read, read once.
 *
 * THE FIVE FLIGHTPECK READS PLUS TWO. The reviewed prototype reads `story.js`,
 * `manifest.js`, `diagrams.js`, `diffs-pr{N}.js`, and `adrs.js`. This surface needs the
 * program's records too, so it reads the record index and the design records as well:
 * `index.json` holds the joins and every entity, and `designs.js` holds the record bodies
 * the shell's own panels draw.
 */
export interface AccountBundle {
  story: Story;
  manifest: Manifest;
  diagrams: Record<string, string>;
  diff: Record<string, string> | null;
  diffError: string | null;
  adrs: AdrRecords;
  index: RecordIndex;
  designs: DesignRecords;
}

export function diffCountOf(diff: Record<string, string> | null): number | null {
  return diff === null ? null : diffFiles(diff).length;
}

/* ------------------------------------------------------------------ the route */

export interface LiveRow {
  group: RailGroup;
  row: RailRow;
}

/**
 * The row the reader's address opens, found by exact address as the shipped rail does.
 *
 * AN EXACT MATCH, NEVER A SECTION MATCH. Two rows share the section name Intent, and two
 * more share Architecture. A match on the section name would light four rows at once,
 * which is the defect the shipped rail's own comment records.
 */
export function liveRow(groups: RailGroup[]): LiveRow | null {
  const here = window.location.hash;
  for (const group of groups) {
    const row = group.rows.find((candidate) => candidate.href === here);
    if (row) return { group, row };
  }
  return null;
}

/** The route the shell's own parser reads, re-exported so the surface names one reader. */
export { readRoute };

/* --------------------------------------------------------------- change pieces */

/**
 * The four narration levels of the change, derived once.
 *
 * `levelsOf` in `./model` is the reviewed prototype's own derivation, and it is the one
 * reader of the bundle's level keys. This function calls it rather than deriving a second
 * time, so the change's account and the reviewed single-pull-request surface cannot
 * disagree about which levels exist.
 */
export function changeLevelsOf(
  entry: StoryEntry,
  story: Story,
  manifest: Manifest,
  diagrams: Record<string, string>,
): Level[] {
  return storyLevelsOf(entry, story, manifest, diagrams);
}

/** The program's own level state, read from the shell's rule and not restated here. */
export function programLevelState(work: WorkItem): Record<string, LevelState> {
  return programLevelsOf(work);
}

/* ------------------------------------------------------------- change audio */

/**
 * The audio addresses the bundle serves, asked for once per voiced level.
 *
 * THE VOICE SCRIPT IS A PROMISE AND NOT THE FILE. A level carries a `voice` string when
 * the bundle records that it was voiced, and `levelsOf` in `./model` derives the address
 * from that string. That derivation is right about the address and silent about the file.
 * `manifest.js` holds the bundle's picture list and its diagram list and no audio list, so
 * no record this surface reads can separate a level whose audio was recorded from a level
 * whose audio file the bundle no longer holds. This bundle is that case: pull request 11
 * carries three voice scripts and three `pr11_*.wav` addresses, and `data/audio/` holds no
 * `pr11_*.wav` file. A count that trusted the script would put a record in the rail row
 * that the panel below it can only state as a file that did not load.
 *
 * SO THE COUNT READS WHAT THE BROWSER FOUND, AND NOT WHAT THE SCRIPT PROMISES. This asks
 * each voiced level's address for its metadata, once, and answers with the addresses that
 * answered. A missing file resolves as a miss, so a surface never waits on a request that
 * a bundle cannot satisfy. The price of asking is the one `NarrationPanel` already argues
 * for its own control: one metadata request per voiced level.
 *
 * THE CHIP COUNTS NOTHING BEFORE THIS ANSWERS. A count reads an audio address as a record
 * only once the browser has confirmed a file at it, so the chip never counts a record the
 * bundle has not answered for, and the confirmation arrives with the rows rather than after
 * them. `Accounts.tsx` asks once, keyed on the change's own level list, so every row of the
 * rail and every panel under it read one answer.
 */
export function servedAudioOf(levels: Level[]): Promise<ReadonlySet<string>> {
  const asked = levels.map((level) => level.audio).filter((url): url is string => url !== null);
  return Promise.all(
    asked.map(
      (url) =>
        new Promise<string | null>((resolve) => {
          const probe = new Audio();
          probe.preload = "metadata";
          /* Metadata is the whole question: a served file answers, a missing one errors. */
          probe.onloadedmetadata = () => resolve(url);
          probe.onerror = () => resolve(null);
          probe.src = url;
        }),
    ),
  ).then((answered) => new Set(answered.filter((url): url is string => url !== null)));
}

/** The shell's own gate rule for one work item. */
export function programGates(work: WorkItem): Gates {
  return gatesOf(work);
}

/** The epics, cut into the sections the shell's own Build level pages. */
export { epicGroups };
