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

export type PagedLevelKey = (typeof PAGED_LEVELS)[number];

/** True when this section has a track. Build's Rubrics sub-view is the one exception. */
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
 * THE CONTAINER DRAWING SITS INSIDE THE WHY PANEL, at the end of its body. This
 * level used to lead with a Diagrams section of its own, and the engineer moved the
 * drawing into Why. The level therefore renders no section named Diagrams, and the
 * Why panel draws the tiles itself.
 *
 * THE LEVEL IS CHOSEN BY ITS NUMBER. A bundle's first diagram level is its container
 * drawing: it names the surfaces and the people who use them, and that answers what
 * this work is and who it is for. The levels after it are mechanism and belong to
 * Architecture. The filter names level "1" rather than taking the first entry, so a
 * record that carries levels 2 and 3 alone draws nothing here.
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

/*
 * The mechanism drawings. The container drawing is the Intent level's, so this level
 * takes every level after the first: the build sequence and the data model.
 */
function architectureSections({ work, theme, adrs, levelState, openSheet }: PagedArgs): ReactNode[] {
  if (levelState === null) return [];
  return [
    <DiagramsSection key="diagrams" work={work} theme={theme} levels={work.diagramLevels.slice(1)} />,
    <DecisionsSection key="decisions" work={work} adrs={adrs} levelState={levelState} openSheet={openSheet} />,
    <BoundariesSection key="boundaries" work={work} openSheet={openSheet} />,
    <DistrictsAndAlternativesSection key="districts" work={work} />,
  ];
}

/* The unresolved-slices panel keeps a section of its own when the bundle holds one. */
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
 * The Build level is the one level whose sections come from the corpus rather than from
 * a fixed list: its epics are chunked, and the chunking rule lives in `./model` beside
 * the other derivations. A route that names an epic is answered by the chunk that holds
 * it, which is also where the reader lands.
 */
export function pagedSections(args: PagedArgs): ReactNode[] {
  return BUILDERS[args.section](args);
}

/** The chunk a route's epic falls in, so a deep link lands on the epic itself. */
export function epicStartIndex(work: WorkItem, focusEpic: string | null): number {
  if (focusEpic === null) return 0;
  const found = epicGroups(work).findIndex((group) =>
    group.some((epic) => epic.epic_id === focusEpic),
  );
  return Math.max(0, found);
}
