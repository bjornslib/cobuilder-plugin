import { useMemo } from "react";

import { routeHref, type SectionKey } from "../model";

export interface SectionAvailability {
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

/*
 * A section the work cannot fill is absent. The shell redirects to the nearest one
 * it can fill, and the redirect is stated, never silent (section 5.1).
 */
export function useSectionAvailability(wanted: SectionKey, filled: Set<SectionKey>, workMissing: boolean): SectionAvailability {
  return useMemo(() => {
    const available = new Set(filled);
    return { available, section: resolveSection(wanted, available, workMissing) };
  }, [wanted, filled, workMissing]);
}

export function sectionHref(workId: string, section: SectionKey, tail?: string): string {
  return routeHref(workId, section, tail);
}
