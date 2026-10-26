import { useRef, type ReactNode, type RefObject } from "react";

import type { JumpTarget } from "../jump";
import { carriedSectionIndex } from "../model";
import { LevelProgress, SectionPager, SectionStage, SectionStrip, useSectionPaging } from "../Pager";

interface PagedLevelProps {
  /** The In Short strip, drawn above the section tabs, or null when the level has none. */
  inShort?: ReactNode;
  /** The sections, in the order Next walks them. The length is the level's count. */
  sections: ReactNode[];
  targets: JumpTarget[];
  routeKey: string;
  /** The section name the reader carried across from the other account, or null. */
  carried: string | null;
  /** The section a new route lands on. 0 unless the route names a section's record. */
  start?: number;
}

type Paging = ReturnType<typeof useSectionPaging>;

function landingIndex(targets: JumpTarget[], carried: string | null, start: number): number {
  if (carried === null) return start;
  return carriedSectionIndex(targets.map((target) => target.label), carried);
}

interface TrackProps {
  sections: ReactNode[];
  paging: Paging;
  boxRef: RefObject<HTMLDivElement | null>;
}

/*
 * THE ONE CHILD WHOSE DOM ORDER IS NOT ITS PAINT ORDER, so do not tidy it back
 * into reading order.
 *
 * `LevelProgress` reads the box ref in a layout effect, and React attaches a
 * host element's ref and runs a component's layout effects in tree order as it
 * walks the commit. A progress strip that sits BEFORE the stage in the DOM
 * therefore reads the box before the stage has attached its ref, and it finds no
 * element. So the stage renders first and the strip takes `order-first`, which
 * paints it at the top of the column where the reading order puts it. Nothing
 * focusable lives in the strip, so no tab order changes.
 */
function PagedTrack({ sections, paging, boxRef }: TrackProps) {
  const { index, count, previous, next } = paging;
  return (
    <>
      <SectionStage index={index} activeBoxRef={boxRef}>
        {sections}
      </SectionStage>
      <LevelProgress index={index} count={count} boxRef={boxRef} />
      <SectionPager index={index} count={count} onPrevious={previous} onNext={next} />
    </>
  );
}

/**
 * A level as a horizontal section pager.
 *
 * One box on screen at a time. The strip moves the reader, the arrows move the reader,
 * and the bar under the track says where they are. `Pager.tsx` holds those pieces and
 * the index they share.
 *
 * THE STRIP MEASURES THE BOX ON SCREEN, NOT THE PANE. On this level there is no page
 * to be part-way down, so the pane's own offset would read zero forever. The number
 * the reader wants is how far through this one section they are, and that is the
 * active box's own scroll.
 *
 * THE STAGE ALSO HAS TO BE RENDERED BEFORE THE STRIP, and the comment on the track below
 * states why. The ref has to be attached before the strip resolves it, and the remount
 * has to re-resolve it. Break either and the bar reads full at every position.
 *
 * The sections keep the level's document order, so Next walks them in the order the
 * stacked level read.
 */
export function PagedLevel({ sections, targets, routeKey, carried, start = 0, inShort = null }: PagedLevelProps) {
  const paging = useSectionPaging(sections.length, routeKey, landingIndex(targets, carried, start));
  const boxRef = useRef<HTMLDivElement | null>(null);
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {inShort}
      <SectionStrip targets={targets} activeIndex={paging.index} onSelect={paging.select} />
      <PagedTrack sections={sections} paging={paging} boxRef={boxRef} />
    </div>
  );
}
