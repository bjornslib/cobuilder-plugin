import type { Ref } from "react";

import { cn } from "@/lib/utils";

import { BAND_SECTION } from "./headings";

interface SectionHeadingProps {
  title: string;
  lead: string;
  id: string;
  /** The shell's handle on the `h1`, so the level's own mount can move focus to it. */
  headingRef?: Ref<HTMLHeadingElement>;
}

const H1_CLASS =
  "m-0 font-mono text-[24px] leading-tight font-bold tracking-[-0.02em] text-band-ink outline-none";

const LEAD_CLASS = "mt-1.5 mb-0 max-w-[92ch] font-serif text-[16px] leading-[1.55] text-band-ink/85";

/**
 * The heading of a scroll-pane section. Focus moves here when the section changes.
 *
 * `headingRef` is the shell's handle on the `h1`. The move belongs to the level's
 * mount, and the level holds the ref (`LevelHeading` in `./App.tsx`), so the ref has to
 * reach the one focusable element here rather than stop at the banner.
 */
export function SectionHeading({ title, lead, id, headingRef }: SectionHeadingProps) {
  return (
    <header className={cn("mb-5 px-[26px] py-[22px]", BAND_SECTION)}>
      <h1 ref={headingRef} id={id} tabIndex={-1} className={H1_CLASS}>
        {title}
      </h1>
      <p className={LEAD_CLASS}>{lead}</p>
    </header>
  );
}
