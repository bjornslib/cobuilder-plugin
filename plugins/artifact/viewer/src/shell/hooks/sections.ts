import { useMemo } from "react";

import { routeHref, type SectionKey } from "../model";

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
function resolveSection(wanted: SectionKey, available: Set<SectionKey>, workMissing: boolean): SectionKey {
  if (workMissing || available.has(wanted)) return wanted;
  return SECTION_FALLBACK.find((key) => available.has(key)) ?? "intent";
}

/**
 * Which section renders, given what the work can fill.
 *
 * A section the work cannot fill is absent, and the shell redirects to the nearest one
 * that it can fill. The redirect is stated, never silent, per section 5.1.
 */
export function useSectionAvailability(wanted: SectionKey, filled: Set<SectionKey>, workMissing: boolean): SectionAvailability {
  return useMemo(() => {
    const available = new Set(filled);
    return { available, section: resolveSection(wanted, available, workMissing) };
  }, [wanted, filled, workMissing]);
}

/** The href for one section of one work item. */
export function sectionHref(workId: string, section: SectionKey, tail?: string): string {
  return routeHref(workId, section, tail);
}
