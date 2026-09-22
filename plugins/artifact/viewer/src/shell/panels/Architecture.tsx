/**
 * The Architecture level: Diagrams, Architecture Decisions, Boundaries, Districts and
 * alternatives considered.
 *
 * ARCHITECTURE IS FOUR SECTIONS, AND THE LEVEL PAGES THEM. It used to be one `Bento` of
 * six panels: diagrams, the decisions, the reach, the rules, the alternatives, and the
 * envisioned pull request. The engineer regrouped it, and each section is now its own
 * box on the pager track, so no panel names a span.
 *
 * The envisioned pull request left this level for the Pull requests level, where it is
 * the first block. It is the pull request this work will open, so it belongs beside the
 * pull requests rather than beside the decisions that shaped it.
 *
 * The four sections keep the order the engineer asked for: Diagrams, Architecture
 * Decisions, Boundaries, Districts and alternatives considered.
 *
 * THIS FILE IS THE PORTED PROTOTYPE at `src/variations/sections-e/panels.tsx`, split by
 * level so `panels/` holds one file per level. The decision body comes from `../records`,
 * which holds the one reader `@/data/bundle` does not yet carry, and the diagram tiles
 * come from `../DiagramTiles`, which the port made the single home of the runtime.
 */

import { AlertOctagon, Boxes, Network, ScrollText } from "lucide-react";

import BasicAccordion from "@/components/smoothui/basic-accordion";
import TiltCard from "@/components/smoothui/tilt-card";
import type { AdrEntity } from "@/data/types";
import { cn } from "@/lib/utils";

import type { AdrRecord } from "../records";
import { excerpt } from "../records";
import type { LevelState, WorkItem } from "../model";
import type { SheetSubject } from "../Sheet";
import {
  AbsentLine,
  ActionButton,
  Box,
  Chip,
  Missing,
  Panel,
  StateBadge,
  TINT_BAR,
  toneForStage,
} from "../atoms";
import { DiagramTiles } from "../DiagramTiles";
import type { Theme } from "../DiagramTiles";

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
export function DiagramsSection({
  work,
  theme,
  levels,
}: {
  work: WorkItem;
  theme: Theme;
  /** The level numbers to draw, in the order to draw them. */
  levels: string[];
}) {
  const sources = work.record?.diagrams ?? null;

  return (
    <Panel
      title="Diagrams"
      icon={Network}
      lead="One tile per level. A press opens the drawing whole."
      absent={levels.length === 0 || sources === null}
    >
      {levels.length > 0 && sources ? (
        <DiagramTiles levels={levels} sources={sources} theme={theme} />
      ) : (
        <Missing>No diagram level exists for this work.</Missing>
      )}
    </Panel>
  );
}

/** Architecture Decisions. */
export function DecisionsSection({
  work,
  adrs,
  levelState,
  openSheet,
}: {
  work: WorkItem;
  adrs: Record<string, AdrRecord>;
  levelState: LevelState;
  openSheet: (subject: SheetSubject) => void;
}) {
  const linked = work.linkedAdrs;
  const missingAdr = linked.filter((adr) => adrs[adr.id] === undefined);

  return (
    <Panel
      title="Architecture Decisions"
      icon={ScrollText}
      lead="Each decision with the rule it enforces, and its whole record one press away."
      absent={!levelState.available}
    >
      {linked.length > 0 ? (
        <DecisionList work={work} adrs={adrs} openSheet={openSheet} />
      ) : (
        <Missing>This work names no decision.</Missing>
      )}
      {missingAdr.length > 0 ? (
        <AbsentLine>
          {missingAdr.length} named decision
          {missingAdr.length === 1 ? "" : "s"} did not resolve to a decision record:{" "}
          {missingAdr.map((adr) => adr.id).join(", ")}.
        </AbsentLine>
      ) : null}
    </Panel>
  );
}

/** Boundaries. The rules the touched contexts declare, unchanged. */
export function BoundariesSection({
  work,
  openSheet,
}: {
  work: WorkItem;
  openSheet: (subject: SheetSubject) => void;
}) {
  return (
    <Panel
      title="Boundaries"
      icon={AlertOctagon}
      lead="The rules the touched contexts declare, and the reason each one carries."
      absent={work.boundaryRules.length === 0}
      count={work.boundaryRules.length}
    >
      {work.boundaryRules.length > 0 ? (
        <div className="grid min-w-0 grid-cols-1 gap-2.5 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {/*
            SIXTEEN SMALL TILES, AND THEY ARE THE ONE BEST FIT FOR A TILT. A reader
            picks one up with the pointer, and the two lines it holds do not need to
            be read in a fixed plane. `glare={false}` is the tilt-without-glare
            variant: the component renders its glare overlay only when `glare` is
            true, so the prop is the whole difference.
          */}
          {work.boundaryRules.map((rule) => (
            <TiltCard key={rule.id} className="h-full" glare={false}>
              <div className="flex h-full min-w-0 flex-col gap-2 rounded-lg border border-line-soft bg-surface-2/50 px-3.5 py-2.5 transition-colors duration-150 ease-house hover:bg-surface-3">
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <Chip tone="warn">{rule.kind}</Chip>
                  {/* The card's own sub-heading, so it takes the level-three bar. */}
                  <span className={cn("min-w-0 font-mono text-[13.5px] break-words", TINT_BAR)}>
                    {rule.target}
                  </span>
                </span>
                {rule.why ? (
                  <p className="m-0 min-w-0 font-serif text-[15.5px] leading-[1.5] text-ink-dim">
                    {excerpt(rule.why, 180)}
                  </p>
                ) : null}
                <ActionButton
                  icon={AlertOctagon}
                  onClick={() =>
                    openSheet({
                      kind: "boundary",
                      id: rule.id,
                      kindLabel: rule.kind,
                      target: rule.target,
                      context: rule.context,
                      contextEntity: work.contexts.find((c) => c.id === rule.context),
                      detail: rule.detail,
                    })
                  }
                  ariaLabel={`Open the whole boundary rule ${rule.id}`}
                  className="mt-auto"
                >
                  Open the whole rule
                </ActionButton>
              </div>
            </TiltCard>
          ))}
        </div>
      ) : (
        <Missing>No boundary rule applies to this work.</Missing>
      )}
    </Panel>
  );
}

/**
 * Districts and alternatives considered, merged.
 *
 * The engineer asked to see how the two could merge, and the merge only works at a
 * tighter density. Measured before this change: the reach panel was 440 px and the nine
 * alternatives were 1183 px, so a merge that kept both shapes would have been 1623 px,
 * or three pages of this stage, which is worse than two sections. So the reach loses its
 * two sub-heading rules and its gaps and becomes one strip of chips, and each
 * alternative loses its card padding and sets its two parts on one flowing line.
 *
 * THE REACH STRIP CARRIES PLAIN LABELS, NOT SUB-HEADINGS. `SubHead` draws a tinted bar
 * with a rule under it, which is what made the old panel tall. The two labels here are
 * the shell's 12 px mono label, the same one the top line uses for `branch` and `epics`.
 * Their counts are gone with the sub-headings: the chips are the count.
 *
 * THE ALTERNATIVE ROWS FLOW. The option keeps its semibold weight and the reason keeps
 * the dim ink, and the two share one line that wraps, so a row costs a line or two
 * instead of a padded card.
 */
export function DistrictsAndAlternativesSection({ work }: { work: WorkItem }) {
  const alternatives = work.record?.intent?.alternatives ?? [];
  const reachEmpty = work.contexts.length === 0 && work.districts.length === 0;

  return (
    <Panel
      title="Districts and alternatives considered"
      icon={Boxes}
      lead="Where the linked decisions land, and what the design rejected."
      absent={reachEmpty && alternatives.length === 0}
      count={alternatives.length}
    >
      {/* The reach: one strip, two labels, their chips, and the uncovered line. */}
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="shrink-0 font-mono text-[12px] tracking-[0.05em] text-ink-faint uppercase">
            contexts
          </span>
          {work.contexts.length > 0 ? (
            work.contexts.map((context) => (
              <Chip key={context.id} tone="accent" title={context.path}>
                {context.id}
              </Chip>
            ))
          ) : (
            <span className="font-mono text-[12px] text-ink-faint">
              No linked decision names a context.
            </span>
          )}
        </span>

        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="shrink-0 font-mono text-[12px] tracking-[0.05em] text-ink-faint uppercase">
            districts
          </span>
          {work.districts.length > 0 ? (
            work.districts.map((district) => (
              <Chip key={district.id}>{district.label}</Chip>
            ))
          ) : (
            <span className="font-mono text-[12px] text-ink-faint">
              No linked decision names a district.
            </span>
          )}
        </span>

        {work.districtsUncovered.length > 0 ? (
          <span className="min-w-0 font-mono text-[12px] text-ink-faint">
            {work.districtsUncovered.map((district) => district.label).join(", ")} carries no
            verifying context.
          </span>
        ) : null}
      </div>

      {alternatives.length > 0 ? (
        <div className="mt-3 flex min-w-0 flex-col gap-1.5">
          {alternatives.map((alt, index) => (
            <div
              key={`${index}-${alt.option.slice(0, 20)}`}
              className="min-w-0 rounded-lg border border-dashed border-line bg-surface-2/40 px-3 py-2"
            >
              <p className="m-0 min-w-0 font-serif text-[15.5px] leading-[1.45] text-ink-dim">
                <span className="font-semibold text-foreground">{alt.option}</span>{" "}
                rejected because {alt.rejected_because}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <Missing>No alternative is recorded.</Missing>
      )}
    </Panel>
  );
}

/**
 * The linked decisions, as an accordion.
 *
 * The pull request a decision reached used to sit here, as a chip on the row and as a
 * block in the body. The engineer removed it: the work item's own state already says
 * whether the work reached a pull request, so a decision did not need to say it a
 * second time. The whole record is still one press away, and it carries the fields
 * the bundle keeps for it.
 */
function DecisionList({
  work,
  adrs,
  openSheet,
}: {
  work: WorkItem;
  adrs: Record<string, AdrRecord>;
  openSheet: (subject: SheetSubject) => void;
}) {
  return (
    <BasicAccordion
      allowMultiple
      idPrefix="adr"
      defaultExpandedIds={work.linkedAdrs.length === 1 ? [work.linkedAdrs[0].id] : []}
      items={work.linkedAdrs.map((adr: AdrEntity) => {
        const full = adrs[adr.id];
        return {
          id: adr.id,
          title: (
            <span className="flex min-w-0 flex-1 items-baseline gap-2.5">
              <span className="shrink-0 font-mono text-[14px] font-bold text-accent-deep">
                {adr.id}
              </span>
              <span className="min-w-0 font-serif text-[16px] leading-[1.45]">{adr.title}</span>
            </span>
          ),
          meta: (
            <>
              {!full ? (
                <Chip tone="warn" dashed title="No record body was read for this decision.">
                  no body
                </Chip>
              ) : null}
              <StateBadge word={adr.state} tone={toneForStage(adr.state)} />
            </>
          ),
          content: (
            <div className="flex min-w-0 flex-col gap-3">
              {full?.maps_to?.rule ? (
                <Box label="The rule this decision enforces">{full.maps_to.rule}</Box>
              ) : (
                <AbsentLine>
                  This decision states no enforceable rule here, so only the title is
                  available. The whole record names the rest.
                </AbsentLine>
              )}

              {full?.maps_to?.modules && full.maps_to.modules.length > 0 ? (
                <span className="flex min-w-0 flex-wrap gap-1.5">
                  {full.maps_to.modules.map((module) => (
                    <Chip key={module} className="text-ink-faint">
                      {module}
                    </Chip>
                  ))}
                </span>
              ) : null}

              <ActionButton
                icon={ScrollText}
                onClick={() =>
                  openSheet({
                    kind: "adr",
                    record: full,
                    title: adr.title,
                    state: adr.state,
                  })
                }
                ariaLabel={`Open the whole record for ${adr.id}`}
              >
                Open the whole record
              </ActionButton>
            </div>
          ),
        };
      })}
    />
  );
}
