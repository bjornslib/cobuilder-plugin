import { useCallback, useEffect, useState } from "react";

import { useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

import { SHEET_HEADING_ATTR } from "../atoms";
import { watchList } from "../observe/children";

interface SheetHeading {
  id: string;
  label: string;
}

/** The id a heading's own words become, so the link and the heading cannot drift. */
function headingId(label: string): string {
  return `sheet-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function labelled(element: HTMLElement): SheetHeading {
  const label = (element.firstElementChild?.textContent ?? "").trim();
  if (element.id === "") element.id = headingId(label);
  return { id: element.id, label };
}

function readHeadings(scroll: HTMLElement): SheetHeading[] {
  return Array.from(scroll.querySelectorAll<HTMLElement>(`[${SHEET_HEADING_ATTR}]`)).map(labelled);
}

/**
 * The record decides the list: `Box` and `SubHead` mark the parts they render and
 * this reads the marks, as the pane's link bar reads panels. A record with
 * different parts gets its own row with no list to keep in step.
 *
 * A heading's label is its first element child's text, where both atoms put their
 * words. The whole element would swallow `SubHead`'s count.
 *
 * The id is assigned here when the heading lacks one, because only this reader
 * knows the label. Setting an attribute fires no child-list mutation, so the
 * observer below cannot loop on itself.
 */
export function useSheetHeadings(scroll: HTMLElement | null, keys: readonly unknown[]): SheetHeading[] {
  const [headings, setHeadings] = useState<SheetHeading[]>([]);
  const signature = keys.join("|");

  useEffect(() => watchList(scroll, readHeadings, setHeadings), [scroll, signature]);

  return headings;
}

function scrollToHeading(scroll: HTMLElement, target: HTMLElement, reduce: boolean): void {
  const delta = target.getBoundingClientRect().top - scroll.getBoundingClientRect().top;
  scroll.scrollTo({
    top: scroll.scrollTop + delta,
    /* The reader's horizontal offset is theirs and it stays. */
    left: scroll.scrollLeft,
    behavior: reduce ? "instant" : "smooth",
  });
  /* The heading keeps focus, so a keyboard reader lands where the pointer did. */
  target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

type HeadingJump = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => void;

function useHeadingJump(scroll: HTMLElement | null): HeadingJump {
  const reduce = useReducedMotion() ?? false;
  return useCallback((event, id) => {
    event.preventDefault();
    const target = document.getElementById(id);
    if (!scroll || !target) return;
    scrollToHeading(scroll, target, reduce);
  }, [reduce, scroll]);
}

const NAV_CLASS =
  "flex min-w-0 shrink-0 items-center gap-1 overflow-x-auto overscroll-x-contain border-b border-line bg-surface px-4 py-1.5";

const LINK_CLASS = cn(
  "inline-flex min-h-8 shrink-0 cursor-pointer items-center rounded-md border border-transparent px-2.5 font-mono text-[12.5px] whitespace-nowrap text-ink-dim",
  "transition-colors duration-150 ease-house hover:bg-surface-2 hover:text-foreground",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

function HeadingLink({ heading, onJump }: { heading: SheetHeading; onJump: HeadingJump }) {
  return (
    <a href={`#${heading.id}`} onClick={(event) => onJump(event, heading.id)} className={LINK_CLASS}>
      {heading.label}
    </a>
  );
}

interface JumpLinksProps {
  headings: SheetHeading[];
  scroll: HTMLElement | null;
}

/**
 * A `nav` of anchors, like the pane's link bar, so a link is focusable and
 * right-clickable. The press is intercepted because the record scrolls inside its
 * own container and a hash write would move the document instead. The row scrolls
 * sideways when it overflows, so no link is clipped.
 */
export function SheetJumpLinks({ headings, scroll }: JumpLinksProps) {
  const jump = useHeadingJump(scroll);
  if (headings.length === 0) return null;
  return (
    <nav aria-label="Parts of this record" className={NAV_CLASS}>
      {headings.map((heading) => (
        <HeadingLink key={heading.id} heading={heading} onJump={jump} />
      ))}
    </nav>
  );
}
