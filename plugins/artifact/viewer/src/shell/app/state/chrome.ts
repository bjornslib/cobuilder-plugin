import { useCallback, useEffect, useState } from "react";

import { useCollapsedRail } from "../../hooks";
import type { SheetSubject } from "../../Sheet";

/*
 * The rail opens with the viewport as its default. Section 9.2 puts the rail in icon mode
 * between 768 px and 1200 px, so crossing that boundary re-applies the default, and the
 * reader may still toggle while inside it.
 */
function useRailOpen() {
  const narrowRail = useCollapsedRail();
  const [railOpen, setRailOpen] = useState(!narrowRail);
  useEffect(() => {
    setRailOpen(!narrowRail);
  }, [narrowRail]);
  return { railOpen, setRailOpen };
}

function useOpenGroups() {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ build: true, review: true });
  const onToggleGroup = (key: string) =>
    setOpenGroups((current) => ({ ...current, [key]: !(current[key] ?? true) }));
  return { openGroups, onToggleGroup };
}

function useSheet() {
  const [sheet, setSheet] = useState<SheetSubject | null>(null);
  const openSheet = useCallback((subject: SheetSubject) => setSheet(subject), []);
  const closeSheet = useCallback((open: boolean) => {
    if (!open) setSheet(null);
  }, []);
  return { sheet, openSheet, closeSheet };
}

/*
 * The work board's drawer, per ADR-0034. The Work icon opens it over any level, and the
 * bare route opens it itself: a deep link to `#/`, the rail's Work row, and a fresh load
 * all land in the deck. Closing it lands on the muted landing behind. The effect fires
 * when the route's board-ness changes, not on every render, so it does not undo the
 * reader's own close.
 */
function useWorkDrawer(board: boolean) {
  const [workDrawerOpen, setWorkDrawerOpen] = useState(false);
  useEffect(() => {
    if (board) setWorkDrawerOpen(true);
  }, [board]);
  return { workDrawerOpen, setWorkDrawerOpen };
}

export function useChrome(board: boolean) {
  return { ...useRailOpen(), ...useOpenGroups(), ...useSheet(), ...useWorkDrawer(board) };
}
