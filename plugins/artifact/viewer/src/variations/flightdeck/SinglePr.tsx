/**
 * Mode one: one pull request, at parity.
 *
 * THE SIX PARTS, AND WHERE EACH ONE IS READ. The shipped viewer shows six things for one
 * pull request, and this mode shows the same six, read from the same records:
 *
 *   1. The four narration levels and their narration — `window.STORY`, one entry per
 *      pull request, `levels` keyed by `landscape`, `problem_solution`, `architecture`,
 *      and `file_changes`. The caption band at the top of every level is the shipped
 *      viewer's own caption band, and the level strip is its rail.
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
 *      same timeline entry. `IntentSheet.tsx` holds that one.
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
 */

import { useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

import {
  AlertTriangle,
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
  SectionHeading,
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

/** The panel heading for each level's frame. One name for one thing. */
const FRAME_TITLE = "The frame";

/* -------------------------------------------------------------- the caption */

/**
 * The shipped viewer's narration caption, in the shell's vocabulary.
 *
 * Heading and narration on the left, a fixed-width audio control on the right, so the
 * row never reflows whether or not the level was voiced. The control always renders; a
 * level with no audio states that in the label rather than hiding the control, because
 * an absence a reader cannot see is an absence they will assume is a bug.
 */
function NarrationCaption({
  level,
  title,
  audio,
  audioFailed,
  onAudioFailed,
}: {
  level: Level;
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
    <div className="flex min-w-0 shrink-0 flex-wrap items-start gap-4 border-b border-line bg-surface-2/70 px-6 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-mono text-[13px] font-bold text-accent-deep">
            Level {level.number}
          </span>
          <span className="font-mono text-[13px] font-bold tracking-[-0.01em] text-ink">
            {level.title}
          </span>
          <span className="min-w-0 truncate font-serif text-[14.5px] text-ink-faint">
            {title}
          </span>
        </span>
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
  onOpenSheet: () => void;
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

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <LevelStrip levels={levels} levelIndex={levelIndex} onLevelIndex={onLevelIndex} />

      <NarrationCaption
        level={level}
        title={entry.title ?? `PR ${entry.pr}`}
        audio={level.audio}
        audioFailed={audioFailed}
        onAudioFailed={onAudioFailed}
      />

      {/*
        The reading-progress strip. `LevelProgress` carries `order-first`, so it paints at
        the top of whichever flex column holds it. In the shell that column is the pane;
        here the column is this pair, so the strip lands directly under the narration
        caption and above the level's band. It stays in the DOM after the stage, because
        `LevelProgress` reads the box ref in a layout effect and React attaches a host ref
        in tree order.
      */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div id={paneId} className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/*
            The level's own band sits above the stage rather than inside the first box, so
            the level's heading stays where a reader left it while the sections page under
            it. It carries no panel heading, so it is not a jump target and the strip below
            lists exactly the sections the pager walks.
          */}
          <div className="min-w-0 shrink-0 px-6 pt-4">
            <SectionHeading
              title={`PR ${entry.pr} · ${level.title}`}
              lead={levelLeadFor(level)}
              id={`flightdeck-level-${level.number}`}
            />
          </div>

          <SectionStrip targets={targets} activeIndex={index} onSelect={onSection} />

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
  );
}

function levelLeadFor(level: Level): string {
  const parts = [
    level.art === null ? null : "scene art",
    level.diagram === null ? null : "a drawing",
    level.audio === null ? null : "narration audio",
  ].filter((part): part is string => part !== null);
  if (parts.length === 0) {
    return "This level carries no art, no drawing, and no audio. It carries the diff.";
  }
  return `This level carries ${parts.join(", ")}.`;
}

/** The four narration levels, as the shipped viewer's rail lists them. */
function LevelStrip({
  levels,
  levelIndex,
  onLevelIndex,
}: {
  levels: Level[];
  levelIndex: number;
  onLevelIndex: (index: number) => void;
}) {
  return (
    <nav
      aria-label="Narration levels"
      className="flex min-w-0 shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-ground px-6 py-2"
    >
      {levels.map((level, index) => {
        const on = index === levelIndex;
        return (
          <button
            key={level.key}
            type="button"
            aria-current={on ? "step" : undefined}
            onClick={() => onLevelIndex(index)}
            title={level.narration || `Level ${level.number}`}
            className={cn(
              "inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-2 rounded-[10px] border px-2.5 font-mono text-[12.5px] whitespace-nowrap transition-colors",
              on
                ? "border-transparent bg-band font-bold text-band-ink"
                : "border-transparent text-ink-dim hover:bg-surface-2 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "font-bold tabular-nums",
                on ? "text-band-ink/80" : "text-ink-faint",
              )}
            >
              {level.number}
            </span>
            {level.title}
            {level.audio === null ? (
              <AlertTriangle
                className={cn("size-3.5 shrink-0", on ? "text-band-ink" : "text-warn")}
                aria-label="no narration audio"
              />
            ) : null}
          </button>
        );
      })}
    </nav>
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
          <button
            type="button"
            onClick={parts.onOpenSheet}
            className={cn(
              "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-line bg-card px-3 font-mono text-[12.5px] font-bold text-ink-mid",
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
      lead="The decision records the pull request names."
      absent={(entry.adrs ?? []).length === 0}
    >
      {(entry.adrs ?? []).length === 0 ? (
        <Missing>This pull request names no decision record.</Missing>
      ) : (
        <ul className="m-0 flex min-w-0 list-none flex-wrap gap-2 p-0">
          {(entry.adrs ?? []).map((adr) => (
            <li key={adr} className="list-none">
              <Chip tone="accent" icon={Shapes}>
                {adr}
              </Chip>
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

