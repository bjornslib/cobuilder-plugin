/**
 * The three levels: Intent, Problem & Solution, Architecture.
 *
 * Each panel is a heading, a short real excerpt, and a stated source field. Where a
 * record is absent the panel names the record in place, because an absent record is a
 * fact the reader needs to see.
 *
 * TWO SHAPES CARRY THE CONTENT, AND THEY ARE THE RECORD MOSAIC'S. A `Box` turns one
 * named field into a card, and an accordion holds a list whose entries repeat. The
 * engineer named the record mosaic as the variation that "does a better job at
 * displaying content in cards and boxes", so the problem column, the solution column,
 * the assessment summary, and every decision now render as boxes rather than as
 * paragraphs with labels. The nested-repeat case gets the accordion: decisions, and
 * assessment findings. A decision's full record opens in a Sheet, because the record
 * carries fourteen fields and the panel needs to show one line.
 *
 * Every value here comes from `data/index.json` or from `data/designs.js`. Nothing is
 * invented, and no panel guesses a value to fill a gap.
 */

import { AlertOctagon, Ban, BookMarked, Boxes, CircleHelp, Compass, FileText, GitBranch, GitPullRequest, ListChecks, Network, Scale, ScrollText, ShieldAlert, Target } from "lucide-react";

import BasicAccordion from "@/components/smoothui/basic-accordion";

import type { AdrEntity } from "@/data/types";

import type { AdrRecord } from "./records";
import { excerpt } from "./records";
import type { AssessmentFinding } from "./records";
import type { DecisionCarrier, LevelState, WorkItem } from "./model";
import { splitBeats } from "./model";
import type { SheetSubject } from "./Sheet";
import {
  AbsentLine,
  ActionButton,
  Box,
  Chip,
  EmptyNote,
  Field,
  Missing,
  Panel,
  SourceLine,
  StateBadge,
  SubHead,
  TextList,
  toneForSeverity,
  toneForStage,
  toneForVerdict,
} from "./atoms";
import { Diagram, type Theme } from "./Diagram";
import { VERDICT_GLOSS } from "./gloss";

const RECORD_SLOTS = ["goal", "intent", "narrative", "assessment", "diagrams", "pr-draft"] as const;

function recordSlots(work: WorkItem) {
  const record = work.record;
  return RECORD_SLOTS.map((slot) => {
    const present =
      slot === "goal"
        ? record !== undefined
        : slot === "intent"
          ? record?.intent !== undefined
          : slot === "narrative"
            ? record?.narrative !== undefined
            : slot === "assessment"
              ? record?.assessment !== undefined
              : slot === "diagrams"
                ? work.diagramLevels.length > 0
                : (record?.pr_draft ?? "").trim().length > 0;
    return { slot, present };
  });
}

/** The readiness of one panel, from the level state the rail already computed. */
function readinessOf(level: LevelState | undefined, fallback: "present" | "absent") {
  if (!level) return fallback;
  return level.available ? ("present" as const) : ("absent" as const);
}

/* -------------------------------------------------------------------- Intent */

export function IntentPanel({ work, levelState }: { work: WorkItem; levelState: LevelState }) {
  const record = work.record;
  const goal = record?.goal;
  const intent = record?.intent;

  const branches = [...new Set(work.epics.map((epic) => epic.branch).filter(Boolean))];
  const done = work.epics.filter((epic) => {
    const state = work.epicState(epic);
    return state === "completed" || state === "merged";
  }).length;
  const slots = recordSlots(work);
  const present = slots.filter((slot) => slot.present).length;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* ---------------------------------------------------------- identity */}
      <Panel
        title="Identity"
        icon={FileText}
        lead="Who this work is, where it sits, and how far it has run."
        readiness={readinessOf(levelState, record ? "present" : "absent")}
        missing={levelState.available ? undefined : levelState.missing}
      >
        <div className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-3.5 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Work id">
            <span className="font-mono text-[15px]">{work.id}</span>
          </Field>
          <Field label="Stage">
            <StateBadge
              word={work.design.stage}
              tone={toneForStage(work.design.stage)}
              gloss={VERDICT_GLOSS[work.design.stage] ?? undefined}
            />
          </Field>
          <Field label="Branch">
            {branches.length === 0 ? (
              <span className="text-ink-dim">no branch recorded</span>
            ) : (
              <span className="flex min-w-0 flex-col gap-1">
                {branches.map((branch) => (
                  <span key={branch} className="flex min-w-0 items-center gap-2 font-mono text-[13.5px]">
                    <GitBranch className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
                    <span className="min-w-0 break-words">{branch}</span>
                  </span>
                ))}
              </span>
            )}
          </Field>
          <Field label="Epics">
            <span className="font-mono text-[15px] tabular-nums">
              {work.epics.length}
              <span className="text-ink-faint"> · {done} done</span>
            </span>
          </Field>
          <Field label="Records" className="sm:col-span-2">
            <span className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="mr-1 font-mono text-[14px] font-bold tabular-nums">
                {present} of {slots.length}
              </span>
              {slots.map((slot) => (
                <Chip
                  key={slot.slot}
                  tone={slot.present ? "good" : "neutral"}
                  dashed={!slot.present}
                  title={slot.present ? "This record exists." : "This record is absent."}
                  className={slot.present ? undefined : "text-ink-faint"}
                >
                  {slot.slot}
                </Chip>
              ))}
            </span>
          </Field>
          <Field label="Supersedes">
            {goal?.supersedes && goal.supersedes.length > 0 ? (
              <span className="flex flex-wrap gap-1.5">
                {goal.supersedes.map((id) => (
                  <Chip key={id} tone="warn">
                    {id}
                  </Chip>
                ))}
              </span>
            ) : (
              <span className="text-ink-dim">nothing</span>
            )}
          </Field>
          {goal?.superseded_by ? (
            <Field label="Superseded by">
              <Chip tone="warn">{goal.superseded_by}</Chip>
            </Field>
          ) : null}
        </div>
        <SourceLine>
          read from <code>entities.design</code>, <code>entities.epic</code>, and{" "}
          <code>joins.epic_status</code> in <code>data/index.json</code>, plus the record
          files under <code>designs.js</code>.
        </SourceLine>
      </Panel>

      {/* ---------------------------------------------------- contract band */}
      <Panel
        title="The contract"
        icon={Target}
        lead="Why the work exists, what would make it done, what would stop it, and what it leaves out."
        readiness={goal ? "present" : "absent"}
      >
        <div className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex min-w-0 flex-col gap-2">
            <ColumnHead label="Why" field="goal.outcome" />
            {goal ? (
              <Box label="Outcome">{excerpt(goal.outcome, 260)}</Box>
            ) : (
              <Missing detail="The record file carries no goal for this design.">
                No goal record, so the work states no outcome.
              </Missing>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <ColumnHead label="Done when" field="goal.done_when" />
            {goal && (goal.done_when?.length ?? 0) > 0 ? (
              <TextList items={goal.done_when ?? []} ordered />
            ) : (
              <Missing detail="goal.done_when holds no entry for this work.">
                No done-when condition is recorded.
              </Missing>
            )}
          </div>

          {/* Abort if — beside Done when, because a reader weighs the two together. */}
          <div className="flex min-w-0 flex-col gap-2">
            <ColumnHead label="Abort if" field="goal.abort_if" />
            {goal && (goal.abort_if?.length ?? 0) > 0 ? (
              <TextList items={goal.abort_if ?? []} />
            ) : (
              <Missing detail="goal.abort_if holds no entry for this work. The column says so rather than rendering blank.">
                No abort condition is recorded.
              </Missing>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <ColumnHead label="Out of scope" field="intent.out_of_scope" />
            {intent && (intent.out_of_scope?.length ?? 0) > 0 ? (
              <TextList items={intent.out_of_scope ?? []} />
            ) : (
              <Missing detail="No intent.json in this design's directory.">
                No scope boundary is recorded.
              </Missing>
            )}
          </div>
        </div>
        <SourceLine>
          read from <code>goal.json</code> and <code>intent.json</code> through{" "}
          <code>data/designs.js</code>.
        </SourceLine>
      </Panel>
    </div>
  );
}

function ColumnHead({ label, field }: { label: string; field: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 border-b border-line-soft pb-1.5">
      <span className="font-mono text-[12.5px] font-bold tracking-[0.08em] uppercase">
        {label}
      </span>
      <span className="min-w-0 font-mono text-[12px] break-words text-ink-faint">{field}</span>
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

  const alternatives = intent?.alternatives ?? [];
  const findings = assessment?.findings ?? [];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Panel
        title="Problem and solution"
        icon={Scale}
        lead="The narrative beats, split by kind: problem and constraint on the left, decision and risk on the right."
        readiness={readinessOf(levelState, "absent")}
        missing={levelState.available ? undefined : levelState.missing}
      >
        <div className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
          {/* Problem column */}
          <div className="flex min-w-0 flex-col gap-3">
            <ColumnHead
              label="Problem"
              field="narrative.problem_solution.beats[kind=problem|constraint]"
            />
            {beats.problem.length > 0 ? (
              <TextList
                items={beats.problem.map((beat) => `${beat.text} — ${beat.kind}`)}
              />
            ) : (
              <AbsentLine>No beat of kind problem or constraint is recorded.</AbsentLine>
            )}
            {intent?.problem ? (
              <Box label="Problem" tone="problem">
                {excerpt(intent.problem, 320)}
              </Box>
            ) : (
              <Missing detail="No intent.json in this design's directory.">
                No authored problem statement.
              </Missing>
            )}
          </div>

          {/* Solution column */}
          <div className="flex min-w-0 flex-col gap-3">
            <ColumnHead
              label="Solution"
              field="narrative.problem_solution.beats[kind=decision|risk]"
            />
            {beats.solution.length > 0 ? (
              <TextList items={beats.solution.map((beat) => `${beat.text} — ${beat.kind}`)} />
            ) : (
              <AbsentLine>No beat of kind decision or risk is recorded.</AbsentLine>
            )}
            {intent?.approach ? (
              <Box label="Approach" tone="solution">
                {excerpt(intent.approach, 320)}
              </Box>
            ) : (
              <Missing detail="No intent.json in this design's directory.">
                No authored approach statement.
              </Missing>
            )}
          </div>
        </div>

        {beats.other.length > 0 ? (
          <p className="m-0 mt-3 min-w-0 font-mono text-[12px] text-ink-faint">
            {beats.other.length} beat
            {beats.other.length === 1 ? "" : "s"} carry a kind outside the four the split
            names: {[...new Set(beats.other.map((beat) => beat.kind))].join(", ")}.
          </p>
        ) : null}
        <SourceLine>
          beats read from <code>narrative.problem_solution.beats[]</code>, split by{" "}
          <code>kind</code>. Prose read from <code>intent.problem</code> and{" "}
          <code>intent.approach</code>.
        </SourceLine>
      </Panel>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Risks"
          icon={ShieldAlert}
          lead="What the work costs if it ships as written."
          readiness={intent && (intent.risks?.length ?? 0) > 0 ? "present" : "absent"}
        >
          {intent && (intent.risks?.length ?? 0) > 0 ? (
            <TextList items={intent.risks ?? []} />
          ) : (
            <Missing detail="intent.risks holds no entry, or no intent.json exists.">
              No risk is recorded.
            </Missing>
          )}
        </Panel>

        <Panel
          title="Unknowns"
          icon={CircleHelp}
          lead="What nobody has settled yet."
          readiness={intent && (intent.unknowns?.length ?? 0) > 0 ? "present" : "absent"}
        >
          {intent && (intent.unknowns?.length ?? 0) > 0 ? (
            <TextList items={intent.unknowns ?? []} />
          ) : (
            <Missing detail="intent.unknowns holds no entry, or no intent.json exists.">
              No open question is recorded.
            </Missing>
          )}
        </Panel>
      </div>

      {/* Assessment. The verdict leads, because it is the answer a reader came for. */}
      <Panel
        title="Assessment"
        icon={BookMarked}
        lead="The verdict leads, because it is the answer a reader came for."
        readiness={assessment ? "present" : "absent"}
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

            <SourceLine>
              assessment.verdict, assessment.findings, and assessment.risk_tier. Each finding
              opens in place.
            </SourceLine>
          </div>
        ) : (
          <Missing detail="No assessment.json in this design's directory, so the panel shows no verdict. An absent verdict is not a pass.">
            This work carries no assessment record.
          </Missing>
        )}
      </Panel>

      <Panel
        title="Alternatives considered"
        icon={Ban}
        lead="What the design rejected, and the reason it recorded."
        readiness={alternatives.length > 0 ? "present" : "absent"}
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
          <Missing detail="intent.alternatives holds no entry, or no intent.json exists.">
            No alternative is recorded.
          </Missing>
        )}
      </Panel>
    </div>
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
          <div className="flex min-w-0 flex-col gap-2">
            <p className="m-0 min-w-0 font-serif text-[16px] leading-[1.6] text-ink-mid">
              {finding.detail}
            </p>
            <SourceLine>
              kind <code>{finding.kind}</code>, severity{" "}
              <code>{finding.severity ?? "unrecorded"}</code>, from{" "}
              <code>assessment.findings</code>.
            </SourceLine>
          </div>
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

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Panel
        title="Linked decisions"
        icon={ScrollText}
        lead="Each decision with the rule it enforces, the pull request that carried it, and its whole record one press away."
        readiness={readinessOf(levelState, linked.length > 0 ? "present" : "absent")}
        missing={levelState.available ? undefined : levelState.missing}
      >
        {linked.length > 0 ? (
          <DecisionList work={work} adrs={adrs} openSheet={openSheet} />
        ) : (
          <Missing detail="goal.adrs[] holds no entry, and goal.adr is null.">
            This work names no decision.
          </Missing>
        )}
        {missingAdr.length > 0 ? (
          <AbsentLine>
            {missingAdr.length} named decision
            {missingAdr.length === 1 ? "" : "s"} did not resolve to an <code>entities.adr</code>{" "}
            row: {missingAdr.map((adr) => adr.id).join(", ")}.
          </AbsentLine>
        ) : null}
        <SourceLine>
          read from <code>goal.adrs[]</code> in <code>designs.js</code>, resolved against{" "}
          <code>entities.adr</code>, with each rule from <code>adrs.js</code>. The carrying
          pull request comes from <code>joins.adr_to_pull_request</code>, and it is shown
          here rather than in the Pull requests group, per section 3.3.
        </SourceLine>
      </Panel>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Boundary rules"
          icon={AlertOctagon}
          lead="The rules the touched contexts declare, and the reason each one carries."
          readiness={work.boundaryRules.length > 0 ? "present" : "absent"}
        >
          {work.boundaryRules.length > 0 ? (
            <div className="flex min-w-0 flex-col gap-2.5">
              {work.boundaryRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex min-w-0 flex-col gap-2 rounded-lg border border-line-soft bg-surface-2/50 px-3.5 py-2.5"
                >
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <Chip tone="warn">{rule.kind}</Chip>
                    <span className="min-w-0 font-mono text-[13.5px] break-words">
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
                  >
                    Open the whole rule
                  </ActionButton>
                </div>
              ))}
            </div>
          ) : (
            <Missing detail="No linked decision names a context, so the join resolves no boundary rule.">
              No boundary rule applies to this work.
            </Missing>
          )}
        </Panel>

        <Panel
          title="Districts and contexts touched"
          icon={Boxes}
          lead="Where the linked decisions land, read from the two joins."
          readiness={
            work.contexts.length > 0 || work.districts.length > 0 ? "present" : "absent"
          }
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
                {work.districtsUncovered.map((district) => district.label).join(", ")} carries
                no verifying context, per <code>joins.district_uncovered</code>.
              </AbsentLine>
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel
        title="Diagrams"
        icon={Network}
        lead="The source is shown as code. The runtime loads from a CDN when the reader presses Render, and at no other moment."
        readiness={work.diagramLevels.length > 0 ? "present" : "absent"}
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
          <Missing detail="No diagrams/ directory, or it holds no level-N.mmd file. Level 4 carries no diagram by design.">
            No diagram level exists for this work.
          </Missing>
        )}
      </Panel>

      {work.record?.pr_draft ? (
        <Panel
          title="Envisioned pull request"
          icon={Compass}
          lead="The pull-request draft the design wrote before any code existed."
          readiness="present"
        >
          <Box label="Draft">{excerpt(work.record.pr_draft, 260)}</Box>
          <SourceLine>
            pr-draft.md, {work.record.pr_draft.trim().split("\n").length} lines.
          </SourceLine>
        </Panel>
      ) : null}

      <Panel
        title="Where an epic's own architecture lives"
        icon={ListChecks}
        lead="Section 2.2 lists the Gate 4b technical solution design under Architecture, for an epic."
        readiness="partial"
      >
        <EmptyNote>
          A Gate 4b design belongs to one epic, so it is disclosed inside that epic in the
          Build section, and it opens in a Sheet there. This panel reads no epic, so it does
          not repeat them. {work.epicDesigns.size} of this work&apos;s {work.epics.length}{" "}
          epics resolve one.
        </EmptyNote>
        <SourceLine>
          resolved from <code>entities.epic_design</code>, by epic id and by{" "}
          <code>feature_slug</code>. Section 12.5 records the keys that do not resolve.
        </SourceLine>
      </Panel>
    </div>
  );
}

/**
 * The linked decisions, as an accordion, with the carrying pull request beside each one.
 *
 * Section 3.3 puts the carrying pull request here rather than in the Pull requests
 * group, and labels it as the pull request that carried the decision. The label says
 * whether one of this work's own epics is on the join's path, so a reader can tell the
 * two cases apart at a glance.
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
        const carrier = work.decisionCarriers.get(adr.id);
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
                <Chip tone="warn" dashed title="adrs.js carries no entry for this id.">
                  no body
                </Chip>
              ) : null}
              {carrier ? (
                <Chip
                  tone={carrier.onThisWork ? "accent" : "neutral"}
                  title={
                    carrier.onThisWork
                      ? `joins.adr_to_pull_request reaches pull request ${carrier.pr}, and one of this work's own epics carries it.`
                      : `joins.adr_to_pull_request reaches pull request ${carrier.pr}, which no epic of this work carries.`
                  }
                >
                  <GitPullRequest className="size-3.5" aria-hidden="true" />
                  carried by PR {carrier.pr}
                </Chip>
              ) : (
                <Chip dashed className="text-ink-faint" title="The join reaches no pull request.">
                  no PR
                </Chip>
              )}
              <StateBadge word={adr.state} tone={toneForStage(adr.state)} />
            </>
          ),
          content: (
            <div className="flex min-w-0 flex-col gap-3">
              {full?.maps_to?.rule ? (
                <Box label="The rule this decision enforces">{full.maps_to.rule}</Box>
              ) : (
                <AbsentLine>
                  adrs.js carries no <code>maps_to.rule</code> for this decision, so only the
                  title is available here. The whole record names the rest.
                </AbsentLine>
              )}

              <CarrierNote carrier={carrier} />

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
                    carrier,
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

/** The pull request that carried one decision. Absent is stated, never implied. */
function CarrierNote({ carrier }: { carrier: DecisionCarrier | undefined }) {
  if (!carrier) {
    return (
      <AbsentLine>
        The bundle reaches no pull request for this decision, so no pull request carried it.
      </AbsentLine>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-line-soft border-l-4 border-l-primary bg-surface px-3 py-2.5">
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <Chip tone="accent">
          <GitPullRequest className="size-3.5" aria-hidden="true" />
          PR {carrier.pr}
        </Chip>
        <span className="font-mono text-[12.5px] text-ink-dim">
          the pull request that carried this decision
        </span>
      </span>
      {carrier.entity ? (
        <span className="min-w-0 font-serif text-[15.5px] leading-[1.5] text-ink-mid">
          {carrier.entity.title}
        </span>
      ) : null}
      <span className="min-w-0 font-mono text-[12px] break-words text-ink-faint">
        reached via {carrier.via}
        {carrier.path.length > 0 ? `, across ${carrier.path.length} epics` : ", directly"}
        {carrier.onThisWork
          ? ". One of this work's own epics carries it."
          : ". No epic of this work carries it, so it is not in this work's own set."}
      </span>
    </div>
  );
}
