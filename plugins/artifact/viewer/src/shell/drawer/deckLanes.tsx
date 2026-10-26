import type { CSSProperties } from "react";

import { ChevronDown } from "lucide-react";
import { useReducedMotion } from "motion/react";

import type { DesignRow } from "@/data/types";
import { cn } from "@/lib/utils";

import { laneRows, type Lane } from "../workDeck";
import { DeckRow } from "./deckRow";
import type { Deck } from "./useDeck";

const HEAD_CLASS = cn(
  "group flex w-full min-w-0 items-baseline gap-2 rounded-md px-2.5 pt-2 pb-1 text-left",
  "border-b border-line transition-colors duration-150 ease-house hover:bg-surface-2/60",
  "cursor-pointer disabled:cursor-not-allowed",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

const BLURB_CLASS = "min-w-0 flex-1 truncate font-serif text-[13px] text-ink-faint";

interface LaneProps {
  lane: Lane;
  deck: Deck;
}

interface Flags {
  isOpen: boolean;
  holdsSelection: boolean;
}

function laneContentId(lane: Lane): string {
  return `lane-${lane.key}-rows`;
}

function LaneChevron({ isOpen }: { isOpen: boolean }) {
  const turned = cn(
    "size-4 shrink-0 self-center text-ink-faint transition-transform duration-150 ease-house",
    !isOpen && "-rotate-90",
  );
  return <ChevronDown className={turned} aria-hidden="true" />;
}

function LaneTitle({ lane, count }: { lane: Lane; count: number }) {
  return (
    <>
      <h3 className="m-0 font-mono text-[12.5px] font-bold tracking-[0.08em] text-ink-dim uppercase">
        {lane.label}
      </h3>
      <span className="font-mono text-[12px] text-ink-faint tabular-nums">{count}</span>
      <span className={BLURB_CLASS} title={lane.blurb}>{lane.blurb}</span>
    </>
  );
}

interface HeaderProps extends Flags {
  lane: Lane;
  count: number;
  onFold: () => void;
}

function LaneHeader({ lane, count, isOpen, holdsSelection, onFold }: HeaderProps) {
  const refuse = holdsSelection ? " — the lane holding the current row stays open" : "";
  return (
    <button type="button" aria-expanded={isOpen} aria-controls={laneContentId(lane)} disabled={holdsSelection} title={`Fold “${lane.label}”${refuse}`} onClick={onFold} className={HEAD_CLASS}>
      <LaneChevron isOpen={isOpen} />
      <LaneTitle lane={lane} count={count} />
    </button>
  );
}

function laneBodyStyle(isOpen: boolean, reduce: boolean): CSSProperties {
  return {
    display: "grid",
    gridTemplateRows: isOpen ? "1fr" : "0fr",
    transition: reduce ? undefined : "grid-template-rows 200ms var(--ease-house, ease)",
  };
}

function LaneEmpty({ text }: { text: string }) {
  return <p className="m-0 px-2.5 py-2 font-serif text-[13.5px] text-ink-dim italic">{text}</p>;
}

function LaneRows({ lane, scoped, deck }: LaneProps & { scoped: DesignRow[] }) {
  const { needleText } = deck.view;
  if (scoped.length === 0) return <LaneEmpty text={needleText.length > 0 ? "no match" : lane.empty} />;
  return (
    <div className="flex min-w-0 flex-col py-1">
      {scoped.map((row, rowIndex) => (
        <DeckRow key={row.design.id} row={row} needle={needleText} selected={row.design.id === deck.state.selection?.id} onSelect={() => deck.actions.toggleDetail(row.design.id)} index={rowIndex} />
      ))}
    </div>
  );
}

/* The rows stay mounted: a fold animates the height and
   hides nothing from the walk. */
function LaneBody({ lane, scoped, isOpen, deck }: LaneProps & { scoped: DesignRow[]; isOpen: boolean }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <div id={laneContentId(lane)} style={laneBodyStyle(isOpen, reduce)} className="min-w-0 overflow-hidden">
      <div className="min-h-0 min-w-0 overflow-hidden">
        <LaneRows lane={lane} scoped={scoped} deck={deck} />
      </div>
    </div>
  );
}

/* `folded[key]` is true when closed, so a press sets the next value to
   `isOpen`: it inverts what the lane now is. */
function foldLane(deck: Deck, lane: Lane, { isOpen, holdsSelection }: Flags): void {
  if (holdsSelection) return;
  deck.state.setFolded((was) => ({ ...was, [lane.key]: isOpen }));
}

function LaneSection({ lane, deck }: LaneProps) {
  const scoped = laneRows(lane, deck.rows, deck.view.needleText);
  const isOpen = !deck.state.folded[lane.key];
  const holdsSelection = deck.view.selected !== null && lane.stages.includes(deck.view.selected.design.stage);
  const onFold = () => foldLane(deck, lane, { isOpen, holdsSelection });
  return (
    <section aria-label={lane.label} className="mb-2 min-w-0">
      <LaneHeader lane={lane} count={scoped.length} isOpen={isOpen} holdsSelection={holdsSelection} onFold={onFold} />
      <LaneBody lane={lane} scoped={scoped} isOpen={isOpen} deck={deck} />
    </section>
  );
}

/*
 * The fold is a display choice and the content stays: the deck folds a lane to
 * its header line and the rows remain mounted beneath it. The walk and the
 * counts keep them, the refusal keeps the current row's lane open, and a folded
 * lane opened by the walk stays put. It is the house `rt` fold (mounted
 * content, animated height, inert off), not a v-if, because a v-if is
 * removal: the defect the engineer named.
 */
export function LaneList({ deck }: { deck: Deck }) {
  return deck.view.visibleLanes.map((lane) => <LaneSection key={lane.key} lane={lane} deck={deck} />);
}
