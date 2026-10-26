import type { EpicDesignEntity, EpicEntity, SliceEntity } from "@/data/types";

import { ListChecks } from "lucide-react";

import BasicAccordion, { type AccordionItem } from "@/components/smoothui/basic-accordion";

import { ActionButton, Box, Chip, KeyValue, SubHead } from "../atoms";
import type { WorkItem } from "../model";
import { ScoreChip, SliceNumber, SliceStateBadge, type OpenSheet } from "./common";

const NO_ENDS_WITH = <span className="text-ink-dim">The slice records no ends-with condition.</span>;

function SliceTitle({ slice }: { slice: SliceEntity }) {
  return (
    <span className="flex min-w-0 flex-1 items-baseline gap-2.5">
      <SliceNumber n={slice.n} />
      <span className="min-w-0 font-serif text-[16px] leading-[1.45]">{slice.title}</span>
    </span>
  );
}

function SliceMeta({ slice }: { slice: SliceEntity }) {
  const word = slice.attempts === 1 ? "attempt" : "attempts";
  return (
    <>
      <ScoreChip score={slice.score} />
      <Chip title="How many attempts the slice loop took.">
        {slice.attempts} {word}
      </Chip>
      <SliceStateBadge slice={slice} />
    </>
  );
}

function SliceFacts({ slice }: { slice: SliceEntity }) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-5 gap-y-2">
      <KeyValue label="slice" value={slice.id} />
      <KeyValue label="n" value={slice.n} />
      <KeyValue label="feature" value={slice.feature} />
      <KeyValue label="score" value={slice.score ?? "unrecorded"} />
      <KeyValue label="attempts" value={slice.attempts} />
    </div>
  );
}

function SliceContent({ slice }: { slice: SliceEntity }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Box label="Ends with">{slice.ends_with ? slice.ends_with : NO_ENDS_WITH}</Box>
      <SliceFacts slice={slice} />
    </div>
  );
}

function sliceItem(slice: SliceEntity): AccordionItem {
  return {
    id: slice.id,
    title: <SliceTitle slice={slice} />,
    meta: <SliceMeta slice={slice} />,
    content: <SliceContent slice={slice} />,
  };
}

/* The caller gates on an empty list, so this is a guard rather than a state. */
function SliceDisclosure({ slices, idPrefix }: { slices: SliceEntity[]; idPrefix: string }) {
  if (slices.length === 0) return null;
  return (
    <BasicAccordion
      items={slices.map(sliceItem)}
      allowMultiple={false}
      idPrefix={idPrefix}
      className="border-line-soft bg-card"
      flush
    />
  );
}

export function epicOutcome(work: WorkItem, epic: EpicEntity): string | null {
  const planRow = work.record?.goal?.epics?.find((row) => row.id === epic.epic_id);
  return planRow?.outcome ?? epic.note ?? null;
}

function EpicOutcome({ work, epic }: { work: WorkItem; epic: EpicEntity }) {
  return (
    <p className="m-0 min-w-0 font-serif text-[16.5px] leading-[1.6] text-foreground">
      {epicOutcome(work, epic) ?? "No outcome is recorded for this epic."}
    </p>
  );
}

/*
  The slices block is absent when the epic owns no slice, on the same rule sections
  follow. The epic's own row states the count, so a block that held only a sentence
  about holding nothing is gone.
*/
function EpicSlices({ slices, epicId }: { slices: SliceEntity[]; epicId: string }) {
  if (slices.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SubHead count={slices.length}>Slices</SubHead>
      <SliceDisclosure slices={slices} idPrefix={`slice-${epicId}`} />
    </div>
  );
}

interface EpicDesignProps {
  epic: EpicEntity;
  design: EpicDesignEntity | undefined;
  openSheet: OpenSheet;
}

/*
  The design block renders only when a design exists. A card states what the epic has,
  and an epic with no document states nothing.

  The sub-head names the document and not the gate. `Gate 4b` is a process step, and
  the document is a technical solution design.

  The block has no chips. A character count and a plan slug are bookkeeping about where
  the document lives, and this shell names no field path and no file it read.
*/
function EpicDesign({ epic, design, openSheet }: EpicDesignProps) {
  if (!design) return null;
  const open = () => openSheet({ kind: "epic-design", doc: design, epic });
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SubHead>Technical solution design</SubHead>
      <ActionButton icon={ListChecks} onClick={open} ariaLabel={`Open the technical solution design for epic ${epic.epic_id}`}>
        Open the design
      </ActionButton>
    </div>
  );
}

function EpicFooter({ index, total, id }: { index: number; total: number; id: string }) {
  return (
    <div className="flex min-w-0 items-baseline gap-3 border-t border-line-soft pt-2.5">
      <span className="font-mono text-[12px] text-ink-faint tabular-nums">
        epic {index + 1} of {total}
      </span>
      <span className="min-w-0 font-mono text-[12px] break-words text-ink-faint">{id}</span>
    </div>
  );
}

interface EpicDisclosureProps {
  work: WorkItem;
  epicId: string;
  index: number;
  openSheet: OpenSheet;
}

/*
  The card carries no bookkeeping row. The refined state `no-pull-request` and the raw
  state `planned` are the bundle talking to itself, and the top bar already states the
  branch for the work. What is left is what the epic is: its outcome here, its slices
  below.
*/
export function EpicDisclosure({ work, epicId, index, openSheet }: EpicDisclosureProps) {
  const epic = work.epics.find((candidate) => candidate.epic_id === epicId);
  if (!epic) return null;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <EpicOutcome work={work} epic={epic} />
      <EpicSlices slices={work.slicesByEpic.get(epic.id) ?? []} epicId={epic.epic_id} />
      <EpicDesign epic={epic} design={work.epicDesigns.get(epic.id)} openSheet={openSheet} />
      <EpicFooter index={index} total={work.epics.length} id={epic.id} />
    </div>
  );
}
