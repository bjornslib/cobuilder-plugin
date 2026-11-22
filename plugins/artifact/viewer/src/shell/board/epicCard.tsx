import { useId, useState } from "react";

import type { SliceEntity } from "@/data/types";
import type { BoardEpic } from "@/data/types/board";
import { cn } from "@/lib/utils";

import { routeHref } from "../model";
import { epicLabel } from "./epicBoard";
import { OrphanSliceCard, SliceLine, STATE_RULE } from "./orphanCard";
import type { EpicCardModel, SliceGroupModel } from "./shape";
import { epicColumnOf, isDoneSlice, SHAPE_GLYPH, sliceColumnOf, STATUS_COLUMNS, type StatusColumnKey } from "./status";

const CARD_CLASS = "overflow-clip rounded-lg border border-l-[3px] border-line-soft bg-surface shadow-card";
const TARGET_CLASS = cn(
  "absolute inset-0 after:absolute after:inset-0 after:content-['']",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);
const PIPS_CLASS = cn(
  "m-0 flex w-full cursor-pointer items-center gap-2 border-t border-dashed border-line px-2 py-1.5 text-left font-mono text-[10.5px] text-ink-dim",
  "hover:bg-surface-2 active:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
);
const GROUP_HEAD_CLASS = "m-0 flex items-baseline gap-1.5 px-0.5 font-mono text-[10.5px] font-bold tracking-[0.04em] text-ink-dim";
const GROUP_LINK_CLASS = cn(
  "min-w-0 truncate text-ink underline decoration-line underline-offset-[3px] hover:text-accent-deep hover:decoration-primary",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

const STATUS_PILL: Record<StatusColumnKey, string> = {
  planned: "bg-surface-3 text-ink-dim",
  in_progress: "bg-warn-wash text-warn",
  done: "bg-good-wash text-good",
};
const PIP: Record<StatusColumnKey, string> = {
  planned: "size-2 rounded-sm border border-dashed border-ink-faint",
  in_progress: "size-2 rounded-sm border border-warn bg-warn",
  done: "size-2 rounded-sm border border-good bg-good",
};

export function epicHref(programId: string, epicId: string): string {
  return routeHref(programId, "build", `epics/${epicId}`);
}

function StatusPill({ column, word }: { column: StatusColumnKey; word: string }) {
  const shape = STATUS_COLUMNS.find((one) => one.key === column)?.shape ?? "half";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-px font-mono text-[10.5px]", STATUS_PILL[column])}>
      <span aria-hidden="true">{SHAPE_GLYPH[shape]}</span> {word}
    </span>
  );
}

function EpicIdentity({ epic }: { epic: BoardEpic }) {
  return (
    <p className="m-0 flex items-baseline gap-1.5 pr-8">
      {epic.title !== null && <span className="shrink-0 font-mono text-[10.5px] font-bold tracking-[0.04em] text-ink-dim">{epic.epicId}</span>}
      <span className="min-w-0 truncate font-mono text-[12px] font-semibold text-ink">{epicLabel(epic)}</span>
    </p>
  );
}

function EpicMeta({ card, column }: { card: EpicCardModel; column: StatusColumnKey }) {
  return (
    <p className="m-0 mt-1.5 flex flex-wrap items-center gap-1.5">
      <StatusPill column={column} word={card.statusWord} />
      {card.epic.pr !== null && <span className="rounded bg-tint px-1.5 py-px font-mono text-[10.5px] text-tint-ink">#{card.epic.pr}</span>}
    </p>
  );
}

function EpicHead({ card, column }: { card: EpicCardModel; column: StatusColumnKey }) {
  const { epic } = card;
  return (
    <div className="relative p-2 hover:bg-surface-2 active:bg-surface-2">
      <a href={epicHref(epic.design, epic.epicId)} aria-label={`Open epic ${epicLabel(epic)}`} className={TARGET_CLASS} />
      <EpicIdentity epic={epic} />
      <EpicMeta card={card} column={column} />
    </div>
  );
}

function PipsFace({ slices, open }: { slices: SliceEntity[]; open: boolean }) {
  const done = slices.filter((slice) => isDoneSlice(slice.state)).length;
  return (
    <>
      <span aria-hidden="true" className="flex flex-wrap gap-0.5">
        {slices.map((slice) => <span key={slice.id} className={PIP[sliceColumnOf(slice.state)]} />)}
      </span>
      <span className="ml-auto whitespace-nowrap tabular-nums">{done}/{slices.length} done</span>
      <span aria-hidden="true" className={cn("text-[10px] transition-transform duration-150 ease-house", open && "rotate-180")}>▾</span>
    </>
  );
}

function SliceList({ id, slices }: { id: string; slices: SliceEntity[] }) {
  return (
    <ul id={id} className="m-0 flex list-none flex-col gap-0.5 border-t border-line-soft p-1">
      {slices.map((slice) => (
        <li key={slice.id} className="flex items-center gap-2 rounded px-1.5 py-1">
          <span aria-hidden="true" className={cn("shrink-0", PIP[sliceColumnOf(slice.state)])} />
          <SliceLine slice={slice} />
        </li>
      ))}
    </ul>
  );
}

function toggleName(open: boolean, card: EpicCardModel): string {
  const count = card.slices.length;
  return `${open ? "Hide" : "Show"} the ${count} ${count === 1 ? "slice" : "slices"} of ${epicLabel(card.epic)}`;
}

function SlicePipsToggle({ card }: { card: EpicCardModel }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  return (
    <>
      <button type="button" aria-label={toggleName(open, card)} aria-expanded={open} aria-controls={listId} onClick={() => setOpen(!open)} className={PIPS_CLASS}>
        <PipsFace slices={card.slices} open={open} />
      </button>
      {open && <SliceList id={listId} slices={card.slices} />}
    </>
  );
}

export function EpicCard({ card }: { card: EpicCardModel }) {
  const column = epicColumnOf(card.epic.status);
  return (
    <li className={cn(CARD_CLASS, STATE_RULE[column])}>
      <EpicHead card={card} column={column} />
      {card.slices.length > 0 && <SlicePipsToggle card={card} />}
    </li>
  );
}

function SliceCard({ slice }: { slice: SliceEntity }) {
  const compact = sliceColumnOf(slice.state) === "done";
  return (
    <li className={cn("rounded-lg border border-line-soft bg-surface", compact ? "px-2 py-1" : "p-2")}>
      <SliceLine slice={slice} />
      {!compact && slice.state && <p className="m-0 mt-1 font-mono text-[10.5px] text-ink-dim">{slice.state}</p>}
    </li>
  );
}

function GroupHead({ group, programId }: { group: SliceGroupModel; programId: string | null }) {
  const label = <span className="min-w-0 truncate">{group.label}</span>;
  return (
    <p className={GROUP_HEAD_CLASS}>
      {group.epicId !== null && programId !== null ? <a href={epicHref(programId, group.epicId)} className={GROUP_LINK_CLASS}>{label}</a> : label}
      <span className="ml-auto tabular-nums">{group.slices.length}</span>
    </p>
  );
}

export function SliceGroup({ group, programId }: { group: SliceGroupModel; programId: string | null }) {
  const cardOf = (slice: SliceEntity) =>
    group.epicId === null ? <OrphanSliceCard key={slice.id} slice={slice} /> : <SliceCard key={slice.id} slice={slice} />;
  return (
    <li className="flex flex-col gap-1">
      <GroupHead group={group} programId={programId} />
      <ul className="m-0 flex list-none flex-col gap-1 p-0">{group.slices.map(cardOf)}</ul>
    </li>
  );
}
