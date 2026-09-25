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
 * four levels are exactly those four things under the keys `intent`, `problem_solution`,
 * `architecture`, and `file_changes`. `CHANGE_LEVEL_KEY` in `./accountModel` holds that
 * mapping, and ADR-0029 renamed the first level's key so that the word and the key agree.
 *
 * ONE PANEL IS ONE SECTION, AND THIS FILE RETURNS THEM AS A LIST. The shell's own paged
 * level holds one panel per section, because the section strip reads its links from the
 * panel headings and a section holding two panels would put two links on the strip and
 * one step on the pager. This file returns one element per panel, so the surface above
 * can hand that list straight to the shell's own stage, strip, and pager. A route whose
 * level the bundle does not hold returns no frame panel, and a route whose diff could not
 * be read returns one more panel than its record carries.
 *
 * THE SEVEN PARTS ADR-0029 LISTS ARE THE SECTION BODIES. A pull request that belongs to a
 * work brings seven things: its narration levels with their art, audio, and diagrams; the
 * intent block Generate mode captured; its assessment; the decisions it landed; and the
 * facts of the change, including its diff. This file puts each part in the section whose
 * name it answers:
 *
 *   Intent              the first narration level with its drawing, the picture when the
 *                       bundle holds one, the intent block, and the facts
 *   Problem & Solution  the second level, its frame, its beats, and the assessment
 *   Architecture        the third level, its drawing, and the decisions it landed
 *   File Diffs          the fourth level's diff, and the prose that reads it
 *
 * THE THREE NARRATION SECTIONS WEAR THE LEVEL'S OWN NAME, AND NOT A NUMBER. They read
 * "Why", "Problem & Solution", and "Architecture", which are the headings the program's
 * own surfaces give those three things. The strip above the pane therefore names the
 * section a reader is in, rather than repeating the rail's row above it.
 *
 * THE FIRST LEVEL'S DRAWING SITS IN ITS NARRATION SECTION, AND ITS FRAME MAY NOT EXIST.
 * The container drawing belongs with the narration it reads, so the Why section closes
 * with it. The level's frame section held the picture and the drawing together, and on
 * this bundle's pull requests the first level carries no picture at all; that section
 * therefore renders only when the level carries a picture, and a level whose whole frame
 * was the drawing has no frame section.
 *
 * AN ABSENT PICTURE IS A STATE, AND IT IS STATED IN PLACE. The dropped frame section left
 * the picture's absence unstated on this bundle, because no panel drew it and no sentence
 * named it. The level's narration panel now carries the statement, in the shell's own
 * absent shape, so every level of every change answers for its picture whether the bundle
 * holds one or not. See `NarrationPanel`.
 *
 * NOTHING HERE IS DERIVED TWICE. `./model` derives the four levels, the diff files, and
 * the counts, and this file reads those answers.
 */

import type { ReactNode } from "react";

import { FileText, GitPullRequest, ScrollText, Scale } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Bento,
  Chip,
  KeyValue,
  Missing,
  NotPresentPill,
  Panel,
  StateBadge,
  TextList,
} from "@/shell/atoms";
import { DiagramTiles } from "@/shell/DiagramTiles";
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

/** The lead for a frame whose drawing this section draws elsewhere, so only a picture is left. */
const PICTURE_ONLY_LEAD = "The picture for this level.";

/**
 * The lead the change's account hands the frame panel, written for the parts that frame holds.
 *
 * THE LEAD THE FRAME CARRIES IS WRITTEN FOR A FRAME THAT HOLDS BOTH PARTS. It reads "The
 * picture and the drawing for this level. Where both exist, the reader picks which to look
 * at", and the count beside it answers how many parts the frame holds. On the levels this
 * account reads, the picture is the part that is missing, so the frame holds the drawing
 * and its count reads 1: the lead promises a picture the count beside it denies. A reader
 * who has just been told that this pull request carries no scene art meets a line
 * promising one, which is the defect stated here and repaired here.
 *
 * THE OTHER PROTOTYPE KEEPS THE INHERITED LINE. `FramePanel` is the reviewed surface's own
 * panel, and the reviewed surface is out of this repair's scope, so its lead stays and this
 * account passes its own. See `FramePanel`'s `lead` prop in `./SinglePr`.
 *
 * A PICTURE THAT DID NOT LOAD IS A PICTURE THAT IS NOT THERE. `FramePanel` counts a part
 * by what it can draw, so a picture the browser failed on is already an absent part there,
 * and the lead reads the same condition. The two cannot disagree.
 */
function frameLead(level: Level, failedArt: string | null): string {
  const picture = level.art !== null && failedArt !== level.art;
  const drawing = level.diagram !== null;
  if (picture && drawing) {
    return "The picture and the drawing for this level. Where both exist, the reader picks which to look at.";
  }
  if (picture) {
    return "The picture for this level. This pull request carries no drawing for it.";
  }
  return "The drawing for this level. This pull request carries no scene art for it.";
}

export function changeSections(props: ChangeBodyProps): ReactNode[] {
  const { section, entry, level, theme } = props;

  if (section === "file-diffs") {
    return [
      <DiffNarration key="diff-narration" level={level} entry={entry} />,
      <Bento key="diff">
        <DiffPanel
          files={diffFilesOf(props.diff)}
          selected={props.diffFile}
          onSelect={props.onDiffFile}
        />
      </Bento>,
      props.diffError === null ? null : (
        <Panel key="diff-error" title="The diff could not be read" icon={FileText} tone="warn" absent>
          <Missing>{props.diffError}</Missing>
        </Panel>
      ),
    ];
  }

  const frame =
    level === null ? null : (
      <Bento key="frame">
        <FramePanel
          level={level}
          theme={theme}
          artMode={props.artMode}
          onArtMode={props.onArtMode}
          failedArt={props.failedArt}
          onArtFailed={props.onArtFailed}
          lead={frameLead(level, props.failedArt)}
        />
      </Bento>
    );

  /*
    THE FIRST LEVEL'S FRAME HOLDS THE PICTURE ALONE, BECAUSE ITS DRAWING MOVED. The Why
    section below closes with the container drawing, so this section would draw that same
    drawing a second time and offer the reader a toggle between one thing and itself. The
    level is copied with its diagram taken off, and `FramePanel`'s own rule then reads a
    single-part frame: the picture, when there is one.

    A LEVEL WITH NO PICTURE HAS NO FRAME SECTION AT ALL. The section's whole content was
    the drawing on every pull request of this bundle, so leaving it in place would leave a
    dashed box saying that nothing is here beside a section that draws it.

    THE ABSENT PICTURE IS STATED IN PLACE RATHER THAN DROPPED. A frame section is not the
    only place the picture can be answered for, and it is not the place this account uses:
    the level's own narration panel carries the statement, beside the statement the level's
    audio already gets there. See `NarrationPanel`.
  */
  const picture =
    level === null || level.art === null ? null : (
      <Bento key="frame">
        <FramePanel
          level={{ ...level, diagram: null }}
          theme={theme}
          artMode={props.artMode}
          onArtMode={props.onArtMode}
          failedArt={props.failedArt}
          onArtFailed={props.onArtFailed}
          lead={PICTURE_ONLY_LEAD}
        />
      </Bento>
    );

  if (section === "intent") {
    return [
      <NarrationPanel
        key="narration"
        title="Why"
        level={level}
        drawing={level?.diagram ?? null}
        theme={theme}
        onAudioFailed={props.onAudioFailed}
        audioFailed={props.audioFailed}
      />,
      picture,
      <Panel
        key="intent"
        title="The change's intent"
        icon={Scale}
        lead="What was captured before this pull request opened, in the author's own words where they survive."
        absent={!entry.intent}
      >
        <IntentBody intent={entry.intent} />
      </Panel>,
      <ChangeFacts key="facts" entry={entry} />,
      <Bento key="districts">
        <DistrictPanel entry={entry} />
      </Bento>,
    ];
  }

  if (section === "problem-and-solution") {
    const held = entry.levels?.["problem_solution"];
    const beats = held?.beats ?? [];
    return [
      <NarrationPanel
        key="narration"
        title="Problem & Solution"
        level={level}
        theme={theme}
        onAudioFailed={props.onAudioFailed}
        audioFailed={props.audioFailed}
      />,
      frame,
      <Panel
        key="gap-and-shape"
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
      </Panel>,
      <Panel
        key="assessment"
        title="The change's assessment"
        icon={Scale}
        lead="The reading written against the merged diff, with the evidence each answer stands on."
        absent={!entry.assessment}
      >
        <AssessmentBody assessment={entry.assessment} />
      </Panel>,
    ];
  }

  const landed = entry.adrs ?? [];
  return [
    <NarrationPanel
      key="narration"
      title="Architecture"
      level={level}
      theme={theme}
      onAudioFailed={props.onAudioFailed}
      audioFailed={props.audioFailed}
    />,
    frame,
    <Panel
      key="decisions"
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
    </Panel>,
  ];
}

function diffFilesOf(diff: Record<string, string> | null): DiffFile[] {
  return diff === null ? [] : diffFiles(diff);
}

/**
 * The level's narration, its audio when the bundle holds one, and its drawing when this
 * section is the one that carries it.
 *
 * THE SECTION WEARS THE LEVEL'S OWN NAME. The title is the caller's, because each of the
 * three levels this panel serves has its own heading, and a section that named its own
 * number would repeat the rail's row above it.
 *
 * A level carries audio exactly when its story entry carries a `voice` string, and `./model`
 * derives the address from that key. A level whose audio the server does not serve says so
 * in place, because a silent control is a defect rather than a detail.
 *
 * THE DRAWING CLOSES THE PANEL, WHEN THERE IS ONE. The container drawing belongs beside
 * the narration it reads, so the Why section passes it here and the drawing follows the
 * text and the audio control. Every other section passes nothing, and the panel is the
 * narration, its audio, and no picture.
 *
 * EVERY PART OF THE LEVEL THIS PANEL CANNOT DRAW IS STATED IN PLACE. The audio's state is
 * the first, and it is stated as the file's own state: a level with no voice script says
 * so, a level whose file did not load says so, and a level whose file is served gets the
 * control. The picture is the second, and it is stated on every section rather than on the
 * one whose frame happens to exist, because the panel that carries a picture alone renders
 * only when there is one. Both statements wear the shell's own absent shape, so a reader of
 * this level meets the parts the bundle holds and the absences it does not, and never meets
 * a silence.
 */
function NarrationPanel({
  title,
  level,
  drawing = null,
  theme,
  audioFailed,
  onAudioFailed,
}: {
  /** The section's own name. It is the heading the strip above the pane reads. */
  title: string;
  level: Level | null;
  /** The level's Mermaid source, when this section is the one that carries it. */
  drawing?: string | null;
  theme: Theme;
  audioFailed: string | null;
  onAudioFailed: (url: string) => void;
}) {
  if (level === null) {
    return (
      <Panel title={title} icon={FileText} absent>
        <Missing>
          The bundle holds no narration record for this level of this pull request.
        </Missing>
      </Panel>
    );
  }
  return (
    <Panel
      title={title}
      icon={FileText}
      absent={level.narration.length === 0 && level.audio === null && drawing === null}
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

      {level.art === null ? (
        <div className="mt-3 flex min-w-0 flex-col gap-2">
          {/*
            THE PICTURE IS STATED WHERE THE LEVEL'S OTHER RECORDS ARE STATED, AND EVERY
            SECTION STATES IT. A panel that carries the picture alone renders only when a
            picture exists, so on a level with none no panel answers for it: the Why section
            has no frame section at all, and the other two frames carry the drawing alone.
            This panel reads the level's whole written record, so the statement belongs here,
            in the shape the shell states every absent record with: the pill and the sentence.
            The wording answers this level's picture alone, because the drawing is drawn below
            it and the audio is answered above it.
          */}
          <NotPresentPill className="self-start" />
          <Missing>This pull request carries no scene art for this level.</Missing>
        </div>
      ) : null}

      {drawing === null ? null : (
        <div className="mt-4 min-w-0">
          <DiagramTiles
            levels={[String(level.number)]}
            sources={{ [String(level.number)]: drawing }}
            theme={theme}
          />
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
 *
 * THE PANEL ONCE SAID ALL OF THAT ABOVE ITS RECORD, AND THE ENGINEER REMOVED IT. The three
 * absences it named are still stated on this level, by `DiffPanel`'s own lead, which names
 * the same three. What the removed line carried and nothing else carries is the account of
 * an absent record: a level with no written record at all now shows the absent frame and
 * the not-present pill with no words under them.
 */
function DiffNarration({ level, entry }: { level: Level | null; entry: StoryEntry }) {
  const groups = entry.levels?.file_changes?.groups ?? [];
  return (
    <Panel
      title="The diff, in the change's own words"
      icon={FileText}
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
