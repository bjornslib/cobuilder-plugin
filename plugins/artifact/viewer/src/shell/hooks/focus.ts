import { useEffect, useRef, type RefObject } from "react";

import { useReducedMotion } from "motion/react";

/**
 * Move focus to an element when the subtree that owns it mounts (section 8.4: a
 * section choice moves focus to the section heading, and a work-item change moves
 * it to the top bar's name).
 *
 * The move is keyed to the mount because the route change is too early.
 * `AnimatePresence mode="wait"` in `App.tsx` keeps the outgoing subtree mounted
 * until its exit animation ends, and that subtree owns the heading of the level
 * being left. A frame-delayed lookup by id found the outgoing heading, then the
 * subtree unmounted and focus fell to `<body>`. The incoming heading never got
 * focus.
 *
 * A longer delay is not the fix. The exit duration is the token `--dur-base` in
 * `App.tsx` and it is zero under reduced motion, so any wait is too short or a
 * second copy of that token. The mount is the one moment neither early nor late,
 * and the returned ref is the incoming subtree's own element, so a heading on its
 * way out can never take the move.
 */
export function useFocusOnMount<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  return ref;
}

function resetPane(elementId: string, reduce: boolean): void {
  const pane = document.getElementById(elementId);
  if (!pane) return;
  pane.scrollTo({
    top: 0,
    /* The horizontal offset is the reader's, so the reset leaves it alone. */
    left: pane.scrollLeft,
    behavior: reduce ? "instant" : "auto",
  });
}

/**
 * Jump the content pane back to its top on every route change. The document never
 * scrolls, so the pane owns the shell's only offset (section 11.3).
 *
 * The caller passes its keys and this hook joins them into one signature, so one
 * dependency list covers every move: another section, another work item, an epic
 * that opens, and a pull request that opens.
 *
 * The jump is instant. `useReducedMotion` is read so the reset can never become a
 * smooth scroll for a reader who did not ask for one.
 */
export function useScrollResetOnRoute(elementId: string, keys: readonly unknown[]): void {
  const reduce = useReducedMotion() ?? false;
  const signature = keys.join("|");

  useEffect(() => resetPane(elementId, reduce), [elementId, signature, reduce]);
}
