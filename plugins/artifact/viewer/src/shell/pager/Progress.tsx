import { useLayoutEffect, useState, type RefObject } from "react";

import ScrollProgress from "@/components/smoothui/scroll-progress";

/** The reading-progress strip's height, in pixels. 4 px, the strip's own default. */
export const PROGRESS_PX = 4;

/**
 * How far through one box the reader is, from 0 to 1.
 *
 * A box with no range is fully read, which is what makes a section that fits one
 * screen contribute its whole share of the level with no special case.
 */
export function withinOf(box: HTMLElement | null): number {
  if (!box) return 0;
  const range = box.scrollHeight - box.clientHeight;
  if (range <= 0) return 1;
  return Math.min(1, Math.max(0, box.scrollTop / range));
}

function watchBox(box: HTMLDivElement | null, setWithin: (within: number) => void) {
  const read = () => setWithin(withinOf(box));
  read();
  if (!box) return undefined;
  box.addEventListener("scroll", read, { passive: true });
  /* The stage takes the height left over, so a window resize moves the range. */
  window.addEventListener("resize", read);
  return () => {
    box.removeEventListener("scroll", read);
    window.removeEventListener("resize", read);
  };
}

function useWithin(boxRef: RefObject<HTMLDivElement | null>, index: number): number {
  const [within, setWithin] = useState(0);
  useLayoutEffect(() => watchBox(boxRef.current, setWithin), [boxRef, index]);
  return within;
}

interface ProgressProps {
  index: number;
  count: number;
  boxRef: RefObject<HTMLDivElement | null>;
}

/**
 * The level's progress, from its first section to its last.
 *
 * A flat "one section in four" would sit still and would say nothing the pager text
 * does not already say. The bar reads a position INSIDE the level instead:
 *
 *     progress = (index + within) / count
 *
 * `within` is the active box's own scroll progress, and a box with no scroll range
 * counts as fully read. So section 1 at its own top is 0 %, section 1 at its bottom is
 * 25 %, section 2 is 50 %, and section 4 is 100 %. Walking forward never moves the bar
 * backwards, and a step never resets it.
 *
 * THE ACTIVE BOX IS MEASURED DIRECTLY, NOT THROUGH `useScroll`. That hook resolves its
 * container once, at setup. A pager re-points its container on every step, so a strip
 * built on it ends up measuring the box it was born with, or a box whose ref is
 * mid-reassignment, and it never recovers: it froze at section 1's bottom value for the
 * rest of the page's life. `scrollTop` against the box's own range cannot go stale, and
 * the effect below re-reads the new box in the same commit the reader moves in.
 *
 * THE PLACEMENT STILL MATTERS. This component renders after `SectionStage` in the DOM,
 * so the box refs are attached before the effect runs, and its wrapper takes
 * `order-first` to paint at the top of the column. It carries no key: the key existed
 * only to force `useScroll` to re-resolve, and a state-driven number has nothing to
 * re-resolve.
 */
export function LevelProgress({ index, count, boxRef }: ProgressProps) {
  const within = useWithin(boxRef, index);
  return (
    <div className="order-first min-w-0 shrink-0">
      <ScrollProgress value={(index + within) / count} variant="bar" position="inline" thickness={PROGRESS_PX} color="var(--band)" />
    </div>
  );
}
