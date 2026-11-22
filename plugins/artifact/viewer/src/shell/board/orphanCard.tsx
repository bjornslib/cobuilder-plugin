import { useId, useState } from "react";

import type { SliceEntity } from "@/data/types";
import { cn } from "@/lib/utils";

import { sliceColumnOf, type StatusColumnKey } from "./status";

const CARD_CLASS = "rounded-lg border border-l-[3px] border-line-soft bg-surface";
const BUTTON_CLASS = cn(
  "flex w-full flex-col gap-1 p-2 text-left hover:bg-surface-2 active:bg-surface-3",
  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
);
const FACTS_CLASS = "m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-line-soft px-2 py-2 font-mono text-[11.5px]";

export const STATE_RULE: Record<StatusColumnKey, string> = {
  planned: "border-l-ink-faint",
  in_progress: "border-l-warn",
  done: "border-l-good",
};

export function SliceLine({ slice }: { slice: SliceEntity }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="shrink-0 font-mono text-[10.5px] font-bold text-ink-dim">#{slice.n}</span>
      <span className="min-w-0 truncate font-mono text-[11.5px] text-ink">{slice.title}</span>
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-ink-dim">{label}</dt>
      <dd className="m-0 font-serif text-[12px] leading-[1.4] text-ink-mid">{value}</dd>
    </>
  );
}

function SliceFacts({ id, slice, open }: { id: string; slice: SliceEntity; open: boolean }) {
  return (
    <dl id={id} hidden={!open} className={FACTS_CLASS}>
      <Fact label="Ends with" value={slice.ends_with} />
      <Fact label="Score" value={slice.score ?? "Not scored"} />
      <Fact label="Attempts" value={String(slice.attempts)} />
      <Fact label="State" value={slice.state} />
    </dl>
  );
}

export function OrphanSliceCard({ slice }: { slice: SliceEntity }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <li className={cn(CARD_CLASS, STATE_RULE[sliceColumnOf(slice.state)], open && "bg-accent-wash")}>
      <button type="button" aria-label={`Show the end state, score, and attempts of ${slice.title}`} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)} className={BUTTON_CLASS}>
        <SliceLine slice={slice} />
      </button>
      <SliceFacts id={panelId} slice={slice} open={open} />
    </li>
  );
}
