/**
 * The change's account: what the pull request did, read from its own narration records.
 *
 * EVERY BODY HERE IS THE REVIEWED PROTOTYPE'S OWN. `./SinglePr.tsx` holds the frame panel,
 * the district panel, and the diff panel, and `./IntentSheet.tsx` holds the intent body
 * and the assessment body. This file composes them, so the change's four sections render
 * the same records the reviewed one-pull-request surface renders, so the rail is the only
 * thing this prototype changes.
 *
 * THE FOUR SECTIONS ARE THE CHANGE'S FOUR NARRATION LEVELS. The engineer's Review group
 * names Intent, Problem & Solution, Architecture, and File Diffs, and the bundle's own
 * four levels are exactly those four things under the keys `landscape`, `problem_solution`,
 * `architecture`, and `file_changes`. `CHANGE_LEVEL_KEY` in `./accountModel` holds that
 * mapping, and ADR-0029 states why the key under the word Intent is still `landscape`.
 *
 * THE SEVEN PARTS ADR-0029 LISTS ARE THE SECTION BODIES. A pull request that belongs to a
 * work brings seven things: its narration levels with their art, audio, and diagrams; the
 * intent block Generate mode captured; its assessment; the decisions it landed; and the
 * facts of the change, including its diff. This file puts each part in the section whose
 * name it answers:
 *
 *   Intent              the first narration level, its frame, the intent block, the facts
 *   Problem & Solution  the second level, its beats, and the assessment
 *   Architecture        the third level, its drawing, and the decisions it landed
 *   File Diffs          the fourth level's diff, and the prose that reads it
 *
 * NOTHING HERE IS DERIVED TWICE. `./model` derives the four levels, the diff files, and
 * the counts, and this file reads those answers.
 */

import type { ReactNode } from "react";

import { FileText, GitPullRequest, ScrollText, Scale } from "lucide-react";

import { cn } from "@/lib/utils";
import { Bento, Chip, KeyValue, Missing, Panel, StateBadge, TextList } from "@/shell/atoms";
import type { Theme } from "@/shell/DiagramTiles";
import type { SheetSubject } from "@/shell/Sheet";
import type { AdrRecord, AdrRecords } from "@/data/adrs";

import { AssessmentBody, IntentBody } from "./IntentSheet";
import { DiffPanel, DistrictPanel, FramePanel } from "./SinglePr";
import { diffFiles } from "./model";
import type { DiffFile, Level, StoryEntry } from "./model";
import type { ChangeKey } from "./accountModel";

export interface ChangeBodyProps {
  section: ChangeKey;
  entry: StoryEntry;
  /** The four narration levels, derived once by `./model`. */
  levels: Level[];
  /** The level this section reads, or null when the bundle holds no record for it. */
  level: Level | null;
  /** The pull request's diff hunks, keyed by path. */
  diff: Record<string, string> | null;
  diffError: string | null;
  theme: Theme;
  artMode: "image" | "diagram";
  onArtMode: (mode: "image" | "diagram") => void;
  failedArt: string | null;
  onArtFailed: (url: string) => void;
  audioFailed: string | null;
  onAudioFailed: (url: string) => void;
  diffFile: string | null;
  onDiffFile: (path: string) => void;
  adrs: AdrRecords;
  openSheet: (subject: SheetSubject) => void;
}

export function ChangeBody(props: ChangeBodyProps): ReactNode {
  const { section, entry, level, theme } = props;

  if (section === "file-diffs") {
    return (
      <>
        <DiffNarration level={level} entry={entry} />
        <Bento>
          <DiffPanel
            files={diffFilesOf(props.diff)}
            selected={props.diffFile}
            onSelect={props.onDiffFile}
          />
        </Bento>
        {props.diffError === null ? null : (
          <Panel title="The diff could not be read" icon={FileText} tone="warn" absent>
            <Missing>{props.diffError}</Missing>
          </Panel>
        )}
      </>
    );
  }

  const frame =
    level === null ? null : (
      <Bento>
        <FramePanel
          level={level}
          theme={theme}
          artMode={props.artMode}
          onArtMode={props.onArtMode}
          failedArt={props.failedArt}
          onArtFailed={props.onArtFailed}
        />
      </Bento>
    );

  if (section === "intent") {
    return (
      <>
        <NarrationPanel level={level} onAudioFailed={props.onAudioFailed} audioFailed={props.audioFailed} />
        {frame}
        <Panel
          title="The change's intent"
          icon={Scale}
          lead="What was captured before this pull request opened, in the author's own words where they survive."
          absent={!entry.intent}
        >
          <IntentBody intent={entry.intent} />
        </Panel>
        <ChangeFacts entry={entry} />
        <Bento>
          <DistrictPanel entry={entry} />
        </Bento>
      </>
    );
  }

  if (section === "problem-and-solution") {
    const held = entry.levels?.["problem_solution"];
    const beats = held?.beats ?? [];
    return (
      <>
        <NarrationPanel level={level} onAudioFailed={props.onAudioFailed} audioFailed={props.audioFailed} />
        {frame}
        <Panel
          title="The gap and the shape"
          icon={GitPullRequest}
          count={beats.length}
          lead="The problem the diff closes and the shape it closes it with, as the change's own record states them."
          absent={!held?.problem && !held?.solution && beats.length === 0}
        >
          {held?.problem ? (
            <div className="mb-3 min-w-0 rounded-lg border border-warn/60 bg-warn-wash/60 px-3.5 py-3">
              <div className="font-mono text-[12px] font-bold tracking-[0.08em] text-ink-dim uppercase">
                Problem
              </div>
              <p className="mt-1.5 mb-0 min-w-0 font-serif text-[16px] leading-[1.6] text-foreground">
                {held.problem}
              </p>
            </div>
          ) : null}
          {held?.solution ? (
            <div className="mb-3 min-w-0 rounded-lg border border-good/60 bg-good-wash/60 px-3.5 py-3">
              <div className="font-mono text-[12px] font-bold tracking-[0.08em] text-ink-dim uppercase">
                Solution
              </div>
              <p className="mt-1.5 mb-0 min-w-0 font-serif text-[16px] leading-[1.6] text-foreground">
                {held.solution}
              </p>
            </div>
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
        </Panel>
        <Panel
          title="The change's assessment"
          icon={Scale}
          lead="The reading written against the merged diff, with the evidence each answer stands on."
          absent={!entry.assessment}
        >
          <AssessmentBody assessment={entry.assessment} />
        </Panel>
      </>
    );
  }

  const landed = entry.adrs ?? [];
  return (
    <>
      <NarrationPanel level={level} onAudioFailed={props.onAudioFailed} audioFailed={props.audioFailed} />
      {frame}
      <Panel
        title="Decisions this change landed"
        icon={ScrollText}
        count={landed.length}
        lead="The decisions the timeline entry names for this pull request. One press opens the whole record."
        absent={landed.length === 0}
      >
        {landed.length === 0 ? (
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
                      "transition-colors hover:bg-surface-2",
                      "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring",
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
      </Panel>
    </>
  );
}

function diffFilesOf(diff: Record<string, string> | null): DiffFile[] {
  return diff === null ? [] : diffFiles(diff);
}

/**
 * The level's narration, and its audio when the bundle holds one.
 *
 * A level carries audio exactly when its story entry carries a `voice` string, and `./model`
 * derives the address from that key. A level whose audio the server does not serve says so
 * in place, because a silent control is a defect rather than a detail.
 */
function NarrationPanel({
  level,
  audioFailed,
  onAudioFailed,
}: {
  level: Level | null;
  audioFailed: string | null;
  onAudioFailed: (url: string) => void;
}) {
  if (level === null) {
    return (
      <Panel title="The narration" icon={FileText} absent>
        <Missing>
          The bundle holds no narration record for this level of this pull request.
        </Missing>
      </Panel>
    );
  }
  return (
    <Panel
      title={`The narration · level ${level.number}`}
      icon={FileText}
      lead="What this level says, in the change's own words. The narration is the record; nothing here rewrites it."
      absent={level.narration.length === 0 && level.audio === null}
    >
      {level.narration.length === 0 ? (
        <Missing>This level carries no narration text.</Missing>
      ) : (
        <p className="m-0 max-w-[92ch] font-serif text-[16.5px] leading-[1.65] text-foreground">
          {level.narration}
        </p>
      )}

      {level.audio === null ? (
        <p className="mt-3 mb-0 font-mono text-[12.5px] text-ink-faint">
          No narration audio: this level carries no voice script.
        </p>
      ) : audioFailed === level.audio ? (
        <p className="mt-3 mb-0 font-mono text-[12.5px] text-warn">
          The narration audio at {level.audio} did not load.
        </p>
      ) : (
        <div className="mt-3 flex min-w-0 flex-col gap-1.5">
          {/*
            `preload="metadata"` rather than `none`. The bundle's `voice` field says a level
            was voiced, and the file itself can still be absent: pull request 11 carries
            three voice scripts and this bundle holds no `pr11_*.wav` file. A control that
            preloads nothing never asks the server, so it never finds out, and the reader
            meets a play button that does nothing. One metadata request per level is the
            price of stating the absence in place.
          */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            controls
            preload="metadata"
            src={level.audio}
            onError={() => onAudioFailed(level.audio ?? "")}
            className="w-full max-w-[42rem]"
          />
          <span className="font-mono text-[12px] text-ink-faint">{level.audio}</span>
        </div>
      )}
    </Panel>
  );
}

/**
 * The facts of the change: what it is, when it merged, and how big it is.
 *
 * These are the timeline entry's own fields, and the surface prints them rather than a
 * summary of them. The change's account is the only account that carries them.
 */
function ChangeFacts({ entry }: { entry: StoryEntry }) {
  return (
    <Panel
      title="Where this pull request sits"
      icon={GitPullRequest}
      lead="The change's own facts, read from its timeline entry."
    >
      <div className="flex min-w-0 flex-wrap items-center gap-3">
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
      </div>
      {entry.tagline ? (
        <p className="mt-3 mb-0 max-w-[86ch] font-serif text-[16px] leading-[1.6] text-ink-mid">
          {entry.tagline}
        </p>
      ) : null}
    </Panel>
  );
}

/**
 * The prose that reads the diff, for the File Diffs section.
 *
 * The bundle's fourth level is the only one with no picture, no drawing, and no audio, so
 * this panel is the whole of its written record. The grouped file list the level carries
 * is printed under it, because it is the change's own account of which files belong
 * together and the diff panel cannot know that.
 */
function DiffNarration({ level, entry }: { level: Level | null; entry: StoryEntry }) {
  const groups = entry.levels?.file_changes?.groups ?? [];
  return (
    <Panel
      title="The diff, in the change's own words"
      icon={FileText}
      lead="The fourth level carries no scene art, no drawing, and no audio. Its written record and its grouped file list are what it holds."
      absent={level === null && groups.length === 0}
    >
      {level?.narration ? (
        <p className="m-0 mb-4 max-w-[92ch] font-serif text-[16.5px] leading-[1.65] text-foreground">
          {level.narration}
        </p>
      ) : null}

      {groups.length === 0 ? null : (
        <ul className="m-0 flex min-w-0 list-none flex-col gap-3 p-0">
          {groups.map((group, index) => (
            <li key={`${index}-${group.title ?? ""}`} className="min-w-0 list-none">
              <div className="flex min-w-0 flex-wrap items-baseline gap-2">
                <span className="font-mono text-[12.5px] font-bold text-ink-mid">
                  {group.title ?? `Group ${index + 1}`}
                </span>
                <KeyValue label="files" value={(group.files ?? []).length} />
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
    </Panel>
  );
}
