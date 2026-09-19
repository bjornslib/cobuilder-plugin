/**
 * The application shell.
 *
 * Three fixed regions and one scrolling region. The document does not scroll at all,
 * per interaction-design section 11.3: `html` and `body` carry no overflow, and the
 * shell fills the viewport exactly. Only the scroll pane scrolls.
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ TOP BAR (fixed)   [ work item ] [ status ] [ theme ]     │
 *   ├────────────┬─────────────────────────────────────────────┤
 *   │ LEFT NAV   │  SCROLL PANE — the only scrolling region    │
 *   │ (fixed)    │                                             │
 *   └────────────┴─────────────────────────────────────────────┘
 *
 * The shell renders. It never computes. Every count, state, and join comes from
 * `data/index.json`, and every record body comes from `data/designs.js` and
 * `data/adrs.js`.
 *
 * This file is scaffolding for a design decision, in the same sense `Variations.tsx`
 * is. When the arrangement is chosen, the shell becomes the Work surface.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Database, RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { BUNDLE_DATA_URL, entitiesOf, joinsOf, loadIndex } from "@/data/bundle";
import type { RecordIndex } from "@/data/types";
import { cn } from "@/lib/utils";

import { SectionHeading } from "./atoms";
import { Rail } from "./Rail";
import { TopBar } from "./TopBar";
import { ArchitecturePanel, IntentPanel, ProblemSolutionPanel } from "./panels";
import { EpicsSection, PullRequestsSection, RubricsSection, ShippedSection, SlicesSection } from "./sections";
import type { Theme } from "./Diagram";
import type { AdrRecords, DesignRecords } from "./records";
import { loadAdrs, loadDesigns } from "./records";
import type { Gates, SectionKey, WorkItem } from "./model";
import {
  buildWorkItems,
  gatesOf,
  levelsOf,
  readRoute,
  routeHref,
  switcherList,
} from "./model";

type Load =
  | { state: "loading" }
  | { state: "ready"; index: RecordIndex; designs: DesignRecords; adrs: AdrRecords }
  | { state: "failed"; message: string };

const PANE_ID = "work-scroll-pane";
const HEADING_ID = "work-section-heading";

/** The order the shell falls back through when a route names a gated section. */
const SECTION_FALLBACK: SectionKey[] = [
  "intent",
  "problem-and-solution",
  "architecture",
  "build",
  "pull-requests",
  "shipped",
];

/* ------------------------------------------------------------------- tokens */

/**
 * The timing and layering tokens of sections 4.2 and 11.1.
 *
 * They are declared here rather than in `index.css`, because the shipped viewer's
 * stylesheet is not this application's to change. Under `prefers-reduced-motion:
 * reduce` every duration resolves to zero except the arrival highlight, which marks a
 * location rather than moving anything.
 */
function shellTokens(reduce: boolean): React.CSSProperties {
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
  } as React.CSSProperties;
}

/* -------------------------------------------------------------------- shell */

export default function AppShell() {
  const reduce = useReducedMotion() ?? false;
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [route, setRoute] = useState(() => readRoute());
  const [theme, setTheme] = useState<Theme>("light");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "the-work": true,
    build: true,
    "pull-requests": true,
    shipped: true,
  });
  const [collapsed, setCollapsed] = useState(false);
  const [redirectedFrom, setRedirectedFrom] = useState<SectionKey | null>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  /* True while the shell itself rewrites the hash, so the notice is not cleared. */
  const selfRewrite = useRef(false);

  /* Theme is light by default and persists nowhere, per section 2.3. */
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    return () => {
      document.documentElement.dataset.theme = "light";
    };
  }, [theme]);

  /*
   * The document never scrolls, so `html` and `body` carry no overflow. This is
   * applied from the shell and removed on unmount, so the other variations in
   * `Variations.tsx` keep the page scroll they rely on.
   */
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtml = html.style.overflow;
    const previousBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = previousHtml;
      body.style.overflow = previousBody;
    };
  }, []);

  /* Routing. The rail renders from the route, so a deep link lands on the same screen. */
  useEffect(() => {
    const onHash = () => {
      if (selfRewrite.current) {
        selfRewrite.current = false;
      } else {
        setRedirectedFrom(null);
      }
      setRoute(readRoute());
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  /* The rail collapses to icons under 1200 px, per sections 2.3 and 9.2. */
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1200px)");
    const apply = () => setCollapsed(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  const reload = useCallback(() => {
    setLoad({ state: "loading" });
    Promise.all([loadIndex(), loadDesigns(), loadAdrs()])
      .then(([index, designs, adrs]) => setLoad({ state: "ready", index, designs, adrs }))
      .catch((error: unknown) =>
        setLoad({
          state: "failed",
          message: error instanceof Error ? error.message : String(error),
        }),
      );
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

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
  const availableSections = useMemo(() => {
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

  const section: SectionKey =
    availableSections.has(route.section) || work === null
      ? route.section
      : (SECTION_FALLBACK.find((key) => availableSections.has(key)) ?? "intent");

  /* A redirect is stated, never silent. */
  useEffect(() => {
    if (work === null) {
      setRedirectedFrom(null);
      return;
    }
    const wanted = readRoute().section;
    if (!availableSections.has(wanted)) {
      setRedirectedFrom(wanted);
      selfRewrite.current = true;
      window.location.hash = routeHref(work.id, section);
    }
  }, [availableSections, section, work]);

  /* A section change moves focus to the section heading, per section 8.4. */
  useEffect(() => {
    if (load.state !== "ready") return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(HEADING_ID)?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [section, load.state, work?.id]);

  const chooseWork = useCallback(
    (id: string) => {
      window.location.hash = routeHref(id, section);
    },
    [section],
  );

  const chooseEpic = useCallback((design: string, epicId: string) => {
    window.location.hash = `${routeHref(design, "build", "epics")}/${epicId}`;
  }, []);

  const openPr = useCallback((n: number) => {
    setRoute((current) => {
      const workId = current.workId ?? "";
      window.location.hash = routeHref(workId, "pull-requests", `${n}`);
      return current;
    });
  }, []);

  /* ---------------------------------------------------------------- states */

  if (load.state === "failed") {
    return (
      <div className="flex h-full min-h-0 flex-col" style={shellTokens(reduce)}>
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
          onToggleTheme={() => setTheme(theme === "light" ? "dark" : "light")}
          paneId={PANE_ID}
          nameId="work-item-name"
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-[80ch] rounded-xl border border-dashed border-warn bg-warn-wash px-4 py-3.5">
            <p className="m-0 font-mono text-[12.5px] font-bold tracking-[0.06em] text-warn uppercase">
              The record index did not load
            </p>
            <p className="mt-2 mb-0 font-serif text-[16px] leading-[1.55] text-ink-mid">
              {load.message}
            </p>
            <p className="mt-2 mb-0 font-mono text-[12.5px] text-ink-dim">
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
        </div>
      </div>
    );
  }

  if (load.state === "ready" && works.size === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col" style={shellTokens(reduce)}>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
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
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------- populated */

  const unresolvedSlices =
    load.state === "ready" ? Object.keys(joinsOf(load.index).slice_to_epic_unresolved).length : 0;
  const allPullRequests = load.state === "ready" ? entitiesOf(load.index).pull_request : [];
  const adrs = load.state === "ready" ? load.adrs : {};

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden bg-ground text-ink"
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
        onToggleTheme={() => setTheme(theme === "light" ? "dark" : "light")}
        paneId={PANE_ID}
        nameId="work-item-name"
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
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
          ref={paneRef}
          tabIndex={-1}
          aria-label={`${work?.design.name ?? "No work item"}, ${section}`}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-ground outline-none"
        >
          {work === null ? (
            <div className="px-6 py-6">
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
                className="px-6 py-6 pb-12"
              >
                {redirectedFrom !== null ? (
                  <p className="mb-4 rounded-lg border border-dashed border-line bg-surface-2 px-3.5 py-2 font-mono text-[12.5px] text-ink-dim">
                    The route named {redirectedFrom}, and this work cannot fill it. The shell
                    redirected to {section}.
                  </p>
                ) : null}

                <SectionHeading
                  id={HEADING_ID}
                  title={SECTION_TITLE[section]}
                  lead={SECTION_LEAD[section](work, gates)}
                />

                {section === "intent" ? <IntentPanel work={work} /> : null}
                {section === "problem-and-solution" ? <ProblemSolutionPanel work={work} /> : null}
                {section === "architecture" ? (
                  <ArchitecturePanel work={work} adrs={adrs} theme={theme} />
                ) : null}
                {section === "build" ? (
                  route.sub === "slices" ? (
                    <SlicesSection work={work} unresolvedSlices={unresolvedSlices} />
                  ) : route.sub === "rubrics" ? (
                    <RubricsSection work={work} gated={gates?.rubrics ?? false} />
                  ) : (
                    <EpicsSection work={work} focusEpic={route.sub === "epics" ? route.subId : null} />
                  )
                ) : null}
                {section === "pull-requests" ? (
                  route.sub === "flightdeck" ? (
                    <PullRequestsSection
                      work={work}
                      focusPr={null}
                      allPullRequests={allPullRequests}
                      onOpenPr={openPr}
                    />
                  ) : (
                    <PullRequestsSection
                      work={work}
                      focusPr={route.sub ? Number(route.sub) : null}
                      allPullRequests={allPullRequests}
                      onOpenPr={openPr}
                    />
                  )
                ) : null}
                {section === "shipped" ? <ShippedSection work={work} /> : null}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
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
    }.`,
  "pull-requests": (work) =>
    `${work.pullRequests.length} pull requests joined to this work, and the whole open set beside them.`,
  shipped: () => "The stage, the publications, and the deploy record that does not exist.",
};
