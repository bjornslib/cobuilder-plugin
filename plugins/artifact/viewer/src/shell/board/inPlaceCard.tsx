import { createContext, useContext, useId, useMemo, useState, type ReactNode } from "react";

import type { SliceEntity } from "@/data/types";
import { cn } from "@/lib/utils";

import { sliceColumnOf, type StatusColumnKey } from "./status";

const CARD_CLASS = "rounded-lg border border-l-[3px] border-line-soft bg-surface";
const BUTTON_CLASS = cn(
  "flex w-full flex-col gap-1 p-2 text-left transition-colors duration-[var(--motion-hover)] ease-[var(--ease)] hover:bg-surface-2 active:bg-surface-3",
  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
);
const FACTS_CLASS = "m-0 animate-[board-panel-in_var(--motion-panel)_var(--ease)] grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-line-soft px-2 py-2 font-mono text-[11.5px]";

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

interface OpenSlice {
  openId: string | null;
  toggle: (id: string) => void;
}

const OpenSliceContext = createContext<OpenSlice | null>(null);

export function InPlaceCardScope({ q, children }: { q: string; children: ReactNode }) {
  const [open, setOpen] = useState<{ id: string | null; q: string }>({ id: null, q });
  const openId = open.q === q ? open.id : null;
  const value = useMemo(() => ({ openId, toggle: (id: string) => setOpen({ id: openId === id ? null : id, q }) }), [openId, q]);
  return <OpenSliceContext.Provider value={value}>{children}</OpenSliceContext.Provider>;
}

function useOpenSlice(id: string): { open: boolean; toggle: () => void } {
  const scope = useContext(OpenSliceContext);
  if (scope === null) throw new Error("InPlaceSliceCard needs an InPlaceCardScope above it.");
  return { open: scope.openId === id, toggle: () => scope.toggle(id) };
}

export function InPlaceSliceCard({ slice }: { slice: SliceEntity }) {
  const { open, toggle } = useOpenSlice(slice.id);
  const panelId = useId();
  return (
    <li className={cn(CARD_CLASS, STATE_RULE[sliceColumnOf(slice.state)], open && "bg-accent-wash")}>
      <button type="button" aria-label={`Show the end state, score, and attempts of ${slice.title}`} aria-expanded={open} aria-controls={panelId} onClick={toggle} className={BUTTON_CLASS}>
        <SliceLine slice={slice} />
      </button>
      <SliceFacts id={panelId} slice={slice} open={open} />
    </li>
  );
}
