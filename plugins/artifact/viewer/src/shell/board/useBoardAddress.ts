import { useCallback } from "react";

import { boardHash, type BoardAddress } from "./address";

export interface BoardAddressWrites {
  /** Push one history entry for a board change. */
  write: (next: BoardAddress) => void;
  /** Replace the current history entry, for the search. */
  replace: (next: BoardAddress) => void;
}

export function useBoardAddress(go: (href: string) => void): BoardAddressWrites {
  const write = useCallback((next: BoardAddress) => go(boardHash(next)), [go]);
  const replace = useCallback((next: BoardAddress) => window.location.replace(boardHash(next)), []);
  return { write, replace };
}
