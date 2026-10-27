import type { ReactNode } from "react";

import type { AdrRecord } from "../records";
import type { Theme } from "../DiagramTiles";
import { epicGroups, type LevelState, type SectionKey, type WorkItem } from "../model";
import type { SheetSubject } from "../Sheet";
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
  RisksSection,
  UnknownsSection,
  UnresolvedSlicesSection,
  WhySection,
} from "../panels";

/**
 * The levels that page, in the order the rail lists them.
 *
 * A paged level drops its visible heading band, because the section strip names the
 * level's own sections and a band above it would repeat the same words.
 *
 * The count is never written down. `PagedLevel` reads the length of the sections array,
 * so the strip, the pager text, and the boxes cannot drift apart.
 */
const PAGED_LEVELS = ["intent", "problem-and-solution", "architecture", "build"] as const;

export type PagedLevelKey = (typeof PAGED_LEVELS)[number];

export function isPaged(section: SectionKey): section is PagedLevelKey {
  return (PAGED_LEVELS as readonly SectionKey[]).includes(section);
}

export interface PagedArgs {
  section: PagedLevelKey;
  work: WorkItem;
  levelState: LevelState | null;
  adrs: Record<string, AdrRecord>;
  theme: Theme;
  openSheet: (subject: SheetSubject) => void;
  unresolvedSlices: number;
  focusEpic: string | null;
}

/*
 * The container drawing sits inside the Why panel, at the end of its body. The engineer
 * moved it there from a Diagrams section of its own, so this level renders no section
 * named Diagrams, and the Why panel draws the tiles itself.
 *
 * The level is chosen by its number. A bundle's first diagram level is its container
 * drawing, which names the surfaces and the people who use them. The later levels are
 * mechanism and belong to Architecture. The filter names level "1" rather than taking
 * the first entry, so a record with levels 2 and 3 alone draws nothing here.
 */
function intentSections({ work, theme }: PagedArgs): ReactNode[] {
  const levels = work.diagramLevels.filter((level) => level === "1");
  return [
    <WhySection key="why" work={work} theme={theme} levels={levels} />,
    <DoneWhenSection key="done-when" work={work} />,
    <AbortIfSection key="abort-if" work={work} />,
    <OutOfScopeSection key="out-of-scope" work={work} />,
  ];
}

function problemSections({ work, levelState }: PagedArgs): ReactNode[] {
  if (levelState === null) return [];
  return [
    <ProblemSolutionSection key="problem" work={work} levelState={levelState} />,
    <RisksSection key="risks" work={work} />,
    <AssessmentSection key="assessment" work={work} />,
    <UnknownsSection key="unknowns" work={work} />,
  ];
}

function architectureSections({ work, theme, adrs, levelState, openSheet }: PagedArgs): ReactNode[] {
  if (levelState === null) return [];
  return [
    <DiagramsSection key="diagrams" work={work} theme={theme} levels={work.diagramLevels.slice(1)} />,
    <DecisionsSection key="decisions" work={work} adrs={adrs} levelState={levelState} openSheet={openSheet} />,
    <BoundariesSection key="boundaries" work={work} openSheet={openSheet} />,
    <DistrictsAndAlternativesSection key="districts" work={work} />,
  ];
}

function buildSections({ work, focusEpic, openSheet, unresolvedSlices }: PagedArgs): ReactNode[] {
  const groups = epicGroups(work).map((group, position) => (
    <EpicGroupSection key={`epics-${position}`} work={work} group={group} focusEpic={focusEpic} openSheet={openSheet} />
  ));
  const unresolved = unresolvedSlices > 0 ? [<UnresolvedSlicesSection key="unresolved" count={unresolvedSlices} />] : [];
  return [...groups, ...unresolved];
}

const BUILDERS: Record<PagedLevelKey, (args: PagedArgs) => ReactNode[]> = {
  intent: intentSections,
  "problem-and-solution": problemSections,
  architecture: architectureSections,
  build: buildSections,
};

/**
 * The sections a paged level lays on its track, in the order Next walks them.
 *
 * Build's sections come from the corpus rather than from a fixed list: its epics are
 * chunked, and the chunking rule lives in `./model`. A route that names an epic lands on
 * the chunk that holds it.
 */
export function pagedSections(args: PagedArgs): ReactNode[] {
  return BUILDERS[args.section](args);
}

export function epicStartIndex(work: WorkItem, focusEpic: string | null): number {
  if (focusEpic === null) return 0;
  const found = epicGroups(work).findIndex((group) =>
    group.some((epic) => epic.epic_id === focusEpic),
  );
  return Math.max(0, found);
}
