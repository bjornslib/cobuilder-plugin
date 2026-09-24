/**
 * Mode one: one pull request, at parity.
 *
 * THE SIX PARTS, AND WHERE EACH ONE IS READ. The shipped viewer shows six things for one
 * pull request, and this mode shows the same six, read from the same records:
 *
 *   1. The four narration levels and their narration — `window.STORY`, one entry per
 *      pull request, `levels` keyed by `landscape`, `problem_solution`, `architecture`,
 *      and `file_changes`. The caption at the head of every level's content is the
 *      shipped viewer's own caption, and the rail on the left lists the levels.
 *   2. The diagrams for levels 1 to 3 — `window.DIAGRAMS`, keyed by pull request and
 *      level, both as strings. The reading is unchanged: one drawing per level, and no
 *      level 4.
 *   3. The scene art at `assets/pr-{N}/level-{L}.webp` — read from `manifest.hero`, the
 *      bundle's own record of which level carries a picture. The extension is `webp`.
 *   4. The narration audio at `data/audio/pr{N}_{level_key}.wav` — present exactly when
 *      the level's story entry carries a `voice`. Level 4 was never voiced, and the
 *      control says so in place rather than vanishing.
 *   5. The diff — `window.DIFFS_BY_PR[N]`, keyed by path.
 *   6. The intent and assessment sheet — the `intent` and `assessment` blocks on the
 *      same timeline entry. `IntentSheet.tsx` holds that one, and a press on a decision
 *      the Architecture level lists opens that decision's own record in the shell's
 *      record Sheet.
 *
 * WHAT THE SURFACE ADDS BESIDES THE PAGER. Two records open over the pane, and one
 * `sheet` value above this mode says which. A press on `Open the sheet` names the intent
 * and assessment; a press on a decision names that decision. Only one can be open, so the
 * two can never stack.
 *
 * THE FRAME IS THE SHIPPED VIEWER'S HERO FRAME. A level with both a picture and a drawing
 * carries an Image/Diagram toggle, exactly as `heroFrame()` does, and a level with only
 * one of the two shows it with no toggle. Level 4 has neither, and the level's own lead
 * sentence says so.
 *
 * WHAT THIS MODE ADDS IS THE SECTION PAGER. The shipped viewer stacks a level's blocks
 * down one column. This surface pages them sideways, because the shell it sits beside
 * does, and because the sections are what E7 ports into that shell. The blocks and their
 * reading order are unchanged.
 *
 * ONE NAVIGATION RUNS LEFT TO RIGHT. The levels are the rail on the left and the sections
 * inside the live level are the single strip below the level's band. The level strip that
 * used to run across the top is gone, and its height is the level's content's again.
 *
 * THE LEVEL'S HEADING BAND IS GONE TOO, and the narration is content. The band read
 * `PR 2 · Problem & Solution` under a lead sentence, and it spent about 140 px of the
 * pane on words the rail already carries: the rail names the level the reader is on and
 * the top band names the pull request. The band's own heading survives as `sr-only`, so
 * the level still has its one `h1` and a screen reader still hears the level's name,
 * which is what the shipped shell does for a paged level. The narration caption that used
 * to sit above that band now sits inside the pane's content, under the section strip and
 * above the section stage, with the band styling gone.
 *
 * THE CAPTION NAMES NO LEVEL EITHER. It carried the level's number and title on its first
 * line, and the commit subject after them as faint clipped metadata. The level's name is
 * the rail's current row and the heading above, so that prefix repeated the level a second
 * time, and the engineer removed the same repetition from the top of the mode. The caption
 * is now the three parts the engineer named and nothing else: the commit subject, the
 * narration, and the audio control.
 */

import { useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

import {
  FileText,
  GitPullRequest,
  Image as ImageIcon,
  Layers,
  Lightbulb,
  ListTree,
  Pause,
  Play,
  Scale,
  ScrollText,
  Shapes,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Box,
  Bento,
  Chip,
  EmptyNote,
  KeyValue,
  Missing,
  Panel,
  StateBadge,
  SubHead,
  TextList,
} from "@/shell/atoms";
import { DiagramTiles } from "@/shell/DiagramTiles";
import type { Theme } from "@/shell/DiagramTiles";
import { useJumpTargets } from "@/shell/jump";
import { LevelProgress, SectionPager, SectionStage, SectionStrip, keyPressIsTaken } from "@/shell/Pager";

import type { DiffFile, Level, StoryEntry } from "./model";
import { diffFiles } from "./model";
import { LevelRail } from "./LevelRail";

/** The panel heading for each level's frame. One name for one thing. */
const FRAME_TITLE = "The frame";

/* -------------------------------------------------------------- the caption */

/**
 * The shipped viewer's narration caption, in the shell's vocabulary.
 *
 * Subject and narration on the left, a fixed-width audio control on the right, so the
 * row never reflows whether or not the level was voiced. The control always renders; a
 * level with no audio states that in the label rather than hiding the control, because
 * an absence a reader cannot see is an absence they will assume is a bug.
 *
 * IT CARRIES NO BAND ANY MORE. It drew a full-bleed bar with a hairline under it and the
 * second surface as its fill, and it sat above the level's heading. The engineer moved the
 * narration into the level's content, so the bar, its hairline, and its fill are gone and
 * the caption is a block of the pane with the pane's own padding. The audio control stays
 * on the level rather than inside one section's box, so a reader who pages to the second
 * section can still start, stop, and read the progress of the level's narration.
 *
 * IT NAMES NO LEVEL, AND IT CARRIES THE THREE PARTS THE ENGINEER NAMED. The row used to
 * open with `Level 2` and the level's own title, and the commit subject sat after them as
 * faint, clipped metadata. The rail's current row and the level's own `h1` already name
 * the level, so the engineer removed that prefix from the top of the mode, and the same
 * prefix here repeated it a second time. Three parts remain and they are now the whole
 * caption: the pull request's commit subject, its narration, and the audio control. The
 * subject takes the caption's own first line, so it keeps its full width and wraps rather
 * than clipping behind an ellipsis.
 */
function NarrationCaption({
  level,
  title,
  audio,
  audioFailed,
  onAudioFailed,
}: {
  level: Level;
  /** The pull request's commit subject. */
  title: string;
  audio: string | null;
  audioFailed: string | null;
  onAudioFailed: (url: string) => void;
}) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  /* A new level is a new track, so the old one stops rather than playing under it. */
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.pause();
    element.currentTime = 0;
    setPlaying(false);
    setProgress(0);
  }, [audio]);

  const blocked = audioFailed !== null;

  return (
    <div className="flex min-w-0 shrink-0 flex-wrap items-start gap-4 px-6 pt-4 pb-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="m-0 min-w-0 font-serif text-[16px] leading-[1.45] text-ink">
          {title}
        </p>
        <p className="m-0 max-w-[92ch] font-serif text-[15.5px] leading-[1.6] text-ink-dim italic">
          {level.narration.length > 0
            ? level.narration
            : "This level carries no authored narration. The shipped viewer states the same absence in the same place."}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2.5" style={{ width: 248 }}>
        <button
          type="button"
          disabled={audio === null || blocked}
          aria-label={playing ? "Pause narration" : "Play narration"}
          onClick={() => {
            const element = ref.current;
            if (!element) return;
            if (element.paused) {
              void element.play().catch(() => setPlaying(false));
            } else {
              element.pause();
            }
          }}
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center rounded-full border text-ink",
            audio === null || blocked
              ? "cursor-not-allowed border-dashed border-line text-ink-faint"
              : "cursor-pointer border-line bg-card hover:bg-surface-3",
          )}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex min-w-0 overflow-hidden rounded-full bg-line" style={{ height: 4 }}>
            <span
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </span>
          <span className="min-w-0 font-mono text-[11.5px] leading-tight text-ink-faint">
            {audio === null
              ? "narration audio (none for this level)"
              : blocked
                ? "narration audio (failed to load)"
                : `narration audio — ${level.title}`}
          </span>
        </span>

        {audio === null ? null : (
          <audio
            ref={ref}
            src={audio}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(event) => {
              const element = event.currentTarget;
              if (element.duration > 0) setProgress(element.currentTime / element.duration);
            }}
            onError={() => {
              setPlaying(false);
              onAudioFailed(audio);
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- the frame */

/**
 * One level's drawing and picture, with the toggle the shipped viewer shows when both
 * exist. The mode is the reader's and it is held above, so a switch between the two
 * modes of this surface brings it back.
 */
function FramePanel({
  level,
  theme,
  artMode,
  onArtMode,
  failedArt,
  onArtFailed,
}: {
  level: Level;
  theme: Theme;
  artMode: "image" | "diagram";
  onArtMode: (mode: "image" | "diagram") => void;
  failedArt: string | null;
  onArtFailed: (url: string) => void;
}) {
  const hasImage = level.art !== null && failedArt !== level.art;
  const hasDiagram = level.diagram !== null;

  if (!hasImage && !hasDiagram) {
    return (
      <Panel
        span="band"
        title={FRAME_TITLE}
        icon={ImageIcon}
        lead="The picture and the drawing for this level. Neither exists here."
        absent
      >
        <Missing>
          This level carries no scene art and no diagram. Level 4 is the diff itself, and it
          has never carried either.
        </Missing>
      </Panel>
    );
  }

  const mode = hasImage && hasDiagram ? artMode : hasImage ? "image" : "diagram";

  return (
    <Panel
      span="band"
      title={FRAME_TITLE}
      icon={ImageIcon}
      lead="The picture and the drawing for this level. Where both exist, the reader picks which to look at."
      count={hasImage && hasDiagram ? 2 : 1}
      action={
        hasImage && hasDiagram ? (
          <span className="flex items-center gap-1" role="group" aria-label="Frame mode">
            {(["image", "diagram"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-current={mode === value ? "true" : undefined}
                onClick={() => onArtMode(value)}
                className={cn(
                  "cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[11.5px] font-bold uppercase tracking-[0.04em] transition-colors",
                  mode === value
                    ? "border-primary bg-accent-wash text-accent-deep"
                    : "border-line text-ink-dim hover:border-primary/40 hover:text-ink",
                )}
              >
                {value}
              </button>
            ))}
          </span>
        ) : undefined
      }
    >
      {mode === "image" && level.art ? (
        <figure className="m-0 flex min-w-0 flex-col gap-2">
          <img
            src={level.art}
            alt={`PR scene art for level ${level.number}`}
            loading="lazy"
            onError={() => onArtFailed(level.art ?? "")}
            className="block h-auto w-full rounded-lg border border-line"
          />
          <figcaption className="font-mono text-[12px] text-ink-faint">
            {level.art}
          </figcaption>
        </figure>
      ) : (
        <DiagramTiles
          levels={level.number <= 3 ? [String(level.number)] : []}
          sources={level.number <= 3 ? { [String(level.number)]: level.diagram ?? "" } : {}}
          theme={theme}
        />
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------- district row */

/** The districts this diff touched, by count. The shipped viewer shows the same chips. */
function DistrictPanel({ entry }: { entry: StoryEntry }) {
  const touched = Object.entries(entry.touched ?? {}).sort((a, b) => b[1] - a[1]);
  return (
    <Panel
      span="half"
      title="Districts touched"
      icon={Layers}
      lead="How many files in each part of this codebase the diff changes."
      absent={touched.length === 0}
    >
      {touched.length === 0 ? (
        <Missing>This pull request records no touched district.</Missing>
      ) : (
        <ul className="m-0 flex min-w-0 list-none flex-wrap gap-2 p-0">
          {touched.map(([district, count]) => (
            <li key={district} className="list-none">
              <Chip tone={count > 5 ? "accent" : "neutral"}>
                {district} &times; {count}
              </Chip>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ the diff */

/**
 * The diff, file by file.
 *
 * The file list carries the counts the diff's own `+` and `-` lines give, so the numbers
 * and the hunks under them cannot disagree. A file with no hunk — a binary, or a mode
 * change — says that in place, because an empty hunk list is a fact about that file and
 * not a rendering failure.
 */
function DiffPanel({
  files,
  selected,
  onSelect,
}: {
  files: DiffFile[];
  selected: string | null;
  onSelect: (path: string) => void;
}) {
  const shown = files.find((file) => file.path === selected) ?? files[0] ?? null;
  return (
    <Panel
      span="band"
      title="The diff"
      icon={FileText}
      lead="Every file the change touches, and the hunks under it. This is the level's whole content: level 4 carries no picture, no drawing, and no audio."
      count={files.length}
      absent={files.length === 0}
    >
      {files.length === 0 ? (
        <Missing>The bundle carries no diff for this pull request.</Missing>
      ) : (
        <div className="grid min-w-0 grid-cols-12 gap-4">
          <ul className="col-span-12 m-0 flex min-w-0 list-none flex-col gap-1 p-0 @3xl:col-span-4">
            {files.map((file) => {
              const on = shown !== null && file.path === shown.path;
              return (
                <li key={file.path} className="min-w-0 list-none">
                  <button
                    type="button"
                    onClick={() => onSelect(file.path)}
                    aria-current={on ? "true" : undefined}
                    className={cn(
                      "flex min-h-9 w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors",
                      on
                        ? "border-primary bg-accent-wash"
                        : "border-line-soft bg-card hover:bg-surface-2",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink-mid">
                      {file.path}
                    </span>
                    <span className="shrink-0 font-mono text-[12px] tabular-nums text-good">
                      +{file.adds}
                    </span>
                    <span className="shrink-0 font-mono text-[12px] tabular-nums text-destructive">
                      &minus;{file.dels}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {shown === null ? null : (
            <div className="col-span-12 flex min-w-0 flex-col gap-2 @3xl:col-span-8">
              <span className="flex min-w-0 flex-wrap items-baseline gap-2">
                <span className="min-w-0 font-mono text-[12.5px] font-bold break-all text-ink">
                  {shown.path}
                </span>
                <KeyValue label="files changed" value={files.length} />
              </span>
              {shown.hunks.length === 0 ? (
                <EmptyNote>
                  This file carries no hunk. The diff records a binary file or a mode
                  change, and there is no text to show.
                </EmptyNote>
              ) : (
                <div className="min-w-0 overflow-x-auto rounded-lg border border-line bg-card">
                  {shown.hunks.slice(0, 6).map((hunk, index) => (
                    <div key={`${index}-${hunk.header}`} className="min-w-0">
                      <div className="border-b border-line-soft bg-surface-2 px-3 py-1 font-mono text-[12px] text-ink-dim">
                        {hunk.header}
                      </div>
                      <pre className="m-0 overflow-x-auto px-3 py-1.5 font-mono text-[12px] leading-[1.5]">
                        {hunk.lines.slice(0, 60).map((line, position) => (
                          <div
                            key={position}
                            className={cn(
                              line.kind === "add"
                                ? "bg-good-wash text-good"
                                : line.kind === "del"
                                  ? "bg-danger-wash text-destructive"
                                  : "text-ink-mid",
                            )}
                          >
                            {line.kind === "add" ? "+" : line.kind === "del" ? "-" : " "}
                            {line.text}
                          </div>
                        ))}
                      </pre>
                      {hunk.lines.length > 60 ? (
                        <div className="border-t border-line-soft px-3 py-1 font-mono text-[12px] text-ink-faint">
                          {hunk.lines.length - 60} further lines in this hunk are not drawn.
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {shown.hunks.length > 6 ? (
                    <div className="border-t border-line-soft px-3 py-1 font-mono text-[12px] text-ink-faint">
                      {shown.hunks.length - 6} further hunks in this file are not drawn.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

/* ----------------------------------------------------------------- the mode */

export interface SinglePrProps {
  entry: StoryEntry;
  levels: Level[];
  diff: Record<string, string> | null;
  diffError: string | null;
  theme: Theme;
  /** The level the reader is on, held above so a mode switch brings it back. */
  levelIndex: number;
  onLevelIndex: (index: number) => void;
  /** The section of that level, held above for the same reason. */
  section: number;
  onSection: (index: number) => void;
  /** The frame's mode, held above for the same reason. */
  artMode: "image" | "diagram";
  onArtMode: (mode: "image" | "diagram") => void;
  /** The selected diff file, held above for the same reason. */
  diffFile: string | null;
  onDiffFile: (path: string) => void;
  /** The intent and assessment sheet. */
  onOpenSheet: () => void;
  /** One decision record, by the id the pull request names for it. */
  onOpenDecision: (adr: string) => void;
  /** The stage's active box, so the surface can read and restore its own scroll. */
  boxRef: RefObject<HTMLDivElement | null>;
  paneId: string;
  onArtFailed: (url: string) => void;
  failedArt: string | null;
  audioFailed: string | null;
  onAudioFailed: (url: string) => void;
}

export function SinglePr(props: SinglePrProps) {
  const {
    entry,
    levels,
    diff,
    diffError,
    theme,
    levelIndex,
    onLevelIndex,
    section,
    onSection,
    artMode,
    onArtMode,
    diffFile,
    onDiffFile,
    onOpenSheet,
    onOpenDecision,
    boxRef,
    paneId,
    onArtFailed,
    failedArt,
    audioFailed,
    onAudioFailed,
  } = props;

  const level = levels[Math.min(levelIndex, levels.length - 1)];
  const files = diff === null ? [] : diffFiles(diff);

  const sections = sectionsFor(level, entry, theme, {
    artMode,
    onArtMode,
    files,
    diffFile,
    onDiffFile,
    onOpenSheet,
    onOpenDecision,
    onArtFailed,
    failedArt,
  });

  /* The reader's section is clamped, because a new level may hold fewer sections. */
  const index = Math.min(section, Math.max(sections.length - 1, 0));

  /*
   * The arrow keys page the level, as the shell's own pager does. `keyPressIsTaken` is
   * the shell's one guard, so a press inside a field and a press with a modifier stay
   * with whoever owns them.
   */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (keyPressIsTaken(event)) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onSection(Math.max(index - 1, 0));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onSection(Math.min(index + 1, sections.length - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, sections.length, onSection]);

  /* The section strip reads the panels the level rendered, as the shell's does. */
  const targets = useJumpTargets(paneId, [level.key, index, sections.length]);

  /*
    ONE NAVIGATION RUNS LEFT TO RIGHT, AND IT IS THE SECTION STRIP. The four narration
    levels sit in the rail on the left, which is the shell's own shape, and a section
    inside the live level is the single horizontal strip below the level's band. The row
    below is what that costs: the rail takes the left edge and the column beside it takes
    everything else, so the removed strip's height comes back to the level's content.

    THE LEVEL'S HEADING IS NOT DRAWN, AND THE NARRATION IS THE LEVEL'S FIRST CONTENT. The
    `h1` stays for the document and for a screen reader, at `sr-only`, exactly as the
    shipped shell keeps a paged level's heading. The caption sits inside the pane, under
    the strip and above the stage, so the reading order is: which section this is (the
    strip), what this level is (the narration), then the section's own panels.
  */
  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <LevelRail levels={levels} levelIndex={levelIndex} onLevelIndex={onLevelIndex} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/*
          The reading-progress strip. `LevelProgress` carries `order-first`, so it paints
          at the top of whichever flex column holds it. In the shell that column is the
          pane; here the column is this pair, so the strip lands directly above the pane
          and above the level's own content. It stays in the DOM after the stage, because
          `LevelProgress` reads the box ref in a layout effect and React attaches a host
          ref in tree order.
        */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div id={paneId} className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/*
              The level's own name, and nothing a reader sees. The band that used to draw
              it is gone: the rail names the level the reader is on and the top band names
              the pull request, so the band repeated both. The heading stays in the flow at
              `sr-only`, so the level keeps its one `h1` and a screen reader still hears the
              level's name.
            */}
            <h1
              id={`flightdeck-level-${level.number}`}
              tabIndex={-1}
              className="sr-only outline-none"
            >
              {`PR ${entry.pr} · ${level.title}`}
            </h1>

            <SectionStrip targets={targets} activeIndex={index} onSelect={onSection} />

            <NarrationCaption
              level={level}
              title={entry.title ?? `PR ${entry.pr}`}
              audio={level.audio}
              audioFailed={audioFailed}
              onAudioFailed={onAudioFailed}
            />

            <SectionStage index={index} activeBoxRef={boxRef}>
              {sections}
            </SectionStage>

            <SectionPager
              index={index}
              count={sections.length}
              onPrevious={() => onSection(Math.max(index - 1, 0))}
              onNext={() => onSection(Math.min(index + 1, sections.length - 1))}
            />
          </div>

          <LevelProgress index={index} count={sections.length} boxRef={boxRef} />
        </div>

        {diffError === null ? null : (
          <p className="m-0 border-t border-line bg-warn-wash px-6 py-2 font-mono text-[12.5px] text-warn">
            {diffError}
          </p>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- the pieces */

/**
 * One level's sections, in the order the shipped viewer stacks them.
 *
 * ONE SECTION IS ONE PANEL, and that is load-bearing rather than tidy. The section strip
 * reads its links from the panel headings the level rendered, so a section that held two
 * panels would put two links on the strip and one step on the pager, and the bar would
 * say "Section 1 of 2" under three headings. The shell's own paged levels hold one panel
 * per section for the same reason.
 *
 * The order is the shipped reading order and is not rearranged: the frame first, then the
 * level's own blocks. The section pager is the only thing this surface adds, so a reader
 * meets the same sequence one section at a time.
 */
function sectionsFor(
  level: Level,
  entry: StoryEntry,
  theme: Theme,
  parts: {
    artMode: "image" | "diagram";
    onArtMode: (mode: "image" | "diagram") => void;
    files: DiffFile[];
    diffFile: string | null;
    onDiffFile: (path: string) => void;
    onOpenSheet: () => void;
    onOpenDecision: (adr: string) => void;
    onArtFailed: (url: string) => void;
    failedArt: string | null;
  },
): ReactNode[] {
  const held = entry.levels?.[level.key];

  const frame = (
    <FramePanel
      level={level}
      theme={theme}
      artMode={parts.artMode}
      onArtMode={parts.onArtMode}
      failedArt={parts.failedArt}
      onArtFailed={parts.onArtFailed}
    />
  );

  const frameSection = <Bento key="frame">{frame}</Bento>;

  if (level.key === "file_changes") {
    return [
      <Bento key="diff">
        <DiffPanel files={parts.files} selected={parts.diffFile} onSelect={parts.onDiffFile} />
      </Bento>,
    ];
  }

  if (level.key === "landscape") {
    return [
      frameSection,
      <DistrictPanel key="districts" entry={entry} />,
      <Panel
        key="where"
        span="band"
        title="Where this pull request sits"
        icon={GitPullRequest}
        lead="The pull request this level describes, and the size of the change."
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
      </Panel>,
    ];
  }

  if (level.key === "problem_solution") {
    return [
      /*
        THE ASSESSMENT BANNER LEADS THIS LEVEL, as it does in the shipped viewer. Its one
        control opens the sheet, and the sheet is parity's sixth part.
      */
      <Panel
        key="intent"
        span="band"
        title="Intent and assessment"
        icon={Scale}
        lead="The author's own statement of this pull request, and the reading written against its merged diff."
        absent={!entry.intent && !entry.assessment}
        action={
          /*
            THE LABEL TAKES `text-ink`, AND THAT IS THE CONTRAST FIX. It read
            `text-ink-mid`, and `index.css` declares no `--color-ink-mid`, so Tailwind
            emits no rule for that spelling and the label inherited the panel header's own
            `text-band-ink`. The control is a white pill on the teal band, so a white label
            on a white fill measured 1.00 to 1 and the engineer could not read it.
            `--color-ink` is declared, and dark ink on the pill's own fill measures 17.16
            to 1.
          */
          <button
            type="button"
            onClick={parts.onOpenSheet}
            className={cn(
              "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-line bg-card px-3 font-mono text-[12.5px] font-bold text-ink",
              "transition-colors hover:bg-surface-2",
            )}
          >
            <ScrollText className="size-4" aria-hidden="true" />
            Open the sheet
          </button>
        }
      >
        {entry.intent || entry.assessment ? (
          <div className="flex min-w-0 flex-col gap-3">
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <Chip tone={entry.assessment ? "accent" : "neutral"} icon={Sparkles}>
                {entry.assessment?.verdict ?? "no verdict"}
              </Chip>
              {entry.intent?.source ? <Chip>intent source: {entry.intent.source}</Chip> : null}
              {entry.assessment?.stage ? (
                <Chip>assessment stage: {entry.assessment.stage}</Chip>
              ) : null}
              {(entry.assessment?.findings ?? []).length > 0 ? (
                <Chip tone="warn">{(entry.assessment?.findings ?? []).length} findings</Chip>
              ) : null}
            </span>
            <Box label="The problem, in the author's words" tone="problem">
              {entry.intent?.problem ?? "No intent block on this entry."}
            </Box>
            <Box label="The verdict" tone="solution">
              {entry.assessment?.summary ?? "No assessment block on this entry."}
            </Box>
          </div>
        ) : (
          <Missing>
            This pull request carries neither an intent block nor an assessment block. PR 2
            in this bundle is the first entry that carries both.
          </Missing>
        )}
      </Panel>,
      frameSection,
      <Panel
        key="ps"
        span="band"
        title="Problem and solution"
        icon={Lightbulb}
        lead="The gap this diff closes and the shape it closes it with, as the level records both."
        absent={!held?.problem && !held?.solution}
      >
        <div className="flex min-w-0 flex-col gap-3">
          <Box label="The problem" tone="problem">
            {held?.problem ?? "No problem statement is recorded for this level."}
          </Box>
          <Box label="The solution" tone="solution">
            {held?.solution ?? "No solution statement is recorded for this level."}
          </Box>
          {(held?.beats ?? []).length > 0 ? (
            <>
              <SubHead count={(held?.beats ?? []).length}>Beats</SubHead>
              <TextList items={(held?.beats ?? []).map((beat) => beat.text ?? "")} />
            </>
          ) : null}
        </div>
      </Panel>,
    ];
  }

  return [
    frameSection,
    <Panel
      key="decisions"
      span="half"
      title="Decisions this diff lands"
      icon={ListTree}
      lead="The decision records the pull request names. A press opens the whole record."
      absent={(entry.adrs ?? []).length === 0}
    >
      {(entry.adrs ?? []).length === 0 ? (
        <Missing>This pull request names no decision record.</Missing>
      ) : (
        <ul className="m-0 flex min-w-0 list-none flex-wrap gap-2 p-0">
          {(entry.adrs ?? []).map((adr) => (
            <li key={adr} className="list-none">
              <button
                type="button"
                onClick={() => parts.onOpenDecision(adr)}
                title={`Open the whole record for ${adr}`}
                aria-label={`Open the whole record for ${adr}`}
                className={cn(
                  "inline-flex cursor-pointer rounded-md",
                  "transition-colors duration-150 ease-house hover:bg-surface-2",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                )}
              >
                <Chip tone="accent" icon={Shapes}>
                  {adr}
                </Chip>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>,
    <Panel
      key="beats"
      span="half"
      title="Mechanism beats"
      icon={Layers}
      lead="The narration's own beats for this level."
      absent={(held?.beats ?? []).length === 0}
    >
      {(held?.beats ?? []).length === 0 ? (
        <Missing>This level records no beat.</Missing>
      ) : (
        <TextList items={(held?.beats ?? []).map((beat) => beat.text ?? "")} />
      )}
    </Panel>,
  ];
}

