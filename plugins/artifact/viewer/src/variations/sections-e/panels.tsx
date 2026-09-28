/**
 * The three levels: Intent, Problem & Solution, Architecture.
 *
 * Each panel is a heading, a short real excerpt, and the records that back it. Where a
 * record is absent the panel states the absence in place, because an absent record is a
 * fact the reader needs to see. It does not name the file it looked in, and it does not
 * announce that a record it did find is there. See `atoms.tsx` rule 4.
 *
 * EACH PANEL IS A TILE OF A BENTO GRID. The level used to be one column of full-width
 * panels, so every panel claimed the same width whether it held one line or a table.
 * Each panel now names a span, and the span follows its content weight. The contract
 * band and the problem/solution pair take two thirds, risks and unknowns take one
 * third, and a long list takes the full width. `atoms.tsx` holds the grid and the
 * named spans.
 *
 * An inner grid reads the tile, not the viewport. A `sm:` breakpoint inside a
 * one-third tile would fire on a wide viewport and crush the tile's own columns, so
 * every inner grid in this file uses a container query instead.
 *
 * PROBLEM AND SOLUTION IS TWO CARDS, AND THE POINTS ARE THEIR ROWS. The engineer asked
 * twice for this shape, so it is worth stating what it replaced. Each point used to sit
 * in its own outlined box, and the authored problem and approach prose sat in two more
 * boxes below, painted amber and green. That is two treatments for one thing, and the
 * colour was doing work the words already did. Now each column is one shadcn `Card`.
 * The authored prose is the card's unboxed lead, and the points are striped rows under
 * it. `PointCard` in `atoms.tsx` is that shape.
 *
 * NO PANEL ON THIS LEVEL STARTS CLOSED. Assessment, Risks, and Unknowns used to render
 * collapsed, and the reason was the stacked page: the pane is 558 px tall at 1280x633
 * and a full Problem and solution section ran several thousand pixels, so a reader was
 * not made to scroll past three folds to reach what they wanted. The level pages one
 * section at a time now, so every panel is its own page and a fold inside it is a fold
 * inside a fold. A reader who arrives at a section sees the whole of it.
 *
 * The panes of shell D still start closed, because that shell still stacks its panels
 * into one scroll.
 *
 * Every value here comes from the bundle's record index and its record files. Nothing
 * is invented, and no panel guesses a value to fill a gap.
 */

import { AlertOctagon, Ban, BookMarked, Boxes, CircleHelp, ListChecks, Network, Scale, ScrollText, ShieldAlert, Target, TriangleAlert } from "lucide-react";

import BasicAccordion from "@/components/smoothui/basic-accordion";
import TiltCard from "@/components/smoothui/tilt-card";
import { cn } from "@/lib/utils";

import type { AdrEntity } from "@/data/types";

import type { AdrRecord } from "./records";
import { excerpt } from "./records";
import type { AssessmentFinding } from "./records";
import type { LevelState, WorkItem } from "./model";
import { splitBeats } from "./model";
import type { SheetSubject } from "./Sheet";
import {
  AbsentLine,
  ActionButton,
  Box,
  Chip,
  Missing,
  Panel,
  PointCard,
  StateBadge,
  TextList,
  TINT_BAR,
  toneForSeverity,
  toneForStage,
  toneForVerdict,
} from "./atoms";
import { DiagramTiles } from "./DiagramTiles";
import type { Theme } from "./Diagram";
import { VERDICT_GLOSS } from "./gloss";

/* -------------------------------------------------------------------- Intent */

/*
 * INTENT IS FOUR SECTIONS, ONE PER PART OF THE CONTRACT. The level was one panel with
 * four parts and ran to 4.2 pages, so a reader met the plan a screen at a time only if
 * they scrolled. Each part is now its own box on the pager track and each carries the
 * whole width of the box, which is the room the contract's lists deserve.
 *
 * THE BODY OF EVERY PART IS UNCHANGED. Its `ColumnHead`, its `Box`, its `TextList`, and
 * its absence line are the ones the single panel rendered; only the container around
 * them changed.
 *
 * Each part also carries its own absence gate now. The single panel gated all four on
 * the goal record alone, so a work with a goal and no abort condition showed an "Abort
 * if" part with nothing under it and no pill to say why. A part that fails its own rule
 * is absent, which is the rule every other panel in this shell already follows.
 *
 * The four sections carry no lead. The single panel's lead named all four parts, so
 * repeating it four times would state the other three, and writing four new sentences
 * would invent prose the record does not hold. The panel's own title and its ColumnHead
 * name the part between them.
 */

/** Why. The goal record's outcome. */
export function WhySection({ work }: { work: WorkItem }) {
  const goal = work.record?.goal;

  return (
    <Panel title="Why" icon={Target} absent={!goal}>
      <div className="flex min-w-0 flex-col gap-2">
        <ColumnHead label="Why" />
        {goal ? (
          <Box label="Outcome">{excerpt(goal.outcome, 260)}</Box>
        ) : (
          <Missing>No goal record, so the work states no outcome.</Missing>
        )}
      </div>
    </Panel>
  );
}

/** Done when. The conditions that make the work done. */
export function DoneWhenSection({ work }: { work: WorkItem }) {
  const goal = work.record?.goal;
  const done = goal?.done_when ?? [];

  return (
    <Panel title="Done when" icon={ListChecks} absent={done.length === 0}>
      <div className="flex min-w-0 flex-col gap-2">
        <ColumnHead label="Done when" />
        {done.length > 0 ? (
          <TextList items={done} ordered />
        ) : (
          <Missing>No done-when condition is recorded.</Missing>
        )}
      </div>
    </Panel>
  );
}

/** Abort if. The conditions that would stop the work. */
export function AbortIfSection({ work }: { work: WorkItem }) {
  const abort = work.record?.goal?.abort_if ?? [];

  return (
    <Panel title="Abort if" icon={TriangleAlert} absent={abort.length === 0}>
      <div className="flex min-w-0 flex-col gap-2">
        <ColumnHead label="Abort if" />
        {abort.length > 0 ? (
          <TextList items={abort} />
        ) : (
          <Missing>No abort condition is recorded.</Missing>
        )}
      </div>
    </Panel>
  );
}

/** Out of scope. The boundary the intent states. */
export function OutOfScopeSection({ work }: { work: WorkItem }) {
  const scope = work.record?.intent?.out_of_scope ?? [];

  return (
    <Panel title="Out of scope" icon={Ban} absent={scope.length === 0}>
      <div className="flex min-w-0 flex-col gap-2">
        <ColumnHead label="Out of scope" />
        {scope.length > 0 ? (
          <TextList items={scope} />
        ) : (
          <Missing>No scope boundary is recorded.</Missing>
        )}
      </div>
    </Panel>
  );
}

/**
 * A column's own heading.
 *
 * It carries the visible word and nothing else. It used to print the field path under
 * the word, so a reader saw `goal.outcome` where they needed to see `WHY`. The engineer
 * removed that, and the whole shell now follows the rule.
 */
function ColumnHead({ label }: { label: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 border-b border-line-soft pb-1.5">
      <span className="font-mono text-[12.5px] font-bold tracking-[0.08em] uppercase">
        {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------- Problem & Solution */

/*
 * THE LEVEL IS FOUR SECTIONS, NOT ONE GRID. It used to be a `Bento` holding four
 * `Panel`s, and each panel named a span inside a twelve-column grid. The level is a
 * horizontal pager now, so each section is its own box on the track and takes the whole
 * width of the stage it sits in. Every panel keeps its heading, icon, lead, absence
 * rule, count, and body; the only change is that a section returns one `Panel` rather
 * than a grid wrapper, and no panel names a span.
 *
 * A section is never reordered. The order here is the order the reader walks with Next:
 * Problem and solution, Risks, Assessment, Unknowns.
 */

/** Problem and solution. Two cards, and the narrative beats are their rows. */
export function ProblemSolutionSection({
  work,
  levelState,
}: {
  work: WorkItem;
  levelState: LevelState;
}) {
  const record = work.record;
  const intent = record?.intent;
  const beats = splitBeats(record?.narrative?.problem_solution?.beats);

  return (
    <Panel
      title="Problem and solution"
      icon={Scale}
      lead="The narrative beats, split by kind: problem and constraint on the left, decision and risk on the right."
      absent={!levelState.available}
    >
      {/* One card per column. The lead is the record's own prose; the rows are the beats. */}
      <div className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-5 @xl:grid-cols-2">
        <PointCard
          title="Problem"
          lead={intent?.problem ? excerpt(intent.problem, 320) : undefined}
          points={beats.problem.map((beat) => ({ text: beat.text, kind: beat.kind }))}
          empty="No beat of kind problem or constraint is recorded, and no authored problem statement."
        />
        <PointCard
          title="Solution"
          lead={intent?.approach ? excerpt(intent.approach, 320) : undefined}
          points={beats.solution.map((beat) => ({ text: beat.text, kind: beat.kind }))}
          empty="No beat of kind decision or risk is recorded, and no authored approach statement."
        />
      </div>

      {beats.other.length > 0 ? (
        <p className="m-0 mt-3 min-w-0 font-mono text-[12px] text-ink-faint">
          {beats.other.length} beat
          {beats.other.length === 1 ? "" : "s"} carry a kind outside the four the split
          names: {[...new Set(beats.other.map((beat) => beat.kind))].join(", ")}.
        </p>
      ) : null}
    </Panel>
  );
}

/** Risks. */
export function RisksSection({ work }: { work: WorkItem }) {
  const risks = work.record?.intent?.risks ?? [];

  return (
    <Panel
      title="Risks"
      icon={ShieldAlert}
      lead="What the work costs if it ships as written."
      absent={risks.length === 0}
      count={risks.length}
    >
      {risks.length > 0 ? (
        <TextList items={risks} />
      ) : (
        <Missing>No risk is recorded.</Missing>
      )}
    </Panel>
  );
}

/** Assessment. The verdict leads, because it is the answer a reader came for. */
export function AssessmentSection({ work }: { work: WorkItem }) {
  const assessment = work.record?.assessment;
  const findings = assessment?.findings ?? [];

  return (
    <Panel
      title="Assessment"
      icon={BookMarked}
      lead="The verdict leads, because it is the answer a reader came for."
      absent={!assessment}
      count={findings.length}
      action={
        assessment ? (
          <StateBadge
            word={assessment.verdict}
            tone={toneForVerdict(assessment.verdict)}
            gloss={VERDICT_GLOSS[assessment.verdict] ?? "A verdict outside the recorded vocabulary."}
            className="text-[14px]"
          />
        ) : null
      }
    >
      {assessment ? (
        <div className="flex min-w-0 flex-col gap-3.5">
          <Box label="Summary">{excerpt(assessment.summary ?? "", 300)}</Box>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Chip tone={toneForSeverity(assessment.risk_tier)}>
              risk tier {assessment.risk_tier ?? "unrecorded"}
            </Chip>
            <Chip>{findings.length} findings</Chip>
            <Chip>{assessment.stage ?? "stage unrecorded"}</Chip>
          </div>

          {findings.length > 0 ? <FindingList findings={findings} /> : null}
        </div>
      ) : (
        <Missing>
          This work carries no assessment record, so the panel shows no verdict. An
          absent verdict is not a pass.
        </Missing>
      )}
    </Panel>
  );
}

/** Unknowns. */
export function UnknownsSection({ work }: { work: WorkItem }) {
  const unknowns = work.record?.intent?.unknowns ?? [];

  return (
    <Panel
      title="Unknowns"
      icon={CircleHelp}
      lead="What nobody has settled yet."
      absent={unknowns.length === 0}
      count={unknowns.length}
    >
      {unknowns.length > 0 ? (
        <TextList items={unknowns} />
      ) : (
        <Missing>No open question is recorded.</Missing>
      )}
    </Panel>
  );
}

/** Findings repeat, so they are an accordion. The detail opens on the reader's press. */
function FindingList({ findings }: { findings: AssessmentFinding[] }) {
  return (
    <BasicAccordion
      allowMultiple
      idPrefix="finding"
      items={findings.map((finding, index) => ({
        id: finding.id ?? index,
        title: (
          <span className="min-w-0 font-serif text-[16px] leading-[1.45] font-semibold">
            {finding.title}
          </span>
        ),
        meta: (
          <>
            <Chip tone={toneForSeverity(finding.severity)}>
              {finding.severity ?? finding.kind}
            </Chip>
            {finding.id ? (
              <span className="font-mono text-[12px] text-ink-faint">{finding.id}</span>
            ) : null}
          </>
        ),
        content: (
          <p className="m-0 min-w-0 font-serif text-[16px] leading-[1.6] text-ink-mid">
            {finding.detail}
          </p>
        ),
      }))}
    />
  );
}

/* -------------------------------------------------------------- Architecture */

/*
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
 */

/**
 * Diagrams. The tiles for the levels the caller names, and a press opens one whole.
 *
 * THE CALLER CHOOSES THE LEVELS, and the two levels of this shell choose different ones.
 * A bundle's first diagram level is its container drawing: it names the surfaces and the
 * people who use them, which is the question the Intent level answers. The levels after
 * it are mechanism, and they stay in Architecture. `sections-e/index.tsx` cuts the list.
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
