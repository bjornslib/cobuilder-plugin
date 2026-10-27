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
 * The heading mounts with its level, and that is where section 8.4's move happens. This
 * component sits in the keyed subtree of the `AnimatePresence`, so a level change mounts
 * it and nothing else does. `useFocusOnMount` focuses the heading on the commit that
 * brings the level in.
 *
 * Moving focus one frame after the route change fails. `mode="wait"` keeps the outgoing
 * subtree mounted for its exit, that subtree owns the `h1` of the level being left, and
 * focus fell to `<body>` when it unmounted. `useFocusOnMount` in `./hooks` holds the
 * measurement.
 *
 * A paged level drops its band and keeps the heading as `sr-only`, so the strip below is
 * the only place the section's own words are drawn. A stacked level draws the band.
 *
 * The work item is nullable, because a workless pull request has none. Such a change is
 * always paged, so it passes null and names the pull request through `title`. The
 * `sr-only` branch also answers a null work item, so a caller that broke the pairing
 * would state the section instead of crashing on a lead it cannot read.
 */
export function LevelHeading({ section, work, gates, paged, title }: HeadingProps) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const text = title ?? SECTION_TITLE[section];

  if (paged || work === null) return <SrHeading headingRef={headingRef} text={text} />;

  return <SectionHeading id={HEADING_ID} title={text} lead={SECTION_LEAD[section](work, gates)} headingRef={headingRef} />;
}
