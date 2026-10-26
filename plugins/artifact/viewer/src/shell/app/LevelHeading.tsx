import type { RefObject } from "react";

import { SectionHeading } from "../atoms";
import { useFocusOnMount } from "../hooks";
import type { Gates, SectionKey, WorkItem } from "../model";
import { HEADING_ID } from "./ids";
import { SECTION_LEAD, SECTION_TITLE } from "./copy";

function SrHeading({ headingRef, text }: { headingRef: RefObject<HTMLHeadingElement | null>; text: string }) {
  return (
    <h1 ref={headingRef} id={HEADING_ID} tabIndex={-1} className="sr-only outline-none">
      {text}
    </h1>
  );
}

interface HeadingProps {
  section: SectionKey;
  work: WorkItem | null;
  gates: Gates | null;
  paged: boolean;
  /** The level's own name, when the section's name is not the one the reader is on. */
  title?: string;
}

/**
 * The level's heading, and the focus move that lands on it.
 *
 * THE HEADING MOUNTS WITH ITS LEVEL, AND THAT IS WHERE SECTION 8.4'S MOVE HAPPENS. This
 * component is rendered inside the keyed subtree of the `AnimatePresence` below, so a
 * level change mounts it and nothing else does. `useFocusOnMount` focuses the heading it
 * returned, which is this level's own element, on the commit that brings the level in.
 *
 * WHY NOT ONE FRAME AFTER THE ROUTE CHANGED. That is what the shell used to do, and the
 * frame resolved the wrong heading: `mode="wait"` keeps the outgoing subtree mounted for
 * its exit, that subtree owns the `h1` of the level being left, and focus fell to `<body>`
 * when it unmounted. `useFocusOnMount` in `./hooks` holds the measurement.
 *
 * A paged level drops its band and keeps the heading as `sr-only`, so the strip below is
 * the only place the section's own words are drawn. A stacked level draws the band.
 *
 * THE WORK ITEM IS NULLABLE, BECAUSE A WORKLESS PULL REQUEST HAS NONE. Every caller of the
 * stacked form passes one, and that form reads it for the section's lead. A workless change
 * carries no work item and is always paged, so it passes null and the heading names the pull
 * request through `title`. The branch below answers the `sr-only` heading for a null work
 * item too, so a caller that broke the pairing would state the section rather than crash on
 * a lead it cannot read.
 */
export function LevelHeading({ section, work, gates, paged, title }: HeadingProps) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const text = title ?? SECTION_TITLE[section];

  if (paged || work === null) return <SrHeading headingRef={headingRef} text={text} />;

  return <SectionHeading id={HEADING_ID} title={text} lead={SECTION_LEAD[section](work, gates)} headingRef={headingRef} />;
}
