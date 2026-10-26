import { useCallback, useRef } from "react";

import { sectionHref, useDocumentNoScroll, useScrollResetOnRoute } from "../../hooks";
import { useJumpTargets } from "../../jump";
import { routeHref, type SectionKey } from "../../model";
import { PANE_ID } from "../ids";
import { useRedirectNotice } from "../railKeys";
import type { Address } from "./address";
import type { ShellCore } from "./core";

/*
 * The scroll pane, as an element. The reading-progress strip measures this ref and
 * never the window, because the document cannot scroll at all. A window-scoped
 * progress bar on this page would sit at zero forever.
 *
 * The section links, read from the panels the pane rendered. The keys cover the
 * two moments the pane itself appears and disappears, which is what the observer
 * has to re-attach on.
 */
function usePaneElement({ load, route }: ShellCore) {
  const paneRef = useRef<HTMLElement | null>(null);
  useDocumentNoScroll();
  const jumpTargets = useJumpTargets(PANE_ID, [load.state, route.workId, route.section]);
  return { paneRef, jumpTargets };
}

/* A redirect is stated, never silent. */
function redirectInput(core: ShellCore, address: Address) {
  const { route, go, setRedirectedFrom } = core;
  const workMissing = address.work === null && address.worklessPr === null;
  const workId = address.work?.id ?? route.workId ?? "";
  return { workMissing, wanted: route.section, available: address.filled, section: address.section, workId, go, setRedirectedFrom };
}

/*
 * SECTION 8.4'S FOCUS MOVE IS NOT SCHEDULED HERE. It used to be one frame after the
 * route changed, and that frame resolved the heading of the level being left. The move
 * belongs to the level's own mount now, and `LevelHeading` below states the whole
 * reason. This call is the pane's scroll and nothing else.
 *
 * A route change starts the reader at the top of the pane. The four fields are the
 * whole route. They are the work item, the section, the sub-view, and the record
 * the sub-view opens, so one list covers a section change, a work-item change, an
 * epic that opens, and a pull request that opens.
 */
export function usePaneEffects(core: ShellCore, address: Address) {
  const pane = usePaneElement(core);
  useRedirectNotice(redirectInput(core, address));
  const { workId, section, sub, subId } = core.route;
  useScrollResetOnRoute(PANE_ID, [workId, section, sub, subId]);
  return pane;
}

export function useNavigation({ go, route }: ShellCore, section: SectionKey) {
  const chooseWork = useCallback((id: string) => go(sectionHref(id, section)), [go, section]);
  const chooseEpic = useCallback((design: string, epicId: string) => go(`${routeHref(design, "build", "epics")}/${epicId}`), [go]);
  const openPr = useCallback((n: number) => go(routeHref(route.workId ?? "", "pull-requests", `${n}`)), [go, route.workId]);
  return { chooseWork, chooseEpic, openPr };
}
