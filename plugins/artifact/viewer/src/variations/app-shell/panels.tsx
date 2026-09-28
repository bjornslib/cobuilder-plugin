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
 * THREE PANELS START CLOSED. Assessment, Risks, and Unknowns render collapsed, with
 * their headings and counts on the closed row. The pane is 558 px tall at 1280x633 and
 * a full Problem and solution section runs several thousand pixels. A reader who wants
 * one of the three opens it. A reader who does not is not made to scroll past it.
 *
 * Every value here comes from the bundle's record index and its record files. Nothing
 * is invented, and no panel guesses a value to fill a gap.
 */

import { AlertOctagon, Ban, BookMarked, Boxes, CircleHelp, Compass, Network, Scale, ScrollText, ShieldAlert, Target } from "lucide-react";

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
  Bento,
  Box,
  Chip,
  Missing,
  Panel,
  PointCard,
  StateBadge,
  SubHead,
  TextList,
  TINT_BAR,
  toneForSeverity,
  toneForStage,
  toneForVerdict,
} from "./atoms";
import { Diagram, type Theme } from "./Diagram";
import { VERDICT_GLOSS } from "./gloss";

/* -------------------------------------------------------------------- Intent */

export function IntentPanel({ work }: { work: WorkItem }) {
  const record = work.record;
  const goal = record?.goal;
  const intent = record?.intent;

  return (
    <Bento>
      {/*
        The contract leads, and it starts at the pane's left edge. It used to sit to
        the right of an Identity box, and that box is gone. Branch, epic count, and
        supersedes are work-item facts rather than Intent content, so they moved to
        the top-line panel the shell draws above every section. The work item's own
        name and stage stay in the top bar, and neither is repeated here.
      */}
      <Panel
        span="band"
        title="The contract"
        icon={Target}
        lead="Why the work exists, what would make it done, what would stop it, and what it leaves out."
        absent={!goal}
      >
        {/* Two lines. `Why` owns the first one at full width; the other three share
            the second, because a reader weighs them against each other. */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <ColumnHead label="Why" />
            {goal ? (
              <Box label="Outcome">{excerpt(goal.outcome, 260)}</Box>
            ) : (
              <Missing>No goal record, so the work states no outcome.</Missing>
            )}
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-4 @xl:grid-cols-3">
            <div className="flex min-w-0 flex-col gap-2">
              <ColumnHead label="Done when" />
              {goal && (goal.done_when?.length ?? 0) > 0 ? (
                <TextList items={goal.done_when ?? []} ordered />
              ) : (
                <Missing>No done-when condition is recorded.</Missing>
              )}
            </div>

            {/* Abort if — beside Done when, because a reader weighs the two together. */}
            <div className="flex min-w-0 flex-col gap-2">
              <ColumnHead label="Abort if" />
              {goal && (goal.abort_if?.length ?? 0) > 0 ? (
                <TextList items={goal.abort_if ?? []} />
              ) : (
                <Missing>No abort condition is recorded.</Missing>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <ColumnHead label="Out of scope" />
              {intent && (intent.out_of_scope?.length ?? 0) > 0 ? (
                <TextList items={intent.out_of_scope ?? []} />
              ) : (
                <Missing>No scope boundary is recorded.</Missing>
              )}
            </div>
          </div>
        </div>
      </Panel>
    </Bento>
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

export function ProblemSolutionPanel({
  work,
  levelState,
}: {
  work: WorkItem;
  levelState: LevelState;
}) {
  const record = work.record;
  const intent = record?.intent;
  const ps = record?.narrative?.problem_solution;
  const assessment = record?.assessment;
  const beats = splitBeats(ps?.beats);

  const risks = intent?.risks ?? [];
  const unknowns = intent?.unknowns ?? [];
  const findings = assessment?.findings ?? [];

  return (
    <Bento>
      <Panel
        span="wide"
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

      <Panel
        span="narrow"
        title="Risks"
        icon={ShieldAlert}
        lead="What the work costs if it ships as written."
        absent={risks.length === 0}
        count={risks.length}
        collapsible
        defaultOpen={false}
      >
        {risks.length > 0 ? (
          <TextList items={risks} />
        ) : (
          <Missing>No risk is recorded.</Missing>
        )}
      </Panel>

      {/* Assessment. The verdict leads, because it is the answer a reader came for. */}
      <Panel
        span="wide"
        title="Assessment"
        icon={BookMarked}
        lead="The verdict leads, because it is the answer a reader came for."
        absent={!assessment}
        count={findings.length}
        collapsible
        defaultOpen={false}
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

      <Panel
        span="narrow"
        title="Unknowns"
        icon={CircleHelp}
        lead="What nobody has settled yet."
        absent={unknowns.length === 0}
        count={unknowns.length}
        collapsible
        defaultOpen={false}
      >
        {unknowns.length > 0 ? (
          <TextList items={unknowns} />
        ) : (
          <Missing>No open question is recorded.</Missing>
        )}
      </Panel>
    </Bento>
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

export function ArchitecturePanel({
  work,
  adrs,
  theme,
  levelState,
  openSheet,
}: {
  work: WorkItem;
  adrs: Record<string, AdrRecord>;
  theme: Theme;
  levelState: LevelState;
  openSheet: (subject: SheetSubject) => void;
}) {
  const linked = work.linkedAdrs;
  const missingAdr = linked.filter((adr) => adrs[adr.id] === undefined);
  const alternatives = work.record?.intent?.alternatives ?? [];

  return (
    <Bento>
      {/*
        Diagrams lead the section. A reader arrives at Architecture to see the shape,
        and the picture answers that faster than any list below it. The panel runs the
        full width, because a diagram is as wide as its own source and no other tile
        pairs with it on this row.
      */}
      <Panel
        span="band"
        title="Diagrams"
        icon={Network}
        lead="The source is shown as code. The runtime loads from a CDN when the reader presses Render, and at no other moment."
        absent={work.diagramLevels.length === 0}
      >
        {work.diagramLevels.length > 0 && work.record?.diagrams ? (
          <div className="flex min-w-0 flex-col gap-4">
            {work.diagramLevels.map((level) => {
              const source = work.record?.diagrams?.[level];
              if (!source) return null;
              return (
                <Diagram
                  key={level}
                  level={level}
                  kind={source.trim().split("\n")[0]?.trim() ?? "mermaid"}
                  source={source}
                  theme={theme}
                />
              );
            })}
          </div>
        ) : (
          <Missing>No diagram level exists for this work.</Missing>
        )}
      </Panel>

      {/*
        The decisions, and where they land. The districts and contexts sit on this
        row's right, because they answer where the decisions on the left reach, and a
        reader who wants one of the two almost always wants the other.
      */}
      <Panel
        span="wide"
        title="Linked Architecture Decisions"
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

      <Panel
        span="narrow"
        title="Districts and contexts touched"
        icon={Boxes}
        lead="Where the linked decisions land."
        absent={work.contexts.length === 0 && work.districts.length === 0}
      >
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <SubHead count={work.contexts.length}>Contexts</SubHead>
            {work.contexts.length > 0 ? (
              <span className="flex min-w-0 flex-wrap gap-1.5">
                {work.contexts.map((context) => (
                  <Chip key={context.id} tone="accent" title={context.path}>
                    {context.id}
                  </Chip>
                ))}
              </span>
            ) : (
              <AbsentLine>No linked decision names a context.</AbsentLine>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <SubHead count={work.districts.length}>Districts</SubHead>
            {work.districts.length > 0 ? (
              <span className="flex min-w-0 flex-wrap gap-1.5">
                {work.districts.map((district) => (
                  <Chip key={district.id}>{district.label}</Chip>
                ))}
              </span>
            ) : (
              <AbsentLine>No linked decision names a district.</AbsentLine>
            )}
          </div>
          {work.districtsUncovered.length > 0 ? (
            <AbsentLine>
              {work.districtsUncovered.map((district) => district.label).join(", ")} carries no
              verifying context.
            </AbsentLine>
          ) : null}
        </div>
      </Panel>

      {/*
        The rules run the full page width. This corpus carries sixteen of them, and a
        one-third tile turned them into a very tall column of very narrow cards. The
        width is spent on a multi-column grid, so the rules read as a set rather than
        as a queue.
      */}
      <Panel
        span="band"
        title="Boundary rules"
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
                    <span
                      className={cn("min-w-0 font-mono text-[13.5px] break-words", TINT_BAR)}
                    >
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

      {/*
        Alternatives considered sits here, not in Problem and solution. A rejected option
        is an architectural one, and every decision above carries its own rejected
        options beside it, so this groups with like.
      */}
      <Panel
        span="band"
        title="Alternatives considered"
        icon={Ban}
        lead="What the design rejected, and the reason it recorded."
        absent={alternatives.length === 0}
        count={alternatives.length}
      >
        {alternatives.length > 0 ? (
          <div className="flex min-w-0 flex-col gap-2.5">
            {alternatives.map((alt, index) => (
              <div
                key={`${index}-${alt.option.slice(0, 20)}`}
                className="min-w-0 rounded-lg border border-dashed border-line bg-surface-2/50 px-3.5 py-3"
              >
                <div className="min-w-0 font-serif text-[16.5px] leading-[1.55] font-semibold text-foreground">
                  {alt.option}
                </div>
                <p className="mt-1 mb-0 min-w-0 font-serif text-[15.5px] leading-[1.55] text-ink-dim">
                  rejected because {alt.rejected_because}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <Missing>No alternative is recorded.</Missing>
        )}
      </Panel>

      {work.record?.pr_draft ? (
        <Panel
          span="wide"
          title="Envisioned pull request"
          icon={Compass}
          lead="The pull-request draft the design wrote before any code existed."
        >
          <Box label="Draft">{excerpt(work.record.pr_draft, 260)}</Box>
        </Panel>
      ) : null}
    </Bento>
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
