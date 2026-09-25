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
 * THE ONE THING THIS FILE DOES NOT REUSE IS THE PAGER. The shell lays a paged level's
 * sections on a horizontal track, one on screen, with a strip above and a pager below.
 * This prototype's navigation is the rail, so a section is a scroll box and the track is
 * gone. The panels are unchanged.
 *
 * THE TWO COMPOSITIONS THAT DIFFER FROM THE SHELL ARE NAMED. The shell's Intent level
 * gives the container drawing to `WhySection` and the Architecture level takes every
 * later drawing, and this file keeps that split exactly. The shell's Build level pages its
 * epics in runs of six, and this file keeps `epicGroups` too, so the two cannot disagree
 * about which epic sits in which run.
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
 * One program section, as the shell's own panels render it.
 *
 * A level state the rail could not fill reads `null` here and the panel states its own
 * absence. The shell passes a non-null state to two of these panels, so the fallback is a
 * state that says the record is not available rather than a state that claims it is.
 */
export function ProgramBody(props: ProgramBodyProps): ReactNode {
  const { section, work, levels, adrs, theme, gated, openSheet } = props;
  const missing: LevelState = { key: "architecture", available: false, missing: [] };

  if (section === "intent") {
    return (
      <>
        <WhySection
          work={work}
          theme={theme}
          /* The container drawing is the first level, and it belongs to this section. */
          levels={work.diagramLevels.filter((level) => level === "1")}
        />
        <DoneWhenSection work={work} />
        <AbortIfSection work={work} />
        <OutOfScopeSection work={work} />
      </>
    );
  }

  if (section === "problem-and-solution") {
    return (
      <>
        <ProblemSolutionSection
          work={work}
          levelState={levels?.["problem-and-solution"] ?? missing}
        />
        <RisksSection work={work} />
        <AssessmentSection work={work} />
        <UnknownsSection work={work} />
      </>
    );
  }

  if (section === "architecture") {
    return (
      <>
        <DiagramsSection
          work={work}
          theme={theme}
          /* The container drawing belongs to Intent, so this section takes the rest. */
          levels={work.diagramLevels.slice(1)}
        />
        <DecisionsSection
          work={work}
          adrs={adrs}
          levelState={levels?.["architecture"] ?? missing}
          openSheet={openSheet}
        />
        <BoundariesSection work={work} openSheet={openSheet} />
        <DistrictsAndAlternativesSection work={work} />
      </>
    );
  }

  if (section === "epics") {
    return (
      <>
        {epicGroups(work).map((group, position) => (
          <EpicGroupSection
            key={`epics-${position}`}
            work={work}
            group={group}
            focusEpic={null}
            openSheet={openSheet}
          />
        ))}
      </>
    );
  }

  return (
    <Bento>
      <RubricsSection work={work} gated={gated} />
    </Bento>
  );
}
