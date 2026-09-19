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
 * The shell renders. It never computes. Every count, state, and join comes from
 * `data/index.json`, and every record body comes from `data/designs.js` and
 * `data/adrs.js`.
 *
 * This file is scaffolding for a design decision, in the same sense `Variations.tsx`
 * is. When the arrangement is chosen, the shell becomes the Work surface.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { Database, RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { BUNDLE_DATA_URL, entitiesOf, joinsOf } from "@/data/bundle";
import { cn } from "@/lib/utils";

import { SectionHeading } from "./atoms";
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
  useFocusOnChange,
  useHashRoute,
  useIndexLoad,
  useSectionAvailability,
  useTheme,
} from "./hooks";

const PANE_ID = "work-scroll-pane";
const HEADING_ID = "work-section-heading";

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
    "--layer-base": "0",
    "--layer-raised": "1",
    "--layer-fixed": "2",
    "--layer-panel": "3",
    "--layer-modal": "4",
  } as CSSProperties;
}

/* -------------------------------------------------------------------- shell */

export default function AppShell() {
  const reduce = useReducedMotion() ?? false;
  const { load, reload } = useIndexLoad();
  const { route, redirectedFrom, setRedirectedFrom, go } = useHashRoute();
  const { theme, toggleTheme } = useTheme();
  const collapsed = useCollapsedRail();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "the-work": true,
    build: true,
    "pull-requests": true,
    shipped: true,
  });
  const [sheet, setSheet] = useState<SheetSubject | null>(null);

  useDocumentNoScroll();

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

  /* ---------------------------------------------------------------- states */

  if (load.state === "failed") {
    return (
      <TooltipProvider delayDuration={150}>
        <div className="flex h-full min-h-0 min-w-0 flex-col" style={shellTokens(reduce)}>
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
        </div>
      </TooltipProvider>
    );
  }

  if (load.state === "ready" && works.size === 0) {
    return (
      <TooltipProvider delayDuration={150}>
        <div className="flex h-full min-h-0 min-w-0 flex-col" style={shellTokens(reduce)}>
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
        </div>
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
      <div
        className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-ground text-ink"
        style={shellTokens(reduce)}
      >
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

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <Rail
            work={work}
            gates={gates}
            levels={levels}
            section={section}
            collapsed={collapsed}
            open={openGroups}
            onToggleGroup={(key) =>
              setOpenGroups((current) => ({ ...current, [key]: !(current[key] ?? true) }))
            }
          />

          {/* The only scrolling region. Both axes belong to this pane. */}
          <div
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
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${work.id}/${section}/${route.subId ?? ""}`}
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduce ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 0.75, 0.3, 1] }}
                  className="min-w-0 px-6 py-6 pb-12"
                >
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

                  {section === "intent" && levels ? (
                    <IntentPanel work={work} levelState={levels.intent} />
                  ) : null}
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
            )}
          </div>
        </div>

        <RecordSheet subject={sheet} onOpenChange={closeSheet} />
      </div>
    </TooltipProvider>
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
