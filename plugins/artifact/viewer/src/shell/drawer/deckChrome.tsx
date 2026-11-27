import { X } from "lucide-react";
import { Drawer } from "vaul";

import { cn } from "@/lib/utils";

import { FILTER_ALL, LANES } from "../workDeck";
import { filterCountOf } from "./deckView";
import type { Deck } from "./useDeck";

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const CHIP_BASE = cn(
  "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1",
  "font-mono text-[12.5px] font-bold transition-colors duration-150 ease-house",
  FOCUS_RING,
);

const CLEAR_CLASS = cn(
  "shrink-0 cursor-pointer rounded-md p-1 text-ink-faint transition-colors duration-150 ease-house hover:bg-surface-2 hover:text-foreground",
  FOCUS_RING,
);

const STRIP_CLASS = "flex min-w-0 shrink-0 flex-wrap items-center gap-1.5 border-b border-line px-4 py-2";

const CHIP_ACTIVE = "border-primary bg-accent-wash text-accent-deep";
const CHIP_IDLE = "border-line bg-surface text-ink-mid hover:border-primary/60 hover:bg-surface-2";

export function DeckHeader({ deck }: { deck: Deck }) {
  return (
    <header className="flex shrink-0 flex-wrap items-baseline gap-x-4 gap-y-1 px-4 pt-2.5 pb-1">
      <Drawer.Title className="m-0 font-mono text-[22px] font-bold tracking-[0.02em]">
        WORK
      </Drawer.Title>
      <span className="font-mono text-[13px] text-ink-faint tabular-nums">
        {deck.rows.length} designs · {deck.view.shown} shown
      </span>
    </header>
  );
}

function SearchInput({ deck }: { deck: Deck }) {
  return (
    <input
      ref={deck.searchRef}
      value={deck.state.needle}
      onChange={(event) => deck.actions.typeNeedle(event.target.value)}
      placeholder="refine the deck…"
      aria-label="Search the work items"
      className="min-h-9 min-w-0 flex-1 bg-transparent font-mono text-[14px] text-foreground outline-none placeholder:text-ink-faint"
    />
  );
}

function ClearSearch({ deck }: { deck: Deck }) {
  if (deck.state.needle.length === 0) return null;
  return (
    <button type="button" onClick={() => deck.state.setNeedle("")} aria-label="Clear the search" className={CLEAR_CLASS}>
      <X className="size-3.5" aria-hidden="true" />
    </button>
  );
}

function KeyHints() {
  return (
    <span className="shrink-0 font-mono text-[11.5px] text-ink-faint">
      <kbd>/</kbd> search &middot; <kbd>↓</kbd>/<kbd>↑</kbd> walk &middot;{" "}
      <kbd>↵</kbd> detail &middot; <kbd>esc</kbd> closes
    </span>
  );
}

export function SearchRow({ deck }: { deck: Deck }) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-2.5">
      <span aria-hidden="true" className="shrink-0 font-mono text-[15px] text-primary">
        &rsaquo;
      </span>
      <SearchInput deck={deck} />
      <ClearSearch deck={deck} />
      <KeyHints />
    </div>
  );
}

function chipLabel(key: string): string {
  return key === FILTER_ALL ? "All" : (LANES.find((l) => l.key === key)?.label ?? key);
}

function FilterChip({ chip, deck }: { chip: string; deck: Deck }) {
  const active = deck.state.laneFilter === chip;
  return (
    <button type="button" aria-pressed={active} onClick={() => deck.state.setLaneFilter(chip)} className={cn(CHIP_BASE, active ? CHIP_ACTIVE : CHIP_IDLE)}>
      {chipLabel(chip)}
      <span aria-hidden="true" className="font-mono text-[11px] font-normal text-ink-faint tabular-nums">
        {filterCountOf(deck.rows, chip)}
      </span>
    </button>
  );
}

/*
 * The state filter combines with the search as AND: the strip narrows where
 * to read, the search narrows what is on the page.
 */
export function FilterStrip({ deck }: { deck: Deck }) {
  return (
    <div aria-label="Filter the lanes by state" data-chip-strip="" className={STRIP_CLASS}>
      {deck.view.chips.map((chip) => (
        <FilterChip key={chip} chip={chip} deck={deck} />
      ))}
    </div>
  );
}
