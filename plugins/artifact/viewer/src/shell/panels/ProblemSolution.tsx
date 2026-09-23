/**
 * The Problem and Solution level: Problem and solution, Risks, Assessment, Unknowns.
 *
 * THE LEVEL IS FOUR SECTIONS, NOT ONE GRID. It used to be a `Bento` holding four
 * `Panel`s, and each panel named a span inside a twelve-column grid. The level is a
 * horizontal pager now, so each section is its own box on the track and takes the whole
 * width of the stage it sits in. Every panel keeps its heading, icon, lead, absence
 * rule, count, and body; the only change is that a section returns one `Panel` rather
 * than a grid wrapper, and no panel names a span.
 *
 * A section is never reordered. The order here is the order the reader walks with Next:
 * Problem and solution, Risks, Assessment, Unknowns.
 *
 * PROBLEM AND SOLUTION IS TWO CARDS, AND THE POINTS ARE THEIR ROWS. Each point used to
 * sit in its own outlined box, and the authored problem and approach prose sat in two
 * more boxes below, painted amber and green. That is two treatments for one thing, and
 * the colour was doing work the words already did. Now each column is one shadcn `Card`.
 * The authored prose is the card's unboxed lead, and the points are striped rows under
 * it. `PointCard` in `../atoms` is that shape.
 *
 * THIS FILE IS THE PORTED PROTOTYPE at `src/variations/sections-e/panels.tsx`, split by
 * level so `panels/` holds one file per level. The record type comes from
 * `@/data/bundle`, which declares every assessment field and finding field possibly
 * absent, so the two reads below coalesce a missing value to an empty string rather than
 * passing undefined. The rendered pixels are the same either way.
 */

import { BookMarked, CircleHelp, Scale, ShieldAlert } from "lucide-react";

import BasicAccordion from "@/components/smoothui/basic-accordion";
import type { AssessmentFinding } from "@/data/bundle";

import { excerpt } from "../records";
import type { LevelState, WorkItem } from "../model";
import { splitBeats } from "../model";
import {
  Box,
  Chip,
  Missing,
  Panel,
  PointCard,
  StateBadge,
  TextList,
  toneForSeverity,
  toneForVerdict,
} from "../atoms";
import { VERDICT_GLOSS } from "../gloss";

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
          /*
           * A record may carry an assessment and no verdict in it. The badge then
           * carries no word, exactly as it did before the shipped type declared the
           * field possibly absent, and the gloss states what an unrecorded verdict
           * means: it is not a pass.
           */
          <StateBadge
            word={assessment.verdict ?? ""}
            tone={toneForVerdict(assessment.verdict ?? "")}
            gloss={VERDICT_GLOSS[assessment.verdict ?? ""] ?? "A verdict outside the recorded vocabulary."}
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
