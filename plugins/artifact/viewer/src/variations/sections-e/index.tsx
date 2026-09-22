/**
 * The application shell.
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
 * SECTIONS (E) IS SHELL (D) WITH ONE CHANGE. The Problem & Solution level is a
 * horizontal section pager rather than a stacked page: one panel per box on a track
 * that slides sideways, and each box scrolls its own overflow. Every other section
 * keeps the layout below unchanged. `Pager.tsx` holds the three pager pieces, and its
 * header comment states what the engineer asked for and why each piece is shaped so.
 *
 * SECTION 11.3'S FOUR RULES ARE THE LAYOUT CONTRACT, and each one is applied here.
 *
 *   1. The shell fills its parent, never the viewport. The root carries `h-full` and
 *      never `h-dvh`, because the viewport height belongs to whoever owns the page.
 *      The host that renders this shell renders its own chrome above it, so a
 *      `h-dvh` shell would stand taller than the space it was given and the surplus
 *      would clip at one edge.
 *   2. The scroll pane scrolls on both axes: `overflow-auto`, never `overflow-y: auto`
 *      with `overflow-x: hidden`. A pane that hides its horizontal overflow clips a
 *      wide block with no scrollbar and no way to reach it.
 *   3. A wide block scrolls itself. Every table, code block, and diagram sits inside
 *      its own `overflow-x: auto` container, so the pane keeps its own scroll and the
 *      wide block keeps its integrity. See `markdown.tsx`, `Diagram.tsx`, and the
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
 *
 * This file is scaffolding for a design decision, in the same sense `Variations.tsx`
 * is. When the arrangement is chosen, the shell becomes the Work surface.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";

import { Database, GitBranch, RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import ScrollProgress from "@/components/smoothui/scroll-progress";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BUNDLE_DATA_URL, entitiesOf, joinsOf } from "@/data/bundle";
import { cn } from "@/lib/utils";

import { Chip, SectionHeading } from "./atoms";
import { JumpBar, useJumpTargets } from "./jump";
import type { JumpTarget } from "./jump";
import { SectionPager, SectionStage, SectionStrip, useSectionPaging } from "./Pager";
import { Rail } from "./Rail";
import { RecordSheet } from "./Sheet";
import type { SheetSubject } from "./Sheet";
import { TopBar } from "./TopBar";
import {
  ArchitecturePanel,
  AssessmentSection,
  IntentPanel,
  ProblemSolutionSection,
  RisksSection,
  UnknownsSection,
} from "./panels";
import { EpicsSection, PullRequestsSection, RubricsSection, ShippedSection } from "./sections";
import type { Theme } from "./Diagram";
import { buildWorkItems, gatesOf, levelsOf, routeHref, switcherList } from "./model";
import type { Gates, LevelState, SectionKey, WorkItem } from "./model";
import {
  sectionHref,
  useCollapsedRail,
  useDocumentNoScroll,
  useVisibleWidthCap,
  useFocusOnChange,
  useHashRoute,
  useIndexLoad,
  useScrollResetOnRoute,
  useSectionAvailability,
  useTheme,
} from "./hooks";

const PANE_ID = "work-scroll-pane";
const HEADING_ID = "work-section-heading";

/** The reading-progress strip's height, in pixels. 4 px, the strip's own default. */
const PROGRESS_PX = 4;

/**
 * How many sections the paging level holds.
 *
 * Written here rather than read from the strip's own list. The strip reads the DOM, so
 * after a section change its list is one commit behind the panels that changed and the
 * pager would print a count of one for that frame. The four boxes `PagedLevel` renders
 * are fixed, so this number is fixed with them. Change the two together.
 */
const PAGED_SECTIONS = 4;

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

export default function AppShell() {
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
    "the-work": true,
    build: true,
    "pull-requests": true,
    shipped: true,
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

  const work = route.workId ? (works.get(route.workId) ?? null) : null;
  const gates: Gates | null = work ? gatesOf(work) : null;
  const levels = work ? levelsOf(work) : null;

  /* Which sections this work fills. A section that fails its rule is absent. */
  const filled = useMemo(() => {
    const set = new Set<SectionKey>();
    if (levels) {
      for (const key of ["intent", "problem-and-solution", "architecture"] as const) {
        if (levels[key].available) set.add(key);
      }
    }
    if (gates?.build) set.add("build");
    if (gates?.pullRequests) set.add("pull-requests");
    if (gates?.shipped) set.add("shipped");
    return set;
  }, [gates, levels]);

  const { section } = useSectionAvailability(route.section, filled, work === null);

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
    workMissing: work === null,
    wanted: route.section,
    available: filled,
    section,
    workId: work?.id ?? "",
    go,
    setRedirectedFrom,
  });

  /* A section change moves focus to the section heading, per section 8.4. */
  useFocusOnChange(HEADING_ID, [section, load.state, work?.id ?? ""]);

  /*
   * A route change starts the reader at the top of the pane. The four fields are the
   * whole route. They are the work item, the section, the sub-view, and the record
   * the sub-view opens, so one list covers a section change, a work-item change, an
   * epic that opens, and a pull request that opens.
   */
  useScrollResetOnRoute(PANE_ID, [route.workId, route.section, route.sub, route.subId]);

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

  const unresolvedSlices =
    load.state === "ready" ? Object.keys(joinsOf(load.index).slice_to_epic_unresolved).length : 0;
  const allPullRequests = load.state === "ready" ? entitiesOf(load.index).pull_request : [];
  const adrs = load.state === "ready" ? load.adrs : {};

  /*
   * The one level that pages. Every other section stacks its panels in the pane's own
   * scroll, so this reads null there and the layout below stays the shell's.
   */
  const pagedLevel =
    section === "problem-and-solution" ? (levels?.["problem-and-solution"] ?? null) : null;

  /* The whole route as one string: the four fields `useScrollResetOnRoute` reads. */
  const routeKey = `${route.workId ?? ""}/${route.section}/${route.sub ?? ""}/${route.subId ?? ""}`;

  return (
    <TooltipProvider delayDuration={150}>
      <Frame reduce={reduce} open={railOpen} onOpenChange={setRailOpen}>
        <TopBar
          workId={work?.id ?? route.workId}
          workName={work?.design.name ?? route.workId}
          stage={work?.design.stage ?? null}
          supersededBy={work?.record?.goal.superseded_by ?? null}
          ready={load.state === "ready"}
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
            work={work}
            gates={gates}
            levels={levels}
            section={section}
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
            aria-label={`${work?.design.name ?? "No work item"}, ${section}`}
            className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain bg-ground outline-none"
          >
            {work === null ? (
              <div className="min-w-0 px-6 py-6">
                <div className="max-w-[80ch] rounded-xl border border-dashed border-warn bg-warn-wash px-4 py-3.5">
                  <p className="m-0 font-mono text-[12.5px] font-bold tracking-[0.06em] text-warn uppercase">
                    The route names an id the bundle lacks
                  </p>
                  <p className="mt-2 mb-0 font-serif text-[16px] leading-[1.55] text-ink-mid">
                    The route asks for work item{" "}
                    <code className="font-mono text-[13px]">{route.workId ?? "(none)"}</code>.
                    The index resolved {works.size} designs, and none of them carries that id.
                    Pick one in the work-item switcher above.
                  </p>
                </div>
              </div>
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
                {pagedLevel === null ? (
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
                ) : null}

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
                      pagedLevel
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
                      THE PAGED LEVEL HAS NO VISIBLE BAND. The section strip right below
                      says the section's own name, so a banner with the same words 105 px
                      higher is a repeat of the strip. The heading stays in the flow as
                      `sr-only`: section 8.4 moves focus to it on a section change, and
                      the document still needs its one `h1`. A screen reader therefore
                      still hears the level name, and no reader loses the text.
                    */}
                    {pagedLevel ? (
                      <h1 id={HEADING_ID} tabIndex={-1} className="sr-only outline-none">
                        {SECTION_TITLE[section]}
                      </h1>
                    ) : (
                      <SectionHeading
                        id={HEADING_ID}
                        title={SECTION_TITLE[section]}
                        lead={SECTION_LEAD[section](work, gates)}
                      />
                    )}

                    {section === "intent" && levels ? <IntentPanel work={work} /> : null}
                    {/*
                      Problem and solution pages. The level is the one section that
                      does not stack its panels, so it hands the pane's remaining
                      height to the track instead of spending it on a column.
                    */}
                    {pagedLevel ? (
                      <PagedLevel
                        work={work}
                        levelState={pagedLevel}
                        targets={jumpTargets}
                        routeKey={routeKey}
                      />
                    ) : null}
                    {section === "architecture" && levels ? (
                      <ArchitecturePanel
                        work={work}
                        adrs={adrs}
                        theme={theme}
                        levelState={levels.architecture}
                        openSheet={openSheet}
                      />
                    ) : null}
                    {section === "build" ? (
                      route.sub === "rubrics" ? (
                        <RubricsSection work={work} gated={gates?.rubrics ?? false} />
                      ) : (
                        <EpicsSection
                          work={work}
                          focusEpic={route.sub === "epics" ? route.subId : null}
                          openSheet={openSheet}
                          unresolvedSlices={unresolvedSlices}
                        />
                      )
                    ) : null}
                    {section === "pull-requests" ? (
                      <PullRequestsSection
                        work={work}
                        focusPr={route.sub && route.sub !== "flightdeck" ? Number(route.sub) : null}
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
  const supersedes = work.record?.goal.supersedes ?? [];

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
 * The Problem & Solution level, as a horizontal section pager.
 *
 * Four boxes on one track, one of them on screen. The strip moves the reader, the
 * arrows move the reader, and the bar under the track says where they are. `Pager.tsx`
 * holds those three pieces and the index they share.
 *
 * THE STRIP MEASURES THE BOX ON SCREEN, NOT THE PANE. On this level there is no page
 * to be part-way down, so the pane's own offset would read zero forever. The number
 * the reader wants is how far through this one section they are, and that is the
 * active box's own scroll. `useScroll` reads the container ref on mount, so the key
 * remounts the strip when the reader moves and the ref points at another box.
 *
 * THE STRIP ALSO HAS TO BE RENDERED AFTER THE STAGE, and the comment on the track below
 * states why. The two facts are one mechanism: the ref has to be attached before the
 * strip resolves it, and the remount has to re-resolve it. Break either and the bar
 * reads full at every position.
 *
 * The four sections keep the level's document order, so Next walks them in the order
 * the stacked level read.
 */
function PagedLevel({
  work,
  levelState,
  targets,
  routeKey,
}: {
  work: WorkItem;
  levelState: LevelState;
  targets: JumpTarget[];
  routeKey: string;
}) {
  const { index, select, previous, next } = useSectionPaging(PAGED_SECTIONS, routeKey);
  const boxRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <SectionStrip targets={targets} activeIndex={index} onSelect={select} />

      {/*
        THE ONE CHILD WHOSE DOM ORDER IS NOT ITS PAINT ORDER, so do not tidy it back
        into reading order.

        `useScroll` resolves its container in a layout effect, and React attaches a
        host element's ref and runs a component's layout effects in tree order as it
        walks the commit. A progress strip that sits BEFORE the stage in the DOM
        therefore resolves its container while the stage has not attached the box ref
        yet. It finds no element, reports a full bar at every position, and never
        re-resolves, because motion resolves the container only once at setup. An
        ancestor's ref and a descendant's ref are both attached in time; a later
        sibling's is not. So the stage renders first and the strip takes `order-first`,
        which paints it at the top of the column where the reading order puts it.
        Nothing focusable lives in the strip, so no tab order changes.
      */}
      <SectionStage index={index} activeBoxRef={boxRef}>
        <ProblemSolutionSection work={work} levelState={levelState} />
        <RisksSection work={work} />
        <AssessmentSection work={work} />
        <UnknownsSection work={work} />
      </SectionStage>

      <LevelProgress index={index} count={PAGED_SECTIONS} boxRef={boxRef} />

      <SectionPager index={index} count={PAGED_SECTIONS} onPrevious={previous} onNext={next} />
    </div>
  );
}

/**
 * The level's progress, from its first section to its last.
 *
 * A flat "one section in four" would sit still and would say nothing the pager text
 * does not already say. The bar reads a position INSIDE the level instead:
 *
 *     progress = (index + within) / count
 *
 * `within` is the active box's own scroll progress, and a box with no scroll range
 * counts as fully read. So section 1 at its own top is 0 %, section 1 at its bottom is
 * 25 %, section 2 is 50 %, and section 4 is 100 %. Walking forward never moves the bar
 * backwards, and a step never resets it.
 *
 * THE ACTIVE BOX IS MEASURED DIRECTLY, NOT THROUGH `useScroll`. That hook resolves its
 * container once, at setup. A pager re-points its container on every step, so a strip
 * built on it ends up measuring the box it was born with, or a box whose ref is
 * mid-reassignment, and it never recovers: it froze at section 1's bottom value for the
 * rest of the page's life. `scrollTop` against the box's own range cannot go stale, and
 * the effect below re-reads the new box in the same commit the reader moves in.
 *
 * THE PLACEMENT STILL MATTERS. This component renders after `SectionStage` in the DOM,
 * so the box refs are attached before the effect runs, and its wrapper takes
 * `order-first` to paint at the top of the column. It carries no key: the key existed
 * only to force `useScroll` to re-resolve, and a state-driven number has nothing to
 * re-resolve.
 */
function LevelProgress({
  index,
  count,
  boxRef,
}: {
  index: number;
  count: number;
  boxRef: RefObject<HTMLDivElement | null>;
}) {
  const [within, setWithin] = useState(0);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const read = () => setWithin(withinOf(box));
    read();
    if (!box) return;
    box.addEventListener("scroll", read, { passive: true });
    /* The stage takes the height left over, so a window resize moves the range. */
    window.addEventListener("resize", read);
    return () => {
      box.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, [boxRef, index]);

  return (
    <div className="order-first min-w-0 shrink-0">
      <ScrollProgress
        value={(index + within) / count}
        variant="bar"
        position="inline"
        thickness={PROGRESS_PX}
        color="var(--band)"
      />
    </div>
  );
}

/**
 * How far through one box the reader is, from 0 to 1.
 *
 * A box with no range is fully read, which is what makes a section that fits one
 * screen contribute its whole share of the level with no special case.
 */
function withinOf(box: HTMLElement | null): number {
  if (!box) return 0;
  const range = box.scrollHeight - box.clientHeight;
  if (range <= 0) return 1;
  return Math.min(1, Math.max(0, box.scrollTop / range));
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
      className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-ground text-ink"
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
    `Why ${work.id} exists, what would make it done, and what would stop it.`,
  "problem-and-solution": () =>
    "What was wrong, what answers it, and what the answer costs.",
  architecture: () =>
    "The decisions this work lands, the boundaries they touch, and the diagrams the bundle holds.",
  build: (work, gates) =>
    `${work.epics.length} epics, ${work.slices.length} slices, and ${
      gates?.rubrics ? "a gate record" : "no gate record"
    }. A slice opens inside the epic that owns it.`,
  "pull-requests": (work) =>
    `${work.pullRequests.length} pull requests one of this work's own epics carries, and the whole open set beside them.`,
  shipped: () => "The stage, the publications, and the deploy record that does not exist.",
};

export type { Theme };
