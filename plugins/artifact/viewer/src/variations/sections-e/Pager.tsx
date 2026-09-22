/**
 * The horizontal section pager for the Problem & Solution level.
 *
 * The level is four long panels. Stacked, they make a column several thousand pixels
 * tall, so a reader scrolls past three panels to reach the fourth. This file puts one
 * panel on screen at a time and moves the track sideways between them. Each box keeps
 * its own scroll, so a panel taller than the stage stays fully readable.
 *
 * THE UNIT IS A SECTION. The engineer named it: next and previous on each page, and
 * the section headings which scroll right and left to each. A chapter is the story's
 * unit and is not what this level holds, so nothing here is called one.
 *
 * ONE INDEX DRIVES ALL THREE PIECES. `SectionStrip` shows it, `SectionStage` moves to
 * it, and `SectionPager` steps it. `useSectionPaging` holds it.
 *
 * THE STAGE IS THE ONLY CLIP BOX IN THIS FILE. Its outer element hides the track, and
 * the boxes past the active one are the overflow it hides. A box's own content is
 * never clipped, because each box is a scroll container. That is section 11.3's rules
 * 2 and 3 applied to a pager: nothing that holds content hides its overflow.
 */

import { Children, useCallback, useEffect, useState } from "react";
import type { ReactNode, RefObject } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

import { BAND_FOCUS } from "./atoms";
import type { JumpTarget } from "./jump";

/** The slide's duration and curve. The curve is `--ease-out` from the shell's tokens. */
const SLIDE_SECONDS = 0.2;
const EASE_OUT: [number, number, number, number] = [0.22, 0.75, 0.3, 1];

/** Which section the reader is on, and how far the track has moved for it. */
const clamp = (wanted: number, count: number): number =>
  Math.min(Math.max(wanted, 0), Math.max(count - 1, 0));

/**
 * The index, and the three ways a reader moves it.
 *
 * THE INDEX IS VIEW STATE AND NEVER A ROUTE. This viewer is a read-only projection of
 * a bundle, so the section on screen says nothing about the bundle and must not become
 * a destination a reader can link to. Nothing here writes the hash.
 *
 * `routeKey` is the caller's whole route, in the shape `useScrollResetOnRoute` uses. A
 * new route is a new page, and a reader starts at that page's first section. The index
 * is clamped at render as well, so a shorter list can never leave it past its own end.
 *
 * The two arrow keys step. A field owns its own caret keys, so a press inside an input,
 * a textarea, or a select is left alone, and so is any press with a modifier held.
 * Vertical scrolling needs no other guard: these two keys move sideways and a box
 * scrolls up and down.
 */
export function useSectionPaging(count: number, routeKey: string) {
  const [state, setState] = useState(0);
  const index = clamp(state, count);

  useEffect(() => {
    setState(0);
  }, [routeKey]);

  const select = useCallback((wanted: number) => setState(clamp(wanted, count)), [count]);
  const step = useCallback(
    (delta: number) => setState((current) => clamp(current + delta, count)),
    [count],
  );
  const previous = useCallback(() => step(-1), [step]);
  const next = useCallback(() => step(1), [step]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        previous();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, previous]);

  return { index, count, select, previous, next };
}

/* -------------------------------------------------------------------- strip */

/**
 * The section headings, one press away from its box.
 *
 * The list comes from `useJumpTargets`, which reads the panels the boxes rendered. So
 * the strip holds one heading per panel with no list of its own, and a label can never
 * disagree with the heading it names. This is the jump bar's mechanism with one change:
 * a press sets the active index instead of scrolling the pane to an anchor.
 *
 * The anchors stay anchors. A reader can still focus one, and it still carries an href.
 * The press is intercepted, because a hash write would move the document and this shell
 * never moves the document.
 *
 * The row scrolls sideways when it overflows, so a narrow pane keeps every heading
 * reachable instead of clipping the last one.
 */
export function SectionStrip({
  targets,
  activeIndex,
  onSelect,
}: {
  targets: JumpTarget[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  if (targets.length === 0) return null;

  return (
    <nav
      aria-label="Sections of this level"
      className="flex min-w-0 shrink-0 items-center gap-1 overflow-x-auto overscroll-x-contain border-b border-line bg-ground px-6 py-1.5"
    >
      {targets.map((target, index) => {
        const on = index === activeIndex;
        return (
          <a
            key={target.id}
            href={`#${target.id}`}
            aria-current={on ? "step" : undefined}
            onClick={(event) => {
              event.preventDefault();
              onSelect(index);
            }}
            className={cn(
              "inline-flex min-h-8 shrink-0 cursor-pointer items-center rounded-[10px] border border-transparent px-2.5 font-mono text-[12.5px] whitespace-nowrap",
              "transition-colors duration-150 ease-house",
              on
                ? /*
                   * The active heading takes the band fill. This is the one selected
                   * state the band may carry, because it marks a heading and the panel
                   * headings it names already wear the same fill. The ring is
                   * `--band-ink`, because the teal ring is 1.4 to 1 on the band.
                   */
                  cn("bg-band font-bold text-band-ink", BAND_FOCUS)
                : cn(
                    "text-ink-dim hover:bg-surface-2 hover:text-foreground",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  ),
            )}
          >
            {target.label}
          </a>
        );
      })}
    </nav>
  );
}

/* -------------------------------------------------------------------- stage */

/**
 * The horizontal track, and the boxes on it.
 *
 * `overflow-hidden` on the outer element clips the track. The track is one row of
 * full-width boxes and it moves by `transform`, so both directions come from the one
 * value: a step forward moves the track left and the next section enters from the
 * right, and a step back moves it right and the previous section enters from the left.
 * No second animation is written for the other direction.
 *
 * A PERCENTAGE OFFSET IS EXACT HERE. The boxes are `w-full shrink-0`, so the track's
 * own width is exactly one box, and `-100%` of the track is exactly one step. Nothing
 * measures the stage, so nothing has to re-measure it on a resize.
 *
 * EACH BOX SCROLLS ITSELF. A box is `overflow-y-auto`, so panel content taller than
 * the stage scrolls inside the box while the track stays put. The box carries
 * `@container` for the same reason `Tile` does: the panel's inner grids measure their
 * own box and not the viewport.
 *
 * `activeBoxRef` is the box on screen. The reading-progress strip measures it, so a
 * reader sees how far through this one section they are rather than a position in a
 * page that no longer exists. Only the active box is ref'd, so the strip can never
 * measure a box the reader cannot see.
 *
 * The boxes off screen are `inert`. A reader cannot tab into a section they are not
 * looking at, and a screen reader does not read out three panels nobody asked for.
 */
export function SectionStage({
  index,
  activeBoxRef,
  children,
}: {
  index: number;
  activeBoxRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const reduce = useReducedMotion() ?? false;

  return (
    <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
      <motion.div
        className="flex h-full min-w-0"
        initial={false}
        animate={{ x: `-${index * 100}%` }}
        transition={
          reduce ? { duration: 0 } : { duration: SLIDE_SECONDS, ease: EASE_OUT }
        }
      >
        {Children.toArray(children).map((box, position) => (
          <div
            key={position}
            ref={position === index ? activeBoxRef : undefined}
            inert={position !== index}
            className="@container h-full w-full min-w-0 shrink-0 overflow-y-auto overscroll-contain px-6 pt-1 pb-6"
          >
            {box}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------------------- pager */

/**
 * The bar under the stage.
 *
 * Two navigation words and a count. Nothing here writes anything back to the bundle:
 * this viewer is a read-only projection, so no label may read as an approval. Previous
 * and Next move the reader through the level and say nothing else.
 *
 * A control at either end is disabled, and it says so twice: `disabled` stops the
 * press, and `aria-disabled` states the reason to a reader who reaches it by keyboard.
 * The pointer cursor is dropped with the state, because a control that cannot act must
 * not look like one that can.
 */
export function SectionPager({
  index,
  count,
  onPrevious,
  onNext,
}: {
  index: number;
  count: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const atStart = index <= 0;
  const atEnd = index >= count - 1;

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-3 border-t border-line bg-ground px-6 py-2">
      <PagerButton
        label="Previous"
        icon={ChevronLeft}
        side="left"
        disabled={atStart}
        onClick={onPrevious}
      />
      <span className="min-w-0 font-mono text-[12.5px] text-ink-dim tabular-nums">
        Section {index + 1} of {count}
      </span>
      <PagerButton
        label="Next"
        icon={ChevronRight}
        side="right"
        disabled={atEnd}
        onClick={onNext}
      />
    </div>
  );
}

/** One step of the pager. The icon sits on the side the button moves toward. */
function PagerButton({
  label,
  icon: Icon,
  side,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof ChevronLeft;
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 font-mono text-[12.5px] font-bold text-ink-mid",
        "transition-colors duration-150 ease-house",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        disabled
          ? /*
             * A disabled control keeps its frame and drops its affordance. The fill
             * stays in `--surface-2`, never `--band`: the heading colour on a control
             * reads as a heading.
             */
            "cursor-not-allowed border-dashed bg-surface-2 text-ink-faint"
          : "cursor-pointer hover:bg-surface-2",
      )}
    >
      {side === "left" ? <Icon className="size-4" aria-hidden="true" /> : null}
      {label}
      {side === "right" ? <Icon className="size-4" aria-hidden="true" /> : null}
    </button>
  );
}
