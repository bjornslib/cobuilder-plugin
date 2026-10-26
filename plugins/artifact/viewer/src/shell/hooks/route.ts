import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { readRoute, type Route, type SectionKey } from "../model";

export interface RouteControl {
  route: Route;
  /** True while the shell itself rewrote the hash, so the redirect notice stands. */
  selfRewrite: RefObject<boolean>;
  /** A section this work cannot fill, when the route asked for one. */
  redirectedFrom: SectionKey | null;
  setRedirectedFrom: (section: SectionKey | null) => void;
  /** Rewrite the hash. A hash write is the only navigation this shell performs. */
  go: (href: string) => void;
}

type SetRedirect = (section: SectionKey | null) => void;
type SetRoute = (route: Route) => void;

function hashHandler(selfRewrite: RefObject<boolean>, setRedirectedFrom: SetRedirect, setRoute: SetRoute) {
  return () => {
    if (selfRewrite.current) {
      selfRewrite.current = false;
    } else {
      setRedirectedFrom(null);
    }
    setRoute(readRoute());
  };
}

function useHashListener(selfRewrite: RefObject<boolean>, setRedirectedFrom: SetRedirect, setRoute: SetRoute): void {
  useEffect(() => {
    const onHash = hashHandler(selfRewrite, setRedirectedFrom, setRoute);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [selfRewrite, setRedirectedFrom, setRoute]);
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

/**
 * The route, read from the hash and kept in step with it.
 *
 * The rail renders from the route, so a deep link lands on the same screen a reader
 * reached by clicking. A hash change the shell did not make clears the redirect
 * notice, because the reader chose that destination.
 */
export function useHashRoute(): RouteControl {
  const [route, setRoute] = useState<Route>(() => readRoute());
  const [redirectedFrom, setRedirectedFrom] = useState<SectionKey | null>(null);
  const selfRewrite = useRef(false);

  useHashListener(selfRewrite, setRedirectedFrom, setRoute);

  return { route, selfRewrite, redirectedFrom, setRedirectedFrom, go: useGo(selfRewrite) };
}
