import { Drawer } from "vaul";

import type { DesignRow, EpicEntity } from "@/data/types";

import { DeckHeader, FilterStrip, SearchRow } from "./deckChrome";
import { LaneList } from "./deckLanes";
import { DetailPane } from "./detailPane";
import { useDeck, type BodyProps, type Deck } from "./useDeck";

function emptyMessage(deck: Deck): string {
  if (deck.rows.length === 0) return "The bundle holds no design.";
  if (deck.view.needleText.length > 0) {
    return `Nothing on the deck matches “${deck.state.needle.trim()}”. Clear the search, or widen the state filter above.`;
  }
  return "No lane holds these stages with this filter. Widen the state filter above.";
}

function EmptyBoard({ deck }: { deck: Deck }) {
  return (
    <p className="m-0 px-2 py-6 font-serif text-[15.5px] text-ink-dim italic">
      {emptyMessage(deck)}
    </p>
  );
}

/* The board: one vertical read of five lane sections. */
function DeckBoard({ deck }: { deck: Deck }) {
  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-3 py-2">
      {deck.view.shown === 0 ? <EmptyBoard deck={deck} /> : <LaneList deck={deck} />}
    </div>
  );
}

function DeckDetail({ deck, row }: { deck: Deck; row: DesignRow }) {
  const { records, onLeave, facts, actions } = deck;
  const epicState = (epic: EpicEntity) => facts.resolvedJoins.epicState(epic);
  return <DetailPane row={row} records={records} epicState={epicState} onLeave={onLeave} onClose={actions.closeDetail} />;
}

function DetailSlot({ deck }: { deck: Deck }) {
  const { selected } = deck.view;
  if (!selected) return null;
  return (
    <div className="hidden w-[42%] min-w-[340px] max-w-[560px] shrink-0 md:block">
      <DeckDetail deck={deck} row={selected} />
    </div>
  );
}

function HeldOut({ heldOut }: { heldOut: Deck["facts"]["heldOut"] }) {
  return (
    <p className="m-0 font-mono text-[12px] leading-[1.5] text-ink-faint">
      Held out of the board by rule:{" "}
      <b className="text-foreground tabular-nums">{heldOut.decisions}</b> decision
      records (ADR) and{" "}
      <b className="text-foreground tabular-nums">{heldOut.openPulls}</b> unfinished
      pull requests. A card shows the pull requests that the tracker holds. The pane
      follows the walk: a row's second press drops the deck back.
    </p>
  );
}

function DeckFooter({ deck }: { deck: Deck }) {
  const { heldOut, trackerNote } = deck.facts;
  return (
    <footer className="shrink-0 border-t border-line px-4 py-1.5">
      <HeldOut heldOut={heldOut} />
      {trackerNote !== null ? (
        <p className="m-0 font-mono text-[12px] leading-[1.5] text-ink-faint">{trackerNote}</p>
      ) : null}
    </footer>
  );
}

function DeckDescription() {
  return (
    <Drawer.Description className="sr-only">
      The Work board as a dense departure board of collapsible lanes, behind a state
      filter. The search refines as you type; the arrows walk the rows; Enter opens the
      selected design in a detail pane and expands the drawer.
    </Drawer.Description>
  );
}

function DeckTop({ deck }: { deck: Deck }) {
  return (
    <>
      <DeckHandle />
      <DeckHeader deck={deck} />
      <SearchRow deck={deck} />
      <FilterStrip deck={deck} />
    </>
  );
}

function DeckMain({ deck }: { deck: Deck }) {
  return (
    <div className="flex min-h-0 flex-1">
      <DeckBoard deck={deck} />
      <DetailSlot deck={deck} />
    </div>
  );
}

function DeckHandle() {
  return <div className="mx-auto mt-2.5 mb-0 h-1 w-10 shrink-0 rounded-full bg-ink-faint/40" />;
}

/**
 * The day deck, dressed in the shell's own data.
 *
 * EVERY INPUT IS THE SHELL'S OWN ANSWER. The rows are `designRowsOf`'s, the
 * records are the bundle's loaded design bodies, and the held-out counts read
 * the index's own entity list. The drawer resolves the index's joins once,
 * beside the shell's other readers, and derives nothing of its own.
 */
export function DrawerBody(props: BodyProps) {
  const deck = useDeck(props);
  return (
    <div className="flex h-full min-h-0 flex-col" onKeyDown={deck.onKeyDown}>
      <DeckTop deck={deck} />
      <DeckMain deck={deck} />
      <DeckFooter deck={deck} />
      <DeckDescription />
    </div>
  );
}
