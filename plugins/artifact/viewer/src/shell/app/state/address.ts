import { useMemo } from "react";

import type { PullRequest } from "@/data/types";

import { useSectionAvailability } from "../../hooks";
import { gatesOf, levelsOf, worklessPullRequest, type Gates, type SectionKey } from "../../model";
import type { Catalog } from "./catalog";
import type { ShellCore } from "./core";

type Levels = NonNullable<ReturnType<typeof levelsOf>>;

const LEVEL_SECTIONS = ["intent", "problem-and-solution", "architecture"] as const;

function levelSections(levels: Levels | null): SectionKey[] {
  if (!levels) return [];
  return LEVEL_SECTIONS.filter((key) => levels[key].available);
}

/*
 * A workless pull request fills the change's account and nothing else. Its four rows
 * live in `pull-requests`, so that section is what its address resolves to, and a route
 * that asks for another section redirects there and states the redirect.
 */
function gateSections(gates: Gates | null, workless: boolean): SectionKey[] {
  const wanted: Array<[boolean, SectionKey]> = [
    [Boolean(gates?.build), "build"],
    [Boolean(gates?.pullRequests) || workless, "pull-requests"],
    [Boolean(gates?.shipped), "shipped"],
  ];
  return wanted.filter(([on]) => on).map(([, key]) => key);
}

function useFilledSections(gates: Gates | null, levels: Levels | null, worklessPr: PullRequest | null) {
  return useMemo(
    () => new Set([...levelSections(levels), ...gateSections(gates, worklessPr !== null)]),
    [gates, levels, worklessPr],
  );
}

/*
 * The workless change. A route whose work segment names no design is not always an
 * address that resolved to nothing. A pull request no design carries has no work item,
 * so no id names one, and `model.pullRequestHref` puts that pull request's number in the
 * work segment. `model.worklessPullRequest` reads the same rule backwards, and this is
 * where the shell applies it. So one segment names a design or a pull request, and the
 * shell renders whichever the index holds rather than the error.
 *
 * The lookup runs only where a design did not claim the segment, so a design row and its
 * own pull request can never be two answers to one address.
 *
 * The third argument means the address resolved to nothing at all. A workless pull
 * request names no design but resolves to a real surface, so the flag covers both
 * sources, and only an id neither source holds keeps the route's own section and error.
 */
export function useWorkAddress({ route }: ShellCore, { works, allPullRequests }: Catalog) {
  const work = route.workId ? (works.get(route.workId) ?? null) : null;
  const gates: Gates | null = work ? gatesOf(work) : null;
  const levels = work ? levelsOf(work) : null;
  const worklessPr = work === null && route.workId !== null ? worklessPullRequest(allPullRequests, route.workId) : null;
  const filled = useFilledSections(gates, levels, worklessPr);
  const { section } = useSectionAvailability(route.section, filled, work === null && worklessPr === null);
  return { work, gates, levels, worklessPr, board: route.workId === null, filled, section };
}

export type Address = ReturnType<typeof useWorkAddress>;
