import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";

/**
 * Where focus goes when the record closes, and the defect this repairs.
 *
 * A verifier measured it: after Escape closed the Sheet, `document.activeElement` was the
 * body, so a keyboard reader lost their place in the list of decisions they were reading.
 * The Sheet is modal, so opening it moves focus into the record, and closing it must put
 * focus back where the reader was.
 *
 * WHY THE SHEET OWNS THIS. The modal library returns focus to the control that opened the
 * dialog only when that control is the dialog's own trigger. This Sheet has no trigger:
 * the caller opens it from a press on a control a panel rendered. The library therefore
 * found nothing to return to, and left the body holding focus.
 *
 * THE READ HAPPENS IN A LAYOUT EFFECT, BEFORE THE RECORD TAKES FOCUS. The library focuses
 * the record in a passive effect, and every layout effect runs before any passive one. A
 * read in a passive effect here would therefore remember the record itself, and would
 * return focus to a surface that is gone. The read is taken once per opening, so a second
 * record opened from a second control returns to that control.
 *
 * The record kinds share this one path, so the decision, the boundary rule, the
 * epic design, and the slice rubric behave the same way.
 */

/** The element the reader had focused when the record opened, or null when none did. */
function focusedElement(): HTMLElement | null {
  const active = document.activeElement;
  /*
   * The body is not a place to return to. A mouse press in a browser that does not focus
   * the control it presses leaves the body as the active element, and returning focus
   * there is the defect this section repairs rather than the fix for it.
   */
  if (!(active instanceof HTMLElement) || active === document.body) return null;
  return active;
}

/**
 * Where focus lands when the element that opened the record is gone from the document.
 *
 * The pane can re-render while a record is open: the route, or the bundle behind it, can
 * change under the reader, and a panel that closes takes its own control with it. The body
 * is no answer, so the fallback is the level's heading, `#work-section-heading`. The shell
 * already moves focus to that heading when a level changes, so it is a place a keyboard
 * reader knows, and its words name the work the record was opened from. It takes
 * `tabindex="-1"` when it carries none, the way a part link marks the heading it lands on.
 */
function fallbackFocus(): HTMLElement | null {
  const heading = document.getElementById("work-section-heading");
  if (heading === null) return null;
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  return heading;
}

/*
 * The close has one path, whatever closed the record: the Close control, Escape, or a
 * press outside. `preventDefault` stops the library's own answer, which is the body when
 * the Sheet carries no trigger.
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
