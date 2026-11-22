import type { SliceEntity } from "@/data/types";
import { cn } from "@/lib/utils";

import { sliceHref } from "../model/routes";
import { SliceLine } from "./orphanCard";
import { sliceColumnOf, type StatusColumnKey } from "./status";

const ROW_CLASS = cn(
  "flex items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-surface-3 active:bg-surface-3",
  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
);
const CARD_FRAME = "block rounded-lg border border-line-soft bg-surface text-left";
const CARD_LINK_CLASS = cn(
  CARD_FRAME,
  "hover:bg-surface-2 active:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

export const PIP: Record<StatusColumnKey, string> = {
  planned: "size-2 rounded-sm border border-dashed border-ink-faint",
  in_progress: "size-2 rounded-sm border border-warn bg-warn",
  done: "size-2 rounded-sm border border-good bg-good",
};

export interface SliceTarget {
  programId: string;
  epicId: string;
}

function SliceRowLink({ slice, target }: { slice: SliceEntity; target: SliceTarget }) {
  return (
    <a href={sliceHref(target.programId, target.epicId, slice.n)} className={ROW_CLASS}>
      <span aria-hidden="true" className={cn("shrink-0", PIP[sliceColumnOf(slice.state)])} />
      <SliceLine slice={slice} />
    </a>
  );
}

export function SliceList({ id, slices, target }: { id: string; slices: SliceEntity[]; target: SliceTarget }) {
  return (
    <ul id={id} className="m-0 flex list-none flex-col gap-0.5 border-t border-line-soft p-1">
      {slices.map((slice) => <li key={slice.id}><SliceRowLink slice={slice} target={target} /></li>)}
    </ul>
  );
}

function SliceCardBody({ slice, compact }: { slice: SliceEntity; compact: boolean }) {
  return (
    <>
      <SliceLine slice={slice} />
      {!compact && slice.state && <p className="m-0 mt-1 font-mono text-[10.5px] text-ink-dim">{slice.state}</p>}
    </>
  );
}

export function SliceCard({ slice, target }: { slice: SliceEntity; target: SliceTarget | null }) {
  const compact = sliceColumnOf(slice.state) === "done";
  const pad = compact ? "px-2 py-1" : "p-2";
  const body = <SliceCardBody slice={slice} compact={compact} />;
  if (target === null) return <li className={cn(CARD_FRAME, pad)}>{body}</li>;
  return (
    <li>
      <a href={sliceHref(target.programId, target.epicId, slice.n)} className={cn(CARD_LINK_CLASS, pad)}>{body}</a>
    </li>
  );
}
