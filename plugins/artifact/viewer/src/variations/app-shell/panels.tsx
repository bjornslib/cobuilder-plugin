/**
 * The three levels: Intent, Problem & Solution, Architecture.
 *
 * Each panel is a heading, a short real excerpt, and a stated source field. The
 * mockup exists to let the engineer judge the information hierarchy, so a panel
 * never dumps a whole record. Where a record is absent the panel names the record
 * in place, because an absent record is a fact the reader needs to see.
 *
 * Every value here comes from `data/index.json` or from `data/designs.js`. Nothing
 * is invented, and no panel guesses a value to fill a gap.
 */

import {
  AlertOctagon,
  Ban,
  BookMarked,
  Boxes,
  CircleHelp,
  Compass,
  FileText,
  GitBranch,
  ListChecks,
  Network,
  Scale,
  ScrollText,
  ShieldAlert,
  Target,
  XCircle,
} from "lucide-react";

import type { AdrRecord } from "./records";
import { excerpt } from "./records";
import type { WorkItem } from "./model";
import { splitBeats } from "./model";
import {
  AbsentLine,
  Bullets,
  Chip,
  Field,
  Missing,
  Panel,
  SourceLine,
  StateBadge,
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

/* -------------------------------------------------------------------- Intent */

export function IntentPanel({ work }: { work: WorkItem }) {
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
    <div className="flex flex-col gap-4">
      {/* ---------------------------------------------------------- identity */}
      <Panel
        title="Identity"
        icon={FileText}
        lead="Who this work is, where it sits, and how far it has run."
      >
        <div className="grid grid-cols-2 gap-x-5 gap-y-3.5 md:grid-cols-3 xl:grid-cols-4">
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
              <span className="flex flex-col gap-1">
                {branches.map((branch) => (
                  <span key={branch} className="flex items-center gap-2 font-mono text-[13.5px]">
                    <GitBranch className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
                    {branch}
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
          <Field label="Records" className="md:col-span-2">
            <span className="flex flex-wrap items-center gap-1.5">
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
      >
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
          {/* Why */}
          <div className="flex min-w-0 flex-col gap-1.5">
            <ColumnHead label="Why" field="goal.outcome" />
            {goal ? (
              <p className="m-0 font-serif text-[16px] leading-[1.55] text-foreground">
                {excerpt(goal.outcome, 260)}
              </p>
            ) : (
              <Missing detail="The record file carries no goal for this design.">
                No goal record, so the work states no outcome.
              </Missing>
            )}
          </div>

          {/* Done when */}
          <div className="flex min-w-0 flex-col gap-1.5">
            <ColumnHead label="Done when" field="goal.done_when" />
            {goal && (goal.done_when?.length ?? 0) > 0 ? (
              <Bullets
                items={goal.done_when ?? []}
                limit={2}
                tone="good"
                onOverflow={(hidden) => `and ${hidden} more, in the goal record.`}
              />
            ) : (
              <Missing detail="goal.done_when holds no entry for this work.">
                No done-when condition is recorded.
              </Missing>
            )}
          </div>

          {/* Abort if — beside Done when, because a reader weighs the two together. */}
          <div className="flex min-w-0 flex-col gap-1.5">
            <ColumnHead label="Abort if" field="goal.abort_if" />
            {goal && (goal.abort_if?.length ?? 0) > 0 ? (
              <Bullets
                items={goal.abort_if ?? []}
                limit={2}
                tone="danger"
                onOverflow={(hidden) => `and ${hidden} more, in the goal record.`}
              />
            ) : (
              <Missing detail="goal.abort_if holds no entry for this work. The column says so rather than rendering blank.">
                No abort condition is recorded.
              </Missing>
            )}
          </div>

          {/* Out of scope */}
          <div className="flex min-w-0 flex-col gap-1.5">
            <ColumnHead label="Out of scope" field="intent.out_of_scope" />
            {intent && (intent.out_of_scope?.length ?? 0) > 0 ? (
              <Bullets
                items={intent.out_of_scope ?? []}
                limit={2}
                onOverflow={(hidden) => `and ${hidden} more, in the intent record.`}
              />
            ) : (
              <Missing detail="No intent.json in this design's directory.">
                No scope boundary is recorded.
              </Missing>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function ColumnHead({ label, field }: { label: string; field: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line-soft pb-1.5">
      <span className="font-mono text-[12.5px] font-bold tracking-[0.08em] uppercase">
        {label}
      </span>
      <span className="font-mono text-[12px] text-ink-faint">{field}</span>
    </div>
  );
}

/* ------------------------------------------------------- Problem & Solution */

export function ProblemSolutionPanel({ work }: { work: WorkItem }) {
  const record = work.record;
  const intent = record?.intent;
  const ps = record?.narrative?.problem_solution;
  const assessment = record?.assessment;
  const beats = splitBeats(ps?.beats);

  const alternatives = intent?.alternatives ?? [];
  const findings = assessment?.findings ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Problem and solution"
        icon={Scale}
        lead="The narrative beats, split by kind: problem and constraint on the left, decision and risk on the right."
      >
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
          {/* Problem column */}
          <div className="flex min-w-0 flex-col gap-3">
            <ColumnHead label="Problem" field="narrative.problem_solution.beats[kind=problem|constraint]" />
            {beats.problem.length > 0 ? (
              <Bullets
                items={beats.problem.map((beat) => `${beat.text} — ${beat.kind}`)}
                limit={4}
                tone="danger"
              />
            ) : (
              <AbsentLine>No beat of kind problem or constraint is recorded.</AbsentLine>
            )}
            {intent?.problem ? (
              <>
                <p className="m-0 font-serif text-[16px] leading-[1.55] text-foreground">
                  {excerpt(intent.problem, 320)}
                </p>
                <SourceLine>intent.problem, excerpted.</SourceLine>
              </>
            ) : (
              <Missing detail="No intent.json in this design's directory.">
                No authored problem statement.
              </Missing>
            )}
          </div>

          {/* Solution column */}
          <div className="flex min-w-0 flex-col gap-3">
            <ColumnHead label="Solution" field="narrative.problem_solution.beats[kind=decision|risk]" />
            {beats.solution.length > 0 ? (
              <Bullets
                items={beats.solution.map((beat) => `${beat.text} — ${beat.kind}`)}
                limit={4}
                tone="accent"
              />
            ) : (
              <AbsentLine>No beat of kind decision or risk is recorded.</AbsentLine>
            )}
            {intent?.approach ? (
              <>
                <p className="m-0 font-serif text-[16px] leading-[1.55] text-foreground">
                  {excerpt(intent.approach, 320)}
                </p>
                <SourceLine>intent.approach, excerpted.</SourceLine>
              </>
            ) : (
              <Missing detail="No intent.json in this design's directory.">
                No authored approach statement.
              </Missing>
            )}
          </div>
        </div>

        {beats.other.length > 0 ? (
          <p className="m-0 mt-3 font-mono text-[12px] text-ink-faint">
            {beats.other.length} beat
            {beats.other.length === 1 ? "" : "s"} carry a kind outside the four the split
            names: {[...new Set(beats.other.map((beat) => beat.kind))].join(", ")}.
          </p>
        ) : null}
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Risks" icon={ShieldAlert} lead="What the work costs if it ships as written.">
          {intent && (intent.risks?.length ?? 0) > 0 ? (
            <Bullets items={intent.risks ?? []} limit={3} tone="warn" />
          ) : (
            <Missing detail="intent.risks holds no entry, or no intent.json exists.">
              No risk is recorded.
            </Missing>
          )}
        </Panel>

        <Panel title="Unknowns" icon={CircleHelp} lead="What nobody has settled yet.">
          {intent && (intent.unknowns?.length ?? 0) > 0 ? (
            <Bullets items={intent.unknowns ?? []} limit={3} />
          ) : (
            <Missing detail="intent.unknowns holds no entry, or no intent.json exists.">
              No open question is recorded.
            </Missing>
          )}
        </Panel>
      </div>

      <Panel
        title="Assessment"
        icon={BookMarked}
        lead="The verdict leads, because it is the answer a reader came for."
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
          <div className="flex flex-col gap-3.5">
            <p className="m-0 font-serif text-[16px] leading-[1.55] text-foreground">
              {excerpt(assessment.summary ?? "", 300)}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={toneForSeverity(assessment.risk_tier)}>
                risk tier {assessment.risk_tier ?? "unrecorded"}
              </Chip>
              <Chip>{findings.length} findings</Chip>
              <Chip>{assessment.stage ?? "stage unrecorded"}</Chip>
            </div>

            {findings.length > 0 ? (
              <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
                {findings.slice(0, 3).map((finding) => (
                  <li
                    key={finding.id ?? finding.title}
                    className="flex flex-col gap-1 rounded-lg border border-line-soft bg-surface-2 px-3 py-2"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <Chip tone={toneForSeverity(finding.severity)}>
                        {finding.severity ?? finding.kind}
                      </Chip>
                      {finding.id ? (
                        <span className="font-mono text-[12px] text-ink-faint">{finding.id}</span>
                      ) : null}
                    </span>
                    <span className="font-serif text-[16px] leading-[1.5] text-foreground">
                      {finding.title}
                    </span>
                    <span className="font-serif text-[15px] leading-[1.5] text-ink-dim">
                      {excerpt(finding.detail, 220)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}

            {findings.length > 3 ? (
              <p className="m-0 font-mono text-[12px] text-ink-faint">
                and {findings.length - 3} more findings in assessment.json.
              </p>
            ) : null}

            <SourceLine>
              assessment.verdict, assessment.findings, and assessment.risk_tier. Findings are
              excerpted at three.
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
      >
        {alternatives.length > 0 ? (
          <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
            {alternatives.slice(0, 3).map((alt, index) => (
              <li
                key={`${index}-${alt.option.slice(0, 20)}`}
                className="flex flex-col gap-1 rounded-lg border border-line-soft border-l-4 border-l-line bg-surface-2 px-3 py-2"
              >
                <span className="flex items-start gap-2">
                  <XCircle
                    className="mt-1 size-4 shrink-0 text-destructive"
                    aria-hidden="true"
                  />
                  <span className="font-serif text-[16px] leading-[1.5] text-foreground">
                    {alt.option}
                  </span>
                </span>
                <span className="pl-6 font-serif text-[15px] leading-[1.5] text-ink-dim">
                  rejected because {alt.rejected_because}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <Missing detail="intent.alternatives holds no entry, or no intent.json exists.">
            No alternative is recorded.
          </Missing>
        )}
        {alternatives.length > 3 ? (
          <p className="m-0 mt-2.5 font-mono text-[12px] text-ink-faint">
            and {alternatives.length - 3} more alternatives in intent.json.
          </p>
        ) : null}
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------- Architecture */

export function ArchitecturePanel({
  work,
  adrs,
  theme,
}: {
  work: WorkItem;
  adrs: Record<string, AdrRecord>;
  theme: Theme;
}) {
  const linked = work.linkedAdrs;
  const missingAdr = linked.filter((adr) => adrs[adr.id] === undefined);

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Linked decisions"
        icon={ScrollText}
        lead="Each decision with the rule it enforces, not only its title."
      >
        {linked.length > 0 ? (
          <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
            {linked.map((adr) => {
              const full = adrs[adr.id];
              return (
                <li
                  key={adr.id}
                  className="flex flex-col gap-1.5 rounded-lg border border-line-soft bg-surface-2 px-3.5 py-2.5"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[12.5px] font-bold text-accent-deep">
                      {adr.id}
                    </span>
                    <Chip>{adr.state}</Chip>
                    {!full ? (
                      <Chip tone="warn" dashed>
                        no body in adrs.js
                      </Chip>
                    ) : null}
                  </span>
                  <span className="font-serif text-[16px] leading-[1.5] text-foreground">
                    {adr.title}
                  </span>
                  {full?.maps_to?.rule ? (
                    <span className="flex items-start gap-2 rounded-md border border-line-soft border-l-4 border-l-primary bg-surface px-2.5 py-2">
                      <span className="font-serif text-[15.5px] leading-[1.5] text-ink-mid">
                        {full.maps_to.rule}
                      </span>
                    </span>
                  ) : (
                    <AbsentLine>
                      adrs.js carries no maps_to.rule for this decision, so only the title
                      is available.
                    </AbsentLine>
                  )}
                  {full?.maps_to?.modules && full.maps_to.modules.length > 0 ? (
                    <span className="flex flex-wrap gap-1.5">
                      {full.maps_to.modules.slice(0, 4).map((module) => (
                        <Chip key={module} className="text-ink-faint">
                          {module}
                        </Chip>
                      ))}
                      {full.maps_to.modules.length > 4 ? (
                        <Chip dashed className="text-ink-faint">
                          +{full.maps_to.modules.length - 4}
                        </Chip>
                      ) : null}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
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
          <code>entities.adr</code>, with each rule from <code>adrs.js</code>. The index
          carries no design-to-decision join.
        </SourceLine>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Boundary rules"
          icon={AlertOctagon}
          lead="The rules the touched contexts declare, and the reason each one carries."
        >
          {work.boundaryRules.length > 0 ? (
            <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
              {work.boundaryRules.slice(0, 4).map((rule) => (
                <li key={rule.id} className="flex flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <Chip tone="warn">{rule.kind}</Chip>
                    <span className="font-mono text-[13.5px]">{rule.target}</span>
                  </span>
                  {rule.why ? (
                    <span className="font-serif text-[15.5px] leading-[1.5] text-ink-dim">
                      {excerpt(rule.why, 180)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <Missing detail="No linked decision names a context, so the join resolves no boundary rule.">
              No boundary rule applies to this work.
            </Missing>
          )}
          {work.boundaryRules.length > 4 ? (
            <p className="m-0 mt-2.5 font-mono text-[12px] text-ink-faint">
              and {work.boundaryRules.length - 4} more rules across the touched contexts.
            </p>
          ) : null}
        </Panel>

        <Panel
          title="Districts and contexts touched"
          icon={Boxes}
          lead="Where the linked decisions land, read from the two joins."
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[12px] tracking-[0.06em] text-ink-faint uppercase">
                Contexts
              </span>
              {work.contexts.length > 0 ? (
                <span className="flex flex-wrap gap-1.5">
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
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[12px] tracking-[0.06em] text-ink-faint uppercase">
                Districts
              </span>
              {work.districts.length > 0 ? (
                <span className="flex flex-wrap gap-1.5">
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
      >
        {work.diagramLevels.length > 0 && work.record?.diagrams ? (
          <div className="flex flex-col gap-4">
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
        >
          <p className="m-0 font-serif text-[16px] leading-[1.55] text-foreground">
            {excerpt(work.record.pr_draft, 260)}
          </p>
          <SourceLine>
            pr-draft.md, {work.record.pr_draft.trim().split("\n").length} lines.
          </SourceLine>
        </Panel>
      ) : null}

      <Panel title="Gate 4b design" icon={ListChecks} lead="A per-epic technical solution design, when one exists.">
        <Missing detail="The index's epic_design entities cover five other features. None of them is this work's plan slug.">
          No epic design document resolves for this work.
        </Missing>
      </Panel>
    </div>
  );
}
