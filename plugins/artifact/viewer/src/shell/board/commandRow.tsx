import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

import type { BoardAddress, CardGrain, ProgramOrder } from "./address";
import { useFindFocus } from "./useFindFocus";

const LABEL_CLASS = "font-mono text-[10px] tracking-[0.12em] text-ink-dim uppercase";
const GROUP_CLASS = "flex shrink-0 items-center gap-2 border-l border-line pl-4";
const BUTTON_CLASS = cn(
  "transition-colors duration-[var(--motion-hover)] ease-[var(--ease)] h-8 cursor-pointer px-3 font-mono text-[12px] text-ink-mid hover:bg-surface-2 hover:text-foreground active:translate-y-px",
  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
);
const SELECTED_CLASS = "bg-accent-wash font-bold text-accent-deep hover:bg-accent-wash hover:text-accent-deep";
const ROW_CLASS = "flex h-12 min-w-0 shrink-0 items-center border-b border-line bg-surface px-4";
const INPUT_CLASS = cn(
  "h-8 w-full max-w-[340px] min-w-0 rounded-md border border-line bg-surface px-2.5 font-mono text-[12.5px] text-ink outline-none",
  "transition-colors duration-[var(--motion-hover)] ease-[var(--ease)] placeholder:text-ink-faint hover:border-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  "disabled:cursor-not-allowed disabled:opacity-45",
);
const SELECT_CLASS = cn(
  "transition-colors duration-[var(--motion-hover)] ease-[var(--ease)] h-8 rounded-md border border-line bg-surface px-2 font-mono text-[12px] text-ink hover:bg-surface-2",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

const GRAINS: readonly { value: CardGrain; label: string }[] = [
  { value: "epics", label: "Epics" },
  { value: "slices", label: "Slices" },
];
const ORDERS: readonly { value: ProgramOrder; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "open", label: "Most open work" },
  { value: "progress", label: "Progress" },
];

interface SwitchProps {
  value: CardGrain;
  onChange: (value: CardGrain) => void;
}

interface CommandRowProps {
  address: BoardAddress;
  write: (next: BoardAddress) => void;
  replace: (next: BoardAddress) => void;
}

function GrainButton({ grain, label, value, onChange }: SwitchProps & { grain: CardGrain; label: string }) {
  return (
    <button type="button" aria-pressed={value === grain} onClick={() => onChange(grain)} className={cn(BUTTON_CLASS, value === grain && SELECTED_CLASS)}>
      {label}
    </button>
  );
}

function CardsSwitch({ value, onChange }: SwitchProps) {
  const buttons = GRAINS.map((one) => <GrainButton key={one.value} grain={one.value} label={one.label} value={value} onChange={onChange} />);
  return (
    <div className={GROUP_CLASS}>
      <span className={LABEL_CLASS}>Cards</span>
      <div role="group" aria-label="Cards" className="inline-flex overflow-clip rounded-full border border-line bg-surface">{buttons}</div>
    </div>
  );
}

function OrderSelect({ value, onChange }: { value: ProgramOrder; onChange: (value: ProgramOrder) => void }) {
  const pick = (raw: string) => onChange(ORDERS.find((one) => one.value === raw)?.value ?? "name");
  return (
    <div className={GROUP_CLASS}>
      <label htmlFor="board-order" className={LABEL_CLASS}>Order</label>
      <select id="board-order" value={value} onChange={(event) => pick(event.target.value)} className={SELECT_CLASS}>
        {ORDERS.map((one) => <option key={one.value} value={one.value}>{one.label}</option>)}
      </select>
    </div>
  );
}

function useFindText(q: string, onChange: ((text: string) => void) | null): [string, (text: string) => void] {
  const [seen, setSeen] = useState(q);
  const [text, setText] = useState(q);
  if (seen !== q) {
    setSeen(q);
    setText(q);
  }
  return [text, (next) => { setText(next); onChange?.(next); }];
}

function FindField({ q, onChange }: { q: string; onChange: ((text: string) => void) | null }) {
  const field = useRef<HTMLInputElement>(null);
  const [text, change] = useFindText(q, onChange);
  useFindFocus(field);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 pr-4">
      <label htmlFor="board-find" className={cn(LABEL_CLASS, "shrink-0")}>Find</label>
      <input ref={field} id="board-find" type="search" value={text} disabled={onChange === null} onChange={(event) => change(event.target.value)} placeholder="Program, epic, or slice. Press / to focus" className={INPUT_CLASS} />
    </div>
  );
}

export function LoadingCommandRow() {
  return (
    <div className={ROW_CLASS}>
      <FindField q="" onChange={null} />
    </div>
  );
}

export function CommandRow({ address, write, replace }: CommandRowProps) {
  return (
    <div className={ROW_CLASS}>
      <FindField q={address.q} onChange={(q) => replace({ ...address, q })} />
      {address.level === "programs" && <OrderSelect value={address.order} onChange={(order) => write({ ...address, order })} />}
      {address.level === "epics" && <CardsSwitch value={address.cards} onChange={(cards) => write({ ...address, cards })} />}
    </div>
  );
}
