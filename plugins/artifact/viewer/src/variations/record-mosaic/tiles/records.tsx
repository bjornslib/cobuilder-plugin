/**
 * The seven tiles that carry a record kind: six authored records, plus the
 * decisions this design is linked to.
 *
 * Each tile takes the design model and the tile context and renders. It decides no
 * verdict, computes no join, and reads no file. `Tile` hides the body when the
 * record is absent and names what is missing instead, so an absent record still
 * occupies its place in the mosaic.
 */

import {
  BookOpen,
  Compass,
  FileText,
  Gavel,
  Network,
  ShieldAlert,
  Target,
} from "lucide-react";
import { useState } from "react";

import { MermaidDiagram } from "../Mermaid";
import {
  draftExcerpt,
  draftHeading,
  draftSections,
  diagramKind,
  diagramTitle,
  narrativeBeats,
  narrativeLevel,
  NARRATIVE_LEVELS,
} from "../records";
import type { DesignModel, DecisionModel } from "../records";
import type { NarrativeBeat } from "../types";
import { ActionButton, Chip, InfoBox, KeyValue, MarkdownBlock, Reveal, SPAN, StateBadge, SubHead, TextList, Tile } from "../ui";
import type { TileContext } from "./context";

const SPANS = {
  goal: SPAN[3],
  intent: SPAN[3],
  narrative: SPAN[3],
  assessment: SPAN[3],
  draft: SPAN[2],
  diagrams: SPAN[4],
  decisions: SPAN[3],
};

/* -------------------------------------------------------------------- goal */

export function GoalTile({ design }: { design: DesignModel }) {
  const goal = design.records.goal;
  const [showGrounding, setShowGrounding] = useState(false);

  if (!goal) {
    return (
      <Tile
        label="Goal"
        icon={Target}
        verdict={design.verdicts.goal}
        span={SPANS.goal}
        absentHint="A design directory always holds a goal.json. This one does not, so the mosaic reads nothing for it."
      />
    );
  }

  const epics = goal.epics ?? [];
  const grounded = goal.min_work?.derived_from;

  return (
    <Tile
      label="Goal"
      icon={Target}
      verdict={design.verdicts.goal}
      span={SPANS.goal}
      absentHint=""
      headerExtra={<StateBadge state={design.design.stage} />}
    >
      <InfoBox label="Outcome">{goal.outcome ?? "The goal records no outcome."}</InfoBox>

      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
        {goal.title ? <KeyValue label="title" value={goal.title} /> : null}
        {goal.created ? <KeyValue label="created" value={goal.created} /> : null}
        <KeyValue label="epics" value={epics.length} />
        <KeyValue label="rounds" value={(goal.rounds ?? []).length} />
        {goal.limits?.warn_after_rounds ? (
          <KeyValue
            label="limits"
            value={`warn ${goal.limits.warn_after_rounds}, cutoff ${goal.limits.cutoff_rounds}`}
          />
        ) : null}
      </div>

      {(goal.done_when ?? []).length > 0 ? (
        <div className="flex flex-col gap-2">
          <SubHead count={goal.done_when?.length}>Done when</SubHead>
          <TextList items={goal.done_when ?? []} ordered />
        </div>
      ) : null}

      {(goal.abort_if ?? []).length > 0 ? (
        <div className="flex flex-col gap-2">
          <SubHead count={goal.abort_if?.length}>Abort if</SubHead>
          <TextList items={goal.abort_if ?? []} />
        </div>
      ) : null}

      {(goal.rounds ?? []).length > 0 ? (
        <div className="flex flex-col gap-2">
          <SubHead count={goal.rounds?.length}>Rounds</SubHead>
          <div className="flex flex-col gap-1.5">
            {(goal.rounds ?? []).map((round) => (
              <div
                key={`round-${round.n}`}
                className="flex flex-wrap items-baseline gap-2 rounded-lg border border-line-soft bg-surface-2/50 px-3 py-2"
              >
                <span className="font-mono text-[13px] font-bold text-ink-mid tabular-nums">
                  round {round.n}
                </span>
                {round.feedback_class ? <StateBadge state={round.feedback_class} /> : null}
                <span className="font-mono text-[13px] text-ink-faint">
                  {round.changed ? "changed" : "unchanged"}
                </span>
                {round.note ? (
                  <span className="w-full font-serif text-[15px] leading-[1.55] text-ink-dim">
                    {round.note}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {grounded ? (
        <div className="flex flex-col gap-2">
          <ActionButton
            icon={Compass}
            onClick={() => setShowGrounding((open) => !open)}
            ariaLabel={showGrounding ? "Hide the grounding" : "Show the grounding"}
          >
            {showGrounding ? "Hide grounding" : "Show grounding"}
          </ActionButton>
          <Reveal show={showGrounding}>
            <div className="flex flex-col gap-2 pt-1">
              <InfoBox label="Derived from" tone="note">
                {grounded}
              </InfoBox>
              {goal.min_work?.note ? (
                <InfoBox label="Grounding note" tone="note">
                  {goal.min_work.note}
                </InfoBox>
              ) : null}
            </div>
          </Reveal>
        </div>
      ) : null}
    </Tile>
  );
}

/* ------------------------------------------------------------------ intent */

export function IntentTile({ design }: { design: DesignModel }) {
  const intent = design.records.intent;
  const [showMore, setShowMore] = useState(false);

  if (!intent) {
    return (
      <Tile
        label="Intent"
        icon={Compass}
        verdict={design.verdicts.intent}
        span={SPANS.intent}
        absentHint="intent.json is design mode's stage 2 record: the problem, the approach, the rejected alternatives, and the risks. Design mode has not reached stage 2 for this design."
      />
    );
  }

  const alternatives = intent.alternatives ?? [];
  const extra = [
    intent.why_now ? { label: "Why now", text: intent.why_now } : null,
    intent.testing ? { label: "How this is tested", text: intent.testing } : null,
  ].filter((entry): entry is { label: string; text: string } => entry !== null);
  const hasMore =
    extra.length > 0 ||
    (intent.doubts ?? []).length > 0 ||
    Boolean(intent.captured) ||
    Boolean(intent.source) ||
    Boolean(intent.design_name);

  return (
    <Tile
      label="Intent"
      icon={Compass}
      verdict={design.verdicts.intent}
      span={SPANS.intent}
      absentHint=""
      headerExtra={
        intent.authorship ? <Chip muted>{intent.authorship}</Chip> : undefined
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <InfoBox label="Problem" tone="problem">
          {intent.problem ?? "The intent records no problem."}
        </InfoBox>
        <InfoBox label="Approach" tone="solution">
          {intent.approach ?? "The intent records no approach."}
        </InfoBox>
      </div>

      {alternatives.length > 0 ? (
        <div className="flex flex-col gap-2">
          <SubHead count={alternatives.length}>Rejected alternatives</SubHead>
          <div className="flex flex-col gap-2">
            {alternatives.map((option, index) => (
              <div
                key={`alt-${index}`}
                className="rounded-lg border border-dashed border-line bg-surface-2/50 px-3.5 py-3"
              >
                <div className="font-serif text-[16.5px] leading-[1.55] font-semibold text-foreground">
                  {option.option ?? "An unnamed option"}
                </div>
                <p className="mt-1 mb-0 font-serif text-[15.5px] leading-[1.55] text-ink-dim">
                  {option.rejected_because ?? "The record states no reason."}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {(intent.risks ?? []).length > 0 ? (
          <div className="flex flex-col gap-2">
            <SubHead count={intent.risks?.length}>Risks</SubHead>
            <TextList items={intent.risks ?? []} />
          </div>
        ) : null}
        {(intent.unknowns ?? []).length > 0 ? (
          <div className="flex flex-col gap-2">
            <SubHead count={intent.unknowns?.length}>Unknowns</SubHead>
            <TextList items={intent.unknowns ?? []} />
          </div>
        ) : null}
        {(intent.out_of_scope ?? []).length > 0 ? (
          <div className="flex flex-col gap-2">
            <SubHead count={intent.out_of_scope?.length}>Out of scope</SubHead>
            <TextList items={intent.out_of_scope ?? []} />
          </div>
        ) : null}
        {(intent.reviewer_focus ?? []).length > 0 ? (
          <div className="flex flex-col gap-2">
            <SubHead count={intent.reviewer_focus?.length}>Where to look</SubHead>
            <TextList items={intent.reviewer_focus ?? []} />
          </div>
        ) : null}
      </div>

      {hasMore ? (
        <ActionButton
          icon={FileText}
          onClick={() => setShowMore((open) => !open)}
          ariaLabel={showMore ? "Hide the rest of the intent" : "Show the rest of the intent"}
        >
          {showMore ? "Hide the rest of this record" : "Show the rest of this record"}
        </ActionButton>
      ) : null}
      <Reveal show={showMore}>
        <div className="flex flex-col gap-3 pt-1">
          {extra.map((entry) => (
            <InfoBox key={entry.label} label={entry.label} tone="note">
              {entry.text}
            </InfoBox>
          ))}
          {(intent.doubts ?? []).length > 0 ? (
            <div className="flex flex-col gap-2">
              <SubHead count={intent.doubts?.length}>Doubts the author flagged</SubHead>
              <TextList items={intent.doubts ?? []} />
            </div>
          ) : null}
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
            {intent.captured ? <KeyValue label="captured" value={intent.captured} /> : null}
            {intent.source ? <KeyValue label="source" value={intent.source} /> : null}
            {intent.design_name ? <KeyValue label="design" value={intent.design_name} /> : null}
          </div>
        </div>
      </Reveal>
    </Tile>
  );
}

/* --------------------------------------------------------------- narrative */

export function NarrativeTile({ design }: { design: DesignModel }) {
  const narrative = design.records.narrative;

  if (!narrative) {
    return (
      <Tile
        label="Narrative"
        icon={BookOpen}
        verdict={design.verdicts.narrative}
        span={SPANS.narrative}
        absentHint="narrative.json holds the four-level story. Odyssey has not narrated this design, so no level exists."
      />
    );
  }

  return (
    <Tile
      label="Narrative"
      icon={BookOpen}
      verdict={design.verdicts.narrative}
      span={SPANS.narrative}
      absentHint=""
    >
      <div className="flex flex-col gap-3">
        {NARRATIVE_LEVELS.map((level, index) => {
          const body = narrativeLevel(design.records, level.key);
          if (!body) return null;
          return (
            <LevelBlock
              key={level.key}
              label={level.label}
              position={index + 1}
              tagline={body.tagline ?? null}
              narration={body.narration ?? null}
              problem={body.problem ?? null}
              solution={body.solution ?? null}
              beats={narrativeBeats(design.records, level.key)}
              open={index === 0}
            />
          );
        })}
      </div>
    </Tile>
  );
}

function LevelBlock({
  label,
  position,
  tagline,
  narration,
  problem,
  solution,
  beats,
  open,
}: {
  label: string;
  position: number;
  tagline: string | null;
  narration: string | null;
  problem: string | null;
  solution: string | null;
  beats: NarrativeBeat[];
  open: boolean;
}) {
  const [shown, setShown] = useState(open);
  const preview = narration && narration.length > 260 ? `${narration.slice(0, 260).trimEnd()}...` : narration;

  return (
    <div className="rounded-lg border border-line-soft bg-surface-2/40 px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex size-7 items-center justify-center rounded-md border border-line bg-card font-mono text-[13px] font-bold text-accent-deep tabular-nums">
          {position}
        </span>
        <h4 className="m-0 font-mono text-[15px] font-bold">{label}</h4>
        <ActionButton
          icon={BookOpen}
          onClick={() => setShown((value) => !value)}
          ariaLabel={shown ? `Collapse the ${label} level` : `Expand the ${label} level`}
          className="ml-auto"
        >
          {shown ? "Collapse" : "Read the level"}
        </ActionButton>
      </div>

      {tagline ? (
        <p className="mt-2 mb-0 font-serif text-[17px] leading-[1.55] font-semibold text-foreground">
          {tagline}
        </p>
      ) : null}

      {problem || solution ? (
        <div className="mt-2.5 grid gap-3 md:grid-cols-2">
          {problem ? (
            <InfoBox label="Problem" tone="problem">
              {problem}
            </InfoBox>
          ) : null}
          {solution ? (
            <InfoBox label="Solution" tone="solution">
              {solution}
            </InfoBox>
          ) : null}
        </div>
      ) : null}

      {narration ? (
        <p className="mt-2.5 mb-0 font-serif text-[16.5px] leading-[1.65] text-ink-mid">
          {shown ? narration : preview}
        </p>
      ) : null}

      <Reveal show={shown}>
        {beats.length > 0 ? (
          <div className="mt-3 flex flex-col gap-2">
            <SubHead count={beats.length}>Beats</SubHead>
            <div className="flex flex-col gap-1.5">
              {beats.map((beat, index) => (
                <div
                  key={`beat-${index}`}
                  className="flex flex-wrap items-baseline gap-2 rounded border border-line-soft bg-card px-3 py-2"
                >
                  {beat.kind ? (
                    <span className="font-mono text-[12.5px] tracking-[0.05em] text-ink-faint uppercase">
                      {beat.kind}
                    </span>
                  ) : null}
                  <span className="w-full font-serif text-[15.5px] leading-[1.55] text-ink-mid">
                    {beat.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Reveal>
    </div>
  );
}

/* -------------------------------------------------------------- assessment */

export function AssessmentTile({ design }: { design: DesignModel }) {
  const assessment = design.records.assessment;

  if (!assessment) {
    return (
      <Tile
        label="Assessment"
        icon={ShieldAlert}
        verdict={design.verdicts.assessment}
        span={SPANS.assessment}
        absentHint="assessment.json holds the verdict and its findings. No review has judged this design, so the mosaic holds no verdict for it."
      />
    );
  }

  const findings = assessment.findings ?? [];
  const checks = (assessment.boundary_checks ?? []).length;
  const drift = (assessment.drift ?? []).length;

  return (
    <Tile
      label="Assessment"
      icon={ShieldAlert}
      verdict={design.verdicts.assessment}
      span={SPANS.assessment}
      absentHint=""
      headerExtra={
        <span className="flex flex-wrap items-center gap-2">
          <StateBadge state={assessment.verdict ?? "no verdict"} className="text-[14px]" />
          {assessment.risk_tier ? (
            <Chip>risk tier: {assessment.risk_tier}</Chip>
          ) : null}
          {assessment.stage ? <Chip muted>stage: {assessment.stage}</Chip> : null}
        </span>
      }
    >
      {assessment.summary ? (
        <InfoBox label="Summary">{assessment.summary}</InfoBox>
      ) : null}

      {findings.length > 0 ? (
        <div className="flex flex-col gap-2">
          <SubHead count={findings.length}>Findings</SubHead>
          <div className="flex flex-col gap-2">
            {findings.map((finding, index) => (
              <div
                key={`finding-${finding.id ?? index}`}
                className="rounded-lg border border-line bg-surface-2/50 px-3.5 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {finding.id ? (
                    <span className="font-mono text-[13px] font-bold text-ink-faint">
                      {finding.id}
                    </span>
                  ) : null}
                  {finding.kind ? <StateBadge state={finding.kind} /> : null}
                  {finding.severity ? (
                    <StateBadge state={finding.severity} title="severity" />
                  ) : null}
                </div>
                {finding.title ? (
                  <p className="mt-1.5 mb-0 font-serif text-[16.5px] leading-[1.5] font-semibold text-foreground">
                    {finding.title}
                  </p>
                ) : null}
                {finding.detail ? (
                  <p className="mt-1 mb-0 font-serif text-[15.5px] leading-[1.6] text-ink-mid">
                    {finding.detail}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {assessment.constraint_introduced ? (
        <InfoBox label="Constraint this introduces" tone="note">
          {assessment.constraint_introduced}
        </InfoBox>
      ) : null}
      {assessment.regret_risk ? (
        <InfoBox label="What the team lives with" tone="note">
          {assessment.regret_risk}
        </InfoBox>
      ) : null}

      {(checks > 0 || drift > 0 || assessment.captured || assessment.assessed) && (
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
          {checks > 0 ? <KeyValue label="boundary checks" value={checks} /> : null}
          {drift > 0 ? <KeyValue label="drift findings" value={drift} /> : null}
          {assessment.captured ? <KeyValue label="captured" value={assessment.captured} /> : null}
          {assessment.assessed ? <KeyValue label="assessed" value={assessment.assessed} /> : null}
        </div>
      )}
    </Tile>
  );
}

/* --------------------------------------------------------------- pr-draft */

export function DraftTile({ design }: { design: DesignModel }) {
  const draft = design.records.pr_draft;
  const [showFull, setShowFull] = useState(false);

  if (!draft || draft.trim().length === 0) {
    return (
      <Tile
        label="Pull request draft"
        icon={FileText}
        verdict={design.verdicts["pr-draft"]}
        span={SPANS.draft}
        absentHint="pr-draft.md is the pull request this design would open, with its problem, its changes, and how it was tested. This design has written none."
      />
    );
  }

  const heading = draftHeading(draft) ?? "Untitled draft";
  const sections = draftSections(draft);

  return (
    <Tile
      label="Pull request draft"
      icon={FileText}
      verdict={design.verdicts["pr-draft"]}
      span={SPANS.draft}
      absentHint=""
      note={`${heading}. ${sections.length} sections, ${draft.length.toLocaleString()} characters.`}
    >
      <div className="flex flex-col gap-2">
        <SubHead count={sections.length}>Sections</SubHead>
        <ol className="m-0 flex list-none flex-col gap-1 p-0">
          {sections.map((section, index) => (
            <li key={`${index}-${section}`} className="flex items-baseline gap-2">
              <span className="font-mono text-[13px] text-ink-faint tabular-nums">
                {index + 1}
              </span>
              <span className="font-mono text-[14px] text-ink-mid">{section}</span>
            </li>
          ))}
        </ol>
      </div>

      <p className="m-0 font-serif text-[15.5px] leading-[1.6] text-ink-mid">
        {draftExcerpt(draft, 420)}
      </p>

      <ActionButton
        icon={FileText}
        onClick={() => setShowFull((open) => !open)}
        ariaLabel={showFull ? "Collapse the draft" : "Read the whole draft"}
      >
        {showFull ? "Collapse the draft" : "Read the whole draft"}
      </ActionButton>
      <Reveal show={showFull}>
        <div className="mt-1 max-h-[36rem] overflow-auto rounded-lg border border-line bg-surface-2/40 p-3.5">
          <MarkdownBlock markdown={draft} />
        </div>
      </Reveal>
    </Tile>
  );
}

/* --------------------------------------------------------------- diagrams */

export function DiagramsTile({ design, ctx }: { design: DesignModel; ctx: TileContext }) {
  const diagrams = design.records.diagrams;

  if (!diagrams || Object.keys(diagrams).length === 0) {
    return (
      <Tile
        label="Diagrams"
        icon={Network}
        verdict={design.verdicts.diagrams}
        span={SPANS.diagrams}
        absentHint="The diagrams record holds one Mermaid block per level: a container diagram, a sequence, and a class diagram. This design has drawn none."
      />
    );
  }

  const levels = ["1", "2", "3"].filter((level) => diagrams[level]);

  return (
    <Tile
      label="Diagrams"
      icon={Network}
      verdict={design.verdicts.diagrams}
      span={SPANS.diagrams}
      absentHint=""
      headerExtra={<Chip>{levels.length} of 3 levels</Chip>}
    >
      <div className="flex flex-col gap-3">
        {levels.map((level) => {
          const source = diagrams[level];
          return (
            <MermaidDiagram
              key={level}
              source={source}
              kind={`level ${level} · ${diagramKind(source)}`}
              title={diagramTitle(source)}
              theme={ctx.theme}
            />
          );
        })}
      </div>
    </Tile>
  );
}

/* -------------------------------------------------------------- decisions */

export function DecisionsTile({ design }: { design: DesignModel }) {
  const verdict = design.verdicts.decisions;
  if (design.decisions.length === 0) {
    return (
      <Tile
        label="Decisions"
        icon={Gavel}
        verdict={verdict}
        span={SPANS.decisions}
        absentHint="A decision reaches a design through goal.adrs. This goal links none, so no decision record names this design."
      />
    );
  }

  return (
    <Tile
      label="Decisions"
      icon={Gavel}
      verdict={verdict}
      span={SPANS.decisions}
      absentHint=""
      note={verdict.note}
    >
      <div className="flex flex-col gap-2">
        {design.decisions.map((decision) => (
          <DecisionRow key={decision.id} decision={decision} design={design} />
        ))}
      </div>
    </Tile>
  );
}

function DecisionRow({
  decision,
  design,
}: {
  decision: DecisionModel;
  design: DesignModel;
}) {
  const reach = decision.reach;
  const onThisDesign = (reach?.path ?? []).filter((entry) =>
    entry.startsWith(`${design.design.id}/`),
  ).length;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface-2/50 px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[13.5px] font-bold text-accent-deep">{decision.id}</span>
        {decision.primary ? <Chip>primary</Chip> : null}
        {decision.adr ? (
          <StateBadge state={decision.adr.state} className="ml-auto" />
        ) : (
          <Chip muted className="ml-auto">
            not in the index
          </Chip>
        )}
      </div>
      <p className="m-0 font-serif text-[16.5px] leading-[1.5] font-semibold text-foreground">
        {decision.adr?.title ?? "No decision record carries this id."}
      </p>
      <p className="m-0 font-serif text-[15px] leading-[1.5] text-ink-dim">
        {reach
          ? reach.pr === null
            ? `No pull request reaches this decision yet${reach.path.length > 0 ? `, and ${reach.path.length} epics sit on its path` : ""}.`
            : reach.via === "epic"
              ? `Reaches PR ${reach.pr} through ${reach.path.length} epics, ${onThisDesign} of them on this design.`
              : `Reaches PR ${reach.pr} directly.`
          : "The index records no pull request for this decision."}
      </p>
    </div>
  );
}
