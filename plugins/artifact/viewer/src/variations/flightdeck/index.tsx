/**
 * FlightDeck — one surface with two modes behind one control.
 *
 * THE SHAPE. Three regions, and the same three in both modes: a top band that never
 * changes, a body row below it that holds whichever mode is live, and nothing else. The
 * switch swaps the body. It opens no page, it writes no address, and it reloads nothing,
 * so a reader never loses the surface they were reading.
 *
 * THE READER'S STATE LIVES HERE, AND NOT IN A MODE. A return to the first mode has to
 * show the surface the reader left, so everything a reader can change in it is held above
 * both modes and handed down: the narration level, the section inside that level, the
 * frame's image-or-diagram choice, and the diff file they opened. The sheet is held here
 * too. A mode that owned any of this would lose it on the switch, which is the state the
 * slice's first criterion is about.
 *
 * THE SCROLL IS HELD HERE FOR THE SAME REASON. The active section box is the only
 * scrolling region, and it unmounts with the mode. So the surface keeps the box as its
 * own ref, remembers its offset per level-and-section as the switch happens, and restores
 * it when the first mode comes back.
 *
 * WHAT THIS FILE DOES NOT DO. It does not register itself in `src/Variations.tsx`, and it
 * must not. That file imports every variation statically and `src/shell/App.tsx` imports
 * that file, so a variation registered there travels into the shipped
 * `plugins/artifact/viewer/index.html`. This prototype is served by its own dev entry at
 * `variations/flightdeck/dev.html` and it stays outside the shipped graph, which is the
 * slice's third regression clause. `npm run build` proves it: the committed file's hash
 * does not move.
 *
 * THE PULL REQUEST IS PR 2. Its bundle entry is the first in
 * `.cobuilder-architect/self/` to carry both an intent block and an assessment block, and
 * it carries all six parts of parity: four levels of narration, three diagrams, three
 * pictures, three audio files, a diff, and the two blocks. `dev.tsx` passes a different
 * number when a reviewer asks for one.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Database, Moon, Sun, TriangleAlert } from "lucide-react";

import { Chip, Missing, Panel } from "@/shell/atoms";
import type { Theme } from "@/shell/DiagramTiles";

import { IntentSheet } from "./IntentSheet";
import { ModeSwitch } from "./ModeSwitch";
import type { Mode } from "./ModeSwitch";
import { MultiPrDesign } from "./MultiPr";
import { SinglePr } from "./SinglePr";
import {
  entriesOf,
  entryOf,
  levelsOf,
  loadDiff,
  loadDiagrams,
  loadManifest,
  loadStory,
  type Level,
  type Manifest,
  type Story,
  type StoryEntry,
} from "./model";

/** The pane the section strip reads its panels from. One per surface. */
const PANE_ID = "flightdeck-sections";

type Loaded = {
  state: "ready";
  story: Story;
  manifest: Manifest;
  diagrams: Record<string, string>;
  diff: Record<string, string> | null;
  diffError: string | null;
};

type Load = { state: "loading" } | Loaded | { state: "failed"; message: string };

export default function FlightDeck({ pr = 2 }: { pr?: number }) {
  const [load, setLoad] = useState<Load>({ state: "loading" });

  /* The reader's own state, and every field of it survives a mode switch. */
  const [mode, setMode] = useState<Mode>("single");
  const [levelIndex, setLevelIndex] = useState(0);
  const [sectionByLevel, setSectionByLevel] = useState<Record<number, number>>({});
  const [artMode, setArtMode] = useState<"image" | "diagram">("image");
  const [diffFile, setDiffFile] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [failedArt, setFailedArt] = useState<string | null>(null);
  const [audioFailed, setAudioFailed] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
  );

  const boxRef = useRef<HTMLDivElement | null>(null);
  const scrollMemory = useRef<Record<string, number>>({});

  const section = sectionByLevel[levelIndex] ?? 0;
  const setSection = useCallback(
    (index: number) => setSectionByLevel((current) => ({ ...current, [levelIndex]: index })),
    [levelIndex],
  );

  /* The theme is the document's, as the shell's own toggle leaves it. */
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  /* One read of the bundle, and the four records a pull request needs. */
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [story, manifest, diagrams] = await Promise.all([
          loadStory(),
          loadManifest(),
          loadDiagrams(pr),
        ]);
        let diff: Record<string, string> | null = null;
        let diffError: string | null = null;
        try {
          diff = await loadDiff(pr);
        } catch (error: unknown) {
          diffError = error instanceof Error ? error.message : String(error);
        }
        if (live) setLoad({ state: "ready", story, manifest, diagrams, diff, diffError });
      } catch (error: unknown) {
        if (live) {
          setLoad({
            state: "failed",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [pr]);

  const entry: StoryEntry | null = load.state === "ready" ? entryOf(load.story, pr) : null;
  const levels: Level[] = useMemo(
    () =>
      entry === null || load.state !== "ready"
        ? []
        : levelsOf(entry, load.story, load.manifest, load.diagrams),
    [entry, load],
  );

  const scrollKey = `${pr}/${levelIndex}/${section}`;

  /*
    The switch. The offset is read BEFORE the mode changes, because the box it belongs to
    is unmounted by the change.
  */
  const switchMode = useCallback(
    (next: Mode) => {
      if (next === mode) return;
      if (mode === "single" && boxRef.current) {
        scrollMemory.current[scrollKey] = boxRef.current.scrollTop;
      }
      setMode(next);
    },
    [mode, scrollKey],
  );

  /* And put back after the first mode renders again. */
  useLayoutEffect(() => {
    if (mode !== "single") return;
    const box = boxRef.current;
    if (!box) return;
    const saved = scrollMemory.current[scrollKey];
    if (saved === undefined) return;
    box.scrollTop = saved;
  }, [mode, scrollKey]);

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-ground text-ink">
      {/*
        THE TOP BAND IS THE SAME IN BOTH MODES. Its title, its switch, and its height do
        not change with the mode, because the frame is the surface and only the body is
        one of two things.
      */}
      <header className="flex min-w-0 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface-2 px-6 py-3">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="font-mono text-[17px] font-bold tracking-[-0.01em] text-ink">
            FlightDeck
          </span>
          <span className="font-mono text-[12.5px] text-ink-faint">
            one surface, two modes
          </span>
        </span>

        <ModeSwitch mode={mode} onMode={switchMode} />

        <span className="flex min-w-0 flex-wrap items-center gap-2">
          {mode === "single" && entry ? (
            <>
              <Chip tone="accent" icon={Database}>
                PR {entry.pr}
              </Chip>
              <Chip>levels {levels.length}</Chip>
              <Chip>diagrams {levels.filter((level) => level.diagram !== null).length}</Chip>
              <Chip>art {levels.filter((level) => level.art !== null).length}</Chip>
              <Chip>audio {levels.filter((level) => level.audio !== null).length}</Chip>
              <Chip>{load.state === "ready" && load.diff ? `${Object.keys(load.diff).length} diff files` : "no diff"}</Chip>
            </>
          ) : null}
          {mode === "multi" ? (
            <Chip tone="warn" dashed icon={TriangleAlert}>
              drawn, not built
            </Chip>
          ) : null}
        </span>

        <span className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Use the light theme" : "Use the dark theme"}
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-line bg-card text-ink-mid hover:bg-surface-3"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </span>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {load.state === "loading" ? (
          <div className="min-w-0 flex-1 px-6 py-6">
            <Panel title="Reading the bundle" icon={Database} lead="Six records, read once.">
              <p className="m-0 font-mono text-[13px] text-ink-dim">
                Reading `story.js`, `manifest.js`, `diagrams.js`, and `diffs-pr{pr}.js` from
                the bundle the dev server mounts at `/bundle/`…
              </p>
            </Panel>
          </div>
        ) : load.state === "failed" ? (
          <div className="min-w-0 flex-1 px-6 py-6">
            <Panel title="The bundle could not be read" icon={TriangleAlert} tone="warn" absent>
              <Missing>{load.message}</Missing>
            </Panel>
          </div>
        ) : entry === null ? (
          <div className="min-w-0 flex-1 px-6 py-6">
            <Panel title="No such pull request" icon={TriangleAlert} tone="warn" absent>
              <Missing>
                The bundle&apos;s story holds no entry for PR {pr}. The prototype is pointed
                at PR 2, which carries all six parts of parity.
              </Missing>
            </Panel>
          </div>
        ) : mode === "single" ? (
          <SinglePr
            entry={entry}
            levels={levels}
            diff={load.diff}
            diffError={load.diffError}
            theme={theme}
            levelIndex={levelIndex}
            onLevelIndex={setLevelIndex}
            section={section}
            onSection={setSection}
            artMode={artMode}
            onArtMode={setArtMode}
            diffFile={diffFile}
            onDiffFile={setDiffFile}
            onOpenSheet={() => setSheetOpen(true)}
            boxRef={boxRef}
            paneId={PANE_ID}
            failedArt={failedArt}
            onArtFailed={setFailedArt}
            audioFailed={audioFailed}
            onAudioFailed={setAudioFailed}
          />
        ) : (
          <MultiPrDesign entries={entriesOf(load.story)} />
        )}
      </div>

      {/*
        The audio failure line. A level whose track the server does not serve would
        otherwise be a silent control, and a missing asset is a defect rather than a
        detail, so the surface says which URL failed.
      */}
      {audioFailed === null ? null : (
        <p className="m-0 shrink-0 border-t border-line bg-warn-wash px-6 py-2 font-mono text-[12.5px] text-warn">
          The narration audio at {audioFailed} did not load.
        </p>
      )}

      <IntentSheet open={sheetOpen} onOpenChange={setSheetOpen} entry={entry} />
    </div>
  );
}
