/**
 * The four narration levels, as a left rail.
 *
 * WHY THIS EXISTS. Mode one carried two navigations that both ran left to right: a level
 * strip across the top and a section strip under it. The engineer asked for one. The
 * levels moved here and the section strip stayed where it was, so the surface now reads
 * down the rail for a level and across the strip for a section inside it.
 *
 * WHERE THE CONVENTIONS COME FROM. `src/shell/Rail.tsx` is the shipped rail, and this
 * file takes four things from it rather than inventing a second language:
 *
 *   The width. `src/shell/App.tsx` sets the sidebar width to fifteen and a half rem, so
 *   the shipped rail renders 248 px. This rail is that wide.
 *
 *   The row frame. The same utilities, in the same order, including the two-pixel focus
 *   ring and the fifteen-hundredth-of-a-second colour transition. A rail row here is the
 *   height, the padding, the type, and the corner of a rail row there.
 *
 *   The current row. `border-l-2 border-l-primary bg-accent-wash font-bold
 *   text-accent-deep`, the same four the shipped rail uses, and `aria-current="page"`.
 *   The level strip this replaces filled its current item with the heading fill instead,
 *   which `src/index.css` forbids for a selected control.
 *
 *   The group label. Mono, twelve pixels, bold, wide tracking, faint, uppercase. The
 *   shipped rail folds a labelled group and this one cannot, because one group has
 *   nothing to fold into, so the chevron and the button go and the text stays.
 *
 * WHAT THIS RAIL DELIBERATELY LEAVES OUT. The sidebar's own collapse, its icon mode, its
 * mobile drawer, and its open and close keyboard shortcut all belong to the shell's
 * `SidebarProvider`. The prototype is one pane inside a reviewed page rather than the
 * shell's own frame, so the rail is fixed and always expanded.
 *
 * THE ARROW-KEY TRAVERSAL IS THE SHELL'S, AND IT LIVES BESIDE THE ROWS IT WALKS. The
 * shipped walk sits in `src/shell/App.tsx`, because the shell's rail renders a list a
 * function builds. This rail renders the level list it was handed, so the walk sits here
 * and steps that same array. Four things come from the shipped walk and nothing is
 * invented: the two key names, the one guard, a position read at the press rather than at
 * the last render, and a press that moves nothing at either end. The left and right keys
 * are the section strip's, and this walk never answers to them.
 *
 * THE LEVEL NUMBER IS A BADGE, per the shipped rail's own meta slot, and the icon is
 * decoration. Two of the four icons are the shell's own icon for the same concept: the
 * triangle for the problem and solution level, and the network for the architecture one.
 */

import { useEffect, useRef } from "react";

import { AlertTriangle, FileText, Map, Network } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { keyPressIsTaken } from "@/shell/Pager";

import type { Level, LevelKey } from "./model";

/**
 * One icon per level key.
 *
 * The map carries no order of its own, as the shipped rail's map does not: the level list
 * comes in from the mode above, and this file never decides what a level is.
 */
const ICONS: Record<LevelKey, LucideIcon> = {
  landscape: Map,
  problem_solution: AlertTriangle,
  architecture: Network,
  file_changes: FileText,
};

/**
 * The frame every row shares.
 *
 * It is the shipped rail's own frame with one line removed: this rail never collapses, so
 * the collapsed-size rules have nothing to size. `outline-solid` is not decoration. The
 * two-pixel outline reads its style from a variable the sidebar sets to none, and this
 * line sets it back.
 */
const ROW_FRAME = cn(
  "flex min-h-9 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left",
  "font-mono text-[13px] leading-[1.3]",
  "transition-colors duration-150 ease-house",
  "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring",
);

/**
 * The rail's rows, walked with the up and down arrows.
 *
 * ArrowDown moves to the next level and ArrowUp to the previous one, in the order the
 * rail renders them. At either end the press moves nothing. The current row follows the
 * walk, because the row that reads current is the row whose index is the reader's.
 *
 * IT STEPS THE LIST THE RAIL RENDERS. `levels` is the one list and the rail draws it, so
 * the walk cannot know fewer levels than a reader sees.
 *
 * THE READER'S POSITION IS READ AT THE PRESS, as the shipped walk reads its address at
 * the press rather than at the last render, so a step that just landed is the position
 * the next press reads.
 *
 * THE PAGER'S GUARD APPLIES HERE TOO. `keyPressIsTaken` is the shell's one copy of it, and
 * it leaves a press inside a field, and a press with a modifier, to whoever owns them.
 * These two keys never touch the pager's own two: the left and right keys belong to the
 * section strip, and this walk answers to neither of them.
 */
function useLevelArrowKeys({
  levels,
  levelIndex,
  onLevelIndex,
}: {
  levels: Level[];
  levelIndex: number;
  onLevelIndex: (index: number) => void;
}): void {
  const at = useRef(levelIndex);
  at.current = levelIndex;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      if (keyPressIsTaken(event)) return;
      const wanted = at.current + (event.key === "ArrowDown" ? 1 : -1);
      if (wanted < 0 || wanted >= levels.length) return;
      event.preventDefault();
      onLevelIndex(wanted);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [levels.length, onLevelIndex]);
}

export function LevelRail({
  levels,
  levelIndex,
  onLevelIndex,
}: {
  levels: Level[];
  levelIndex: number;
  onLevelIndex: (index: number) => void;
}) {
  useLevelArrowKeys({ levels, levelIndex, onLevelIndex });

  return (
    <nav
      aria-label="Narration levels"
      /*
       * The rail never scrolls the page and it never moves, so it is its own scroll
       * container, as the shipped rail is.
       */
      className="flex min-h-0 w-[15.5rem] shrink-0 flex-col gap-1 self-stretch overflow-y-auto border-r border-line bg-surface p-2"
    >
      <span className="px-2.5 py-1.5 font-mono text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase">
        The levels
      </span>

      <ul className="m-0 flex min-w-0 list-none flex-col gap-0.5 p-0">
        {levels.map((level, index) => {
          const Icon = ICONS[level.key];
          const current = index === levelIndex;
          /*
           * The number is the badge and it is decoration beside the spoken name, so the
           * row's own label carries it and the badge repeats it silently.
           */
          const name = `Level ${level.number} · ${level.title}`;
          return (
            <li key={level.key} className="min-w-0 list-none">
              <button
                type="button"
                aria-current={current ? "page" : undefined}
                aria-label={level.audio === null ? `${name} · no narration audio` : name}
                title={level.narration || name}
                onClick={() => onLevelIndex(index)}
                className={cn(
                  ROW_FRAME,
                  current
                    ? "border-l-2 border-l-primary bg-accent-wash font-bold text-accent-deep"
                    : "text-ink-mid hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{level.title}</span>
                {level.audio === null ? (
                  <AlertTriangle
                    className="size-3.5 shrink-0 text-warn"
                    aria-label="no narration audio"
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  className={cn(
                    "min-w-5 shrink-0 rounded-md px-1 text-center font-mono text-[12px] font-medium tabular-nums",
                    current ? "text-accent-deep" : "text-ink-faint",
                  )}
                >
                  {level.number}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
