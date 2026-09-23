/**
 * The Intent, Problem, and Solution lenses.
 *
 * These three read the authored records, and every one of them renders its content
 * as boxes and cards rather than as a paragraph. The prose stays in a box with a
 * label and the file it came from, and everything the record already lists becomes a
 * card: an alternative, an unknown, a reviewer focus line, a done-when condition.
 *
 * All three share one shell. The shell decides between four states, and it never
 * renders a blank body: loading, unreadable, absent, and present.
 */

import type { ReactNode } from "react";
import {
  AlertTriangle,
  Compass,
  Crosshair,
  Eye,
  type LucideIcon,
  Wrench,
} from "lucide-react";

import { cn } from "@/lib/utils";

import {
  Chip,
  ContentCard,
  Disclosure,
  EmptyLensBody,
  LensTile,
  LoadingLine,
  NumberedCard,
  Prose,
  ProseBox,
  SectionLabel,
} from "./primitives";
import {
  absenceNote,
  intentStatus,
  problemStatus,
  solutionStatus,
  type LensStatus,
} from "./lenses";
import { levelsOf, type DesignRecord, type RecordsLoad } from "./records";

/**
 * The shell every record-backed lens uses. Four states, one place, so no tile can
 * invent a fifth.
 */
export function RecordLens({
  icon,
  title,
  status,
  load,
  record,
  designId,
  children,
}: {
  icon: LucideIcon;
  title: string;
  status: LensStatus;
  load: RecordsLoad;
  record: DesignRecord | null;
  designId: string;
  children: ReactNode;
}) {
  const absent = load.state === "ready" && !status.present;
  const sub =
    load.state === "loading"
      ? `reading ${status.file}`
      : load.state === "failed"
        ? "the authored records did not load"
        : status.present
          ? status.shows
          : "no record. This lens is disabled";

  return (
    <LensTile
      id={`lens-${title.toLowerCase()}-${designId}`}
      icon={icon}
      title={title}
      sub={sub}
      muted={absent || load.state === "failed"}
    >
      {load.state === "loading" ? (
        <LoadingLine>Reading the authored records for {designId}.</LoadingLine>
      ) : null}

      {load.state === "failed" ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-warn bg-warn-wash px-3.5 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden="true" />
          <p className="m-0 font-serif text-[15.5px] leading-[1.5] text-ink-mid">
            The authored records did not load, so this lens cannot say whether a record
            exists. The reason is in the panel above the mosaic. Nothing here is empty
            by accident.
          </p>
        </div>
      ) : null}

      {absent ? (
        <EmptyLensBody
          file={status.file}
          what={status.missing}
          note={absenceNote(record)}
        />
      ) : null}

      {/*
        The body fills the tile so the provenance line can sit at its foot. A row of
        three tiles stretches to its tallest member, and a line pinned to the bottom
        of each one reads better than a gap under the shortest.
      */}
      {load.state === "ready" && status.present ? (
        <div className="flex h-full flex-col gap-3">{children}</div>
      ) : null}
    </LensTile>
  );
}

export function IntentTile({
  record,
  load,
  designId,
}: {
  record: DesignRecord | null;
  load: RecordsLoad;
  designId: string;
}) {
  const status = intentStatus(record, designId);
  const intent = record?.intent;

  return (
    <RecordLens
      icon={Compass}
      title="Intent"
      status={status}
      load={load}
      record={record}
      designId={designId}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {intent?.authorship ? (
            <Chip tone="accent" title="intent.json: authorship">
              {intent.authorship}
            </Chip>
          ) : null}
          {intent?.captured ? (
            <Chip title="intent.json: captured">captured {intent.captured}</Chip>
          ) : null}
          {intent?.source ? (
            <Chip tone="muted" title="intent.json: source">
              source {intent.source}
            </Chip>
          ) : null}
          {record?.goal.rounds?.length ? (
            <Chip
              tone="warn"
              title={record.goal.rounds
                .map((round) => `round ${round.n}: ${round.feedback_class ?? "unclassified"}`)
                .join(", ")}
            >
              {record.goal.rounds.length} challenge rounds
            </Chip>
          ) : null}
        </div>

        {intent?.why_now ? (
          <ProseBox title="Why now" source="intent.json">
            <Prose>{intent.why_now}</Prose>
          </ProseBox>
        ) : null}

        {intent?.reviewer_focus?.length ? (
          <div>
            <SectionLabel count={intent.reviewer_focus.length}>
              Reviewer focus
            </SectionLabel>
            <div className="flex flex-col gap-2">
              {intent.reviewer_focus.map((line, index) => (
                <NumberedCard key={line} n={index + 1}>
                  {line}
                </NumberedCard>
              ))}
            </div>
          </div>
        ) : null}

        {intent?.unknowns?.length ? (
          <Disclosure
            label="What the design does not know yet"
            count={intent.unknowns.length}
          >
            <div className="flex flex-col gap-2">
              {intent.unknowns.map((line) => (
                <ContentCard key={line} label="unknown" labelTone="warn">
                  {line}
                </ContentCard>
              ))}
            </div>
          </Disclosure>
        ) : null}

        {intent?.testing || record?.goal.min_work?.derived_from ? (
          <Disclosure label="How this design was tested and derived" kind="record">
            <div className="flex flex-col gap-2.5">
              {intent?.testing ? (
                <ProseBox title="Testing" source="intent.json">
                  <Prose>{intent.testing}</Prose>
                </ProseBox>
              ) : null}
              {record?.goal.min_work?.derived_from ? (
                <ProseBox title="What this design was derived from" source="goal.json">
                  <Prose>{record.goal.min_work.derived_from}</Prose>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Chip
                      tone={record.goal.min_work.challenge_stage_run ? "good" : "warn"}
                    >
                      challenge stage{" "}
                      {record.goal.min_work.challenge_stage_run ? "ran" : "did not run"}
                    </Chip>
                    {typeof record.goal.min_work.alternatives_explored === "number" ? (
                      <Chip>
                        {record.goal.min_work.alternatives_explored} alternatives explored
                      </Chip>
                    ) : null}
                    {typeof record.goal.min_work.boundary_rules_checked === "boolean" ? (
                      <Chip
                        tone={
                          record.goal.min_work.boundary_rules_checked ? "good" : "warn"
                        }
                      >
                        boundary rules{" "}
                        {record.goal.min_work.boundary_rules_checked
                          ? "checked"
                          : "not checked"}
                      </Chip>
                    ) : null}
                  </div>
                </ProseBox>
              ) : null}
            </div>
          </Disclosure>
        ) : null}

        <Provenance file={status.file} extra="intent.json" />
      </div>
    </RecordLens>
  );
}

export function ProblemTile({
  record,
  load,
  designId,
}: {
  record: DesignRecord | null;
  load: RecordsLoad;
  designId: string;
}) {
  const status = problemStatus(record, designId);
  const levels = levelsOf(record?.narrative);
  const narrated = levels?.problem_solution;
  const recorded = record?.intent?.problem;
  const shownNarrated = narrated?.problem ?? null;
  const bothDiffer = Boolean(recorded && shownNarrated && recorded !== shownNarrated);

  return (
    <RecordLens
      icon={Crosshair}
      title="Problem"
      status={status}
      load={load}
      record={record}
      designId={designId}
    >
      <div className="flex flex-col gap-3">
        {recorded ? (
          <ProseBox title="The problem" source="intent.json">
            <Prose>{recorded}</Prose>
          </ProseBox>
        ) : null}

        {bothDiffer ? (
          <ProseBox title="The problem, as narrated" source="narrative.json">
            <Prose>{shownNarrated}</Prose>
          </ProseBox>
        ) : null}

        {!recorded && shownNarrated ? (
          <ProseBox title="The problem" source="narrative.json">
            <Prose>{shownNarrated}</Prose>
          </ProseBox>
        ) : null}

        {levels?.landscape?.tagline ? (
          <ContentCard label="in one line" labelTone="accent">
            {levels.landscape.tagline}
          </ContentCard>
        ) : null}

        {narrated?.beats?.length ? (
          <div>
            <SectionLabel count={narrated.beats.length}>Narrative beats</SectionLabel>
            <div className="flex flex-col gap-2">
              {narrated.beats.map((beat, index) => (
                <ContentCard
                  key={`${beat.kind ?? "beat"}-${index}`}
                  label={beat.kind ?? "beat"}
                >
                  {beat.text ?? ""}
                </ContentCard>
              ))}
            </div>
          </div>
        ) : null}

        {record?.intent?.risks?.length ? (
          <Disclosure label="Risks the design named" count={record.intent.risks.length}>
            <div className="flex flex-col gap-2">
              {record.intent.risks.map((line) => (
                <ContentCard key={line} label="risk" labelTone="warn">
                  {line}
                </ContentCard>
              ))}
            </div>
          </Disclosure>
        ) : null}

        <Provenance file={status.file} extra="intent.json, narrative.json" />
      </div>
    </RecordLens>
  );
}

export function SolutionTile({
  record,
  load,
  designId,
}: {
  record: DesignRecord | null;
  load: RecordsLoad;
  designId: string;
}) {
  const status = solutionStatus(record, designId);
  const levels = levelsOf(record?.narrative);
  const narrated = levels?.problem_solution;
  const recorded = record?.intent?.approach;
  const alternatives = narrated?.alternatives ?? record?.intent?.alternatives ?? [];
  const doneWhen = record?.goal.done_when ?? [];
  const outOfScope = record?.intent?.out_of_scope ?? [];

  return (
    <RecordLens
      icon={Wrench}
      title="Solution"
      status={status}
      load={load}
      record={record}
      designId={designId}
    >
      <div className="flex flex-col gap-3">
        {narrated?.solution ? (
          <ProseBox title="The approach, as narrated" source="narrative.json">
            <Prose>{narrated.solution}</Prose>
          </ProseBox>
        ) : null}

        {recorded ? (
          <ProseBox title="The approach, as recorded" source="intent.json">
            <Prose>{recorded}</Prose>
          </ProseBox>
        ) : null}

        {alternatives.length > 0 ? (
          <div>
            <SectionLabel count={alternatives.length}>
              Alternatives considered
            </SectionLabel>
            <div className="flex flex-col gap-2">
              {alternatives.map((entry) => (
                <ContentCard
                  key={entry.option}
                  label="rejected"
                  labelTone="warn"
                  title={entry.option}
                >
                  {entry.rejected_because}
                </ContentCard>
              ))}
            </div>
          </div>
        ) : null}

        {doneWhen.length > 0 ? (
          <Disclosure label="Done when the design is finished" count={doneWhen.length}>
            <div className="flex flex-col gap-2">
              {doneWhen.map((line, index) => (
                <NumberedCard key={line} n={index + 1}>
                  {line}
                </NumberedCard>
              ))}
            </div>
          </Disclosure>
        ) : null}

        {outOfScope.length > 0 ? (
          <Disclosure label="Out of scope" count={outOfScope.length}>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {outOfScope.map((line) => (
                <li
                  key={line}
                  className="rounded-lg border border-dashed border-line bg-card px-3 py-2 font-serif text-[15.5px] leading-[1.5] text-ink-mid"
                >
                  {line}
                </li>
              ))}
            </ul>
          </Disclosure>
        ) : null}

        {record?.goal.abort_if?.length ? (
          <Disclosure label="Abort if" count={record.goal.abort_if.length}>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {record.goal.abort_if.map((line) => (
                <li key={line}>
                  <ContentCard label="abort condition" labelTone="warn">
                    {line}
                  </ContentCard>
                </li>
              ))}
            </ul>
          </Disclosure>
        ) : null}

        <Provenance file={status.file} extra="narrative.json, goal.json" />
      </div>
    </RecordLens>
  );
}

/** The last line of every record-backed tile: which files it read. */
function Provenance({ file, extra }: { file: string; extra: string }) {
  return (
    <p
      className={cn(
        "m-0 mt-auto flex items-center gap-1.5 border-t border-line-soft pt-2.5 font-mono text-[12px] text-ink-faint",
      )}
    >
      <Eye className="size-3.5 shrink-0" aria-hidden="true" />
      read from {file}
      <span className="text-line">/</span>
      {extra}
    </p>
  );
}
