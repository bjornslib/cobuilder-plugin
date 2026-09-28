/**
 * The application shell.
 *
 * THIS FILE IS THE PROTOTYPE AT `src/variations/sections-e/` PORTED INTO THE SHIPPED
 * SHELL. The prototype built and measured the arrangement, and it stays on disk as the
 * comparison, so a reader can hold the two side by side. Four things changed in the move:
 * the data comes from `@/data/bundle` instead of the variation's own scaffolding, the
 * route is the bare `#/` because the shell is no longer one variation among several, the
 * THE FILE IS NOW THE ONLY ENTRY THE SHIPPED GRAPH HAS. The comparison harness that
 * rendered the prototype arrangements used to sit beside it, and this file handed that
 * harness its own addresses back. The harness is gone: each prototype under
 * `src/variations/` carries a dev-only entry of its own, and no file the shell can reach
 * imports one. So the shell answers every address the bundle's own designs answer, and
 * an address that names no design says so.
 *
 * Three fixed regions and one scrolling region. The document does not scroll at all,
 * per interaction-design section 11.3: `html` and `body` carry no overflow, and the
 * shell fills the space its host gives it. Only the scroll pane scrolls.
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ TOP BAR (fixed)   [ work item ] [ status ] [ theme ]     │
 *   ├────────────┬─────────────────────────────────────────────┤
 *   │ LEFT NAV   │  SCROLL PANE — the only scrolling region    │
 *   │ (fixed)    │                                             │
 *   └────────────┴─────────────────────────────────────────────┘
 *
 * FOUR LEVELS ARE HORIZONTAL SECTION PAGERS rather than stacked pages: one section per
 * box on a track that slides sideways, and each box scrolls its own overflow. Intent
 * pages the four parts of its contract. Problem & Solution pages its four panels.
 * Architecture regroups its level into Diagrams, Architecture Decisions, Boundaries,
 * and Districts and alternatives considered. Build pages its epics, six to a section.
 * Every other section keeps the layout below unchanged, and Build's Rubrics sub-view
 * keeps it too. `Pager.tsx` holds the pager pieces, and its header comment states what
 * the engineer asked for and why each piece is shaped so.
 *
 * A paged level also drops its visible heading band, because the section strip names
 * the same words a band would. It keeps the heading as `sr-only`, so the focus
 * contract and the document's one `h1` survive.
 *
 * THE BOARD IS THE LANDING SURFACE, and it is not a level. The bare route `#/` names no
 * work item, and it renders every work item as one row rather than the error it used to
 * render. The route that names an id the bundle lacks keeps that error. The board draws
 * no strip, no pager, and no level progress bar, and `Board.tsx` states why it also draws
 * no reading-progress strip. The rail's top entry opens it from any level.
 *
 * SECTION 11.3'S FOUR RULES ARE THE LAYOUT CONTRACT, and each one is applied here.
 *
 *   1. The shell fills its parent, never the viewport. The root carries `h-full` and
 *      never `h-dvh`, because the viewport height belongs to whoever owns the page. The
 *      page that serves this shell gives that height: `src/index.css` sets `height: 100%`
 *      on `html`, `body`, and `#root`, so the root's `h-full` resolves to the viewport on
 *      every state. The root also caps its own height with `max-h-dvh`, which binds when a
 *      host hands it a height taller than the visible screen. Without the cap the shell
 *      would overflow such a host, the document would scroll, and no ancestor would bound
 *      the pane. That is the board's defect.
 *   2. The scroll pane scrolls on both axes: `overflow-auto`, never `overflow-y: auto`
 *      with `overflow-x: hidden`. A pane that hides its horizontal overflow clips a
 *      wide block with no scrollbar and no way to reach it.
 *   3. A wide block scrolls itself. Every table, code block, and diagram sits inside
 *      its own `overflow-x: auto` container, so the pane keeps its own scroll and the
 *      wide block keeps its integrity. See `markdown.tsx`, `DiagramTiles.tsx`, and the
 *      diagram source block.
 *   4. Every flex and grid child carries `min-w-0`. A flex child defaults to its
 *      content width, so one wide row would stretch the pane and push its siblings off
 *      the edge.
 *
 * THE RAIL IS A SHADCN SIDEBAR. `SidebarProvider` is the shell's own frame, and the
 * rail renders inside a `Sidebar`, so the shell gains the sidebar's drawer below
 * 768 px, its icon collapse, and its toggle shortcut. The body row inside the frame
 * is the sidebar's positioned ancestor, so the top bar keeps the full width section
 * 2.1 gives it and the rail starts below the bar rather than beside it.
 *
 * The shell renders. It never computes. Every count, state, and join comes from
 * `data/index.json`, and every record body comes from `data/designs.js` and
 * `data/adrs.js`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { Database, GitBranch, RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import ScrollProgress from "@/components/smoothui/scroll-progress";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  BUNDLE_DATA_URL,
  designRowsOf,
  entitiesOf,
  unresolvedSliceCount,
} from "@/data/bundle";
import type { DesignRow } from "@/data/types";
import { resolvedJoinsOf } from "@/data/joins";
import { cn } from "@/lib/utils";

import { AccountRule } from "./AccountMark";
import type { JumpTargetLink } from "./AccountMark";
import { Chip, SectionHeading } from "./atoms";
import { Board } from "./Board";
import { diffFiles, useChangeBundle, useServedAudio } from "./change/levels";
import type { ArtMode } from "./change/Frame";
import { changeSections } from "./change/sections";
import type { AdrRecord } from "./records";
import { JumpBar, useJumpTargets } from "./jump";
import type { JumpTarget } from "./jump";
import {
  LevelProgress,
  PROGRESS_PX,
  SectionPager,
  SectionStage,
  SectionStrip,
  keyPressIsTaken,
  useSectionPaging,
} from "./Pager";
import { Rail } from "./Rail";
import { RecordSheet } from "./Sheet";
import type { SheetSubject } from "./Sheet";
import { TopBar } from "./TopBar";
import {
  AbortIfSection,
  AssessmentSection,
  BoundariesSection,
  DecisionsSection,
  DiagramsSection,
  DistrictsAndAlternativesSection,
  DoneWhenSection,
  EpicGroupSection,
  OutOfScopeSection,
  ProblemSolutionSection,
  PullRequestsSection,
  RisksSection,
  RubricsSection,
  ShippedSection,
  UnknownsSection,
  UnresolvedSlicesSection,
  WhySection,
} from "./panels";
import type { Theme } from "./DiagramTiles";
import {
  boardHref,
  buildWorkItems,
  changeRowIndex,
  counterpartHref,
  epicGroups,
  gatesOf,
  levelsOf,
  railGroups,
  rowsOf,
  routeHref,
  SECTION_LABEL,
  switcherList,
  worklessPullRequest,
} from "./model";
import type { Gates, LevelState, RailSource, SectionKey, WorkItem } from "./model";
import { STAGE_PUBLICATIONS_DEPLOY_LEAD } from "./model";
import {
  sectionHref,
  useCollapsedRail,
  useDocumentNoScroll,
  useVisibleWidthCap,
  useFocusOnMount,
  useHashRoute,
  useIndexLoad,
  useScrollResetOnRoute,
  useSectionAvailability,
  useTheme,
} from "./hooks";

const PANE_ID = "work-scroll-pane";
const HEADING_ID = "work-section-heading";

/**
 * The levels that page, in the order the rail lists them.
 *
 * A paged level lays its sections on a horizontal track, one section on screen, and it
 * drops its visible heading band for the same reason in every case: the section strip
 * names the level's own sections, so a band above it would repeat the same words. The
 * other sections stack their panels into the pane's own scroll.
 *
 * The count is never written down. `PagedLevel` takes the sections it renders as one
 * array and reads the length of it, so the strip, the pager text, and the boxes cannot
 * drift apart.
 */
const PAGED_LEVELS = ["intent", "problem-and-solution", "architecture", "build"] as const;

type PagedLevelKey = (typeof PAGED_LEVELS)[number];

/** True when this section has a track. Build's Rubrics sub-view is the one exception. */
function isPaged(section: SectionKey): section is PagedLevelKey {
  return (PAGED_LEVELS as readonly SectionKey[]).includes(section);
}

/**
 * The sections a paged level lays on its track, in the order Next walks them.
 *
 * The Build level is the one level whose sections come from the corpus rather than from
 * a fixed list: its epics are chunked, and the chunking rule lives in `./model` beside
 * the other derivations. A route that names an epic is answered by the chunk that holds
 * it, which is also where the reader lands.
 */
function pagedSections({
  section,
  work,
  levelState,
  adrs,
  theme,
  openSheet,
  unresolvedSlices,
  focusEpic,
}: {
  section: PagedLevelKey;
  work: WorkItem;
  levelState: LevelState | null;
  adrs: Record<string, AdrRecord>;
  theme: Theme;
  openSheet: (subject: SheetSubject) => void;
  unresolvedSlices: number;
  focusEpic: string | null;
}): ReactNode[] {
  if (section === "intent") {
    return [
      /*
        THE CONTAINER DRAWING SITS INSIDE THE WHY PANEL, at the end of its body. This
        level used to lead with a Diagrams section of its own, and the engineer moved the
        drawing into Why. The level therefore renders no section named Diagrams, and the
        Why panel draws the tiles itself.

        THE LEVEL IS CHOSEN BY ITS NUMBER. A bundle's first diagram level is its container
        drawing: it names the surfaces and the people who use them, and that answers what
        this work is and who it is for. The levels after it are mechanism and belong to
        Architecture. The filter names level "1" rather than taking the first entry, so a
        record that carries levels 2 and 3 alone draws nothing here.
      */
      <WhySection
        key="why"
        work={work}
        theme={theme}
        levels={work.diagramLevels.filter((level) => level === "1")}
      />,
      <DoneWhenSection key="done-when" work={work} />,
      <AbortIfSection key="abort-if" work={work} />,
      <OutOfScopeSection key="out-of-scope" work={work} />,
    ];
  }

  if (section === "problem-and-solution") {
    return [
      <ProblemSolutionSection key="problem" work={work} levelState={levelState!} />,
      <RisksSection key="risks" work={work} />,
      <AssessmentSection key="assessment" work={work} />,
      <UnknownsSection key="unknowns" work={work} />,
    ];
  }

  if (section === "architecture") {
    return [
      /*
        The mechanism drawings. The container drawing is the Intent level's, so this level
        takes every level after the first: the build sequence and the data model.
      */
      <DiagramsSection
        key="diagrams"
        work={work}
        theme={theme}
        levels={work.diagramLevels.slice(1)}
      />,
      <DecisionsSection
        key="decisions"
        work={work}
        adrs={adrs}
        levelState={levelState!}
        openSheet={openSheet}
      />,
      <BoundariesSection key="boundaries" work={work} openSheet={openSheet} />,
      <DistrictsAndAlternativesSection key="districts" work={work} />,
    ];
  }

  const groups = epicGroups(work);
  return [
    ...groups.map((group, position) => (
      <EpicGroupSection
        key={`epics-${position}`}
        work={work}
        group={group}
        focusEpic={focusEpic}
        openSheet={openSheet}
      />
    )),
    /* The unresolved-slices panel keeps a section of its own when the bundle holds one. */
    ...(unresolvedSlices > 0
      ? [<UnresolvedSlicesSection key="unresolved" count={unresolvedSlices} />]
      : []),
  ];
}

/** The chunk a route's epic falls in, so a deep link lands on the epic itself. */
function epicStartIndex(work: WorkItem, focusEpic: string | null): number {
  if (focusEpic === null) return 0;
  const found = epicGroups(work).findIndex((group) =>
    group.some((epic) => epic.epic_id === focusEpic),
  );
  return Math.max(0, found);
}

/**
 * The rail's two widths, in the tokens section 9.1 and 9.2 give them.
 *
 * The sidebar ships 16 rem and 3 rem. The spec fixes 248 px expanded and 56 px
 * collapsed, so the shell sets the two variables rather than editing the added
 * component.
 */
const RAIL_WIDTHS = {
  "--sidebar-width": "15.5rem",
  "--sidebar-width-icon": "3.5rem",
} as CSSProperties;

/* ------------------------------------------------------------------- tokens */

/**
 * The timing and layering tokens of sections 4.2 and 11.1.
 *
 * They are declared here rather than in `index.css`, because the shipped viewer's
 * stylesheet is not this application's to change. Under `prefers-reduced-motion:
 * reduce` every duration resolves to zero except the arrival highlight, which marks a
 * location rather than moving anything.
 */
function shellTokens(reduce: boolean): CSSProperties {
  return {
    "--dur-instant": "0ms",
    "--dur-fast": reduce ? "0ms" : "150ms",
    "--dur-base": reduce ? "0ms" : "200ms",
    "--dur-slow": reduce ? "0ms" : "250ms",
    "--dur-expand": reduce ? "0ms" : "220ms",
    "--dur-highlight": "1200ms",
    "--ease-out": "cubic-bezier(0.22, 0.75, 0.3, 1)",
    "--ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
    // The layering scale lives in src/index.css, on the root. Portalled
    // content such as the Sheet and the tooltip reads it from outside the
    // shell, where a token scoped to this element would be undefined.
  } as CSSProperties;
}

/* -------------------------------------------------------------------- shell */

export default function ShellApp() {
  const reduce = useReducedMotion() ?? false;
  const { load, reload } = useIndexLoad();
  const { route, redirectedFrom, setRedirectedFrom, go } = useHashRoute();
  const { theme, toggleTheme } = useTheme();

  /*
   * The rail's own open state, with the viewport as its default. Section 9.2 puts
   * the rail in icon mode between 768 px and 1200 px, so crossing that boundary
   * re-applies the default and the reader may still toggle while inside it.
   */
  const narrowRail = useCollapsedRail();
  const [railOpen, setRailOpen] = useState(!narrowRail);
  useEffect(() => {
    setRailOpen(!narrowRail);
  }, [narrowRail]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    build: true,
    review: true,
  });
  const [sheet, setSheet] = useState<SheetSubject | null>(null);

  /*
   * The scroll pane, as an element. The reading-progress strip measures this ref and
   * never the window, because the document cannot scroll at all. A window-scoped
   * progress bar on this page would sit at zero forever.
   */
  const paneRef = useRef<HTMLElement | null>(null);

  useDocumentNoScroll();

  /*
   * The section links, read from the panels the pane rendered. The keys cover the
   * two moments the pane itself appears and disappears, which is what the observer
   * has to re-attach on.
   */
  const jumpTargets = useJumpTargets(PANE_ID, [load.state, route.workId, route.section]);

  const works = useMemo(() => {
    if (load.state !== "ready") return new Map<string, WorkItem>();
    return buildWorkItems(load.index, load.designs);
  }, [load]);

  const workList = useMemo(() => {
    if (load.state !== "ready") return { designs: [], epics: [] };
    return switcherList(works);
  }, [load, works]);

  /*
   * The board's own rows, resolved by the data layer. The board takes one row per design
   * and the record map beside it, so it reads no work item and derives no join of its
   * own. `designRowsOf` is the one derivation of that row, and the index is its only input.
   */
  const boardRows = useMemo((): DesignRow[] => {
    if (load.state !== "ready") return [];
    return designRowsOf(load.index);
  }, [load]);

  const work = route.workId ? (works.get(route.workId) ?? null) : null;
  const gates: Gates | null = work ? gatesOf(work) : null;
  const levels = work ? levelsOf(work) : null;

  /*
   * The index's own pull request entities. They are the second row source the board reads,
   * and the set a workless route resolves against. The value is the index's answer or an
   * empty list, so a route read before the index lands resolves to nothing and keeps its
   * error until the index answers.
   */
  const allPullRequests = load.state === "ready" ? entitiesOf(load.index).pull_request : [];

  /*
   * THE WORKLESS CHANGE. A route whose work segment names no design is not always an
   * address that resolved to nothing. A pull request no design carries has no work item of
   * its own, so no id names one, and `model.pullRequestHref` states that pull request's own
   * number in the work segment. `model.worklessPullRequest` reads the same rule backwards,
   * and this is where the shell applies it. So one segment names either a design or a pull
   * request, and the shell renders whichever the index holds rather than the error.
   *
   * The lookup runs only where a design did not claim the segment, so a design row and its
   * own pull request can never be two answers to one address.
   */
  const worklessPr =
    work === null && route.workId !== null
      ? worklessPullRequest(allPullRequests, route.workId)
      : null;

  /*
   * The bare route is the board. A route that names an id the bundle lacks is not the
   * board: it is an address that resolved to nothing, and it keeps its own error.
   */
  const board = route.workId === null;

  /* Which sections this work fills. A section that fails its rule is absent. */
  const filled = useMemo(() => {
    const set = new Set<SectionKey>();
    if (levels) {
      for (const key of ["intent", "problem-and-solution", "architecture"] as const) {
        if (levels[key].available) set.add(key);
      }
    }
    if (gates?.build) set.add("build");
    /*
     * A WORKLESS PULL REQUEST FILLS THE CHANGE'S ACCOUNT AND NOTHING ELSE. Its four rows
     * live in `pull-requests`, so that section is what its address resolves to, and a route
     * that asks for another section redirects there and states the redirect.
     */
    if (gates?.pullRequests || worklessPr !== null) set.add("pull-requests");
    if (gates?.shipped) set.add("shipped");
    return set;
  }, [gates, levels, worklessPr]);

  /*
   * THE THIRD ARGUMENT IS "THE ADDRESS RESOLVED TO NOTHING AT ALL". It used to mean "names
   * no design", and a workless pull request named no design while its address resolved to a
   * real surface. So the flag now covers both sources, and only an id neither source holds
   * keeps the route's own section and its own error.
   */
  const { section } = useSectionAvailability(
    route.section,
    filled,
    work === null && worklessPr === null,
  );

  const chooseWork = useCallback(
    (id: string) => {
      go(sectionHref(id, section));
    },
    [go, section],
  );

  const chooseEpic = useCallback(
    (design: string, epicId: string) => {
      go(`${routeHref(design, "build", "epics")}/${epicId}`);
    },
    [go],
  );

  const openPr = useCallback(
    (n: number) => {
      go(routeHref(route.workId ?? "", "pull-requests", `${n}`));
    },
    [go, route.workId],
  );

  const openSheet = useCallback((subject: SheetSubject) => setSheet(subject), []);
  const closeSheet = useCallback((open: boolean) => {
    if (!open) setSheet(null);
  }, []);

  /* A redirect is stated, never silent. */
  useRedirectNotice({
    workMissing: work === null && worklessPr === null,
    wanted: route.section,
    available: filled,
    section,
    workId: work?.id ?? route.workId ?? "",
    go,
    setRedirectedFrom,
  });

  /*
   * SECTION 8.4'S FOCUS MOVE IS NOT SCHEDULED HERE. It used to be one frame after the
   * route changed, and that frame resolved the heading of the level being left. The move
   * belongs to the level's own mount now, and `LevelHeading` below states the whole
   * reason. This call is the pane's scroll and nothing else.
   *
   * A route change starts the reader at the top of the pane. The four fields are the
   * whole route. They are the work item, the section, the sub-view, and the record
   * the sub-view opens, so one list covers a section change, a work-item change, an
   * epic that opens, and a pull request that opens.
   */
  useScrollResetOnRoute(PANE_ID, [route.workId, route.section, route.sub, route.subId]);

  /*
   * THE CHANGE'S ACCOUNT. A route that names a pull request number opens the change the
   * work's own epics carry, and the four rows read that pull request's own records. The
   * number comes from the route's `sub` field, which is the field the pull-request list
   * already writes, so no second address scheme exists.
   *
   * A WORKLESS ROUTE'S CHANGE IS THE PULL REQUEST ITS WORK SEGMENT NAMES, AND `sub` CANNOT
   * OVERRIDE IT. No design carries the segment, and `model.worklessPullRequest` answered
   * which pull request does. That pull request's change account is the address's whole
   * destination, so a `sub` that named another number would name a change this address does
   * not belong to. The segment therefore wins, and `#/17/pull-requests` and
   * `#/17/pull-requests/17` answer the same change. One derivation, so the heading and the
   * rows read the same number and cannot disagree.
   *
   * The four hooks sit above the loading and error returns, because a hook that runs on
   * one render and not the next is the defect the rules of hooks exist to prevent. A
   * route that names no pull request reads nothing: `useChangeBundle(null)` answers the
   * idle state and asks the bundle for no file.
   */
  const namedPr =
    route.sub !== null && route.sub !== "flightdeck" ? Number(route.sub) : null;
  const changePr =
    section !== "pull-requests"
      ? null
      : worklessPr !== null
        ? worklessPr.id
        : namedPr !== null && Number.isFinite(namedPr)
          ? namedPr
          : null;
  const change = useChangeBundle(changePr);
  const servedAudio = useServedAudio(change.levels);
  const [artMode, setArtMode] = useState<ArtMode>("image");
  const [failedArt, setFailedArt] = useState<string | null>(null);
  const [diffFile, setDiffFile] = useState<string | null>(null);

  /* A reader who opens another change meets that change's own frame, diff file, and picture. */
  useEffect(() => {
    setArtMode("image");
    setFailedArt(null);
    setDiffFile(null);
  }, [changePr]);

  /*
   * THE INDEX'S JOINS, RESOLVED ONCE AND HELD. The change's own rows read the decisions it
   * landed from the index's `adr_to_pull_request` and never from a second list, so the
   * account and the index cannot disagree about that set. The hook sits above the loading
   * and error returns, because a hook that runs on one render and not the next is the
   * defect the rules of hooks exist to prevent.
   */
  const resolvedJoins = useMemo(
    () => (load.state === "ready" ? resolvedJoinsOf(load.index) : null),
    [load],
  );

  /*
   * The rail's own input. One object serves the rail, the arrow-key walk, and the Review
   * group's addresses, so all three read one derivation.
   *
   * THE CHANGE THE RAIL ADDRESSES IS THE ROUTE'S CHANGE, AND FAILING THAT THE WORK'S OWN.
   * A reader on a program row still sees where the change's four rows lead, and a reader
   * inside the change's account sees rows that open the address they are on. Without the
   * fallback the current-row match would fail on every program row, because the route
   * names no pull request there.
   */
  const railChangePr =
    changePr ?? (work && work.pullRequests.length > 0 ? work.pullRequests[0].id : null);
  const railSource: RailSource = {
    work,
    gates,
    levels,
    board,
    workCount: load.state === "ready" ? works.size : null,
    changePr: railChangePr,
    changeLevels: change.levels,
    diffFiles: change.diff === null ? null : diffFiles(change.diff).length,
    servedAudio,
  };

  /* The rail's rows, walked with the up and down arrows. */
  useRailArrowKeys({ source: railSource, go });

  /*
   * THE READER'S OWN ROW, MATCHED BY ITS ADDRESS AND NEVER BY ITS SECTION NAME. Every
   * section of both accounts carries its account's mark, and the mark is the mark of the
   * row the reader's own address opens. The two groups repeat three section names, so a
   * match on the name would light more than one row at once and the mark would name the
   * wrong account. The address is what a deep link carries, so a reader who arrives on the
   * change's Architecture row reads Architecture's mark and not the account's first row's.
   *
   * A SECTION NO ACCOUNT OWNS HAS NO ROW. The pull-request list and the shipped record are
   * sections of the shell rather than of either account, so no row opens them and no mark
   * stands above them. The board and a work item the bundle lacks render no pane content
   * either way.
   */
  const here = window.location.hash || boardHref();
  const row =
    rowsOf(railGroups(railSource)).find((candidate) => candidate.href === here) ?? null;

  /*
   * THE JUMP CROSSES ONLY WHERE BOTH ACCOUNTS CARRY THE SAME SECTION NAME. The row's own
   * `shared` field holds that name or null, and it is the field the jump reads: a jump
   * decided from a row's label would be offered on the change's File Diffs row, and on the
   * program's Epics and Rubrics rows, which share no section name with the other account.
   *
   * THE ADDRESS COMES FROM `counterpartHref`, the one builder that calls both of the
   * account builders, so the jump and the rail cannot hold two address schemes. A work
   * whose own epics carry no pull request has no change's account to cross to, so a
   * program row's shared sections have no jump there and say so in place.
   */
  const jump: JumpTargetLink | null =
    row === null || row.shared === null || railChangePr === null
      ? null
      : {
          href: counterpartHref(work?.id ?? "", railChangePr, row.account, row.shared),
          account: row.account === "program" ? "change" : "program",
          section: SECTION_LABEL[row.shared],
        };

  /* ---------------------------------------------------------------- states */

  if (load.state === "failed") {
    return (
      <TooltipProvider delayDuration={150}>
        <Frame reduce={reduce}>
          <TopBar
            workId={route.workId}
            workName={route.workId}
            stage={null}
            supersededBy={null}
            ready={false}
            /*
              The badge stays here. This state is the index failing to resolve, which is
              exactly what the badge's own gloss says, so it is true and it belongs.
            */
            board={false}
            designs={[]}
            epics={[]}
            onChooseWork={chooseWork}
            onChooseEpic={chooseEpic}
            theme={theme}
            onToggleTheme={toggleTheme}
            paneId={PANE_ID}
            nameId="work-item-name"
          />
          <Pane>
            <div className="max-w-[80ch] rounded-xl border border-dashed border-warn bg-warn-wash px-4 py-3.5">
              <p className="m-0 font-mono text-[12.5px] font-bold tracking-[0.06em] text-warn uppercase">
                The record index did not load
              </p>
              <p className="mt-2 mb-0 font-serif text-[16px] leading-[1.55] text-ink-mid">
                {load.message}
              </p>
              <p className="mt-2 mb-0 font-mono text-[12.5px] break-all text-ink-dim">
                path read: {BUNDLE_DATA_URL}index.json
              </p>
              <button
                type="button"
                onClick={reload}
                className={cn(
                  "mt-3.5 inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3.5 font-mono text-[12.5px] font-bold text-ink-mid",
                  "transition-colors duration-150 ease-house hover:bg-surface-2",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                )}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Retry
              </button>
            </div>
          </Pane>
        </Frame>
      </TooltipProvider>
    );
  }

  if (load.state === "ready" && works.size === 0) {
    return (
      <TooltipProvider delayDuration={150}>
        <Frame reduce={reduce}>
          <Pane>
            <div className="max-w-[80ch] rounded-xl border border-dashed border-line bg-surface-2 px-4 py-3.5">
              <p className="m-0 flex items-center gap-2 font-mono text-[12.5px] font-bold tracking-[0.06em] text-ink-dim uppercase">
                <Database className="size-4" aria-hidden="true" />
                The bundle holds no work
              </p>
              <p className="mt-2 mb-0 font-serif text-[16px] leading-[1.55] text-ink-mid">
                The index resolved from{" "}
                <code className="font-mono text-[13px]">{BUNDLE_DATA_URL}index.json</code> and
                lists no design. Write a bundle with{" "}
                <code className="font-mono text-[13px]">/pr:baseline</code>, then reload this
                page.
              </p>
            </div>
          </Pane>
        </Frame>
      </TooltipProvider>
    );
  }

  /* --------------------------------------------------------------- populated */

  /*
   * How many slices the index could not join. The data module counts them, because the
   * join is the index's own shape and the shell names no key of it.
   */
  const unresolvedSlices = load.state === "ready" ? unresolvedSliceCount(load.index) : 0;
  const adrs = load.state === "ready" ? load.adrs : {};
  /* The board states that it is reading, so an empty map is the honest value here. */
  const records = load.state === "ready" ? load.designs : {};

  /*
   * The level state behind a paged section. Build has none, because the rail's own gate
   * decides it. Every other section stacks its panels in the pane's own scroll, so this
   * reads null there and the layout below stays the shell's.
   *
   * RUBRICS IS NOT PAGED. The rail's Rubrics entry is a sub-view of Build, and it keeps
   * the layout it has always had: one panel, its own scroll. Only the epics sub-view
   * lays an epic per section on a track.
   */
  const programPaged = isPaged(section) && !(section === "build" && route.sub === "rubrics");
  /*
   * THE CHANGE'S ACCOUNT IS A PAGED SURFACE TOO. Its four rows page through the same
   * strip, stage, and pager the program's levels use, so the two accounts cannot disagree
   * about how a row reads. `paged` is the layout flag; `programPaged` is the one that
   * narrows the section to a level of the program's own records.
   */
  const changeAccount = changePr !== null;
  const paged = programPaged || changeAccount;
  const pagedLevel = programPaged && section !== "build" ? (levels?.[section] ?? null) : null;
  const focusEpic = section === "build" && route.sub === "epics" ? route.subId : null;

  /* The whole route as one string: the four fields `useScrollResetOnRoute` reads. */
  const routeKey = `${route.workId ?? ""}/${route.section}/${route.sub ?? ""}/${route.subId ?? ""}`;

  /*
   * Why the change's four rows read what they read. A record file that did not load and a
   * story entry the bundle does not hold are two different facts, and the second one is
   * already a whole sentence.
   */
  const changeNotice: string | null = !changeAccount
    ? null
    : change.state === "failed"
      ? `The change's records did not load, so these four rows state what they could not read: ${
          change.message ?? "no reason was given"
        }`
      : change.message;

  return (
    <TooltipProvider delayDuration={150}>
      <Frame reduce={reduce} open={railOpen} onOpenChange={setRailOpen}>
        <TopBar
          workId={work?.id ?? route.workId}
          /*
            A WORKLESS CHANGE IS NAMED BY ITS PULL REQUEST. The top bar states the work
            item's own name, and a workless route has no work item, so the id alone would
            name it. The pull request's title says more, and it is the same word the board's
            row states for the same pull request.
          */
          workName={
            work?.design.name ??
            (worklessPr === null ? route.workId : `Pull request ${worklessPr.id}`)
          }
          stage={work?.design.stage ?? null}
          supersededBy={work?.record?.goal?.superseded_by ?? null}
          ready={load.state === "ready"}
          /*
            A WORKLESS CHANGE NAMES NO WORK ITEM EITHER. The top bar drops the stage badge
            and reads the switcher as "no work item selected" for both routes, because a
            stage and a selected work item both belong to a work item and this route has
            none. The pull request's own state is not a stage, so it takes no badge here.
          */
          board={board || worklessPr !== null}
          designs={workList.designs}
          epics={workList.epics}
          onChooseWork={chooseWork}
          onChooseEpic={chooseEpic}
          theme={theme}
          onToggleTheme={toggleTheme}
          paneId={PANE_ID}
          nameId="work-item-name"
        />

        {/*
          The body row. It is the sidebar's positioned ancestor, so the rail starts
          under the top bar and the pane sits beside it.
        */}
        <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <Rail
            {...railSource}
            open={openGroups}
            onToggleGroup={(key) =>
              setOpenGroups((current) => ({ ...current, [key]: !(current[key] ?? true) }))
            }
          />

          {/* The only scrolling region. Both axes belong to this pane. */}
          <SidebarInset
            id={PANE_ID}
            ref={paneRef}
            tabIndex={-1}
            aria-label={
              board
                ? "Work board"
                : `${
                    work?.design.name ??
                    (worklessPr === null ? "No work item" : `Pull request ${worklessPr.id}`)
                  }, ${section}`
            }
            className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain bg-ground outline-none"
          >
            {board ? (
              /*
                THE BOARD TAKES THE DATA LAYER'S OWN ROWS, AND THE INDEX'S OWN PULL
                REQUESTS BESIDE THEM. `Board.tsx` fixed its props in E19: the resolved
                `DesignRow[]`, the record map, the readiness flag, and the heading id.
                Slice 18 adds the second row source, so the board also takes the index's
                `pull_request` entities and derives the pull requests no design carries
                from those two inputs alone. It reads no work item, so the shell hands it
                the index's answer and nothing else.

                THE SLOT IS WHAT LETS THE PANE OWN THE BOARD'S SCROLL. Section 11.3 gives
                the pane that scroll, and `Board.tsx` says the same in its own comment.
                The board's root reads `h-full`, so against the pane's definite height it
                would resolve to that height, the board would fit the pane exactly, and
                the pane would never scroll. This box carries no height of its own, so
                the root's `h-full` resolves to the board's own content instead, and
                `shrink-0` keeps the box at that height inside the pane's column. The
                board then stands taller than the pane and the pane takes the overflow.
                The height at work here is the board's own, never a number this file
                picks.
              */
              <div className="min-w-0 shrink-0">
                <Board
                  rows={boardRows}
                  pullRequests={allPullRequests}
                  records={records}
                  ready={load.state === "ready"}
                  headingId={HEADING_ID}
                />
              </div>
            ) : work === null ? (
              /*
                THE WORKLESS CHANGE IS NOT THE UNKNOWN-ID ERROR. An id no design carries
                may still name a pull request, and then the address resolves to that pull
                request's own change account. `model.worklessPullRequest` answered above, so
                this branch states the account rather than the error, and only an id neither
                source holds reaches the error below.

                THE ACCOUNT IS THE CHANGE'S OWN, AND NOTHING ELSE. A pull request with no
                design has no branch, no epic figure, and no supersedes list, so the top line
                panel is absent rather than empty. The rail's two groups read a work item and
                are therefore absent too, and the account's own four rows are the section
                strip and the two pager arrows below. So a reader still reaches all four.

                THE PULL REQUEST'S OWN NUMBER NAMES THE CHANGE HERE, AND `changePr` IS THAT
                SAME NUMBER. The derivation above fixes it to the work segment's own pull
                request for a workless route, so the heading and the rows below read one
                number and cannot disagree. This branch therefore reads `worklessPr.id` and
                needs no guard on `changePr`.
              */
              worklessPr === null ? (
                <div className="min-w-0 px-6 py-6">
                  <div className="max-w-[80ch] rounded-xl border border-dashed border-warn bg-warn-wash px-4 py-3.5">
                    <p className="m-0 font-mono text-[12.5px] font-bold tracking-[0.06em] text-warn uppercase">
                      The route names an id the bundle lacks
                    </p>
                    <p className="mt-2 mb-0 font-serif text-[16px] leading-[1.55] text-ink-mid">
                      The route asks for work item{" "}
                      <code className="font-mono text-[13px]">{route.workId ?? "(none)"}</code>.
                      The index resolved {works.size} designs and {allPullRequests.length} pull
                      requests, and neither source carries that id. Pick one in the work-item
                      switcher above.
                    </p>
                  </div>
                </div>
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${worklessPr.id}/${section}/${route.subId ?? ""}`}
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 0.75, 0.3, 1] }}
                    className={cn(
                      "min-w-0",
                      paged ? "flex h-full min-h-0 flex-col pt-6 pb-2" : "px-6 py-6 pb-12",
                    )}
                  >
                    {redirectedFrom !== null ? (
                      <p className="mb-4 min-w-0 rounded-lg border border-dashed border-line bg-surface-2 px-3.5 py-2 font-mono text-[12.5px] text-ink-dim">
                        The route named {redirectedFrom}, and this pull request carries no such
                        section. The shell redirected to {section}.
                      </p>
                    ) : null}

                    {changeNotice !== null ? (
                      <p className="mb-4 min-w-0 rounded-lg border border-dashed border-warn bg-warn-wash px-3.5 py-2 font-mono text-[12.5px] text-ink-dim">
                        {changeNotice}
                      </p>
                    ) : null}

                    {/*
                      THE HEADING NAMES THE PULL REQUEST, NOT THE WORK ITEM. There is no work
                      item, so the design's own name has nothing to say here. A paged level
                      keeps its heading `sr-only` and moves focus onto it, so a screen reader
                      hears the pull request it landed on. The number is `worklessPr.id`,
                      which `changePr` equals for this route.
                    */}
                    <LevelHeading
                      section={section}
                      work={null}
                      gates={null}
                      paged={paged}
                      title={`Pull request ${worklessPr.id}`}
                    />

                    <PagedLevel
                      targets={jumpTargets}
                      routeKey={routeKey}
                      start={changeRowIndex(route.subId)}
                      sections={changeSections({
                        entry: change.entry,
                        levels: change.levels,
                        servedAudio,
                        diff: change.diff,
                        diffMessage: change.diffMessage,
                        theme,
                        artMode,
                        onArtMode: setArtMode,
                        failedArt,
                        onArtFailed: setFailedArt,
                        diffFile,
                        onDiffFile: setDiffFile,
                        joins: resolvedJoins,
                        adrs,
                        openSheet,
                      })}
                    />
                  </motion.div>
                </AnimatePresence>
              )
            ) : (
              <>
                {/*
                  The reading-progress strip, then the section-link bar, as one
                  sticky band at the pane's top edge. Neither is a fourth fixed
                  region: they are the pane's first children and they are `sticky`,
                  so the pane keeps the only scroll, per section 11.3.

                  THE STRIP MEASURES THE PANE, NOT THE WINDOW. `useDocumentNoScroll`
                  guarantees the document cannot scroll, so a window-scoped progress
                  bar would read zero at every position. The component takes the
                  container as a ref, and this ref is the pane.

                  The band carries the ground fill, so content passing under the
                  strip does not show through it, and the bar adds `PROGRESS_PX` to
                  the jump offset so a jumped-to heading lands below both.

                  THE PAGING LEVEL DROPS THE BAND. Its pane never scrolls, so nothing
                  could stick, and its headings are the section strip on the track
                  rather than links into a page. `PagedLevel` draws its own strip,
                  which measures the box on screen.
                */}
                {paged ? null : (
                  <div
                    className="sticky top-0 min-w-0 bg-ground"
                    style={{ zIndex: "var(--layer-raised)" }}
                  >
                    <ScrollProgress
                      container={paneRef}
                      variant="bar"
                      position="inline"
                      thickness={PROGRESS_PX}
                      color="var(--band)"
                    />
                    <JumpBar paneId={PANE_ID} targets={jumpTargets} topOffset={PROGRESS_PX} />
                  </div>
                )}

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${work.id}/${section}/${route.subId ?? ""}`}
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 0.75, 0.3, 1] }}
                    className={cn(
                      "min-w-0",
                      /*
                       * A paging level fills the pane and hands the height it has left
                       * to the stage. `h-full` is the pane's own height, so the stage,
                       * a `flex-1` child, takes exactly what the chrome above it did
                       * not spend. A level that stacks keeps the pane's own scroll.
                       */
                      paged
                        ? "flex h-full min-h-0 flex-col pt-6 pb-2"
                        : "px-6 py-6 pb-12",
                    )}
                  >
                    <TopLinePanel work={work} />

                    {redirectedFrom !== null ? (
                      <p className="mb-4 min-w-0 rounded-lg border border-dashed border-line bg-surface-2 px-3.5 py-2 font-mono text-[12.5px] text-ink-dim">
                        The route named {redirectedFrom}, and this work cannot fill it. The shell
                        redirected to {section}.
                      </p>
                    ) : null}

                    {/*
                      A RECORD THE BUNDLE COULD NOT GIVE THE CHANGE IS STATED ABOVE THE ROWS.
                      A story entry the bundle does not hold, and a record file that did not
                      load, are both read failures. The rows below state what each one could
                      not read; this line states why, once, so a reader is not left to guess
                      whether the change is thin or the page is broken.
                    */}
                    {changeAccount && changeNotice !== null ? (
                      <p className="mb-4 min-w-0 rounded-lg border border-dashed border-warn bg-warn-wash px-3.5 py-2 font-mono text-[12.5px] text-ink-dim">
                        {changeNotice}
                      </p>
                    ) : null}

                    {/*
                      THE PAGED LEVEL HAS NO VISIBLE BAND. The section strip right below
                      says the section's own name, so a banner with the same words 105 px
                      higher is a repeat of the strip. The heading stays in the flow as
                      `sr-only`: section 8.4 moves focus to it when the level changes, and
                      the document still needs its one `h1`. A screen reader therefore
                      still hears the level name, and no reader loses the text.
                    */}
                    {/*
                      THE ACCOUNT'S MARK STANDS ABOVE THE SECTION, AND ONE RENDER PATH
                      SERVES BOTH ACCOUNTS. The rule reads the row the reader arrived on, so
                      it names that section's own account and that section's own name, and a
                      deep link carries its own section's mark rather than the account's
                      first row's. The jump is drawn only where the two accounts carry the
                      same section name, and the rule states the absence in place where they
                      do not.
                    */}
                    {row === null ? null : (
                      <AccountRule
                        account={row.account}
                        whose={row.account === "change" ? `Pull request ${railChangePr}` : work.id}
                        section={row.label}
                        jump={jump}
                        onGo={go}
                      />
                    )}

                    <LevelHeading
                      section={section}
                      work={work}
                      gates={gates}
                      paged={paged}
                      title={changeAccount ? `Pull request ${changePr}` : undefined}
                    />

                    {/*
                      THE PAGED LEVELS LAY THEIR SECTIONS ON A TRACK. Intent, Problem and
                      solution, Architecture, and Build's epics each hand the pane's
                      remaining height to the track instead of spending it on a column.
                      The order of the array is the order Next walks, and its length is
                      the count the strip and the pager bar read, so nothing here can
                      drift. `start` answers a route that names one section's record,
                      which today means an epic deep link.

                      THE CHANGE'S FOUR ROWS USE THE SAME TRACK. One element per panel, so
                      the strip's links and the boxes' count come from one list.
                    */}
                    {paged ? (
                      programPaged ? (
                        <PagedLevel
                          targets={jumpTargets}
                          routeKey={routeKey}
                          start={epicStartIndex(work, focusEpic)}
                          sections={pagedSections({
                            section,
                            work,
                            levelState: pagedLevel,
                            adrs,
                            theme,
                            openSheet,
                            unresolvedSlices,
                            focusEpic,
                          })}
                        />
                      ) : (
                        <PagedLevel
                          targets={jumpTargets}
                          routeKey={routeKey}
                          /*
                            THE APPENDED SEGMENT DECIDES WHICH ROW OPENS. The address
                            `#/<work>/pull-requests/<pr>/architecture` names the change's
                            Architecture row, so a deep link lands on that row rather than
                            on the first one. A segment that names no row of the change
                            lands on the first, which is the row the bare address opens.
                          */
                          start={changeRowIndex(route.subId)}
                          sections={changeSections({
                            entry: change.entry,
                            levels: change.levels,
                            servedAudio,
                            diff: change.diff,
                            diffMessage: change.diffMessage,
                            theme,
                            artMode,
                            onArtMode: setArtMode,
                            failedArt,
                            onArtFailed: setFailedArt,
                            diffFile,
                            onDiffFile: setDiffFile,
                            joins: resolvedJoins,
                            adrs,
                            openSheet,
                          })}
                        />
                      )
                    ) : null}
                    {section === "build" && route.sub === "rubrics" ? (
                      <RubricsSection work={work} gated={gates?.rubrics ?? false} />
                    ) : null}
                    {section === "pull-requests" && !changeAccount ? (
                      <PullRequestsSection
                        work={work}
                        focusPr={changePr}
                        allPullRequests={allPullRequests}
                        onOpenPr={openPr}
                      />
                    ) : null}
                    {section === "shipped" ? <ShippedSection work={work} /> : null}
                  </motion.div>
                </AnimatePresence>
              </>
            )}
          </SidebarInset>
        </div>

        <RecordSheet subject={sheet} onOpenChange={closeSheet} />
      </Frame>
    </TooltipProvider>
  );
}

/**
 * The work item's own facts, on the top line of the content.
 *
 * The Intent level used to open with an Identity box holding the work id, the stage,
 * the branch, the epic count, and what the work supersedes. The engineer dissolved
 * that box. The work item's own name and stage already live in the top bar, so only
 * three facts needed a home: the branch, the epic count, and what this work
 * supersedes. They read on one line, at the top of the content and above every
 * section, so a reader never has to open Intent to learn what branch they are on.
 *
 * The panel states three values and marks no absence as a readiness state. A branch
 * the bundle does not carry reads `no branch recorded`, and a work that supersedes
 * nothing reads `nothing`, which is a value and not a missing record.
 */
function TopLinePanel({ work }: { work: WorkItem }) {
  const branches = [...new Set(work.epics.map((epic) => epic.branch).filter(Boolean))];
  const done = work.epics.filter((epic) => {
    const state = work.epicState(epic);
    return state === "completed" || state === "merged";
  }).length;
  const supersedes = work.record?.goal?.supersedes ?? [];

  return (
    <section
      aria-label="This work item"
      className="mb-5 flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-line bg-card px-4 py-2.5"
    >
      <Fact label="branch">
        {branches.length === 0 ? (
          <span className="min-w-0 font-mono text-[13px] text-ink-dim">no branch recorded</span>
        ) : (
          branches.map((branch) => (
            <span key={branch} className="flex min-w-0 items-center gap-1.5">
              <GitBranch className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
              <span className="min-w-0 font-mono text-[13px] break-words text-ink-mid">
                {branch}
              </span>
            </span>
          ))
        )}
      </Fact>

      <Fact label="epics">
        <span className="font-mono text-[13px] text-ink-mid tabular-nums">
          {work.epics.length}
          <span className="text-ink-faint"> · {done} done</span>
        </span>
      </Fact>

      <Fact label="supersedes">
        {supersedes.length === 0 ? (
          <span className="min-w-0 font-mono text-[13px] text-ink-dim">nothing</span>
        ) : (
          supersedes.map((id) => (
            <Chip key={id} tone="warn">
              {id}
            </Chip>
          ))
        )}
      </Fact>
    </section>
  );
}

/** One labelled fact of the top line. The label names the value and nothing else. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 font-mono text-[12px] tracking-[0.05em] text-ink-faint uppercase">
        {label}
      </span>
      {children}
    </span>
  );
}

/**
 * The level's heading, and the focus move that lands on it.
 *
 * THE HEADING MOUNTS WITH ITS LEVEL, AND THAT IS WHERE SECTION 8.4'S MOVE HAPPENS. This
 * component is rendered inside the keyed subtree of the `AnimatePresence` below, so a
 * level change mounts it and nothing else does. `useFocusOnMount` focuses the heading it
 * returned, which is this level's own element, on the commit that brings the level in.
 *
 * WHY NOT ONE FRAME AFTER THE ROUTE CHANGED. That is what the shell used to do, and the
 * frame resolved the wrong heading: `mode="wait"` keeps the outgoing subtree mounted for
 * its exit, that subtree owns the `h1` of the level being left, and focus fell to `<body>`
 * when it unmounted. `useFocusOnMount` in `./hooks` holds the measurement.
 *
 * A paged level drops its band and keeps the heading as `sr-only`, so the strip below is
 * the only place the section's own words are drawn. A stacked level draws the band.
 *
 * THE WORK ITEM IS NULLABLE, BECAUSE A WORKLESS PULL REQUEST HAS NONE. Every caller of the
 * stacked form passes one, and that form reads it for the section's lead. A workless change
 * carries no work item and is always paged, so it passes null and the heading names the pull
 * request through `title`. The branch below answers the `sr-only` heading for a null work
 * item too, so a caller that broke the pairing would state the section rather than crash on
 * a lead it cannot read.
 */
function LevelHeading({
  section,
  work,
  gates,
  paged,
  title,
}: {
  section: SectionKey;
  work: WorkItem | null;
  gates: Gates | null;
  paged: boolean;
  /** The level's own name, when the section's name is not the one the reader is on. */
  title?: string;
}) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  if (paged || work === null) {
    return (
      <h1 ref={headingRef} id={HEADING_ID} tabIndex={-1} className="sr-only outline-none">
        {title ?? SECTION_TITLE[section]}
      </h1>
    );
  }

  return (
    <SectionHeading
      id={HEADING_ID}
      title={title ?? SECTION_TITLE[section]}
      lead={SECTION_LEAD[section](work, gates)}
      headingRef={headingRef}
    />
  );
}

/**
 * A level as a horizontal section pager.
 *
 * One box on screen at a time. The strip moves the reader, the arrows move the reader,
 * and the bar under the track says where they are. `Pager.tsx` holds those pieces and
 * the index they share.
 *
 * THE STRIP MEASURES THE BOX ON SCREEN, NOT THE PANE. On this level there is no page
 * to be part-way down, so the pane's own offset would read zero forever. The number
 * the reader wants is how far through this one section they are, and that is the
 * active box's own scroll.
 *
 * THE STAGE ALSO HAS TO BE RENDERED BEFORE THE STRIP, and the comment on the track below
 * states why. The ref has to be attached before the strip resolves it, and the remount
 * has to re-resolve it. Break either and the bar reads full at every position.
 *
 * The sections keep the level's document order, so Next walks them in the order the
 * stacked level read.
 */
function PagedLevel({
  sections,
  targets,
  routeKey,
  start = 0,
}: {
  /** The sections, in the order Next walks them. The length is the level's count. */
  sections: ReactNode[];
  targets: JumpTarget[];
  routeKey: string;
  /** The section a new route lands on. 0 unless the route names a section's record. */
  start?: number;
}) {
  const count = sections.length;
  const { index, select, previous, next } = useSectionPaging(count, routeKey, start);
  const boxRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <SectionStrip targets={targets} activeIndex={index} onSelect={select} />

      {/*
        THE ONE CHILD WHOSE DOM ORDER IS NOT ITS PAINT ORDER, so do not tidy it back
        into reading order.

        `LevelProgress` reads the box ref in a layout effect, and React attaches a
        host element's ref and runs a component's layout effects in tree order as it
        walks the commit. A progress strip that sits BEFORE the stage in the DOM
        therefore reads the box before the stage has attached its ref, and it finds no
        element. So the stage renders first and the strip takes `order-first`, which
        paints it at the top of the column where the reading order puts it. Nothing
        focusable lives in the strip, so no tab order changes.
      */}
      <SectionStage index={index} activeBoxRef={boxRef}>
        {sections}
      </SectionStage>

      <LevelProgress index={index} count={count} boxRef={boxRef} />

      <SectionPager index={index} count={count} onPrevious={previous} onNext={next} />
    </div>
  );
}

/**
 * The shell's frame, and the sidebar's provider.
 *
 * The provider is the frame rather than a wrapper inside it, because the top bar
 * holds the mobile drawer's trigger and `useSidebar` reads the provider's context.
 * Three states render through here, so the frame is written once.
 *
 * Rule 1 of section 11.3 holds: the frame carries `h-full` and never `h-dvh`. The
 * sidebar ships `min-h-svh` on its wrapper, so the shell sets `min-h-0` over it.
 *
 * THE HEIGHT CAP IS RULE 1'S OWN GUARD, and it is the height mirror of rule 5's width
 * cap. A host can hand the frame a height, and that height can be taller than the
 * visible screen. `max-h-dvh` then caps the shell to the viewport, the row's
 * `flex-1 min-h-0` fills the cap, and the pane takes that height. One unit serves here
 * where the width cap needs `useVisibleWidthCap` and a measurement, because the visible
 * height has a CSS unit and the visible width has none.
 *
 * The floor is the page's, not the frame's. `h-full` needs a definite height from an
 * ancestor, and `src/index.css` supplies it on `html`, `body`, and `#root`. The frame
 * therefore never claims the viewport height itself. See the height-chain rule there.
 *
 * The two rail widths are section 9.1's and 9.2's, set here rather than in the
 * sidebar, because the spec fixes them and the added component does not.
 */
function Frame({
  reduce,
  open,
  onOpenChange,
  children,
}: {
  reduce: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  // The frame owns the cap, because the frame is what spans the window.
  const widthCap = useVisibleWidthCap();

  return (
    <SidebarProvider
      open={open}
      onOpenChange={onOpenChange}
      className="relative flex h-full max-h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-ground text-ink"
      style={{ ...shellTokens(reduce), ...RAIL_WIDTHS, ...widthCap }}
    >
      {children}
    </SidebarProvider>
  );
}

/**
 * The scroll pane, for the two states that render no rail.
 *
 * It carries the same two-axis rule as the populated pane, so a long error message
 * or a wide path scrolls rather than clipping.
 */
function Pane({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain px-6 py-6">
      {children}
    </div>
  );
}

/**
 * The rail's rows, walked with the up and down arrows.
 *
 * ArrowDown moves to the next row and ArrowUp to the previous one, in the order the rail
 * renders them. At either end the press moves nothing. The keys never write a section of
 * their own: they open the address the row carries, so a step lands exactly where a press
 * on that row lands.
 *
 * IT STEPS THE RAIL'S OWN LIST, ACROSS BOTH ACCOUNTS. The board's own row comes first,
 * because the rail draws it first, and `rowsOf` flattens the two accounts after it. So the
 * traversal cannot know fewer rows than the rail shows, and a group boundary is one step.
 * A folded group is a display choice and never a wall.
 *
 * A ROW WHOSE RECORD IS ABSENT IS NOT A STEP. It carries `href="#"`, so a step onto it
 * would send the reader to the board. The walk therefore holds the rows a press can reach,
 * and only those.
 *
 * THE BOARD IS NOT A LEVEL. On the board the rail draws its own row alone, so the list
 * holds one address that is the board itself, and an arrow press has nowhere to go. Two
 * presses are covered by that: neither the up press nor the down one leaves the board.
 *
 * THE READER'S POSITION IS THEIR OWN ADDRESS. The walk reads `window.location.hash`,
 * which is the address the shell writes, and matches the row whose `href` equals it. It
 * never matches on the section name: the two groups repeat three names, so a name match
 * would stall on the wrong account's row.
 *
 * THE PAGER'S GUARD APPLIES HERE TOO. `keyPressIsTaken` is the one copy of it, and it
 * leaves a press inside a field, and a press with a modifier, to whoever owns it. These
 * two keys never touch the pager's own two.
 */
function useRailArrowKeys({ source, go }: { source: RailSource; go: (href: string) => void }): void {
  /*
   * THE SOURCE IS READ AT THE PRESS, NOT CAPTURED AT THE LAST RENDER. The rail's input holds
   * the change's own levels and the audio the bundle answered, and those objects change
   * without the route changing, so an effect that depended on them would re-subscribe on
   * every render. A ref keeps one subscription and still reads the rows the rail renders.
   */
  const latest = useRef<RailSource>(source);
  latest.current = source;

  useEffect(() => {
    /*
     * THE ADDRESSES A PRESS CAN REACH, IN THE RAIL'S OWN ORDER. The board's own row comes
     * first, because the rail draws it first and it is the way back from any section. Then
     * `rowsOf` flattens both accounts, so the walk crosses a group boundary as one step and
     * reaches every reachable row whether a group is open or closed. A folded group is a
     * display choice and never a wall.
     */
    const steps = (): string[] => [
      boardHref(),
      ...rowsOf(railGroups(latest.current)).map((row) => row.href),
    ];

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      if (keyPressIsTaken(event)) return;
      /*
       * The reader's own address, read at the press rather than captured at the last
       * render, so a step that just landed is the position the next press reads.
       */
      const here = window.location.hash || boardHref();
      const rows = steps();
      const at = rows.indexOf(here);
      if (at < 0) return;
      const wanted = at + (event.key === "ArrowDown" ? 1 : -1);
      if (wanted < 0 || wanted >= rows.length) return;
      event.preventDefault();
      go(rows[wanted]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);
}

/**
 * State a redirect once, and perform it.
 *
 * A section the work cannot fill is absent, so the shell lands on the nearest section
 * the work can fill and says which one it was asked for. The notice is cleared by a
 * hash change the reader made, per section 5.1. The effect returns early once the
 * route names a section the work fills, so it cannot loop.
 */
function useRedirectNotice({
  workMissing,
  wanted,
  available,
  section,
  workId,
  go,
  setRedirectedFrom,
}: {
  workMissing: boolean;
  wanted: SectionKey;
  available: Set<SectionKey>;
  section: SectionKey;
  workId: string;
  go: (href: string) => void;
  setRedirectedFrom: (section: SectionKey | null) => void;
}): void {
  useEffect(() => {
    if (workMissing) {
      setRedirectedFrom(null);
      return;
    }
    if (available.has(wanted)) return;
    setRedirectedFrom(wanted);
    go(routeHref(workId, section));
  }, [available, go, section, setRedirectedFrom, wanted, workId, workMissing]);
}

/* ------------------------------------------------------------------ copy */

const SECTION_TITLE: Record<SectionKey, string> = {
  intent: "Intent",
  "problem-and-solution": "Problem and solution",
  architecture: "Architecture",
  build: "Build",
  "pull-requests": "Pull requests",
  shipped: "Shipped",
};

const SECTION_LEAD: Record<SectionKey, (work: WorkItem, gates: Gates | null) => string> = {
  intent: (work) =>
    `The goal, the done-when condition, and the blockers of ${work.id}.`,
  "problem-and-solution": () =>
    "The problem, the solution, and the cost of the solution.",
  architecture: () =>
    "The decisions, the affected boundaries, and the diagrams of this work.",
  build: (work, gates) =>
    `${work.epics.length} epics, ${work.slices.length} slices, and ${
      gates?.rubrics ? "a gate record" : "no gate record"
    }.`,
  "pull-requests": (work) =>
    `${work.pullRequests.length} pull requests from this work's epics, and all open pull requests.`,
  shipped: () => STAGE_PUBLICATIONS_DEPLOY_LEAD,
};

export type { Theme };
