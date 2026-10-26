import { AlertOctagon, Network, ScrollText } from "lucide-react";

import type { ContextEntity } from "@/data/types";
import type { BoundaryRule } from "@/data/works";

import { ActionButton, Missing, Panel } from "../../atoms";
import type { LevelState, WorkItem } from "../../model";
import type { SheetSubject } from "../../Sheet";
import { DiagramTiles, type Theme } from "../../DiagramTiles";
import { BoundaryTile } from "./boundaryTile";
import { DecisionList, UnresolvedAdrs, type DecisionListProps } from "./decisionList";

interface DiagramsSectionProps {
  work: WorkItem;
  theme: Theme;
  /** The level numbers to draw, in the order to draw them. */
  levels: string[];
}

/**
 * Diagrams. The tiles for the levels the caller names, and a press opens one whole.
 *
 * THE CALLER CHOOSES THE LEVELS, and the two levels of this shell choose different ones.
 * A bundle's first diagram level is its container drawing: it names the surfaces and the
 * people who use them, which is the question the Intent level answers. The levels after
 * it are mechanism, and they stay in Architecture. `App.tsx` cuts the list.
 *
 * The grid follows the count. A row of three columns leaves a hole when two tiles are in
 * it, and a single tile in a three-column row is a third of the page wide.
 */
export function DiagramsSection({ work, theme, levels }: DiagramsSectionProps) {
  const sources = work.record?.diagrams ?? null;
  return (
    <Panel title="Diagrams" icon={Network} absent={levels.length === 0 || sources === null}>
      {levels.length > 0 && sources ? (
        <DiagramTiles levels={levels} sources={sources} theme={theme} />
      ) : (
        <Missing>No diagram level exists for this work.</Missing>
      )}
    </Panel>
  );
}

interface DecisionsSectionProps extends DecisionListProps {
  levelState: LevelState;
}

/** Architecture Decisions. */
export function DecisionsSection({ work, adrs, levelState, openSheet }: DecisionsSectionProps) {
  return (
    <Panel title="Architecture Decisions" icon={ScrollText} absent={!levelState.available}>
      {work.linkedAdrs.length > 0 ? (
        <DecisionList work={work} adrs={adrs} openSheet={openSheet} />
      ) : (
        <Missing>This work names no decision.</Missing>
      )}
      <UnresolvedAdrs linked={work.linkedAdrs} adrs={adrs} />
    </Panel>
  );
}

interface BoundariesProps {
  work: WorkItem;
  openSheet: (subject: SheetSubject) => void;
}

/** Boundaries. The rules the touched contexts declare, unchanged. */
export function BoundariesSection({ work, openSheet }: BoundariesProps) {
  const count = work.boundaryRules.length;
  return (
    <Panel title="Boundaries" icon={AlertOctagon} absent={count === 0} count={count}
      lead="The rules of each affected context, with the reason for each rule.">
      <BoundaryBody work={work} openSheet={openSheet} />
    </Panel>
  );
}

function BoundaryBody({ work, openSheet }: BoundariesProps) {
  if (work.boundaryRules.length === 0) return <Missing>No boundary rule applies to this work.</Missing>;
  return (
    <div className="grid min-w-0 grid-cols-1 gap-2.5 @2xl:grid-cols-2 @5xl:grid-cols-3">
      {work.boundaryRules.map((rule) => (
        <BoundaryTile key={rule.id} rule={rule}>
          <BoundaryOpen rule={rule} context={work.contexts.find((c) => c.id === rule.context)} openSheet={openSheet} />
        </BoundaryTile>
      ))}
    </div>
  );
}

interface BoundaryOpenProps {
  rule: BoundaryRule;
  context: ContextEntity | undefined;
  openSheet: (subject: SheetSubject) => void;
}

function BoundaryOpen({ rule, context, openSheet }: BoundaryOpenProps) {
  const label = `Open the whole boundary rule ${rule.id}`;
  const open = () => openSheet(boundarySubject(rule, context));
  return (
    <ActionButton icon={AlertOctagon} onClick={open} ariaLabel={label} className="mt-auto">
      Open the whole rule
    </ActionButton>
  );
}

function boundarySubject(rule: BoundaryRule, context: ContextEntity | undefined): SheetSubject {
  return {
    kind: "boundary",
    id: rule.id,
    kindLabel: rule.kind,
    target: rule.target,
    context: rule.context,
    contextEntity: context,
    detail: rule.detail,
  };
}
