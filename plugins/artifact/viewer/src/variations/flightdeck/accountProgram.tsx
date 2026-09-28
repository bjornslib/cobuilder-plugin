/**
 * The program's account: what the work set out to do, read from its own design records.
 *
 * EVERY BODY HERE IS A SHIPPED PANEL. `src/shell/panels/` and `src/shell/sections.tsx`
 * hold the panels the shipped shell renders for exactly these five sections, and this
 * file composes them rather than drawing a second set. So the prototype's Build group
 * reads the same records, in the same order, with the same absences stated in the same
 * words, as the shell's own Intent, Problem & Solution, Architecture, and Build levels.
 * A reader who compares the prototype with the shipped surface is comparing one render
 * with itself, so the rail is the only thing this prototype changes.
 *
 * ONE PANEL IS ONE SECTION, AND THIS FILE RETURNS THEM AS A LIST. The shell's own paged
 * level holds one panel per section, because the section strip reads its links from the
 * panel headings and a section holding two panels would put two links on the strip and
 * one step on the pager. This file returns one element per panel, so the surface above
 * can hand that list straight to the shell's own stage, strip, and pager and get the same
 * one-link-per-panel shape the shipped shell has.
 *
 * THE TWO COMPOSITIONS THAT DIFFER FROM THE SHELL ARE NAMED. The shell's Intent level
 * gives the container drawing to `WhySection` and the Architecture level takes every
 * later drawing, and this file keeps that split exactly. The shell's Build level pages its
 * epics in runs of six, and this file keeps `epicGroups` too, so the two cannot disagree
 * about which epic sits in which run. One run is one panel, so one run is one section.
 */

import type { ReactNode } from "react";

import { Bento } from "@/shell/atoms";
import type { Theme } from "@/shell/DiagramTiles";
import type { SheetSubject } from "@/shell/Sheet";
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
  RubricsSection,
  UnknownsSection,
  WhySection,
} from "@/shell/panels";
import { epicGroups } from "@/shell/model";
import type { LevelState } from "@/shell/model";
import type { WorkItem } from "@/data/works";
import type { AdrRecords } from "@/data/adrs";

import type { ProgramKey } from "./accountModel";

export interface ProgramBodyProps {
  section: ProgramKey;
  work: WorkItem;
  /** The level state the shell's own rule produced, never a second derivation. */
  levels: Record<string, LevelState> | null;
  adrs: AdrRecords;
  theme: Theme;
  gated: boolean;
  openSheet: (subject: SheetSubject) => void;
}

/**
 * One program section, as the shell's own panels render it, one panel per returned entry.
 *
 * A level state the rail could not fill reads `null` here and the panel states its own
 * absence. The shell passes a non-null state to two of these panels, so the fallback is a
 * state that says the record is not available rather than a state that claims it is.
 */
export function programSections(props: ProgramBodyProps): ReactNode[] {
  const { section, work, levels, adrs, theme, gated, openSheet } = props;
  const missing: LevelState = { key: "architecture", available: false, missing: [] };

  if (section === "intent") {
    return [
      /* The container drawing is the first level, and it belongs to this section. */
      <WhySection
        key="why"
        work={work}
        theme={theme}
        levels={work.diagramLevels.filter((level) => level === "1")}
      />,
      <DoneWhenSection key="done-when" work={work} />,
      <AbortIfSection key="abort-if" work={work} />,
      <OutOfScopeSection key="out-of-scope" work={work} />,
    ];
  }

  if (section === "problem-and-solution") {
    return [
      <ProblemSolutionSection
        key="problem-and-solution"
        work={work}
        levelState={levels?.["problem-and-solution"] ?? missing}
      />,
      <RisksSection key="risks" work={work} />,
      <AssessmentSection key="assessment" work={work} />,
      <UnknownsSection key="unknowns" work={work} />,
    ];
  }

  if (section === "architecture") {
    return [
      /* The container drawing belongs to Intent, so this section takes the rest. */
      <DiagramsSection key="diagrams" work={work} theme={theme} levels={work.diagramLevels.slice(1)} />,
      <DecisionsSection
        key="decisions"
        work={work}
        adrs={adrs}
        levelState={levels?.["architecture"] ?? missing}
        openSheet={openSheet}
      />,
      <BoundariesSection key="boundaries" work={work} openSheet={openSheet} />,
      <DistrictsAndAlternativesSection key="districts-and-alternatives" work={work} />,
    ];
  }

  if (section === "epics") {
    return epicGroups(work).map((group, position) => (
      <EpicGroupSection
        key={`epics-${position}`}
        work={work}
        group={group}
        focusEpic={null}
        openSheet={openSheet}
      />
    ));
  }

  return [
    <Bento key="rubrics">
      <RubricsSection work={work} gated={gated} openSheet={openSheet} />
    </Bento>,
  ];
}
