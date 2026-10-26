import { useRef, type ReactNode, type RefObject } from "react";

import type { JumpTarget } from "../jump";
import { carriedSectionIndex } from "../model";
import { LevelProgress, SectionPager, SectionStage, SectionStrip, useSectionPaging } from "../Pager";

interface PagedLevelProps {
  /** Drawn above the section tabs. */
  inShort?: ReactNode;
  /** The sections, in the order Next walks them. Their length is the level's count. */
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
 * The one child whose DOM order is not its paint order, so do not tidy it back into
 * reading order.
 *
 * `LevelProgress` reads the box ref in a layout effect. React attaches a host element's
 * ref and runs layout effects in tree order. A strip BEFORE the stage in the DOM would
 * read the box before the stage attached its ref, and it would find no element. So the
 * stage renders first and the strip takes `order-first`, which paints it at the top.
 * Nothing focusable lives in the strip, so no tab order changes.
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
 * The strip measures the box on screen, not the pane. This level has no page to be
 * part-way down, so the pane's own offset would read zero forever. The strip needs how
 * far through one section the reader is, and that is the active box's own scroll.
 *
 * The stage must render before the strip, as the comment on the track states. The ref
 * must be attached before the strip resolves it, and the remount must re-resolve it.
 * Break either and the bar reads full at every position.
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
