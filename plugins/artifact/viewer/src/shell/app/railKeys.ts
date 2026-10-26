import { useEffect, useRef, type RefObject } from "react";

import { keyPressIsTaken } from "../Pager";
import { railGroups, rowsOf, routeHref, type RailSource, type SectionKey } from "../model";

type Go = (href: string) => void;

/*
 * THE ADDRESSES A PRESS CAN REACH, IN THE RAIL'S OWN ORDER. The board's own row comes
 * THE ADDRESSES A PRESS CAN REACH, IN THE RAIL'S OWN ORDER. The board is not a step:
 * ADR-0034 makes it a drawer and not an address the hash names, so the walk holds the
 * two accounts' rows alone. `rowsOf` flattens them, so the walk crosses a group
 * boundary as one step and reaches every reachable row whether a group is open or
 * closed. A folded group is a display choice and never a wall.
 */
function railSteps(source: RailSource): string[] {
  return rowsOf(railGroups(source)).map((row) => row.href);
}

/*
 * The reader's own address, read at the press rather than captured at the last
 * render, so a step that just landed is the position the next press reads.
 */
function stepTarget(event: KeyboardEvent, steps: string[]): string | null {
  const at = steps.indexOf(window.location.hash);
  if (at < 0) return null;
  const wanted = at + (event.key === "ArrowDown" ? 1 : -1);
  return wanted < 0 || wanted >= steps.length ? null : steps[wanted];
}

function railKeyHandler(latest: RefObject<RailSource>, go: Go): (event: KeyboardEvent) => void {
  return (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    if (keyPressIsTaken(event)) return;
    const href = stepTarget(event, railSteps(latest.current));
    if (href === null) return;
    event.preventDefault();
    go(href);
  };
}

/**
 * The rail's rows, walked with the up and down arrows.
 *
 * ArrowDown moves to the next row and ArrowUp to the previous one, in the order the rail
 * renders them. At either end the press moves nothing. The keys never write a section of
 * their own: they open the address the row carries, so a step lands exactly where a press
 * on that row lands.
 *
 * IT STEPS THE RAIL'S OWN LIST, ACROSS BOTH ACCOUNTS. The board's own row comes first,
 * because the rail draws it first, and `rowsOf` flattens the two accounts after it. So the
 * traversal cannot know fewer rows than the rail shows, and a group boundary is one step.
 * A folded group is a display choice and never a wall.
 *
 * A ROW WHOSE RECORD IS ABSENT IS NOT A STEP. It carries `href="#"`, so a step onto it
 * would send the reader to the board. The walk therefore holds the rows a press can reach,
 * and only those.
 *
 * THE BOARD IS NOT A LEVEL. On the board the rail draws its own row alone, so the list
 * holds one address that is the board itself, and an arrow press has nowhere to go. Two
 * presses are covered by that: neither the up press nor the down one leaves the board.
 *
 * THE READER'S POSITION IS THEIR OWN ADDRESS. The walk reads `window.location.hash`,
 * which is the address the shell writes, and matches the row whose `href` equals it. It
 * never matches on the section name: the two groups repeat three names, so a name match
 * would stall on the wrong account's row.
 *
 * THE PAGER'S GUARD APPLIES HERE TOO. `keyPressIsTaken` is the one copy of it, and it
 * leaves a press inside a field, and a press with a modifier, to whoever owns it. These
 * two keys never touch the pager's own two.
 *
 * THE SOURCE IS READ AT THE PRESS, NOT CAPTURED AT THE LAST RENDER. The rail's input holds
 * the change's own levels and the audio the bundle answered, and those objects change
 * without the route changing, so an effect that depended on them would re-subscribe on
 * every render. A ref keeps one subscription and still reads the rows the rail renders.
 */
export function useRailArrowKeys({ source, go }: { source: RailSource; go: Go }): void {
  const latest = useRef<RailSource>(source);
  latest.current = source;

  useEffect(() => {
    const onKey = railKeyHandler(latest, go);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);
}

interface RedirectInput {
  workMissing: boolean;
  wanted: SectionKey;
  available: Set<SectionKey>;
  section: SectionKey;
  workId: string;
  go: Go;
  setRedirectedFrom: (section: SectionKey | null) => void;
}

/**
 * State a redirect once, and perform it.
 *
 * A section the work cannot fill is absent, so the shell lands on the nearest section
 * the work can fill and says which one it was asked for. The notice is cleared by a
 * hash change the reader made, per section 5.1. The effect returns early once the
 * route names a section the work fills, so it cannot loop.
 */
export function useRedirectNotice({ workMissing, wanted, available, section, workId, go, setRedirectedFrom }: RedirectInput): void {
  useEffect(() => {
    if (workMissing) {
      setRedirectedFrom(null);
      return;
    }
    if (available.has(wanted)) return;
    setRedirectedFrom(wanted);
    go(routeHref(workId, section));
  }, [available, go, section, setRedirectedFrom, wanted, workId, workMissing]);
}
