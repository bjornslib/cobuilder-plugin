import { useEffect, useState, type CSSProperties } from "react";

/*
 * The document never scrolls, so `html` and `body` carry no overflow. The lock is
 * removed on unmount, so a host keeps the page scroll it gave the document.
 */
function lockScroll(): () => void {
  const html = document.documentElement;
  const body = document.body;
  const previousHtml = html.style.overflow;
  const previousBody = body.style.overflow;
  html.style.overflow = "hidden";
  body.style.overflow = "hidden";
  return () => {
    html.style.overflow = previousHtml;
    body.style.overflow = previousBody;
  };
}

export function useDocumentNoScroll(): void {
  useEffect(lockScroll, []);
}

/**
 * Cap the shell to the visible screen, never to the window.
 *
 * The document never scrolls and only the pane does. When the window is wider
 * than the screen, the surplus sits outside the display and a normal page lets a
 * reader scroll sideways to reach it. This shell cannot, on purpose, so what is
 * drawn there is unreachable and no scrollbar says so. Measured on a 1512 px
 * screen in a 1600 px window: 88 px of the shell was off-screen, and it looked
 * like a layout that clipped its content.
 *
 * A multi-monitor setup can report the primary screen rather than the one in use,
 * so the cap can fire when it need not. That costs a shell narrower than the
 * window, which a reader can see. The opposite mistake costs content nobody can
 * reach.
 */
function measureWidthCap(): number | null {
  if (typeof window === "undefined") return null;
  const screenWidth = window.screen?.width ?? 0;
  if (!screenWidth) return null;
  return window.innerWidth > screenWidth ? screenWidth : null;
}

export function useVisibleWidthCap(): CSSProperties {
  const [cap, setCap] = useState<number | null>(measureWidthCap);

  useEffect(() => {
    const onResize = () => setCap(measureWidthCap());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return cap ? { maxWidth: `${cap}px` } : {};
}

function watchQuery(query: string, setMatches: (matches: boolean) => void): () => void {
  const list = window.matchMedia(query);
  const apply = () => setMatches(list.matches);
  apply();
  list.addEventListener("change", apply);
  return () => list.removeEventListener("change", apply);
}

/**
 * The first read is synchronous, so the first paint already carries the right
 * answer. A `false` start would paint the rail expanded on a tablet and collapse
 * it one frame later, a visible jump.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => watchQuery(query, setMatches), [query]);

  return matches;
}

/** The rail collapses to icons under 1200 px, per sections 2.3 and 9.2. */
export function useCollapsedRail(): boolean {
  return useMediaQuery("(max-width: 1200px)");
}
