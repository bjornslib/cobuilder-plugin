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

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { Database, GitBranch, RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BUNDLE_DATA_URL, entitiesOf, joinsOf } from "@/data/bundle";
import { cn } from "@/lib/utils";

import { Chip, SectionHeading } from "./atoms";
import { JumpBar, useJumpTargets } from "./jump";
import { Rail } from "./Rail";
import { RecordSheet } from "./Sheet";
import type { SheetSubject } from "./Sheet";
import { TopBar } from "./TopBar";
import { ArchitecturePanel, IntentPanel, ProblemSolutionPanel } from "./panels";
import { EpicsSection, PullRequestsSection, RubricsSection, ShippedSection } from "./sections";
import type { Theme } from "./Diagram";
import { buildWorkItems, gatesOf, levelsOf, routeHref, switcherList } from "./model";
import type { Gates, SectionKey, WorkItem } from "./model";
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
                  The section-link bar. It is not a fourth fixed region: it is the
                  first child of the pane and it is `sticky`, so the pane keeps the
                  only scroll, per section 11.3.
                */}
                <JumpBar paneId={PANE_ID} targets={jumpTargets} />

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${work.id}/${section}/${route.subId ?? ""}`}
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 0.75, 0.3, 1] }}
                    className="min-w-0 px-6 py-6 pb-12"
                  >
                    <TopLinePanel work={work} />

                    {redirectedFrom !== null ? (
                      <p className="mb-4 min-w-0 rounded-lg border border-dashed border-line bg-surface-2 px-3.5 py-2 font-mono text-[12.5px] text-ink-dim">
                        The route named {redirectedFrom}, and this work cannot fill it. The shell
                        redirected to {section}.
                      </p>
                    ) : null}

                    <SectionHeading
                      id={HEADING_ID}
                      title={SECTION_TITLE[section]}
                      lead={SECTION_LEAD[section](work, gates)}
                    />

                    {section === "intent" && levels ? <IntentPanel work={work} /> : null}
                    {section === "problem-and-solution" && levels ? (
                      <ProblemSolutionPanel work={work} levelState={levels["problem-and-solution"]} />
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
