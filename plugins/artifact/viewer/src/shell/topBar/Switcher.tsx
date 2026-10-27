import { useEffect, useRef, useState, type RefObject } from "react";

import { ChevronDown, Layers, Search } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

import { FOCUS_RING } from "./buttons";
import type { TopBarProps } from "./props";
import { DesignList, EpicList } from "./SwitcherLists";

const TRIGGER_CLASS = cn(
  "group flex min-h-11 min-w-0 cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 text-left",
  "transition-colors duration-150 ease-house hover:bg-surface-2",
  FOCUS_RING,
);

const PANEL_STYLE = { zIndex: "var(--layer-panel)" };
const PANEL_CLASS = "w-[420px] max-w-[92vw] rounded-xl border border-line bg-card p-0 shadow-frame outline-none";

type NameRef = RefObject<HTMLSpanElement | null>;

/*
 * A reader on the board has picked nothing yet, and the control is how they pick.
 * The words state that selection rather than a missing record, so the control
 * reads as the way in and not as a fault. Both phrases are the shell's own.
 */
function NameText({ bar, nameRef }: { bar: TopBarProps; nameRef: NameRef }) {
  const emptyName = bar.board ? "No work item selected" : "No work item";
  return (
    <span id={bar.nameId} ref={nameRef} tabIndex={-1} className="max-w-[38ch] truncate font-mono text-[15px] font-bold outline-none">
      {bar.workName ?? (bar.ready ? emptyName : "reading the index…")}
    </span>
  );
}

function TriggerName({ bar, nameRef }: { bar: TopBarProps; nameRef: NameRef }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="font-mono text-[12px] tracking-[0.08em] text-ink-faint uppercase">
        Work item
      </span>
      <NameText bar={bar} nameRef={nameRef} />
    </span>
  );
}

function TriggerChevron({ open }: { open: boolean }) {
  const turned = cn("size-4 shrink-0 text-ink-faint transition-transform duration-150 ease-house", open && "rotate-180");
  return <ChevronDown className={turned} aria-hidden="true" />;
}

function SwitcherTrigger({ bar, open, nameRef }: { bar: TopBarProps; open: boolean; nameRef: NameRef }) {
  const label = bar.board ? "Pick a work item" : "Change work item";
  return (
    <PopoverPrimitive.Trigger asChild>
      <button type="button" className={TRIGGER_CLASS} aria-label={label}>
        <Layers className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
        <TriggerName bar={bar} nameRef={nameRef} />
        <TriggerChevron open={open} />
      </button>
    </PopoverPrimitive.Trigger>
  );
}

type QueryProps = { query: string; onQuery: (query: string) => void };

function FilterInput({ query, onQuery }: QueryProps) {
  return (
    <input
      value={query}
      onChange={(event) => onQuery(event.target.value)}
      placeholder="Filter by design id or epic id"
      aria-label="Filter the work item list"
      className="min-h-9 w-full bg-transparent font-mono text-[13px] text-foreground outline-none placeholder:text-ink-faint"
    />
  );
}

function FilterBox({ query, onQuery }: QueryProps) {
  return (
    <div className="flex items-center gap-2 border-b border-line-soft px-3 py-2">
      <Search className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
      <FilterInput query={query} onQuery={onQuery} />
    </div>
  );
}

interface PanelProps {
  bar: TopBarProps;
  query: string;
  onQuery: (query: string) => void;
  onPick: () => void;
}

function SwitcherLists({ bar, query, onPick }: Omit<PanelProps, "onQuery">) {
  const needle = query.trim().toLowerCase();
  return (
    <div className="max-h-[62vh] overflow-auto px-2 py-2">
      <DesignList bar={bar} needle={needle} onPick={onPick} />
      <EpicList bar={bar} needle={needle} onPick={onPick} />
    </div>
  );
}

function SwitcherPanel({ bar, query, onQuery, onPick }: PanelProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content align="start" sideOffset={6} style={PANEL_STYLE} className={PANEL_CLASS}>
        <FilterBox query={query} onQuery={onQuery} />
        <SwitcherLists bar={bar} query={query} onPick={onPick} />
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

/* A work-item change moves focus to the bar's work-item name, per section 8.4. */
function useNameFocus(workId: string | null): NameRef {
  const nameRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (workId) nameRef.current?.focus();
  }, [workId]);
  return nameRef;
}

export function Switcher({ bar }: { bar: TopBarProps }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const nameRef = useNameFocus(bar.workId);
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <SwitcherTrigger bar={bar} open={open} nameRef={nameRef} />
      <SwitcherPanel bar={bar} query={query} onQuery={setQuery} onPick={() => setOpen(false)} />
    </PopoverPrimitive.Root>
  );
}
