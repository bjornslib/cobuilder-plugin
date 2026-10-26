/**
 * The bar is not a fourth fixed region: interaction-design section 2.1 gives the
 * shell three fixed regions and one scrolling region. It is the first child of the
 * scroll pane and it is `sticky`, so the pane still owns the only scroll.
 *
 * One link per panel the section actually rendered, read through a
 * `MutationObserver` on the pane. A panel that a section gates away has no link.
 * Nothing here holds a list of section names, because such a list would drift the
 * moment a section changed its panels.
 *
 * The pane scrolls, never the window: `useDocumentNoScroll` guarantees the document
 * cannot scroll, so `window.scrollTo` would do nothing. A press leaves the
 * horizontal offset the reader chose where it was.
 *
 * The offset subtracts the bar's own height, so a target heading lands under the
 * bar rather than behind it. `topOffset` adds any sticky chrome above the bar in
 * the same band, which today is the reading-progress strip.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

import { watchList } from "./observe/children";

/**
 * `Panel` in `atoms.tsx` is the only writer. The attribute holds the panel's own
 * heading, so the link label and the heading can never disagree.
 */
export const JUMP_ATTR = "data-shell-panel";

export interface JumpTarget {
  id: string;
  label: string;
}

/** Two panels may not share a heading. */
export function panelId(title: string): string {
  return `panel-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function readTargets(pane: HTMLElement): JumpTarget[] {
  return Array.from(pane.querySelectorAll<HTMLElement>(`[${JUMP_ATTR}]`)).map((element) => ({
    id: element.id,
    label: element.getAttribute(JUMP_ATTR) ?? "",
  }));
}

/**
 * The pane is read rather than a React registry, because document order is the
 * order a reader sees and a registry would have to be sorted back into it. The
 * observer covers the section crossfade, a section change, and a work-item change,
 * all of which replace panels without unmounting the pane.
 *
 * The `keys` argument is the caller's dependency list. The pane does not exist
 * while the index is loading or after it failed, so the observer has to attach
 * again when a mount brings the pane into the document. It is spread into the
 * effect, as `useScrollResetOnRoute` does.
 */
export function useJumpTargets(paneId: string, keys: readonly unknown[]): JumpTarget[] {
  const [targets, setTargets] = useState<JumpTarget[]>([]);
  const signature = keys.join("|");

  useEffect(
    () => watchList(document.getElementById(paneId), readTargets, setTargets),
    [paneId, signature],
  );

  return targets;
}

export interface JumpBarProps {
  paneId: string;
  targets: JumpTarget[];
  /**
   * The bar measures itself and cannot see a sibling, so the caller states the
   * pixels of sticky chrome above it. Without it, a jumped-to heading would land
   * under the reading-progress strip.
   */
  topOffset?: number;
}

interface Landing {
  pane: HTMLElement;
  target: HTMLElement;
  offset: number;
  reduce: boolean;
}

function land({ pane, target, offset, reduce }: Landing): void {
  const delta = target.getBoundingClientRect().top - pane.getBoundingClientRect().top - offset;
  pane.scrollTo({
    /* `top` alone. The reader's horizontal offset is theirs and it stays. */
    top: pane.scrollTop + delta,
    behavior: reduce ? "instant" : "smooth",
  });
  /* The target keeps focus, so a keyboard reader lands where the pointer did. */
  target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

type JumpHandler = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => void;

function useJump(paneId: string, topOffset: number, barRef: React.RefObject<HTMLElement | null>): JumpHandler {
  const reduce = useReducedMotion() ?? false;
  return useCallback((event, id) => {
    event.preventDefault();
    const pane = document.getElementById(paneId);
    const target = document.getElementById(id);
    if (!pane || !target) return;
    land({ pane, target, offset: (barRef.current?.offsetHeight ?? 0) + topOffset, reduce });
  }, [paneId, reduce, topOffset, barRef]);
}

const BAR_STYLE: React.CSSProperties = { zIndex: "var(--layer-raised)" };

const BAR_CLASS =
  "sticky top-0 flex min-w-0 flex-wrap items-center gap-1 border-b border-line bg-ground px-6 py-1.5";

const LINK_CLASS = cn(
  "inline-flex min-h-8 cursor-pointer items-center rounded-md border border-transparent px-2.5 font-mono text-[12.5px] whitespace-nowrap text-ink-dim",
  "transition-colors duration-150 ease-house hover:border-line hover:bg-surface-2 hover:text-foreground",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

function JumpLink({ target, onJump }: { target: JumpTarget; onJump: JumpHandler }) {
  return (
    <a href={`#${target.id}`} onClick={(event) => onJump(event, target.id)} className={LINK_CLASS}>
      {target.label}
    </a>
  );
}

/*
 * A `nav` of anchors, like the rail, so a link is focusable, right-clickable, and
 * openable in a new tab. The press is intercepted, because a hash write would move
 * the document and the document must not move.
 *
 * No links means no bar. An empty bar would spend a strip of the pane on nothing and
 * would state a presence the page does not have, which section 1.1's rule 8 forbids.
 */
export function JumpBar({ paneId, targets, topOffset = 0 }: JumpBarProps) {
  const barRef = useRef<HTMLElement>(null);
  const jump = useJump(paneId, topOffset, barRef);
  if (targets.length === 0) return null;
  return (
    <nav ref={barRef} aria-label="Sections on this page" style={BAR_STYLE} className={BAR_CLASS}>
      {targets.map((target) => (
        <JumpLink key={target.id} target={target} onJump={jump} />
      ))}
    </nav>
  );
}
