/**
 * The change's account: the four rows of one work item's pull request.
 *
 * A WORK ITEM AND THE PULL REQUEST ITS OWN EPICS CARRY ARE TWO ACCOUNTS OF ONE SURFACE.
 * The work's own records are the program's account, and `src/shell/sections.tsx` renders
 * them. This module renders the change's account: four rows, each read from that pull
 * request's own records.
 *
 * THE FOUR ROWS ARE INTENT, PROBLEM & SOLUTION, ARCHITECTURE, AND FILE DIFFS. The fourth
 * name stands in this account alone, and the first three repeat in the program's own
 * levels. That repetition is what makes a same-named jump across the two accounts
 * possible, so the names are fixed once in `CHANGE_LABEL` and read from there.
 *
 * ONE ROW IS ONE PAGED LEVEL, AND ONE SECTION IS ONE PANEL. The shell's paged level reads
 * its section strip from the panel headings on the page and its box count from the list
 * this module returns. So `changeSections` returns the sections of one row, each a `Panel`,
 * and every part inside a section is a heading, a box, or a statement rather than a second
 * panel. This is the program account's own structure, so a level reads the same way in
 * both accounts. The sections of each row are named where `changeSections` builds them.
 *
 * EVERY PART A ROW CANNOT REACH IS STATED IN PLACE. An open pull request carries fewer
 * records than a merged one, a level the bundle never voiced carries no audio, and a
 * picture the browser failed on is not there. Absence is a state, so a reader meets a
 * sentence where the record would be, and never a blank frame.
 *
 * THE LEVEL KEY BEHIND EACH ROW IS `CHANGE_LEVEL_KEY`, AND NOTHING DERIVES IT. ADR-0029
 * renamed the bundle's first level, so the row named Intent and the key beneath it read the
 * same word, and the two rows whose words differ have one table that holds the difference.
 *
 * THE DECISIONS THIS CHANGE LANDED COME FROM THE INDEX'S JOIN. `entry.adrs` is a second
 * list of the same fact, and this module does not read it. The shell resolves the index's
 * `adr_to_pull_request` once and hands it in, so this row and the index cannot disagree.
 */

import type { ReactNode } from "react";

import type { LucideIcon } from "lucide-react";
import { FileText, GitPullRequest, ScrollText, Target } from "lucide-react";

import type { AdrRecord, AdrRecords } from "@/data/adrs";
import type { StoryEntry } from "@/data/bundle";
import type { ResolvedJoins } from "@/data/joins";
import { cn } from "@/lib/utils";
import {
  Box,
  Chip,
  Missing,
  Panel,
  StateBadge,
  SubHead,
  TextList,
} from "@/shell/atoms";
import type { Theme } from "@/shell/DiagramTiles";
import type { SheetSubject } from "@/shell/Sheet";

import { ChangeDiff } from "./Diff";
import { ChangeFrame } from "./Frame";
import type { ArtMode } from "./Frame";
import { ChangeAssessmentPart, ChangeIntentPart } from "./Sheets";
import { diffFiles } from "./levels";
import type { ChangeLevel, LevelKey } from "./levels";

/* ------------------------------------------------------------------ the rows */

/**
 * The change's four rows, in the order the reader walks them.
 *
 * The order is the bundle's own level order, so the row a reader is on and the level they
 * are reading are the same position. Three of the four names also stand in the program's
 * Levels group.
 */
export type ChangeKey = "intent" | "problem-and-solution" | "architecture" | "file-diffs";

/** The same four rows as a list, in the order the reader walks them. */
export const CHANGE_KEYS: readonly ChangeKey[] = [
  "intent",
  "problem-and-solution",
  "architecture",
  "file-diffs",
];

/**
 * The bundle's own narration level key behind each of the change's four rows.
 *
 * Two of the four rows read a key spelled differently from the row's word. One table
 * holds the whole mapping, so no row spells a key for itself.
 */
export const CHANGE_LEVEL_KEY: Record<ChangeKey, LevelKey> = {
  "intent": "intent",
  "problem-and-solution": "problem_solution",
  "architecture": "architecture",
  "file-diffs": "file_changes",
};

/** The four rows' own names. The fourth stands in this account alone. */
export const CHANGE_LABEL: Record<ChangeKey, string> = {
  intent: "Intent",
  "problem-and-solution": "Problem & Solution",
  architecture: "Architecture",
  "file-diffs": "File Diffs",
};

/** What each row reads, and the callbacks its controls raise. */
export interface ChangeBodyProps {
  /** The pull request's own timeline entry, or null when the bundle holds none. */
  entry: StoryEntry | null;
  /** The four narration levels, derived once by `./levels`. */
  levels: ChangeLevel[];
  /** The diff hunks, keyed by path, or null when the bundle holds no diff. */
  diff: Record<string, string> | null;
  /** Why the diff is absent, or null when the bundle holds one. */
  diffMessage: string | null;
  theme: Theme;
  artMode: ArtMode;
  onArtMode: (mode: ArtMode) => void;
  /** The picture address that did not load, or null. */
  failedArt: string | null;
  onArtFailed: (url: string) => void;
  /** The diff path the reader selected, or null for the largest file. */
  diffFile: string | null;
  onDiffFile: (path: string) => void;
  /**
   * The index's joins, resolved once by the shell, or null when the index did not load.
   *
   * The decisions this change landed come from here and never from the entry's own
   * `adrs` list, so the account and the index cannot disagree about that set.
   */
  joins: ResolvedJoins | null;
  adrs: AdrRecords;
  openSheet: (subject: SheetSubject) => void;
}

/**
 * One row's sections, one element per panel, in the order the reader walks them.
 *
 * EACH ROW IS A PAGED LEVEL OF ITS OWN, AS IN THE PROGRAM'S ACCOUNT. The rail's four rows
 * open four levels, and the section strip of a level names that level's own sections. A
 * row used to be one long panel and the strip repeated the rail's four names, so the
 * strip told the reader nothing the rail had not told them.
 *
 * THE ENTRY'S ABSENCE IS ONE STATED SECTION, AND NOT AN EMPTY LIST. A route can name a
 * change the bundle holds no story entry for, and the reader who asked for that row wants
 * the row they asked for, saying what it could not read. An empty list would leave the
 * pane with no strip, no boxes, and no statement at all.
 */
export function changeSections(props: ChangeBodyProps, row: ChangeKey): ReactNode[] {
  const { entry, levels } = props;
  const icon = ROW_ICON[row];
  const level = levels.find((candidate) => candidate.key === CHANGE_LEVEL_KEY[row]) ?? null;

  if (entry === null) {
    return [
      <Panel key={row} title={CHANGE_LABEL[row]} icon={icon} absent>
        <Missing>
          The bundle holds no story entry for this pull request, so this row has no record
          to read.
        </Missing>
      </Panel>,
    ];
  }

  /** The level's picture or drawing, which leads the row's first section. */
  const narration = (
    <>
      <ChangeFrame
        level={level ?? EMPTY_LEVEL}
        theme={props.theme}
        artMode={props.artMode}
        onArtMode={props.onArtMode}
        failedArt={props.failedArt}
        onArtFailed={props.onArtFailed}
      />
    </>
  );

  const intent = entry.intent;
  const assessment = entry.assessment;

  if (row === "intent") {
    return [
      <Panel key="why" title="Why" icon={icon} absent={level === null && intent === undefined}>
        {narration}
        <ChangeIntentPart intent={intent} part="why" />
      </Panel>,
      <Panel key="approach" title="Approach" icon={icon} absent={intent === undefined}>
        <ChangeIntentPart intent={intent} part="approach" />
      </Panel>,
      <Panel key="scope" title="Scope and risk" icon={icon} absent={intent === undefined}>
        <ChangeIntentPart intent={intent} part="scope" />
      </Panel>,
      <Panel key="where" title="Where it sits" icon={icon}>
        <ChangeFacts entry={entry} />
        <SubHead>Districts touched</SubHead>
        <Touched entry={entry} />
      </Panel>,
    ];
  }

  if (row === "problem-and-solution") {
    const gap = entry.levels?.[CHANGE_LEVEL_KEY["problem-and-solution"]];
    const beats = gap?.beats ?? [];
    const stated = Boolean(gap?.problem || gap?.solution) || beats.length > 0;
    return [
      <Panel
        key="problem"
        title="Problem and solution"
        icon={icon}
        absent={level === null && !stated}
      >
        {narration}
        {stated ? (
          <div className="flex min-w-0 flex-col gap-3">
            {gap?.problem ? (
              <Box label="Problem" tone="problem">
                {gap.problem}
              </Box>
            ) : null}
            {gap?.solution ? (
              <Box label="Solution" tone="solution">
                {gap.solution}
              </Box>
            ) : null}
            {beats.length === 0 ? null : (
              <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">
                {beats.map((beat, index) => (
                  <li
                    key={`${index}-${beat.kind ?? ""}`}
                    className="min-w-0 rounded-lg border border-line-soft bg-surface-2/50 px-3.5 py-2.5"
                  >
                    <span className="font-mono text-[11.5px] font-bold tracking-[0.08em] text-ink-faint uppercase">
                      {beat.kind ?? "beat"}
                    </span>
                    <p className="mt-1 mb-0 min-w-0 font-serif text-[15.5px] leading-[1.6] text-foreground">
                      {beat.text}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <Missing>
            This pull request states no problem and no solution for this level. The bundle
            records neither the two prose fields nor a beat.
          </Missing>
        )}
      </Panel>,
      <Panel key="assessment" title="Assessment" icon={icon} absent={assessment === undefined}>
        <ChangeAssessmentPart assessment={assessment} part="assessment" />
      </Panel>,
      <Panel
        key="findings"
        title="Findings and checks"
        icon={icon}
        absent={assessment === undefined}
      >
        <ChangeAssessmentPart assessment={assessment} part="findings" />
      </Panel>,
      <Panel
        key="risk"
        title="Regret risk and drift"
        icon={icon}
        absent={assessment === undefined}
      >
        <ChangeAssessmentPart assessment={assessment} part="risk" />
      </Panel>,
    ];
  }

  if (row === "architecture") {
    /*
     * THE DECISIONS COME FROM THE INDEX'S JOIN, AND FROM NOWHERE ELSE. `entry.adrs` is the
     * story entry's own list, and it and `data/index.json` already disagree about which
     * decisions a change landed. One fact has one source, so this row reads the join the
     * index computed and derives none of it. A null join is the index not loaded, which is
     * stated in place rather than answered from the second list.
     */
    const landed = props.joins === null ? [] : props.joins.adrIdsForPullRequest(entry.pr);
    return [
      <Panel key="mechanism" title="Mechanism" icon={icon} absent={level === null}>
        {narration}
      </Panel>,
      <Panel key="decisions" title="Decisions landed" icon={icon} absent={landed.length === 0}>
        {props.joins === null ? (
          <Missing>
            The index did not load, so this row cannot read the decisions this change landed.
            The join that names them lives in the index.
          </Missing>
        ) : landed.length === 0 ? (
          <Missing>This pull request landed no decision record.</Missing>
        ) : (
          <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">
            {landed.map((id) => {
              const record: AdrRecord | undefined = props.adrs[id];
              return (
                <li key={id} className="min-w-0 list-none">
                  <button
                    type="button"
                    onClick={() =>
                      props.openSheet({
                        kind: "adr",
                        record,
                        title: record?.title ?? id,
                        state: record?.state ?? "unknown",
                      })
                    }
                    className={cn(
                      "flex min-h-9 w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-line-soft bg-card px-3 py-2 text-left",
                      "transition-colors duration-150 ease-house hover:bg-surface-2",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    )}
                  >
                    <ScrollText className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink-mid">
                      {id} · {record?.title ?? "no record in this bundle"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>,
    ];
  }

  const groups = entry.levels?.[CHANGE_LEVEL_KEY["file-diffs"]]?.groups ?? [];
  const files = props.diff === null ? [] : diffFiles(props.diff);
  return [
    <Panel
      key="groups"
      title="Change groups"
      icon={icon}
      absent={level === null && groups.length === 0}
    >
      {groups.length === 0 ? (
        <Missing>
          This pull request's fourth level groups no file. The diff is the whole of the
          record.
        </Missing>
      ) : (
        <ul className="m-0 flex min-w-0 list-none flex-col gap-3 p-0">
          {groups.map((group, index) => (
            <li key={`${index}-${group.title ?? ""}`} className="min-w-0 list-none">
              <div className="flex min-w-0 flex-wrap items-baseline gap-2">
                <span className="font-mono text-[12.5px] font-bold text-ink-mid">
                  {group.title ?? `Group ${index + 1}`}
                </span>
                <span className="font-mono text-[12px] text-ink-faint tabular-nums">
                  {(group.files ?? []).length} files
                </span>
              </div>
              {group.note ? (
                <p className="mt-1 mb-0 font-serif text-[15px] leading-[1.55] text-ink-dim">
                  {group.note}
                </p>
              ) : null}
              <div className="mt-1.5 min-w-0">
                <TextList items={group.files ?? []} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>,
    <Panel key="diff" title="The diff" icon={icon} absent={props.diff === null}>
      {props.diffMessage === null ? null : <Missing>{props.diffMessage}</Missing>}
      <ChangeDiff files={files} selected={props.diffFile} onSelect={props.onDiffFile} />
    </Panel>,
  ];
}

/** One icon per row, so a row's heading and its rail entry can name it the same way. */
const ROW_ICON: Record<ChangeKey, LucideIcon> = {
  intent: Target,
  "problem-and-solution": GitPullRequest,
  architecture: ScrollText,
  "file-diffs": FileText,
};

/**
 * A level the row cannot read, as the frame's own input.
 *
 * The frame states every part it holds and every part it does not, so it needs a level to
 * read. A row whose level the bundle does not hold hands it this one: four nulls and an
 * empty narration, which the frame reads as every part absent.
 */
const EMPTY_LEVEL: ChangeLevel = {
  number: 1,
  key: "intent",
  title: "Intent",
  narration: "",
  voice: null,
  art: null,
  audio: null,
  diagram: null,
};

/** The change's own facts: what it is, when it merged, and how big it is. */
function ChangeFacts({ entry }: { entry: StoryEntry }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      <Chip tone="neutral">PR {entry.pr}</Chip>
      <StateBadge
        word={entry.status ?? "unknown"}
        tone={entry.status === "merged" ? "good" : "accent"}
      />
      {entry.date ? <Chip>{entry.date}</Chip> : null}
      {entry.commit ? <Chip className="text-ink-faint">{entry.commit.slice(0, 9)}</Chip> : null}
      {entry.size ? (
        <Chip>
          {entry.size.files} files, +{entry.size.adds} / &minus;{entry.size.dels}
        </Chip>
      ) : null}
      {entry.depth ? <Chip>depth: {entry.depth}</Chip> : null}
      {entry.tagline ? (
        <p className="mt-1 mb-0 max-w-[92ch] font-serif text-[16px] leading-[1.6] text-ink-mid">
          {entry.tagline}
        </p>
      ) : null}
    </div>
  );
}

/** The districts this diff touched, by count. */
function Touched({ entry }: { entry: StoryEntry }) {
  const touched = Object.entries(entry.touched ?? {}).sort((a, b) => b[1] - a[1]);
  if (touched.length === 0) {
    return <Missing>This pull request records no touched district.</Missing>;
  }
  return (
    <ul className="m-0 flex min-w-0 list-none flex-wrap gap-2 p-0">
      {touched.map(([district, count]) => (
        <li key={district} className="list-none">
          <Chip tone={count > 5 ? "accent" : "neutral"}>
            {district} &times; {count}
          </Chip>
        </li>
      ))}
    </ul>
  );
}
