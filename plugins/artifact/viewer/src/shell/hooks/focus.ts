import { useEffect, useRef, type RefObject } from "react";

import { useReducedMotion } from "motion/react";

/**
 * Move focus to an element when the subtree that owns it mounts.
 *
 * Section 8.4: choosing a section moves focus to the section heading, and a work-item
 * change moves focus to the top bar's name. A surface's heading is mounted with that
 * surface, so the mount is the moment to move to.
 *
 * THE MOVE IS KEYED TO THE MOUNT BECAUSE THE ROUTE CHANGE IS TOO EARLY. This hook used to
 * run one animation frame after the route changed and resolve its target by id.
 * `AnimatePresence mode="wait"` in `App.tsx` keeps the outgoing subtree mounted until its
 * exit animation finishes, and that subtree owns the heading of the level being left. So
 * the frame resolved the outgoing heading, moved focus to it, and then the subtree
 * unmounted and focus fell to `<body>`. Measured over 1.2 s of 50 ms samples across a
 * level change, the run held exactly two states: the outgoing `h1` for the 200 ms of the
 * exit, then `BODY` for the rest. The incoming heading never received focus.
 *
 * A LONGER DELAY IS NOT THE FIX. The exit duration is a token, `--dur-base` in
 * `App.tsx`, and it is zero under reduced motion, so any wait is either too short or a
 * second copy of that token. The incoming subtree mounts when the exit completes, so the
 * mount is the one moment that is neither early nor late, and the returned ref is that
 * subtree's own element rather than an id two subtrees can answer at once.
 *
 * The reader's own element is focused, never one the hook resolved from the document, so
 * a heading on its way out can never take the move.
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
 * Jump the content pane back to its top on every route change.
 *
 * The document never scrolls, so `window` is never the target. The scroll pane owns
 * the shell's only offset, per section 11.3, and this hook resets that one element.
 *
 * A route change covers every move a reader makes: another section, another work
 * item, an epic that opens, and a pull request that opens. The signature is the
 * caller's, so one dependency list covers all four: the caller passes its keys and
 * this hook joins them into the one signature its effect reads.
 *
 * The jump is instant. `useReducedMotion` is read so the reset can never become a
 * smooth scroll for a reader who did not ask for one, and both branches resolve to
 * an instant jump today.
 */
export function useScrollResetOnRoute(elementId: string, keys: readonly unknown[]): void {
  const reduce = useReducedMotion() ?? false;
  const signature = keys.join("|");

  useEffect(() => resetPane(elementId, reduce), [elementId, signature, reduce]);
}
