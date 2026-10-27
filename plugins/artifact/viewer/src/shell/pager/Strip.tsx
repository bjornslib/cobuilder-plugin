import type { MouseEvent } from "react";

import { cn } from "@/lib/utils";

import { BAND_FOCUS } from "../atoms";
import type { JumpTarget } from "../jump";

const NAV_CLASS =
  "flex min-w-0 shrink-0 items-center gap-1 overflow-x-auto overscroll-x-contain border-b border-line bg-ground px-6 py-1.5";
const LINK_BASE =
  "inline-flex min-h-8 shrink-0 cursor-pointer items-center rounded-[10px] border border-transparent px-2.5 font-mono text-[12.5px] whitespace-nowrap";
const LINK_MOTION = "transition-colors duration-150 ease-house";
/*
 * The active heading takes the band fill. This is the one selected state the band may
 * carry, because it marks a heading and the panel headings it names already wear the
 * same fill. The ring is `--band-ink`, because the teal ring is 1.4 to 1 on the band.
 */
const LINK_ON = cn("bg-band font-bold text-band-ink", BAND_FOCUS);
const LINK_OFF = cn(
  "text-ink-dim hover:bg-surface-2 hover:text-foreground",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

interface StripLinkProps {
  target: JumpTarget;
  on: boolean;
  onSelect: () => void;
}

function pressLink(event: MouseEvent<HTMLAnchorElement>, onSelect: () => void): void {
  event.preventDefault();
  onSelect();
}

function StripLink({ target, on, onSelect }: StripLinkProps) {
  return (
    <a
      href={`#${target.id}`}
      aria-current={on ? "step" : undefined}
      onClick={(event) => pressLink(event, onSelect)}
      className={cn(LINK_BASE, LINK_MOTION, on ? LINK_ON : LINK_OFF)}
    >
      {target.label}
    </a>
  );
}

interface StripProps {
  targets: JumpTarget[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

/**
 * The section headings, one press away from its box.
 *
 * The list comes from `useJumpTargets`, which reads the panels the boxes rendered. So the
 * strip holds one heading per panel with no list of its own, and a label can never
 * disagree with the heading it names. This is the jump bar's mechanism, except that a
 * press sets the active index instead of scrolling the pane to an anchor.
 *
 * The anchors stay anchors. A reader can still focus one, and it still carries an href.
 * The press is intercepted, because a hash write would move the document and this shell
 * never moves the document.
 *
 * The row scrolls sideways when it overflows, so a narrow pane keeps every heading
 * reachable instead of clipping the last one.
 */
export function SectionStrip({ targets, activeIndex, onSelect }: StripProps) {
  if (targets.length === 0) return null;
  return (
    <nav aria-label="Sections of this level" className={NAV_CLASS}>
      {targets.map((target, index) => (
        <StripLink key={target.id} target={target} on={index === activeIndex} onSelect={() => onSelect(index)} />
      ))}
    </nav>
  );
}
