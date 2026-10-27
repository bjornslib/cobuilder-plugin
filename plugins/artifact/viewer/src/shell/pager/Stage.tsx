import { Children, type ReactNode, type RefObject } from "react";

import { motion, useReducedMotion } from "motion/react";

/** The slide's duration and curve. The curve is `--ease-out` from the shell's tokens. */
const SLIDE_SECONDS = 0.2;
const EASE_OUT: [number, number, number, number] = [0.22, 0.75, 0.3, 1];
const INSTANT = { duration: 0 };
const SLIDE = { duration: SLIDE_SECONDS, ease: EASE_OUT };
const BOX_CLASS =
  "@container h-full w-full min-w-0 shrink-0 overflow-y-auto overscroll-contain px-6 pt-1 pb-6";

interface StageProps {
  index: number;
  activeBoxRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}

function StageBox({ active, boxRef, children }: { active: boolean; boxRef?: StageProps["activeBoxRef"]; children: ReactNode }) {
  return (
    <div ref={active ? boxRef : undefined} inert={!active} className={BOX_CLASS}>
      {children}
    </div>
  );
}

function StageBoxes({ index, activeBoxRef, children }: StageProps) {
  return (
    <>
      {Children.toArray(children).map((box, position) => (
        <StageBox key={position} active={position === index} boxRef={activeBoxRef}>
          {box}
        </StageBox>
      ))}
    </>
  );
}

function Track(props: StageProps) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.div
      className="flex h-full min-w-0" initial={false}
      animate={{ x: `-${props.index * 100}%` }}
      transition={reduce ? INSTANT : SLIDE}
    >
      <StageBoxes {...props} />
    </motion.div>
  );
}

/**
 * The horizontal track, and the boxes on it.
 *
 * `overflow-hidden` on the outer element clips the track. The track is one row of
 * full-width boxes and it moves by `transform`, so both directions come from the one
 * value: a step forward moves the track left, and a step back moves it right. No second
 * animation is written for the other direction.
 *
 * A percentage offset is exact here. The boxes are `w-full shrink-0`, so the track's own
 * width is exactly one box, and `-100%` of the track is exactly one step. Nothing
 * measures the stage, so nothing has to re-measure it on a resize.
 *
 * Each box scrolls itself. A box is `overflow-y-auto`, so panel content taller than the
 * stage scrolls inside the box while the track stays put. The box carries `@container`
 * for the same reason `Tile` does: the panel's inner grids measure their own box and not
 * the viewport.
 *
 * `activeBoxRef` is the box on screen. The reading-progress strip measures it, so only
 * the active box is ref'd, and the strip can never measure a box the reader cannot see.
 *
 * The boxes off screen are `inert`. A reader cannot tab into a section they are not
 * looking at, and a screen reader does not read out three panels nobody asked for.
 */
export function SectionStage(props: StageProps) {
  return (
    <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
      <Track {...props} />
    </div>
  );
}
