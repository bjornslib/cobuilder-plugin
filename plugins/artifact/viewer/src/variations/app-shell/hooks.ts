/**
 * The shell's side effects, each in its own named hook.
 *
 * This shell had six `useEffect` calls in one component body: the theme, the
 * document's overflow, the hash listener, the viewport query, the index load, and the
 * focus move on a section change. Every one of them is a side effect, and the corpus
 * principle `react_hooks` puts side effects in custom hooks rather than in the render
 * body. So each one lives here, behind a name that says what it does.
 *
 * None of these hooks computes a record. `model.ts` derives every count and join, and
 * `data/index.json` is the only source for them.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

import { loadIndex } from "@/data/bundle";
import type { RecordIndex } from "@/data/types";

import type { AdrRecords, DesignRecords } from "./records";
import { loadAdrs, loadDesigns } from "./records";
import type { Route, SectionKey } from "./model";
import { readRoute, routeHref } from "./model";
import type { Theme } from "./Diagram";

/* --------------------------------------------------------------------- route */

export interface RouteControl {
  route: Route;
  /** True while the shell itself rewrote the hash, so the redirect notice stands. */
  selfRewrite: RefObject<boolean>;
  /** A section this work cannot fill, when the route asked for one. */
  redirectedFrom: SectionKey | null;
  setRedirectedFrom: (section: SectionKey | null) => void;
  /** Rewrite the hash. A hash write is the only navigation this shell performs. */
  go: (href: string) => void;
}

/**
 * The route, read from the hash and kept in step with it.
 *
 * The rail renders from the route, so a deep link lands on the same screen a reader
 * reached by clicking. A hash change the shell did not make clears the redirect
 * notice, because the reader chose that destination.
 */
export function useHashRoute(): RouteControl {
  const [route, setRoute] = useState<Route>(() => readRoute());
  const [redirectedFrom, setRedirectedFrom] = useState<SectionKey | null>(null);
  const selfRewrite = useRef(false);

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

  const go = useCallback((href: string) => {
    selfRewrite.current = true;
    window.location.hash = href;
  }, []);

  return { route, selfRewrite, redirectedFrom, setRedirectedFrom, go };
}

/* --------------------------------------------------------------------- index */

export type IndexLoad =
  | { state: "loading" }
  | { state: "ready"; index: RecordIndex; designs: DesignRecords; adrs: AdrRecords }
  | { state: "failed"; message: string };

/**
 * The three files the shell reads, and the retry that reads them again.
 *
 * The shell never waits for this. It renders the top bar and the rail from the route
 * at first paint, and the index fills in behind them, which is the loading state of
 * section 3.1.
 */
export function useIndexLoad(): { load: IndexLoad; reload: () => void } {
  const [load, setLoad] = useState<IndexLoad>({ state: "loading" });

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

  return { load, reload };
}

/* --------------------------------------------------------------------- theme */

export interface ThemeControl {
  theme: Theme;
  toggleTheme: () => void;
}

/**
 * The theme, and the attribute that carries it.
 *
 * Light is the default and the preference persists nowhere, per section 2.3. A
 * published file cannot store a preference, so the shell does not pretend to.
 */
export function useTheme(): ThemeControl {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    return () => {
      document.documentElement.dataset.theme = "light";
    };
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }, []);

  return { theme, toggleTheme };
}

/* -------------------------------------------------- document-scroll ownership */

/**
 * The document never scrolls, so `html` and `body` carry no overflow.
 *
 * This is applied from the shell and removed on unmount, so the other variations in
 * `Variations.tsx` keep the page scroll they were built against.
 */
export function useDocumentNoScroll(): void {
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
}

/* ------------------------------------------------------------------ viewport */

/** True while the query matches. One listener, one boolean. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    const apply = () => setMatches(list.matches);
    apply();
    list.addEventListener("change", apply);
    return () => list.removeEventListener("change", apply);
  }, [query]);

  return matches;
}

/** The rail collapses to icons under 1200 px, per sections 2.3 and 9.2. */
export function useCollapsedRail(): boolean {
  return useMediaQuery("(max-width: 1200px)");
}

/* --------------------------------------------------------------------- focus */

/**
 * Move focus to an element when its key changes.
 *
 * Section 8.4: choosing a section moves focus to the section heading, and a
 * work-item change moves focus to the top bar's name. Both are one target id and one
 * dependency list, so both read through here. The dependency list is the caller's, so
 * it is spread into the effect rather than computed here.
 */
export function useFocusOnChange(elementId: string, keys: readonly unknown[]): void {
  const signature = keys.join("|");
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      document.getElementById(elementId)?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [elementId, signature]);
}

/* ------------------------------------------------------------- section gating */

export interface SectionAvailability {
  /** Which sections this work fills. */
  available: Set<SectionKey>;
  /** The section the route asked for, or the nearest one the work can fill. */
  section: SectionKey;
}

const SECTION_FALLBACK: readonly SectionKey[] = [
  "intent",
  "problem-and-solution",
  "architecture",
  "build",
  "pull-requests",
  "shipped",
];

/**
 * Which section renders, given what the work can fill.
 *
 * A section the work cannot fill is absent, and the shell redirects to the nearest one
 * that it can fill. The redirect is stated, never silent, per section 5.1.
 */
export function useSectionAvailability(
  wanted: SectionKey,
  filled: Set<SectionKey>,
  workMissing: boolean,
): SectionAvailability {
  return useMemo(() => {
    const available = new Set(filled);
    const section =
      workMissing || available.has(wanted)
        ? wanted
        : (SECTION_FALLBACK.find((key) => available.has(key)) ?? "intent");
    return { available, section };
  }, [wanted, filled, workMissing]);
}

/** The href for one section of one work item. */
export function sectionHref(workId: string, section: SectionKey, tail?: string): string {
  return routeHref(workId, section, tail);
}
