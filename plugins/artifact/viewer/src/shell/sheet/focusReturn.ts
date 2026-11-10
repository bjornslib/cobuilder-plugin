import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";

/**
 * Where focus goes when the record closes. A verifier measured the defect this
 * repairs: after Escape closed the Sheet, `document.activeElement` was the body,
 * so a keyboard reader lost their place in the list of decisions.
 *
 * The Sheet owns this because the modal library returns focus only to the
 * dialog's own trigger. This Sheet has no trigger: the caller opens it from a
 * press on a control a panel rendered, so the library left the body holding focus.
 *
 * The read happens in a layout effect, before the record takes focus. The
 * library focuses the record in a passive effect, and every layout effect runs
 * before any passive one. A passive read would remember the record itself and
 * return focus to a surface that is gone. The read is taken once per opening, so
 * a second record opened from a second control returns to that control.
 *
 * Every record kind shares this one path.
 */

function focusedElement(): HTMLElement | null {
  const active = document.activeElement;
  /*
   * The body is not a place to return to: a press in a browser that does not
   * focus its control leaves the body active, and returning there is the defect
   * this section repairs.
   */
  if (!(active instanceof HTMLElement) || active === document.body) return null;
  return active;
}

/**
 * Where focus lands when the element that opened the record is gone.
 *
 * The route or the bundle can change under the reader while a record is open, and
 * a panel that closes takes its own control with it. The body is no answer, so
 * the fallback is the level's heading, `#work-section-heading`: the shell already
 * moves focus there when a level changes, and its words name the work the record
 * came from. It takes `tabindex="-1"` when it carries none, like a part link does.
 */
function fallbackFocus(): HTMLElement | null {
  const heading = document.getElementById("work-section-heading");
  if (heading === null) return null;
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  return heading;
}

/*
 * The close has one path, whatever closed the record. `preventDefault` stops the
 * library's own answer, which is the body when the Sheet carries no trigger.
 */
function returnFocusTo(openedFrom: RefObject<HTMLElement | null>, event: Event): void {
  event.preventDefault();
  const origin = openedFrom.current;
  openedFrom.current = null;
  const target = origin !== null && document.contains(origin) ? origin : fallbackFocus();
  target?.focus();
}

export function useFocusReturn(open: boolean): (event: Event) => void {
  const openedFrom = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  useLayoutEffect(() => {
    if (open && !wasOpen.current) openedFrom.current = focusedElement();
    wasOpen.current = open;
  }, [open]);
  return useCallback((event: Event) => returnFocusTo(openedFrom, event), []);
}
