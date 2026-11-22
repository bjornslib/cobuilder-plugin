import { cn } from "@/lib/utils";

import type { BoardAddress, CardGrain } from "./address";

const LABEL_CLASS = "font-mono text-[10px] tracking-[0.12em] text-ink-dim uppercase";
const BUTTON_CLASS = cn(
  "h-8 cursor-pointer px-3 font-mono text-[12px] text-ink-mid hover:bg-surface-2 hover:text-foreground active:translate-y-px",
  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
);
const SELECTED_CLASS = "bg-accent-wash font-bold text-accent-deep hover:bg-accent-wash hover:text-accent-deep";

const GRAINS: readonly { value: CardGrain; label: string }[] = [
  { value: "epics", label: "Epics" },
  { value: "slices", label: "Slices" },
];

interface SwitchProps {
  value: CardGrain;
  onChange: (value: CardGrain) => void;
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
    <div className="flex shrink-0 items-center gap-2">
      <span className={LABEL_CLASS}>Cards</span>
      <div role="group" aria-label="Cards" className="inline-flex overflow-clip rounded-full border border-line bg-surface">{buttons}</div>
    </div>
  );
}

export function CommandRow({ address, write }: { address: BoardAddress; write: (next: BoardAddress) => void }) {
  if (address.level !== "epics") return null;
  return (
    <div className="flex h-12 min-w-0 shrink-0 items-center border-b border-line bg-surface px-4">
      <CardsSwitch value={address.cards} onChange={(cards) => write({ ...address, cards })} />
    </div>
  );
}
