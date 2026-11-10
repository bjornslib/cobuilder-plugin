import { useRef, type KeyboardEvent, type RefObject } from "react";

import type { DesignRecords } from "@/data/bundle";
import type { DesignRow, RecordIndex } from "@/data/types";

import { deckActions, type SetSnap } from "./deckActions";
import { useDeckEffects, useDeckState } from "./deckState";
import { handleKey } from "./deckKeys";
import { useDeckView, useIndexFacts } from "./deckView";

export interface BodyProps {
  rows: DesignRow[];
  index: RecordIndex;
  records: DesignRecords | null;
  /** The drawer's own open state, so a closed drawer forgets its last read. */
  open: boolean;
  onLeave: () => void;
  /** The controlled snap, so Enter's expand contract can set the height. */
  setSnap: SetSnap;
}

export interface DeckBase extends BodyProps {
  state: ReturnType<typeof useDeckState>;
  view: ReturnType<typeof useDeckView>;
  facts: ReturnType<typeof useIndexFacts>;
  actions: ReturnType<typeof deckActions>;
  searchRef: RefObject<HTMLInputElement | null>;
}

export interface Deck extends DeckBase {
  onKeyDown: (event: KeyboardEvent) => void;
}

function useDeckCore(props: BodyProps) {
  const state = useDeckState();
  const view = useDeckView(props.rows, state);
  const facts = useIndexFacts(props.index);
  useDeckEffects({ rows: props.rows, open: props.open, walk: view.walk }, state);
  return { state, view, facts };
}

export function useDeck(props: BodyProps): Deck {
  const { state, view, facts } = useDeckCore(props);
  const searchRef = useRef<HTMLInputElement>(null);
  const actions = deckActions(view.walk, state, props.setSnap);
  const base: DeckBase = { ...props, state, view, facts, actions, searchRef };
  return { ...base, onKeyDown: (event) => handleKey(event, base) };
}
