import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";

const clamp = (wanted: number, count: number): number =>
  Math.min(Math.max(wanted, 0), Math.max(count - 1, 0));

/**
 * True when a press belongs to something else, so no shell key may act on it.
 *
 * A field owns its own caret keys, so a press inside an input, a textarea, or a select is
 * the field's. A modifier names a command, which the browser or the operating system owns.
 *
 * The key handlers share this function and never the rule. The pager's own two arrows call
 * it, and so does the shell's rail traversal. A second copy of these two lines is the
 * drift this shell has already been bitten by, so there is one copy.
 */
export function keyPressIsTaken(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return true;
  const tag = (event.target as HTMLElement | null)?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function arrowStep(event: KeyboardEvent, previous: () => void, next: () => void): void {
  if (keyPressIsTaken(event)) return;
  const move = event.key === "ArrowLeft" ? previous : event.key === "ArrowRight" ? next : null;
  if (!move) return;
  event.preventDefault();
  move();
}

function useArrowKeys(previous: () => void, next: () => void): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => arrowStep(event, previous, next);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, previous]);
}

function useSteps(count: number, setState: Dispatch<SetStateAction<number>>) {
  const select = useCallback((wanted: number) => setState(clamp(wanted, count)), [count, setState]);
  const step = useCallback(
    (delta: number) => setState((current) => clamp(current + delta, count)),
    [count, setState],
  );
  const previous = useCallback(() => step(-1), [step]);
  const next = useCallback(() => step(1), [step]);
  return { select, previous, next };
}

/**
 * The index, and the three ways a reader moves it.
 *
 * The index is view state and never a route. This viewer is a read-only projection of a
 * bundle, so the section on screen says nothing about the bundle and must not become a
 * destination a reader can link to. Nothing here writes the hash.
 *
 * `routeKey` is the caller's whole route, in the shape `useScrollResetOnRoute` uses. A
 * new route is a new page, and a reader starts at that page's first section. The index is
 * clamped at render as well, so a shorter list can never leave it past its own end.
 *
 * `start` is the section a new route lands on, and it is 0 for every level whose sections
 * carry no route of their own. The Build level needs it: an epic deep link names one
 * epic, and the section that holds that epic is the one the reader asked for.
 *
 * The two arrow keys step. Vertical scrolling needs no other guard: these two keys move
 * sideways and a box scrolls up and down.
 */
export function useSectionPaging(count: number, routeKey: string, start = 0) {
  const [state, setState] = useState(0);
  const index = clamp(state, count);
  useEffect(() => {
    setState(clamp(start, count));
  }, [routeKey, start, count]);
  const { select, previous, next } = useSteps(count, setState);
  useArrowKeys(previous, next);
  return { index, count, select, previous, next };
}
