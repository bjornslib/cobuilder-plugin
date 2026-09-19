/**
 * The lens tiles, scoped to whatever is selected.
 *
 * This is the second half of the variation's idea. The Build region is where a reader
 * navigates. These tiles follow: a design selection shows the whole design's records,
 * an epic selection shows that epic's own, and a slice selection shows the slice's.
 *
 * A tile that holds no record for the current selection is disabled and states the
 * reason. Where an action can reach a record, the tile offers the action: the epic a
 * slice belongs to, or the whole design. That is what keeps a narrow scope legible
 * rather than empty.
 */

import { useMemo, useState } from "react";

import { motion, useReducedMotion } from "motion/react";
import {
  Compass,
  FileText,
  Gavel,
  GitPullRequest,
  ListChecks,
  ScrollText,
  ShieldCheck,
  Target,
  Workflow,
} from "lucide-react";

import { cn } from "@/lib/utils";

import {
  Bullets,
  Chip,
  ENTER_EASE,
  Field,
  LinkButton,
  Panel,
  PrototypeNote,
  SectionLabel,
  StatePill,
  Stat,
  TextButton,
  Tile,
  Unavailable,
} from "./atoms";
import type { EpicDetail } from "./data";
import { preferredSection, sections } from "./data";
import { Markdown } from "./Markdown";
import { MermaidDiagram, type Theme } from "./Mermaid";
import { designScope, type Scope, type ScopeData, type SliceRow } from "./scope";
import {
  EPIC_STATES,
  SLICE_STATES,
  TONE_DOT,
  VERDICT_TONE,
  epicMove,
  sliceMove,
} from "./states";

export interface TileProps {
  data: ScopeData;
  epic: EpicDetail | null;
  slice: SliceRow | null;
  scopeText: string;
  theme: Theme;
  onSelect: (scope: Scope) => void;
}

function toDesign(p: TileProps): () => void {
  return () => p.onSelect(designScope(p.data.designId));
}

function toEpic(p: TileProps): (() => void) | null {
  const epicId = p.epic?.epic.id;
  if (!epicId) return null;
  return () => p.onSelect({ kind: "epic", designId: p.data.designId, epicId });
}

function designAction(p: TileProps, label: string) {
  return (
    <LinkButton onClick={toDesign(p)} icon={Target} title="Return every lens to the whole design">
      {label}
    </LinkButton>
  );
}

function epicAction(p: TileProps, label: string) {
  const go = toEpic(p);
  if (!go) return null;
  return (
    <LinkButton onClick={go} icon={Target} title="Scope every lens to this slice's epic">
      {label}
    </LinkButton>
  );
}

/* ------------------------------------------------------------------ record */

function RecordTile(p: TileProps) {
  const { data, slice, epic } = p;

  if (slice) {
    const s = slice.slice;
    const loop = sliceMove(s.state);
    return (
      <Tile title="Record" icon={ScrollText} scope={p.scopeText}>
        <div className="flex flex-col gap-3.5">
          <Field label="Slice">{s.title}</Field>
          <Field label="Ends with">{s.ends_with}</Field>
          <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
            <Stat
              value={s.score ?? "—"}
              label="validator score"
              tone={s.score ? "good" : "warn"}
              title={
                s.score
                  ? `The plan records a validator score of ${s.score} for this slice.`
                  : "The plan records no score for this slice."
              }
            />
            <Stat
              value={s.attempts}
              label={s.attempts === 1 ? "attempt" : "attempts"}
              tone={s.attempts > 1 ? "warn" : "neutral"}
              title="How many attempts the slice loop took to reach an accepted state."
            />
            <Stat value={`#${s.n}`} label="plan position" />
          </div>
          <Field label="State">
            <StatePill
              value={s.state}
              intended={loop?.intended ?? null}
              intendedWhy={loop?.because}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Feature slug">{s.feature}</Field>
            <Field label="Index id">{s.id}</Field>
          </div>
          {slice.epic ? (
            <Field label="Resolved epic">
              {slice.epic.epic.epic_id} — {slice.epic.epic.id}
            </Field>
          ) : (
            <Field label="Resolved epic">
              None. {slice.unresolvedReason ?? "The index records no reason."}
            </Field>
          )}
        </div>
      </Tile>
    );
  }

  if (epic) {
    const e = epic.epic;
    const move = epicMove(epic.status);
    const outcome = epic.planRow?.outcome ?? null;
    return (
      <Tile title="Record" icon={ScrollText} scope={p.scopeText}>
        <div className="flex flex-col gap-3.5">
          <Field label={`Epic ${e.epic_id} ends with`}>
            {outcome ??
              (data.records === null
                ? "designs.js did not load, so the outcome line is not available. The index's epic entity carries no outcome field."
                : "The goal record carries no outcome line for this epic.")}
          </Field>
          <Field label="State as the index records it">
            <StatePill
              value={epic.status}
              intended={move?.intended ?? null}
              intendedWhy={move?.because}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Goal record state">{e.state}</Field>
            <Field label="Index id">{e.id}</Field>
            <Field label="Branch">{e.branch ?? "None recorded."}</Field>
            <Field label="Pull request">
              {epic.pr === null ? "None reaches this epic." : `PR ${epic.pr}`}
            </Field>
            <Field label="Design document">
              {epic.doc
                ? `${epic.doc.id} — ${epic.doc.title}`
                : `None. docs/plans/${data.plan.slug}/epic-${e.epic_id}-design.md is not in the index.`}
            </Field>
            <Field label="Slices">
              {epic.slices.length === 0
                ? "None resolve to this epic."
                : `${epic.slices.length}, listed under the epic in the Build region.`}
            </Field>
          </div>
          <Panel title="The author's note" icon={ScrollText}>
            <p className="m-0 text-[15.5px] leading-[1.6] text-ink-mid">
              {e.note ?? "The goal record carries no note for this epic."}
            </p>
          </Panel>
        </div>
      </Tile>
    );
  }

  const record = data.designRecord;
  const goal = record?.goal;
  return (
    <Tile title="Record" icon={ScrollText} scope={p.scopeText}>
      <div className="flex flex-col gap-3.5">
        <Field label="Design">{data.design.name}</Field>
        <Field label={goal ? "Goal title" : "Outcome"}>
          {goal?.title ?? data.design.outcome}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Stage">
            {data.design.stage}
          </Field>
          <Field label="Created">{goal?.created ?? "Not recorded in the loaded file."}</Field>
          <Field label="Plan slug">
            {data.plan.slug}
            <span className="mt-1 block font-mono text-[12px] text-ink-faint">
              {data.plan.via === "slice"
                ? "derived from this design's slice ids, and confirmed by a plan record"
                : "the design id, because no slice in the index carries another prefix"}
            </span>
          </Field>
          <Field label="Program design">
            {data.programDesign
              ? `${data.programDesign.title} (Gate ${data.programDesign.gate})`
              : `No 03-program-design.md under docs/plans/${data.plan.slug}/ in the index.`}
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Primary decision">{goal?.adr ?? "None recorded."}</Field>
          <Field label={`Alternatives explored`}>
            {goal?.min_work?.alternatives_explored ?? "Not recorded."}
          </Field>
          <Field label="Abort conditions">
            {goal?.abort_if?.length
              ? `${goal.abort_if.length}, listed in the decisions tile's evidence`
              : "None recorded."}
          </Field>
          <Field label="Rounds">
            {goal?.rounds?.length
              ? `${goal.rounds.length} of a warn-after ${goal.limits?.warn_after_rounds ?? "?"} warning, cutoff ${goal.limits?.cutoff_rounds ?? "?"}`
              : "None recorded."}
          </Field>
        </div>
        {goal?.done_when?.length ? (
          <div>
            <SectionLabel icon={ListChecks}>Done when</SectionLabel>
            <Bullets items={goal.done_when} ordered />
          </div>
        ) : null}
      </div>
    </Tile>
  );
}

/* ------------------------------------------------------------------ intent */

function IntentTile(p: TileProps) {
  const { data, epic, slice } = p;
  const [section, setSection] = useState<string | null>(null);

  if (slice) {
    return (
      <Tile title="Intent" icon={Compass} scope={p.scopeText} empty>
        <Unavailable
          reason="A slice authors no intent of its own. The bundle holds no per-slice record."
          detail="A slice is one row in the plan's 04-slices.md table: a number, a title, an ends-with line, a score, and an attempt count. Its intent is written into the epic's design document, or into the design's intent.json."
          action={epicAction(p, `Read epic ${slice.epic?.epic.epic_id ?? "?"}'s intent`)}
        />
      </Tile>
    );
  }

  if (epic) {
    if (!epic.doc) {
      return (
        <Tile title="Intent" icon={Compass} scope={p.scopeText} empty>
          <Unavailable
            reason={`No design document exists for epic ${epic.epic.epic_id}, so this epic records no intent of its own.`}
            detail={`The index holds no epic_design row for epic id ${epic.epic.epic_id} under the plan slug ${data.plan.slug}. docs/plans/${data.plan.slug}/epic-${epic.epic.epic_id}-design.md is not in the tree the index read.`}
            action={designAction(p, "Read the whole design's intent instead")}
          />
        </Tile>
      );
    }

    const list = sections(epic.doc.body_md);
    const chosen =
      list.find((candidate) => candidate.heading === section) ??
      preferredSection(list);

    return (
      <Tile title="Intent" icon={Compass} scope={p.scopeText}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Chip icon={FileText} title={epic.doc.title}>
              {epic.doc.id}
            </Chip>
            <span className="font-mono text-[12px] text-ink-faint">
              {list.length} {list.length === 1 ? "section" : "sections"} in the document
            </span>
          </div>
          {list.length > 1 ? (
            <div className="flex flex-wrap gap-1.5">
              {list.map((candidate) => (
                <TextButton
                  key={candidate.heading}
                  current={chosen?.heading === candidate.heading}
                  onClick={() => setSection(candidate.heading)}
                  title={`Show the section "${candidate.heading}"`}
                >
                  {candidate.heading}
                </TextButton>
              ))}
            </div>
          ) : null}
          <div className="max-h-[30rem] overflow-auto rounded-lg border border-line-soft bg-surface px-3.5 py-3">
            {chosen ? (
              <>
                <SectionLabel>{chosen.heading}</SectionLabel>
                <Markdown source={chosen.body} />
              </>
            ) : (
              <p className="m-0 font-serif text-[15.5px] text-ink-dim">
                The document holds no section this reader can show.
              </p>
            )}
          </div>
          <PrototypeNote>
            The full document is {epic.doc.body_md.split("\n").length} lines. This tile
            renders one section at a time and never truncates the text inside it.
          </PrototypeNote>
        </div>
      </Tile>
    );
  }

  const intent = data.designRecord?.intent;
  const slot = data.slots.find((candidate) => candidate.slot === "intent");

  if (!intent) {
    return (
      <Tile title="Intent" icon={Compass} scope={p.scopeText} empty>
        <Unavailable
          reason="This design records no intent."
          detail={`${slot?.detail ?? "No intent.json in this design's directory."} ${
            data.design.stage === "backlog"
              ? "Design mode's stages 2 to 7 have not run, which is the expected shape for a backlog design."
              : ""
          }`.trim()}
          action={null}
        />
      </Tile>
    );
  }

  return (
    <Tile title="Intent" icon={Compass} scope={p.scopeText}>
      <div className="flex flex-col gap-3.5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Panel title="The problem" tone="danger" icon={Target}>
            <p className="m-0">
              {intent.problem ?? "The intent record holds no problem statement."}
            </p>
          </Panel>
          <Panel title="The approach" tone="good" icon={Compass}>
            <p className="m-0">
              {intent.approach ?? "The intent record holds no approach statement."}
            </p>
          </Panel>
        </div>

        {intent.why_now ? (
          <Panel title="Why now" tone="warn">
            <p className="m-0 text-[15.5px] leading-[1.6] text-ink-mid">{intent.why_now}</p>
          </Panel>
        ) : null}

        {intent.alternatives?.length ? (
          <div>
            <SectionLabel icon={Gavel}>
              Alternatives considered
              <span className="ml-1 text-ink-faint normal-case">
                {intent.alternatives.length} rejected
              </span>
            </SectionLabel>
            <div className="flex flex-col gap-2">
              {intent.alternatives.map((alternative) => (
                <div
                  key={alternative.option}
                  className="rounded-lg border border-line-soft border-l-4 border-l-ink-faint bg-surface-2 px-3.5 py-2.5"
                >
                  <p className="m-0 font-mono text-[13px] font-bold text-foreground">
                    {alternative.option}
                  </p>
                  <p className="mt-1.5 mb-0 font-serif text-[15.5px] leading-[1.55] text-ink-mid">
                    Rejected because {alternative.rejected_because}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {intent.out_of_scope?.length ? (
          <div>
            <SectionLabel icon={ListChecks}>Out of scope</SectionLabel>
            <Bullets items={intent.out_of_scope} />
          </div>
        ) : null}

        <div className="grid gap-3.5 sm:grid-cols-2">
          {intent.risks?.length ? (
            <div>
              <SectionLabel icon={ShieldCheck}>Risks</SectionLabel>
              <Bullets items={intent.risks} tone="warn" />
            </div>
          ) : null}
          {intent.unknowns?.length ? (
            <div>
              <SectionLabel icon={Compass}>Unknowns</SectionLabel>
              <Bullets items={intent.unknowns} tone="accent" />
            </div>
          ) : null}
        </div>

        {intent.doubts?.length ? (
          <div>
            <SectionLabel icon={ShieldCheck}>Doubts held at design time</SectionLabel>
            <Bullets items={intent.doubts} tone="danger" />
          </div>
        ) : null}

        {intent.testing ? (
          <Panel title="How this gets tested" icon={ListChecks}>
            <p className="m-0 text-[15.5px] leading-[1.6] text-ink-mid">{intent.testing}</p>
          </Panel>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Authorship">{intent.authorship ?? "Not recorded."}</Field>
          <Field label="Captured">{intent.captured ?? "Not recorded."}</Field>
        </div>
      </div>
    </Tile>
  );
}

/* -------------------------------------------------------------- assessment */

function AssessmentTile(p: TileProps) {
  const { data, epic, slice } = p;
  const assessment = data.designRecord?.assessment;

  if (epic || slice) {
    return (
      <Tile title="Assessment" icon={ShieldCheck} scope={p.scopeText} empty>
        <Unavailable
          reason="An assessment is authored per design, never per epic or per slice. Nothing here is missing: no such record exists to read."
          detail="assessment.json sits in docs/architecture/designs/<name>/. Its findings carry a stage of design or retrospective, and the design is the unit they judge."
          action={designAction(p, "Read the design's assessment")}
        />
      </Tile>
    );
  }

  if (!assessment) {
    return (
      <Tile title="Assessment" icon={ShieldCheck} scope={p.scopeText} empty>
        <Unavailable
          reason="This design records no assessment."
          detail="No assessment.json sits in this design's directory. The design has not reached the stage where one is written."
        />
      </Tile>
    );
  }

  const verdict = assessment.verdict ?? "unrecorded";
  const tone = VERDICT_TONE[verdict] ?? "neutral";
  const findings = assessment.findings ?? [];

  return (
    <Tile title="Assessment" icon={ShieldCheck} scope={p.scopeText}>
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <Chip tone={tone} title={`The assessment's verdict is ${verdict}.`}>
            verdict {verdict}
          </Chip>
          {assessment.risk_tier ? (
            <Chip title={`The assessment records a risk tier of ${assessment.risk_tier}.`}>
              risk {assessment.risk_tier}
            </Chip>
          ) : null}
          {assessment.stage ? (
            <Chip
              title={
                assessment.stage === "design"
                  ? "Written before the code exists. Its findings are predictions."
                  : "Written after the design shipped. Its findings are observations."
              }
            >
              {assessment.stage}
            </Chip>
          ) : null}
          <Chip dashed title="Nothing enforces this field today. It is shown because the record carries it.">
            {assessment.captured ?? assessment.assessed ?? "no date"}
          </Chip>
        </div>

        {assessment.summary ? (
          <Panel title="The verdict in one paragraph" tone={tone}>
            <p className="m-0 text-[15.5px] leading-[1.6]">{assessment.summary}</p>
          </Panel>
        ) : null}

        {findings.length > 0 ? (
          <div>
            <SectionLabel icon={ShieldCheck}>
              Findings
              <span className="ml-1 text-ink-faint normal-case">
                {findings.length} recorded
              </span>
            </SectionLabel>
            <div className="flex flex-col gap-2.5">
              {findings.map((finding, index) => (
                <div
                  key={finding.id ?? `${finding.title}-${index}`}
                  className="rounded-lg border border-line-soft bg-surface-2 px-3.5 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip
                      tone={
                        finding.kind === "drift"
                          ? "warn"
                          : finding.kind === "observation"
                            ? "good"
                            : "accent"
                      }
                      title={
                        finding.kind === "prediction"
                          ? "Written before the code exists."
                          : finding.kind === "drift"
                            ? "A shipped record no longer matches the tree."
                            : "Written after the design shipped."
                      }
                    >
                      {finding.kind}
                    </Chip>
                    {finding.severity ? (
                      <Chip
                        tone={
                          finding.severity === "high"
                            ? "danger"
                            : finding.severity === "medium"
                              ? "warn"
                              : "neutral"
                        }
                      >
                        {finding.severity}
                      </Chip>
                    ) : null}
                    {finding.id ? (
                      <span className="font-mono text-[12px] text-ink-faint">
                        {finding.id}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 mb-0 font-serif text-[16px] leading-[1.5] font-bold">
                    {finding.title}
                  </p>
                  <p className="mt-1.5 mb-0 font-serif text-[15.5px] leading-[1.6] text-ink-mid">
                    {finding.detail}
                  </p>
                  {finding.cites ? (
                    <p className="mt-2 mb-0 font-mono text-[12px] text-ink-faint">
                      cites {finding.cites}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {assessment.drift?.length ? (
          <div>
            <SectionLabel icon={ShieldCheck}>Drift</SectionLabel>
            <Bullets
              items={assessment.drift.map((entry) => `${entry.title} — ${entry.detail}`)}
              tone="warn"
            />
          </div>
        ) : null}

        {assessment.boundary_checks?.length ? (
          <div>
            <SectionLabel icon={ShieldCheck}>Boundary checks</SectionLabel>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {assessment.boundary_checks.map((check, index) => (
                <li key={`${check.rule}-${index}`} className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-[9px] size-1.5 shrink-0 rounded-full",
                      check.result === "holds" ? TONE_DOT.good : TONE_DOT.warn,
                    )}
                  />
                  <span className="font-serif text-[15.5px] leading-[1.55]">
                    <span className="font-bold">{check.rule}</span>
                    {` — ${check.result ?? "no result recorded"}`}
                    {check.note ? `: ${check.note}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-3.5 sm:grid-cols-2">
          {assessment.constraint_introduced ? (
            <Panel title="Constraint introduced" tone="warn">
              <p className="m-0 text-[15.5px] leading-[1.6] text-ink-mid">
                {assessment.constraint_introduced}
              </p>
            </Panel>
          ) : null}
          {assessment.regret_risk ? (
            <Panel title="Regret risk" tone="danger">
              <p className="m-0 text-[15.5px] leading-[1.6] text-ink-mid">
                {assessment.regret_risk}
              </p>
            </Panel>
          ) : null}
        </div>
      </div>
    </Tile>
  );
}

/* --------------------------------------------------------------- decisions */

function DecisionRow({
  id,
  title,
  state,
  primary,
  reaches,
  onReach,
}: {
  id: string;
  title: string;
  state: string;
  primary: boolean;
  reaches: string | null;
  onReach: (() => void) | null;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-line-soft bg-surface-2 px-3.5 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={state === "approved" ? "good" : "neutral"} icon={Gavel}>
          {id}
        </Chip>
        {primary ? (
          <Chip tone="accent" title="The design's own goal record names this as its primary decision.">
            primary
          </Chip>
        ) : null}
        <Chip title={`The decision record's state is ${state}.`}>{state}</Chip>
      </div>
      <p className="m-0 font-serif text-[16px] leading-[1.5] text-foreground">{title}</p>
      {reaches ? (
        <p className="m-0 flex flex-wrap items-center gap-2 font-mono text-[12px] text-ink-dim">
          {reaches}
          {onReach ? (
            <LinkButton onClick={onReach} icon={Target} title="Select the epic this pull request carries">
              open the epic
            </LinkButton>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

function DecisionsTile(p: TileProps) {
  const { data, epic, slice } = p;

  const reachOf = useMemo(() => {
    return (adrId: string) => {
      const joined = data.joins.adr_to_pull_request[adrId];
      return joined ? joined : null;
    };
  }, [data.joins]);

  const epicForPr = useMemo(() => {
    return (pr: number) =>
      data.epics.find((candidate) => candidate.pr === pr) ?? null;
  }, [data.epics]);

  if (epic || slice) {
    const source = epic ?? slice?.epic ?? null;
    if (!source) {
      return (
        <Tile title="Decisions" icon={Gavel} scope={p.scopeText} empty>
          <Unavailable
            reason="This slice resolves to no epic, so no decision reaches it through an epic."
            detail={slice?.unresolvedReason ?? "The index records no reason."}
          />
        </Tile>
      );
    }

    const reachingPr =
      source.pr === null
        ? []
        : Object.entries(data.joins.adr_to_pull_request)
            .filter(([, joined]) => joined.pr === source.pr)
            .map(([adrId, joined]) => ({ adrId, via: joined.via }));

    const rows: Array<{ adrId: string; origin: string; via: string | null }> =
      source.cited.map((adrId) => ({
        adrId,
        origin: "cited in the epic design document",
        via: null,
      }));
    for (const { adrId, via } of reachingPr) {
      if (!rows.some((row) => row.adrId === adrId)) {
        rows.push({ adrId, origin: `reaches PR ${source.pr}`, via });
      }
    }

    return (
      <Tile title="Decisions" icon={Gavel} scope={p.scopeText} empty={rows.length === 0}>
        {rows.length === 0 ? (
          <Unavailable
            reason={`No decision reaches epic ${source.epic.epic_id}.`}
            detail={`The epic's design document names no ADR id in its text, and no ADR in the index joins to pull request ${source.pr === null ? "— the epic carries no pull request" : source.pr}.`}
            action={designAction(p, "Read the whole design's decisions instead")}
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {slice ? (
              <PrototypeNote>
                A slice carries no decision of its own. These are its epic&apos;s decisions,
                read through epic {source.epic.epic_id}.
              </PrototypeNote>
            ) : null}
            {rows.map((row) => {
              const adr = data.adrById.get(row.adrId);
              return (
                <DecisionRow
                  key={row.adrId}
                  id={row.adrId}
                  title={adr?.title ?? "This decision id is not in the record index."}
                  state={adr?.state ?? "unknown"}
                  primary={false}
                  reaches={row.origin}
                  onReach={null}
                />
              );
            })}
          </div>
        )}
      </Tile>
    );
  }

  const goal = data.designRecord?.goal;
  const ids = goal?.adrs ?? [];
  const primary = goal?.adr ?? null;

  return (
    <Tile title="Decisions" icon={Gavel} scope={p.scopeText} empty={ids.length === 0}>
      {ids.length === 0 ? (
        <Unavailable
          reason="This design names no decision."
          detail={`${goal ? "goal.adrs holds an empty list." : "The design record did not load."} A design names its decisions in goal.adr and goal.adrs.`}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Stat value={ids.length} label="linked decisions" />
            <p className="m-0 max-w-[52ch] font-mono text-[12px] leading-[1.6] text-ink-faint">
              Read from goal.adrs, then resolved against the index&apos;s adr entities and
              its adr_to_pull_request join.
            </p>
          </div>
          {ids.map((adrId) => {
            const adr = data.adrById.get(adrId);
            const reach = reachOf(adrId);
            const owner = reach === null ? null : epicForPr(reach.pr);
            return (
              <DecisionRow
                key={adrId}
                id={adrId}
                title={adr?.title ?? "This decision id is not in the record index."}
                state={adr?.state ?? "unknown"}
                primary={adrId === primary}
                reaches={
                  reach === null
                    ? "No pull request reaches this decision in the index."
                    : `reaches pull request ${reach.pr} (${reach.via})${
                        owner ? `, which carries epic ${owner.epic.epic_id}` : ""
                      }`
                }
                onReach={
                  owner
                    ? () =>
                        p.onSelect({
                          kind: "epic",
                          designId: data.designId,
                          epicId: owner.epic.id,
                        })
                    : null
                }
              />
            );
          })}
        </div>
      )}
    </Tile>
  );
}

/* ------------------------------------------------------------------- build */

function BuildTile(p: TileProps) {
  const { data, epic, slice } = p;

  if (slice) {
    const s = slice.slice;
    const loop = sliceMove(s.state);
    const ladder = SLICE_STATES.filter((state) =>
      ["planned", "red", "green", "validated", "completed"].includes(state.key),
    );
    const exits = SLICE_STATES.filter((state) =>
      ["failed", "skipped"].includes(state.key),
    );
    return (
      <Tile title="Build" icon={ListChecks} scope={p.scopeText}>
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
            <Stat
              value={s.score ?? "—"}
              label="validator score"
              tone={s.score ? "good" : "warn"}
            />
            <Stat
              value={s.attempts}
              label={s.attempts === 1 ? "attempt" : "attempts"}
              tone={s.attempts > 1 ? "warn" : "neutral"}
            />
            <Stat value={s.state} label="recorded state" tone="accent" />
          </div>
          <div>
            <SectionLabel icon={ListChecks}>The slice loop, as intended</SectionLabel>
            <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
              {ladder.map((state) => {
                const here = state.key === s.state;
                return (
                  <li key={state.key} className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-[7px] size-2.5 shrink-0 rounded-full",
                        here ? TONE_DOT.good : TONE_DOT.neutral,
                        !here && "opacity-40",
                      )}
                    />
                    <span className="font-serif text-[15.5px] leading-[1.55]">
                      <span
                        className={cn(
                          "font-mono text-[13px] font-bold",
                          here ? "text-good" : "text-ink-faint",
                        )}
                      >
                        {state.key}
                      </span>
                      {here ? (
                        <span className="ml-2 font-mono text-[12px] text-good">
                          the record stops here
                        </span>
                      ) : null}
                      <span className="mt-0.5 block text-ink-mid">{state.gloss}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
          <div>
            <SectionLabel icon={ListChecks}>Exits</SectionLabel>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {exits.map((state) => (
                <li key={state.key} className="flex items-start gap-2.5">
                  <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-ink-faint opacity-40" />
                  <span className="font-serif text-[15.5px] leading-[1.55]">
                    <span className="font-mono text-[13px] font-bold text-ink-faint">
                      {state.key}
                    </span>
                    <span className="mt-0.5 block text-ink-mid">{state.gloss}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <PrototypeNote>
            The ladder and the two exits are the intended vocabulary. This index records
            {" "}
            <span className="font-bold">{s.state}</span> for this slice and nothing else.
            {loop ? ` It reaches the ladder at ${loop.intended} because ${loop.because}.` : ""}
          </PrototypeNote>
        </div>
      </Tile>
    );
  }

  if (epic) {
    const move = epicMove(epic.status);
    const slices = epic.slices;
    const scored = slices.filter((s) => s.score !== null);
    const retried = slices.filter((s) => s.attempts > 1);
    return (
      <Tile title="Build" icon={ListChecks} scope={p.scopeText}>
        <div className="flex flex-col gap-3.5">
          <Field label="State">
            <StatePill
              value={epic.status}
              intended={move?.intended ?? null}
              intendedWhy={move?.because}
            />
          </Field>
          <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
            <Stat value={slices.length} label="slices" />
            <Stat value={scored.length} label="scored" tone="good" />
            <Stat value={retried.length} label="retried" tone={retried.length > 0 ? "warn" : "neutral"} />
          </div>
          {slices.length === 0 ? (
            <Unavailable
              reason="No slice resolves to this epic, so the slice loop has nothing to show."
              detail={`joins.slice_to_epic holds ${Object.keys(data.joins.slice_to_epic).length} entries and none names ${epic.epic.id}.`}
            />
          ) : (
            <div>
              <SectionLabel icon={ListChecks}>
                Scores and attempts, from the plan table
              </SectionLabel>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {slices.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[12.5px] font-bold text-accent-deep tabular-nums">
                      #{s.n}
                    </span>
                    <Chip tone="good">{s.state}</Chip>
                    <Chip>{s.score ? `score ${s.score}` : "no score"}</Chip>
                    <Chip>
                      {s.attempts} {s.attempts === 1 ? "attempt" : "attempts"}
                    </Chip>
                    <span className="min-w-0 flex-1 truncate font-serif text-[15px] text-ink-mid">
                      {s.title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Field label="Gate 4b document">
            {epic.doc
              ? `Present: ${epic.doc.id}. The epic design document that Gate 4b requires.`
              : `Absent. No epic_design row for ${epic.epic.epic_id} under plan ${data.plan.slug}.`}
          </Field>
        </div>
      </Tile>
    );
  }

  const done = data.doneEpics;
  const total = data.epics.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const reduce = useReducedMotion();

  return (
    <Tile title="Build" icon={ListChecks} scope={p.scopeText}>
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
          <Stat value={total} label="epics" />
          <Stat value={done} label="merged or completed" tone="good" />
          <Stat value={data.designSlices.length} label="slices" />
          <Stat value={`${percent}%`} label="of the plan" tone="accent" />
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full border border-line bg-surface-2">
          <motion.div
            className="h-full rounded-full bg-good"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: reduce ? 0 : 0.4, ease: ENTER_EASE }}
          />
        </div>

        <div>
          <SectionLabel icon={ListChecks}>
            Gates, from the index&apos;s feature-gates join
          </SectionLabel>
          {data.gates.length === 0 ? (
            <Unavailable
              reason={`The index holds no gate line for the plan ${data.plan.slug}.`}
              detail="joins.feature_gates keys a plan slug to the gate lines its 00-status.md holds. A design with no plan directory has none."
            />
          ) : (
            <ol className="m-0 flex list-none flex-wrap gap-2 p-0">
              {data.gates.map((gate) => (
                <li key={gate.n}>
                  <Chip
                    tone={
                      gate.state.startsWith("APPROVED")
                        ? "good"
                        : gate.state.startsWith("n/a")
                          ? "neutral"
                          : "warn"
                    }
                    dashed={gate.state.startsWith("n/a")}
                    title={`${gate.name}: ${gate.state}`}
                  >
                    {gate.n} · {gate.state}
                  </Chip>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Epic states, as the index records them">
            <span className="flex flex-wrap gap-1.5">
              {data.epics.length === 0 ? (
                <span className="font-serif text-[15.5px] text-ink-dim">No epic.</span>
              ) : (
                Object.entries(
                  data.epics.reduce<Record<string, number>>((counts, detail) => {
                    counts[detail.status] = (counts[detail.status] ?? 0) + 1;
                    return counts;
                  }, {}),
                ).map(([value, count]) => (
                  <Chip key={value}>
                    {value} · {count}
                  </Chip>
                ))
              )}
            </span>
          </Field>
          <Field label="Every slice the design owns">
            <span className="font-mono text-[13px]">
              {data.designSlices.length === 0
                ? "None. This design's epics carry no slice row."
                : `${data.designSlices.length} slices under ${
                    new Set(
                      data.designSlices.map(
                        (slice) => data.joins.slice_to_epic[slice.id],
                      ),
                    ).size
                  } of its ${data.epics.length} epics.`}
            </span>
          </Field>
        </div>
      </div>
    </Tile>
  );
}

/* ---------------------------------------------------------------- diagrams */

function DiagramRow({
  level,
  kind,
  source,
  theme,
}: {
  level: string;
  kind: string;
  source: string;
  theme: Theme;
}) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  return (
    <div className="overflow-hidden rounded-lg border border-line-soft bg-surface">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors duration-150 ease-house",
          "hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        )}
      >
        <Workflow className="size-4 shrink-0 text-ink-faint" />
        <span className="font-mono text-[13px] font-bold">Level {level}</span>
        <Chip>{kind}</Chip>
        <span className="ml-auto font-mono text-[12px] text-ink-faint">
          {open ? "hide" : "draw this diagram"}
        </span>
      </button>
      {open ? (
        <motion.div
          initial={reduce ? false : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: reduce ? 0 : 0.22, ease: ENTER_EASE }}
          className="overflow-hidden border-t border-line-soft"
        >
          <div className="px-3.5 py-3">
            <MermaidDiagram level={level} kind={kind} source={source} theme={theme} />
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}

function DiagramTile(p: TileProps) {
  const { data, epic, slice } = p;

  if (epic || slice) {
    return (
      <Tile title="Diagrams" icon={Workflow} scope={p.scopeText} empty>
        <Unavailable
          reason="Diagrams are authored per design and per pull request, and never per epic. This epic carries none of its own, and none is missing."
          detail={`docs/architecture/designs/${data.designId}/diagrams/ holds level-N.mmd files. The plan directory holds documents, not diagrams.`}
          action={designAction(p, "Draw the design's diagrams")}
        />
      </Tile>
    );
  }

  if (data.diagrams.length === 0) {
    return (
      <Tile title="Diagrams" icon={Workflow} scope={p.scopeText} empty>
        <Unavailable
          reason="This design carries no diagram."
          detail={`No diagrams/ directory under docs/architecture/designs/${data.designId}/, or it holds no level-N.mmd file.`}
        />
      </Tile>
    );
  }

  return (
    <Tile title="Diagrams" icon={Workflow} scope={p.scopeText}>
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Stat value={data.diagrams.length} label="levels" />
          <PrototypeNote className="max-w-[46ch]">
            Mermaid is not installed in this application. This tile loads Mermaid 11 from
            jsdelivr when a reader opens a diagram, and falls back to the source in a
            code block when the network refuses it.
          </PrototypeNote>
        </div>
        {data.diagrams.map((diagram) => (
          <DiagramRow
            key={diagram.level}
            level={diagram.level}
            kind={diagram.kind}
            source={diagram.source}
            theme={p.theme}
          />
        ))}
      </div>
    </Tile>
  );
}

/* ----------------------------------------------------------- pull requests */

function PullRequestTile(p: TileProps) {
  const { data, epic, slice } = p;

  if (slice || epic) {
    const source = epic ?? slice?.epic ?? null;
    if (!source) {
      return (
        <Tile title="Pull requests" icon={GitPullRequest} scope={p.scopeText} empty>
          <Unavailable
            reason="This slice resolves to no epic, so no pull request reaches it."
            detail={slice?.unresolvedReason ?? "The index records no reason."}
          />
        </Tile>
      );
    }
    const pr = source.pullRequest;
    return (
      <Tile title="Pull requests" icon={GitPullRequest} scope={p.scopeText} empty={pr === null}>
        {pr === null ? (
          <Unavailable
            reason={`No pull request reaches epic ${source.epic.epic_id}.`}
            detail={`joins.epic_to_pull_request holds ${Object.keys(data.joins.epic_to_pull_request).length} entries across the whole index, and none names ${source.epic.id}.`}
            action={designAction(p, "Read the design's pull requests instead")}
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {slice ? (
              <PrototypeNote>
                A slice carries no pull request of its own. This is its epic&apos;s, read
                through epic {source.epic.epic_id}.
              </PrototypeNote>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Stat value={pr.id} label="pull request" tone="accent" />
              <Chip tone={pr.state === "merged" ? "good" : "warn"}>{pr.state}</Chip>
              {pr.commit ? <Chip>{pr.commit}</Chip> : null}
              {pr.date ? <Chip>{pr.date}</Chip> : null}
            </div>
            <Field label="Title">{pr.title}</Field>
            <Field label="Reached through">
              joins.epic_to_pull_request[{source.epic.id}] = {pr.id}
            </Field>
          </div>
        )}
      </Tile>
    );
  }

  const draft = data.designRecord?.pr_draft;
  const rows = data.pullRequests;
  const hasDraft = typeof draft === "string" && draft.trim().length > 0;

  return (
    <Tile
      title="Pull requests"
      icon={GitPullRequest}
      scope={p.scopeText}
      empty={rows.length === 0 && !hasDraft}
    >
      <div className="flex flex-col gap-3.5">
        {rows.length === 0 ? (
          <Unavailable
            reason="No pull request reaches this design."
            detail="Not one of this design's epics carries a pull request in the index, so joins.epic_to_pull_request holds nothing for it."
          />
        ) : (
          <div>
            <SectionLabel icon={GitPullRequest}>
              Pull requests this design&apos;s epics point at
            </SectionLabel>
            <div className="flex flex-col gap-2">
              {rows.map((pr) => {
                const owners = data.epics.filter((candidate) => candidate.pr === pr.id);
                return (
                  <div
                    key={pr.id}
                    className="flex flex-col gap-1.5 rounded-lg border border-line-soft bg-surface-2 px-3.5 py-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone={pr.state === "merged" ? "good" : "warn"}>
                        PR {pr.id} · {pr.state}
                      </Chip>
                      {pr.commit ? <Chip>{pr.commit}</Chip> : null}
                      {pr.date ? <Chip>{pr.date}</Chip> : null}
                    </div>
                    <p className="m-0 font-serif text-[16px] leading-[1.5]">{pr.title}</p>
                    {owners.length > 0 ? (
                      <p className="m-0 flex flex-wrap items-center gap-2 font-mono text-[12px] text-ink-dim">
                        carries {owners.map((owner) => owner.epic.epic_id).join(", ")}
                        {owners[0] ? (
                          <LinkButton
                            onClick={() =>
                              p.onSelect({
                                kind: "epic",
                                designId: data.designId,
                                epicId: owners[0].epic.id,
                              })
                            }
                            icon={Target}
                            title="Select the first epic this pull request carries"
                          >
                            open {owners[0].epic.epic_id}
                          </LinkButton>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <SectionLabel icon={FileText}>The envisioned pull request</SectionLabel>
          {hasDraft && draft ? (
            <div className="max-h-[26rem] overflow-auto rounded-lg border border-line-soft bg-surface px-3.5 py-3">
              <Markdown source={draft} />
            </div>
          ) : (
            <Unavailable
              reason="This design holds no pr-draft.md."
              detail={`No docs/architecture/designs/${data.designId}/pr-draft.md, so the design states no envisioned pull request.`}
            />
          )}
        </div>
      </div>
    </Tile>
  );
}

/* ------------------------------------------------------------------ export */

export function LensTiles(p: TileProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <PullRequestTile {...p} />
      <RecordTile {...p} />
      <IntentTile {...p} />
      <AssessmentTile {...p} />
      <DecisionsTile {...p} />
      <BuildTile {...p} />
      <DiagramTile {...p} />
    </div>
  );
}

/** The two state vocabularies, and the mapping from the values the index carries. */
export function StateLegends({ data }: { data: ScopeData }) {
  const epicCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const epic of data.entities.epic) {
      const value = data.joins.epic_status[epic.id] ?? epic.state;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [data.entities.epic, data.joins]);

  const sliceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const slice of data.entities.slice) {
      counts.set(slice.state, (counts.get(slice.state) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [data.entities.slice]);

  const scored = data.entities.slice.filter((slice) => slice.score !== null);
  const retried = data.entities.slice.filter((slice) => slice.attempts > 1);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-dashed border-line bg-card px-4 py-3.5 shadow-card">
        <SectionLabel icon={ShieldCheck}>
          Epic states · the intended vocabulary
        </SectionLabel>
        <PrototypeNote className="mb-3">
          None of these six values is in the record index. The board renders the value the
          index carries on every pill, and this table states how each one would read.
        </PrototypeNote>
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {EPIC_STATES.map((state) => (
            <li key={state.key}>
              <Chip tone={state.tone} title={state.gloss}>
                <span
                  className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[state.tone])}
                />
                {state.key}
                <span className="ml-1.5 font-normal text-ink-faint">{state.gloss}</span>
              </Chip>
            </li>
          ))}
        </ul>
        <div className="mt-3.5">
          <SectionLabel icon={ListChecks}>
            Every epic value in this index, and where it would land
          </SectionLabel>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="border-b border-line py-1.5 pr-3 font-mono text-[12px] tracking-[0.04em] text-ink-faint uppercase">
                  the index carries
                </th>
                <th className="border-b border-line py-1.5 pr-3 font-mono text-[12px] tracking-[0.04em] text-ink-faint uppercase">
                  epics
                </th>
                <th className="border-b border-line py-1.5 pr-3 font-mono text-[12px] tracking-[0.04em] text-ink-faint uppercase">
                  intended
                </th>
                <th className="border-b border-line py-1.5 font-mono text-[12px] tracking-[0.04em] text-ink-faint uppercase">
                  because
                </th>
              </tr>
            </thead>
            <tbody>
              {epicCounts.map(([value, count]) => {
                const move = epicMove(value);
                return (
                  <tr key={value}>
                    <td className="border-b border-line-soft py-2 pr-3">
                      <Chip>{value}</Chip>
                    </td>
                    <td className="border-b border-line-soft py-2 pr-3 font-mono text-[13px] tabular-nums">
                      {count}
                    </td>
                    <td className="border-b border-line-soft py-2 pr-3">
                      {move ? (
                        <Chip tone="neutral" dashed className="text-ink-faint">
                          prototype: {move.intended}
                        </Chip>
                      ) : (
                        <span className="font-mono text-[12px] text-ink-faint">
                          no mapping stated
                        </span>
                      )}
                    </td>
                    <td className="border-b border-line-soft py-2 font-serif text-[15px] leading-[1.5] text-ink-mid">
                      {move?.because ?? "This variation states no move for this value."}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-line bg-card px-4 py-3.5 shadow-card">
        <SectionLabel icon={ListChecks}>
          Slice states · the intended vocabulary
        </SectionLabel>
        <PrototypeNote className="mb-3">
          The ladder, the two exits, and the score and attempt columns are the slice loop&apos;s
          own. The index carries one state value per slice row and no more.
        </PrototypeNote>
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {SLICE_STATES.map((state) => (
            <li key={state.key}>
              <Chip tone={state.tone} title={state.gloss}>
                <span
                  className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[state.tone])}
                />
                {state.key}
              </Chip>
            </li>
          ))}
        </ul>
        <div className="mt-3.5 flex flex-col gap-2">
          <Field label="Every slice state in this index">
            <span className="flex flex-wrap gap-1.5">
              {sliceCounts.map(([value, count]) => (
                <Chip key={value}>
                  {value} · {count}
                </Chip>
              ))}
            </span>
          </Field>
          <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
            <Stat value={data.entities.slice.length} label="slice rows" />
            <Stat
              value={scored.length}
              label="carry a score"
              tone="good"
              title="The index records a score for these slices. Nothing rendered them before this variation."
            />
            <Stat
              value={retried.length}
              label="took more than one attempt"
              tone={retried.length > 0 ? "warn" : "neutral"}
              title="The index records an attempt count for every slice."
            />
            <Stat value={`${data.entities.epic.length}`} label="epics in the index" />
          </div>
          <Field label="Slices that resolve to no epic">
            {data.unresolved.length === 0
              ? `None. All ${data.entities.slice.length} slice rows resolve, and the index's slice_to_epic_unresolved join is empty.`
              : `${data.unresolved.length}, listed under the Build region.`}
          </Field>
        </div>
      </section>
    </div>
  );
}
