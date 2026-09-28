/**
 * One work item, read through a rail grouped in two parts, with two accounts behind it.
 *
 * THE SHAPE. Three regions. A top band that names the work item, the change, the account
 * the reader is in, and the address on screen. A rail down the left edge with the
 * engineer's two groups. Beside it, the shell's own section pager: one section on screen,
 * a strip of the section headings above it, and a pager under it.
 *
 * THE ENGINEER'S OWN WORDS FOR THIS SURFACE:
 *
 *   "group items under 'Build', 'Review' and 'Deploy'. Build would contain: Intent,
 *    Problem & Solution, Architecture, Epics, Rubrics. Review: The same except
 *    Epics+Rubrics + File Diffs."
 *
 * and then:
 *
 *   "Let's remove the 'Deploy' section for the time being."
 *
 * So the rail holds two groups now, and the middle one repeats the first one's three
 * names. The names repeat because the accounts differ: Build reads the program's account
 * and Review reads the change's. `./accountModel` builds the rows, `./AccountRail` draws
 * them, `./AccountMark` states which account a reader is in and carries the jump between
 * them.
 *
 * THE SECTION MODEL IS THE SHIPPED SHELL'S, AND NOT A SECOND ONE. The engineer asked for
 * the reading the live viewer already has: one section on screen at a time, the section
 * headings on a horizontal strip, a content window of fixed height, and no page scrolling
 * anywhere. `@/shell/Pager` holds that machinery, and this surface calls it rather than
 * writing its own. The rail keeps the levels, so the rail moves a reader between the two
 * accounts' sections and the strip moves them inside one of them. The one-pull-request
 * surface beside this one reads a level the same way, so the two agree by construction.
 *
 * THE SECTION HEADINGS CARRY NO FILL. The rail's rows and the pager's strip are the two
 * things a reader can press to move, and they are the two things that say so with a
 * fill. A panel heading is a name and not a control, so it wears no fill at all.
 *
 * THE DEFAULT WORK ITEM IS `cobuilder-implement`, AND ITS CHANGE IS PULL REQUEST 11.
 * `dev.tsx` states why that pair, and it takes a different work id or pull request from the
 * query string. The address wins over the query string: a reader who follows a deep link
 * lands on the section that address names.
 *
 * THE ADDRESS IS THE ROUTE. `@/shell/model` holds the shell's own parser and builder, and
 * this surface calls them. A press writes the hash and nothing else. No second router, no
 * second address scheme, and every row's address can be copied, sent, and opened. The
 * section inside the live row is view state and is never a route, exactly as it is on the
 * shipped shell's paged levels.
 *
 * THE GROUPING IS DECIDED. The engineer specified the groups and this file renders them as
 * the navigation, not as a candidate. What stays open is the mark that separates the two
 * accounts, and only that. `./AccountMark` says so where the mark lives.
 *
 * THE SHIPPED RAIL IS NOT MOVED BY THIS FILE. `src/shell/Rail.tsx` keeps its own six flat
 * entries, because a grouped shipped rail would carry the change's account in its Review
 * group and the shipped shell does not render that account yet. The grouping lands with
 * the model rather than ahead of it. Nothing in the shipped graph imports this file, so no
 * prototype code travels into the committed `plugins/artifact/viewer/index.html`.
 *
 * ONE THING ABOUT THE COMMITTED FILE IS WORTH KNOWING. Tailwind reads every file under
 * `src/` for class candidates, and `src/variations/` is deliberately not excluded. A
 * rebuild therefore picks up any class this directory uses, and this surface adds two: the
 * pair that takes the fill off a section heading. Neither rule is in the committed viewer
 * today, because a rebuild is what writes that file and this work ran no rebuild.
 */

import { Children, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Database, GitPullRequest, Moon, Sun, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { Chip, Missing, Panel } from "@/shell/atoms";
import type { Theme } from "@/shell/DiagramTiles";
import { useDocumentNoScroll } from "@/shell/hooks";
import { useJumpTargets } from "@/shell/jump";
import { LevelProgress, SectionPager, SectionStage, SectionStrip, useSectionPaging } from "@/shell/Pager";
import { RecordSheet } from "@/shell/Sheet";
import type { SheetSubject } from "@/shell/Sheet";
import { gatesOf, levelsOf as programLevelsOf } from "@/shell/model";
import { loadDesigns, loadIndex } from "@/data/bundle";
import { buildWorkItems } from "@/data/works";
import type { WorkItem } from "@/data/works";
import type { AdrRecords } from "@/data/adrs";

import { AccountRail } from "./AccountRail";
import { ACCOUNT_GLYPH, AccountRule } from "./AccountMark";
import { changeSections } from "./accountChange";
import {
  ACCOUNT_MARK,
  CHANGE_LEVEL_KEY,
  changeHref,
  changeLevelsOf,
  diffCountOf,
  liveRow,
  programHref,
  railGroups,
  servedAudioOf,
} from "./accountModel";
import type { AccountId, LiveRow, RailRow } from "./accountModel";
import { programSections } from "./accountProgram";
import {
  entryOf,
  loadAdrs,
  loadDiff,
  loadDiagrams,
  loadManifest,
  loadStory,
  type Level,
  type Manifest,
  type Story,
  type StoryEntry,
} from "./model";

/** The work item this prototype opens on. `dev.tsx` passes another when asked. */
export const DEFAULT_WORK = "cobuilder-implement";

/** The pane the section strip reads its panels from. One per surface. */
const PANE_ID = "flightdeck-account-sections";

/**
 * The pane's panel headings, with the fill taken off.
 *
 * A panel heading names the section under it. The shipped shell paints that heading with
 * the heading band, and on a screen where a reader may press a rail row or a strip
 * heading to move, a filled heading reads as one of those two: a thing that is selected,
 * or a thing a press opens. It is neither, so this surface renders it as a plain heading
 * on the card.
 *
 * THE FILL IS THE ONLY THING REMOVED, and the two declarations below are the whole of it.
 * The second one re-points the band's own ink at the page's ink, because the band's white
 * is only readable on the band itself. Every part of the heading that reads that token —
 * the title, its count, its icon chip, and its focus ring — follows, so no part of a
 * heading keeps a colour that needs a fill to be legible.
 *
 * IT IS SCOPED TO THE PANE AND TO PANELS. The rule reaches a `header` inside a `section`,
 * which is what `Panel` renders and nothing else. The strip, the account rule, and the
 * rail are none of those, so this class cannot touch them: the rail's current row and the
 * strip's active heading still say where the reader is with the shell's own fill.
 */
const FLAT_SECTION_HEADINGS = cn(
  "[&_section>header]:bg-transparent",
  "[&_section>header]:[--band-ink:var(--ink)]",
);

type Loaded = {
  state: "ready";
  story: Story;
  manifest: Manifest;
  adrs: AdrRecords;
  works: Map<string, WorkItem>;
};

type Load = { state: "loading" } | Loaded | { state: "failed"; message: string };

/** The change's own two reads: its diagrams and its diff, both keyed on its number. */
type ChangeRead = {
  pr: number;
  diagrams: Record<string, string>;
  diff: Record<string, string> | null;
  diffError: string | null;
};

export default function Accounts({
  workId = DEFAULT_WORK,
  pr,
}: {
  workId?: string;
  /** The change to read, or nothing to take the first pull request the work's epics carry. */
  pr?: number;
}) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [hash, setHash] = useState(() => window.location.hash);
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
  );
  const [artMode, setArtMode] = useState<"image" | "diagram">("image");
  const [diffFile, setDiffFile] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetSubject | null>(null);
  const [failedArt, setFailedArt] = useState<string | null>(null);
  const [audioFailed, setAudioFailed] = useState<string | null>(null);
  /*
   * THE AUDIO THE BUNDLE SERVES, READ ONCE PER CHANGE.
   *
   * A level's `voice` script records that the level was voiced and names the address. It
   * does not record whether a file sits there, and `manifest.js` holds no audio list, so
   * the rail's count cannot answer that question from any record it reads. `servedAudioOf`
   * asks the addresses themselves, and the answer is held here so the rail's count and the
   * panel's own audio control read one fact rather than two.
   */
  const [servedAudio, setServedAudio] = useState<ReadonlySet<string>>(() => new Set());
  /*
   * THE GROUP FOLD, HELD ABOVE THE RAIL, AND THE ONE CASE THAT CANNOT CLOSE. The shipped
   * rail is handed its open state and writes none of it itself, so the same choice survives
   * a re-render of the rail. Every group starts open, and a group with no entry is open.
   *
   * THE FOLD REFUSES TO CLOSE THE READER'S OWN GROUP. The rail's convention is that the row
   * the reader is on is never hidden: the walk visits every row of both groups, and the
   * group holding the current row stays open so the row the walk landed on is a row the
   * reader can see. Closing that group would hide the one row the reader needs, and the
   * surface would have to open it again on the next render — a press that undoes itself.
   * So the refusal is explicit here and the rail states it on the control. Every other
   * group folds and unfolds freely.
   */
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    build: true,
    review: true,
  });
  const boxRef = useRef<HTMLDivElement | null>(null);

  /*
   * THE DOCUMENT NEVER SCROLLS. The shell's own hook, and the shell's own rule: the pane
   * owns the only scroll and the page has none. The frame below is already the viewport's
   * height, so this is the guard rather than the layout, and it is the same guard the
   * shipped shell takes for the same page.
   */
  useDocumentNoScroll();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  /*
    One read of the bundle's shared records. The reviewed prototype reads five files; the
    program's account needs the record index and the design records as well, so this read is
    six. None of the six depends on which pull request is live, so this effect runs once.
  */
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [story, manifest, adrs, index, designs] = await Promise.all([
          loadStory(),
          loadManifest(),
          loadAdrs(),
          loadIndex(),
          loadDesigns(),
        ]);
        if (!live) return;
        setLoad({
          state: "ready",
          story,
          manifest,
          adrs,
          works: buildWorkItems(index, designs),
        });
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
  }, []);

  /* The address is the reader's position. A press writes it, and nothing else does. */
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((href: string) => {
    if (window.location.hash === href) return;
    window.location.hash = href;
  }, []);

  const work: WorkItem | null = load.state === "ready" ? (load.works.get(workId) ?? null) : null;

  /*
    THE CHANGE IS ALWAYS ONE THIS WORK'S OWN EPICS CARRY.

    `joins.epic_to_pull_request` answers which pull requests belong to the work, and this
    reads that answer rather than trusting the query string. A requested number outside the
    set falls back to the first one inside it, because the whole point of this surface is
    that the two accounts belong to one work item. A query string that named a stranger's
    pull request would put two unrelated records side by side and the comparison would be a
    lie. A work whose epics carry no pull request has no change at all, and the Review group
    states that absence in place.
  */
  const ownPrs = useMemo(() => (work === null ? [] : work.pullRequests.map((p) => p.id)), [work]);
  const changePr: number | null = useMemo(() => {
    if (ownPrs.length === 0) return null;
    if (pr !== undefined && ownPrs.includes(pr)) return pr;
    return ownPrs[0];
  }, [ownPrs, pr]);

  /* The change's own two reads, keyed on its number. */
  const [change, setChange] = useState<ChangeRead | null>(null);
  useEffect(() => {
    if (changePr === null) {
      setChange(null);
      return;
    }
    let live = true;
    (async () => {
      const [diagrams, diff] = await Promise.all([
        loadDiagrams(changePr).catch(() => ({}) as Record<string, string>),
        loadDiff(changePr).then(
          (value) => ({ diff: value as Record<string, string> | null, error: null as string | null }),
          (error: unknown) => ({
            diff: null as Record<string, string> | null,
            error: error instanceof Error ? error.message : String(error),
          }),
        ),
      ]);
      if (!live) return;
      setChange({ pr: changePr, diagrams, diff: diff.diff, diffError: diff.error });
    })();
    return () => {
      live = false;
    };
  }, [changePr]);

  const diagrams = load.state === "ready" && change !== null && change.pr === changePr ? change.diagrams : {};

  const entry: StoryEntry | null =
    load.state === "ready" && changePr !== null ? entryOf(load.story, changePr) : null;

  const changeLevels: Level[] = useMemo(
    () =>
      load.state !== "ready" || entry === null
        ? []
        : changeLevelsOf(entry, load.story, load.manifest, diagrams),
    [load, entry, diagrams],
  );

  const programLevelStates = useMemo(() => (work === null ? null : programLevelsOf(work)), [work]);
  const gates = useMemo(() => (work === null ? null : gatesOf(work)), [work]);

  /*
    The change's audio, asked for once, and keyed on the change's own levels so the answer
    belongs to the change a reader is on. A file the bundle does not hold answers as a miss
    rather than a wait, so no row holds an unanswered question open. See `servedAudioOf`.
  */
  useEffect(() => {
    if (changeLevels.length === 0) return;
    let live = true;
    servedAudioOf(changeLevels).then((served) => {
      if (live) setServedAudio(served);
    });
    return () => {
      live = false;
    };
  }, [changeLevels]);

  const groups = useMemo(
    () =>
      railGroups({
        work,
        gates,
        levels: programLevelStates,
        entry,
        changeLevels,
        diffFiles: change === null ? null : diffCountOf(change.diff),
        servedAudio,
      }),
    [work, gates, programLevelStates, entry, changeLevels, change, servedAudio],
  );

  const live: LiveRow | null = useMemo(() => liveRow(groups), [groups, hash]);

  /*
   * THE GROUP HOLDING THE CURRENT ROW IS ALWAYS OPEN, AND THE WALK IS WHY.
   *
   * The rail's convention is that a reader always sees the row they are on. The walk
   * visits every row of both groups, folded or not, so a press can land inside a folded
   * group — and that is what this effect answers. The moment the current row sits in a
   * folded group, the group opens. One rule, enforced once, so it covers every way an
   * address can arrive: the walk, a deep link, the jump between the accounts, and a typed
   * address. The rail's walk therefore holds no group state of its own and opens nothing
   * itself; it stays a walk.
   */
  useEffect(() => {
    if (live === null) return;
    const key = live.group.key;
    setOpenGroups((current) =>
      (current[key] ?? true) ? current : { ...current, [key]: true },
    );
  }, [live]);

  /*
   * THE FOLD CONTROL, WITH THE ONE REFUSAL THE INVARIANT ABOVE FORCES. A group that holds
   * the current row does not close, because closing it hides the reader's own row and this
   * effect would open it again on the next render. A press that undoes itself is worse than
   * a press that is refused and says so, so the state never becomes closed and the rail
   * states the reason on the control. Every other group toggles freely.
   */
  const toggleGroup = useCallback(
    (key: string) => {
      if (live !== null && live.group.key === key) return;
      setOpenGroups((current) => ({ ...current, [key]: !(current[key] ?? true) }));
    },
    [live],
  );

  /*
    A route that names no row opens the first row. The bare `#/` is the shell's board, and
    this prototype has no board, so it lands on the program's Intent rather than on an
    empty page. The landing is stated on screen while it happens rather than silently.
  */
  const firstHref = groups[0]?.rows[0]?.href ?? null;
  useEffect(() => {
    if (firstHref === null) return;
    if (live !== null) return;
    go(firstHref);
  }, [firstHref, live, go]);

  const current: RailRow | null = live?.row ?? null;
  const changeSection = current?.body.kind === "change" ? current.body.section : null;
  const liveLevel: Level | null =
    changeSection === null
      ? null
      : (changeLevels.find((level) => level.key === CHANGE_LEVEL_KEY[changeSection]) ?? null);

  /*
    ONE SECTION IS ONE PANEL, and the two body files return one element per panel so the
    shell's own strip, stage, and pager get the shape they expect.

    `Children.toArray` IS THE COUNT, AND IT IS THE SAME CALL THE STAGE MAKES. A body may
    answer with a hole: a level the bundle does not hold has no frame panel, and a diff
    that read cleanly has no error panel. The stage drops a hole when it builds its boxes,
    so a list that kept one would put a step on the pager that no box answers. Reading the
    list through the stage's own call means the pager's count and the boxes are the same
    number by construction rather than by agreement.

    The list is empty while the bundle is read, or when the address names no row: both
    states show their own panel and neither gets pager chrome it cannot fill.
  */
  const sections: ReactNode[] = useMemo(() => {
    const built = (): ReactNode[] => {
      if (load.state !== "ready" || work === null || current === null) return [];
      if (current.body.kind === "program") {
        return programSections({
          section: current.body.section,
          work,
          levels: programLevelStates,
          adrs: load.adrs,
          theme,
          gated: gates?.rubrics ?? false,
          openSheet: setSheet,
        });
      }
      if (changeSection === null || entry === null) return [];
      return changeSections({
        section: changeSection,
        entry,
        levels: changeLevels,
        level: liveLevel,
        diff: change?.diff ?? null,
        diffError: change?.diffError ?? null,
        theme,
        artMode,
        onArtMode: setArtMode,
        failedArt,
        onArtFailed: setFailedArt,
        audioFailed,
        onAudioFailed: setAudioFailed,
        diffFile,
        onDiffFile: setDiffFile,
        adrs: load.adrs,
        openSheet: setSheet,
      });
    };
    return Children.toArray(built());
  }, [
    load,
    work,
    current,
    programLevelStates,
    gates,
    theme,
    changeSection,
    entry,
    changeLevels,
    liveLevel,
    change,
    artMode,
    failedArt,
    audioFailed,
    diffFile,
  ]);

  /*
   * The section the reader is on. The index is view state and never a route, as it is on
   * the shipped shell's paged levels: the whole route is the key, so a row that opens a
   * new section lands that section at its own first page.
   */
  const paging = useSectionPaging(sections.length, hash);

  /* The strip reads the panels this level rendered, so a label can never drift from one. */
  const targets = useJumpTargets(PANE_ID, [load.state, hash, sections.length]);

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-ground text-ink">
      <header className="flex min-w-0 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface-2 px-6 py-3">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="font-mono text-[17px] font-bold tracking-[-0.01em] text-ink">
            FlightDeck
          </span>
          <span className="font-mono text-[12.5px] text-ink-faint">
            one work item, two accounts
          </span>
        </span>

        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <Chip tone="accent" icon={Database}>
            {workId}
          </Chip>
          {work ? <Chip>stage {work.design.stage}</Chip> : null}
          <Chip icon={GitPullRequest}>{entry === null ? "no change" : `PR ${entry.pr}`}</Chip>
          {current === null ? null : <AccountMarkChip account={current.account} />}
        </span>

        <span className="ml-auto flex min-w-0 items-center gap-2">
          <a
            href="?surface=single"
            className="inline-flex min-h-9 items-center rounded-full border border-line bg-card px-3 font-mono text-[12px] text-ink-mid hover:bg-surface-3"
          >
            the reviewed one-pull-request prototype
          </a>
          <a
            href="?surface=accounts"
            className="inline-flex min-h-9 items-center rounded-full border border-line bg-card px-3 font-mono text-[12px] text-ink-mid hover:bg-surface-3"
          >
            reload this prototype
          </a>
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

      {/*
        The address on screen, in full and in mono. A reader judging the navigation has to
        see where a press lands, and this line is the address itself rather than a summary
        of it.
      */}
      <p className="m-0 flex min-w-0 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-surface px-6 py-1.5 font-mono text-[12px]">
        <span className="font-bold tracking-[0.08em] text-ink-faint uppercase">address</span>
        <span className="min-w-0 break-all text-accent-deep">{hash || "#/"}</span>
        <span className="min-w-0 text-ink-faint">
          {current === null ? "no row opens this address yet" : current.label}
        </span>
      </p>

      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <AccountRail
          groups={groups}
          onGo={go}
          open={openGroups}
          onToggleGroup={toggleGroup}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            id={PANE_ID}
            className={cn("flex min-h-0 min-w-0 flex-1 flex-col", FLAT_SECTION_HEADINGS)}
          >
            {current === null ? (
              /* The states with no row to page through keep a box of their own to scroll. */
              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
                {load.state === "loading" ? (
                  <Panel title="Reading the bundle" icon={Database} lead="Two accounts, read once.">
                    <p className="m-0 font-mono text-[13px] text-ink-dim">
                      Reading `index.json`, `designs.js`, `story.js`, `manifest.js`,
                      `diagrams.js`, and the change&apos;s diff from the bundle the dev server
                      mounts at `/bundle/`…
                    </p>
                  </Panel>
                ) : load.state === "failed" ? (
                  <Panel title="The bundle could not be read" icon={TriangleAlert} tone="warn" absent>
                    <Missing>{load.message}</Missing>
                  </Panel>
                ) : work === null ? (
                  <Panel title="No such work item" icon={TriangleAlert} tone="warn" absent>
                    <Missing>
                      The index resolved no design whose id is {workId}. It carries fifteen
                      designs, and `cobuilder-implement` is the one this prototype opens on.
                    </Missing>
                  </Panel>
                ) : (
                  <Panel title="No section at this address" icon={TriangleAlert} tone="warn" absent>
                    <Missing>
                      The address {hash || "#/"} names no row of this rail, and the prototype is
                      moving to {firstHref ?? "#/"}.
                    </Missing>
                  </Panel>
                )}
              </div>
            ) : (
              <>
                {/*
                  THE ROW'S NAME IS THE DOCUMENT'S ONE HEADING, AND IT IS NOT DRAWN. The
                  rail's current row already names it, and the top band names the work item
                  and the change, so a heading here would repeat the rail a second time and
                  spend height the fixed content window needs. It stays in the flow at
                  `sr-only`, so the page keeps its one `h1` and a screen reader still hears
                  which section this is.
                */}
                <h1 className="sr-only">{current.label}</h1>

                <SectionStrip
                  targets={targets}
                  activeIndex={paging.index}
                  onSelect={paging.select}
                />

                <AccountRule
                  account={current.account}
                  whose={whoseOf(current.account, workId, entry)}
                  section={current.label}
                  jump={jumpOf(current, workId, entry)}
                  onGo={go}
                />

                <SectionStage index={paging.index} activeBoxRef={boxRef}>
                  {sections}
                </SectionStage>

                <SectionPager
                  index={paging.index}
                  count={paging.count}
                  onPrevious={paging.previous}
                  onNext={paging.next}
                />
              </>
            )}
          </div>

          {/*
            The reading-progress strip, which reads the box on screen. It renders after
            `SectionStage` because it reads the box ref in a layout effect, and it paints
            first because its own wrapper takes `order-first`.
          */}
          {current === null ? null : (
            <LevelProgress index={paging.index} count={paging.count} boxRef={boxRef} />
          )}
        </div>
      </div>

      {audioFailed === null ? null : (
        <p className="m-0 shrink-0 border-t border-line bg-warn-wash px-6 py-2 font-mono text-[12.5px] text-warn">
          The narration audio at {audioFailed} did not load.
        </p>
      )}

      <RecordSheet
        subject={sheet}
        onOpenChange={(open) => {
          if (!open) setSheet(null);
        }}
      />
    </div>
  );
}

/**
 * The account mark in the top band: the account's glyph and the account's own word.
 *
 * IT CARRIES NO FILL. The engineer dropped the mark's third part — "The title and icon
 * are sufficient" — so this chip-shaped element keeps the border that lines it up with
 * the band's other chips and no background at all. `./AccountMark` states the mark, and
 * `./AccountRail` draws the same two parts on each group heading.
 */
function AccountMarkChip({ account }: { account: AccountId }) {
  const Glyph = ACCOUNT_GLYPH[account];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-0.5 font-mono text-[12px] whitespace-nowrap text-ink-mid">
      <Glyph className="size-3.5 shrink-0" aria-hidden="true" />
      {ACCOUNT_MARK[account].word} account
    </span>
  );
}

/** Whose record the reader is in, in that account's own terms. */
function whoseOf(account: AccountId, workId: string, entry: StoryEntry | null): string {
  if (account === "program") return workId;
  return entry === null ? "no pull request" : `pull request ${entry.pr}`;
}

/**
 * The other account's address for this same section name, or null when this section has no
 * counterpart. The change's File Diffs row carries no counterpart, and the rule says so on
 * the bar.
 *
 * The address comes from `./accountModel`'s two builders and never from string surgery, so
 * a change to the route shape reaches the jump and the rail at once.
 */
function jumpOf(
  row: RailRow,
  workId: string,
  entry: StoryEntry | null,
): { href: string; account: AccountId; section: string } | null {
  if (row.shared === null || entry === null) return null;
  if (row.account === "program") {
    return {
      href: changeHref(workId, entry.pr, row.shared),
      account: "change",
      section: row.label,
    };
  }
  return { href: programHref(workId, row.shared), account: "program", section: row.label };
}
