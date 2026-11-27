import { useEffect } from "react";

import { ChevronRight, ClipboardCheck } from "lucide-react";

import type { RubricEntity, SliceEntity } from "@/data/types";

import { Bento, Panel, SubHead } from "../atoms";
import type { WorkItem } from "../model";
import { GateSteps, NoGateRecord } from "./gates";
import { ROW_BUTTON_TALL, ScoreChip, SliceNumber, SliceStateBadge, type OpenSheet } from "./common";

const RUBRIC_EMPTY_CLASS =
  "flex min-w-0 items-center gap-3 rounded-lg border border-dashed border-warn bg-warn-wash px-3.5 py-2.5";

function RubricEmpty({ slice }: { slice: SliceEntity }) {
  return (
    <div data-testid="rubric-empty" className={RUBRIC_EMPTY_CLASS}>
      <SliceNumber n={slice.n} />
      <span className="min-w-0 font-serif text-[15.5px] leading-[1.55] text-ink-mid">
        No rubric document exists for slice {slice.n}. An absent record is not a
        passed gate.
      </span>
    </div>
  );
}

function RubricRowBody({ slice }: { slice: SliceEntity }) {
  return (
    <>
      <SliceNumber n={slice.n} />
      <span className="min-w-0 flex-1 truncate font-serif text-[16px]">{slice.title}</span>
      <span className="flex shrink-0 flex-wrap gap-1.5">
        <ScoreChip score={slice.score} />
        <SliceStateBadge slice={slice} />
      </span>
    </>
  );
}

interface RubricRowProps {
  slice: SliceEntity;
  rubric: RubricEntity | undefined;
  openSheet: OpenSheet;
}

function RubricRow({ slice, rubric, openSheet }: RubricRowProps) {
  if (!rubric) return <RubricEmpty slice={slice} />;
  const open = () => openSheet({ kind: "rubric", doc: rubric, slice });
  return (
    <button type="button" onClick={open} aria-label={`Open the acceptance rubric for slice ${slice.n}`} className={ROW_BUTTON_TALL}>
      <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
      <RubricRowBody slice={slice} />
    </button>
  );
}

/*
 * One row per slice, in slice order. A row with a rubric is a button that opens the
 * whole document in the Sheet, the same way an epic's technical solution design opens,
 * because a rubric is deep content and a panel that held it would bury its own
 * subject. A slice with no rubric keeps its row and states the absence in place. It is
 * not a button, so a press cannot open an empty Sheet.
 *
 * The block is absent when the work holds no slice, because each epic's own row
 * already states its slice count.
 */
function SliceRubrics({ work, openSheet }: { work: WorkItem; openSheet: OpenSheet }) {
  if (work.slices.length === 0) return null;
  return (
    <div className="mt-4 flex min-w-0 flex-col gap-2">
      <SubHead count={work.slices.length}>Slice rubrics</SubHead>
      {work.slices.map((slice) => (
        <RubricRow key={slice.id} slice={slice} rubric={work.rubricBySlice.get(slice.id)} openSheet={openSheet} />
      ))}
    </div>
  );
}

/*
 * The route's slice opens its rubric here. The epic-design Sheet opens only from a
 * press, and no route reaches it. A rubric tail route names a real record, so this
 * opens the Sheet on mount through the same `openSheet` callback a press uses. The App
 * owns the subject, and the route names which one. The shell remounts this section when
 * the tail changes, so a second arrival opens the second rubric, and a Sheet the reader
 * closed stays closed.
 */
function useRubricFocus(work: WorkItem, focus: string | null, openSheet: OpenSheet) {
  const slice = focus !== null ? (work.slices.find((s) => String(s.n) === focus) ?? null) : null;
  const rubric = slice === null ? null : (work.rubricBySlice.get(slice.id) ?? null);
  useEffect(() => {
    if (slice === null || rubric === null) return;
    openSheet({ kind: "rubric", doc: rubric, slice });
  }, [slice, rubric, openSheet]);
}

const RUBRICS_LEAD =
  "The gate record this work runs under, and the rubric each slice was scored against.";

function RubricsPanel({ work, gated, openSheet }: { work: WorkItem; gated: boolean; openSheet: OpenSheet }) {
  const steps = work.gateSteps ?? [];
  const present = gated && steps.length > 0;
  return (
    <Panel span="band" title="Rubrics" icon={ClipboardCheck} lead={RUBRICS_LEAD} absent={!present}>
      {present ? <GateSteps steps={steps} /> : <NoGateRecord />}
      <SliceRubrics work={work} openSheet={openSheet} />
    </Panel>
  );
}

interface RubricsSectionProps {
  work: WorkItem;
  gated: boolean;
  openSheet: OpenSheet;
  /**
   * The slice number the route's tail names, or null. A tail that names a slice with a
   * rubric opens that rubric's Sheet on arrival.
   */
  focus?: string | null;
}

export function RubricsSection({ work, gated, openSheet, focus = null }: RubricsSectionProps) {
  useRubricFocus(work, focus, openSheet);
  return (
    <Bento>
      <RubricsPanel work={work} gated={gated} openSheet={openSheet} />
    </Bento>
  );
}
