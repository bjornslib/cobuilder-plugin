import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { readBoardAddress, type BoardAddress } from "../board/address";
import { readRoute, type Route, type SectionKey } from "../model";

export interface RouteControl {
  route: Route;
  /**
   * The board address of the current hash, or null on every other address. The board
   * wins `#/board` over a design that carries the id `board`, as ADR-0050 accepts.
   */
  kanban: BoardAddress | null;
  /** True while the shell itself rewrote the hash, so the redirect notice stands. */
  selfRewrite: RefObject<boolean>;
  /** A section this work cannot fill, when the route asked for one. */
  redirectedFrom: SectionKey | null;
  setRedirectedFrom: (section: SectionKey | null) => void;
  /** Rewrite the hash. A hash write is the only navigation this shell performs. */
  go: (href: string) => void;
}

interface HashRead {
  route: Route;
  kanban: BoardAddress | null;
}

type SetRedirect = (section: SectionKey | null) => void;
type SetHash = (read: HashRead) => void;

function readHash(): HashRead {
  return { route: readRoute(), kanban: readBoardAddress(window.location.hash) };
}

function hashHandler(selfRewrite: RefObject<boolean>, setRedirectedFrom: SetRedirect, setHash: SetHash) {
  return () => {
    if (selfRewrite.current) {
      selfRewrite.current = false;
    } else {
      setRedirectedFrom(null);
    }
    setHash(readHash());
  };
}

function useHashListener(selfRewrite: RefObject<boolean>, setRedirectedFrom: SetRedirect, setHash: SetHash): void {
  useEffect(() => {
    const onHash = hashHandler(selfRewrite, setRedirectedFrom, setHash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [selfRewrite, setRedirectedFrom, setHash]);
}

function useGo(selfRewrite: RefObject<boolean>): (href: string) => void {
  return useCallback(
    (href: string) => {
      selfRewrite.current = true;
      window.location.hash = href;
    },
    [selfRewrite],
  );
}

/*
 * The rail renders from the route, so a deep link lands where a click would. A
 * hash change the shell did not make clears the redirect notice, because the
 * reader chose that destination.
 */
export function useHashRoute(): RouteControl {
  const [{ route, kanban }, setHash] = useState<HashRead>(readHash);
  const [redirectedFrom, setRedirectedFrom] = useState<SectionKey | null>(null);
  const selfRewrite = useRef(false);

  useHashListener(selfRewrite, setRedirectedFrom, setHash);

  return { route, kanban, selfRewrite, redirectedFrom, setRedirectedFrom, go: useGo(selfRewrite) };
}
