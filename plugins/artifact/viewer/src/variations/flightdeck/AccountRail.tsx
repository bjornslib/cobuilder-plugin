/**
 * One work item, read through a rail grouped in two parts.
 *
 * THE GROUPS ARE THE ENGINEER'S. Build holds Intent, Problem & Solution, Architecture,
 * Epics, and Rubrics, all read from the program's account. Review holds Intent, Problem &
 * Solution, Architecture, and File Diffs, all read from the change's account. The engineer
 * named a third group, Deploy, gave it no items, and then asked for it to be removed, so
 * the rail holds two groups.
 *
 * THE RAIL SHOWS WHICH ACCOUNT EACH GROUP READS. Because Intent, Problem & Solution, and
 * Architecture appear twice, a reader who cannot tell the groups apart cannot tell the
 * accounts apart. Each group heading carries the account's word and the account's glyph,
 * and `AccountMark.tsx` owns both. THE MARK CARRIES NO FILL, on the heading or anywhere
 * else it appears, so a heading here is a name and two shapes and no colour.
 *
 * THE RAIL'S CURRENT ROW IS NOT THE MARK. That row keeps the shell's own current-row
 * treatment, because it states where the reader is and not which account they are reading.
 * It is the one row in this rail that wears a selected fill.
 *
 * WHERE THE CONVENTIONS COME FROM. `src/shell/Rail.tsx` is the shipped rail and
 * `./LevelRail.tsx` is the reviewed prototype's. This file takes from both:
 *
 *   The width. The shell sets its sidebar to fifteen and a half rem, so a rail renders
 *   two hundred and forty-eight pixels. This rail is that wide.
 *
 *   The row frame. The same utilities in the same order, including the two-pixel focus
 *   ring and the fifteen-hundredth-of-a-second colour transition.
 *
 *   The current row. The shipped rail's own four, and the address match that decides it.
 *
 *   The group label. Mono, twelve pixels, bold, wide tracking, faint, uppercase.
 *
 *   The group fold. THE SHIPPED RAIL'S OWN MECHANISM, AND NOT A SECOND ONE. The chevron,
 *   its quarter turn when the group closes, the open state held above the rail, the
 *   `aria-expanded` on the control, and the keyboard. The control is a real button, so
 *   Enter and Space fold the group with no key handler of this file's own. The rows stay
 *   mounted and the box collapses around them, exactly as the shipped rail collapses its
 *   own. Every group starts open, and a group with no rows folds its own line away with
 *   them.
 *
 *   The arrow-key walk. The two key names, the one guard, a position read at the press,
 *   and a press that moves nothing at either end.
 *
 * THE FOLD AND THE WALK OBEY ONE CONVENTION, AND IT IS THE RAIL'S, NOT THIS PROTOTYPE'S.
 * The engineer stated it, and every rail in this family follows it — the shipped rail's
 * walk obeys it too when the grouped rail lands in the shipped shell:
 *
 *   THE WALK VISITS EVERY ROW OF BOTH GROUPS, whether a group is open or closed. A folded
 *   group is a display choice and not a wall: a reader who presses the down arrow keeps
 *   moving, and the row they land on is a row they can reach.
 *
 *   THE GROUP HOLDING THE CURRENT ROW IS ALWAYS OPEN. The walk opens a folded group the
 *   moment it enters one, so the reader always sees the row the current row landed on. The
 *   surface above enforces the same rule for every other way an address arrives — a deep
 *   link, the jump, a typed address — so the rule holds however the reader got there, and
 *   the fold control refuses to close the reader's own group rather than create a state
 *   the rule would immediately undo. `Accounts.tsx` owns both halves; this file reads the
 *   refusal from `holdsCurrent` below and reports it on the control.
 *
 * THE ROW THE READER IS ON IS NEVER HIDDEN, and that is what the two rules are for. A
 * press may fail to move at either end of the row list, but no press can leave the reader
 * unable to see where they are.
 *
 * WHAT THIS RAIL LEAVES OUT. The sidebar's own collapse, its icon mode, its mobile
 * drawer, and its open and close shortcut all belong to the shell's `SidebarProvider`.
 * This prototype is one page, so the rail is fixed and always expanded.
 */

import { useEffect, useRef } from "react";

import {
  ChevronDown,
  ClipboardCheck,
  Eye,
  FileText,
  ListTree,
  Network,
  Target,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import { keyPressIsTaken } from "@/shell/Pager";

import { ACCOUNT_GLYPH } from "./AccountMark";
import { ACCOUNT_MARK } from "./accountModel";
import type { GroupKey, RailGroup, RailRow } from "./accountModel";

/**
 * One icon per row key, and one per group.
 *
 * The icon is decoration and it carries no order, exactly as the shipped rail's map does
 * not. The two icons that a shipped surface already owns are reused rather than replaced:
 * the triangle for the problem and solution section, and the network for the architecture
 * one.
 */
const ROW_ICON: Record<string, LucideIcon> = {
  "program-intent": Target,
  "program-problem-and-solution": TriangleAlert,
  "program-architecture": Network,
  "program-epics": ListTree,
  "program-rubrics": ClipboardCheck,
  "change-intent": Target,
  "change-problem-and-solution": TriangleAlert,
  "change-architecture": Network,
  "change-file-diffs": FileText,
};

/**
 * The group's own icon on its heading, one per group.
 *
 * NO GROUP WEARS THE SHAPE THE ACCOUNT MARK USES. The mark's glyph for the change is the
 * pull-request shape, and the Review group first drew that same shape, so its heading
 * carried the one drawing twice and the mark was lost beside it. The engineer kept the
 * heading's icons and asked for a different one here, so Review takes the eye: the group
 * is the act of reading a change over, and the eye is a shape nothing else in this rail
 * uses. Build keeps the target, which the account mark never uses either, so both headings
 * now draw two different shapes — the group's own and the account's.
 */
const GROUP_ICON: Record<GroupKey, LucideIcon> = {
  build: Target,
  review: Eye,
};

/**
 * The frame every row shares.
 *
 * It is the shipped rail's own frame with the collapsed-size rules removed, because this
 * rail never collapses. `outline-solid` is not decoration: the two-pixel outline reads its
 * style from a variable a sidebar sets to none, and this line sets it back for the case
 * where this rail is ever rendered inside one.
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
 * The walk steps EVERY row of both groups, in the order the rail renders them, and it
 * crosses a group boundary as one step. At either end the press moves nothing. The current
 * row follows the walk, because the row that reads current is the row whose address is the
 * reader's.
 *
 * A FOLDED GROUP IS NOT A GAP. The walk is handed every row, open group or closed, so a
 * press always reaches the next row. It needs no group of its own and it opens nothing
 * itself: the group the walk enters opens because the surface keeps the group holding the
 * current row open, and a press that lands in a folded group is what moves the current row
 * there. One rule, one place, and the walk stays a walk.
 *
 * The position is read at the press rather than at the last render, as the shipped walk
 * reads its own address at the press. The pager's guard applies here too: a press inside a
 * field and a press with a modifier stay with whoever owns them.
 */
function useRailArrowKeys({
  rows,
  onGo,
}: {
  rows: RailRow[];
  onGo: (href: string) => void;
}): void {
  const at = useRef<RailRow[]>(rows);
  at.current = rows;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      if (keyPressIsTaken(event)) return;
      const here = window.location.hash;
      const position = at.current.findIndex((row) => row.href === here);
      if (position < 0) return;
      const wanted = position + (event.key === "ArrowDown" ? 1 : -1);
      if (wanted < 0 || wanted >= at.current.length) return;
      event.preventDefault();
      onGo(at.current[wanted].href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onGo]);
}

export function AccountRail({
  groups,
  onGo,
  open,
  onToggleGroup,
}: {
  groups: RailGroup[];
  /** The rail never writes an address itself. The surface above owns the route. */
  onGo: (href: string) => void;
  /** Which groups are open, keyed by group. A group with no entry is open. */
  open: Record<string, boolean>;
  onToggleGroup: (key: string) => void;
}) {
  const reduce = useReducedMotion();
  /*
   * THE WALK STEPS EVERY ROW, FOLDED GROUP OR NOT. The list is the rail's whole list, in
   * the order this file renders it, so a press cannot reach a row the rail does not hold
   * and cannot skip one it does.
   */
  const rows = groups.flatMap((group) => group.rows);
  useRailArrowKeys({ rows, onGo });

  const here = window.location.hash;

  return (
    <nav
      aria-label="This work item, grouped in two parts"
      className="flex min-h-0 w-[15.5rem] shrink-0 flex-col gap-2 self-stretch overflow-y-auto border-r border-line bg-surface p-2"
    >
      <span className="px-2.5 pt-1.5 pb-0.5 font-mono text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase">
        One work item, two accounts
      </span>

      {groups.map((group) => {
        const GroupIcon = GROUP_ICON[group.key];
        const AccountGlyph = ACCOUNT_GLYPH[group.account];
        const mark = ACCOUNT_MARK[group.account];
        const isOpen = open[group.key] ?? true;
        /*
         * True when this group holds the row the reader is on. The surface refuses to
         * close that group, because the rail never hides the reader's own row. The control
         * stays a real button and states the reason instead of silently doing nothing.
         */
        const holdsCurrent = group.rows.some((row) => row.href === here);
        const heldNote = "This group holds the section you are reading, so it stays open.";
        return (
          <div key={group.key} className="flex min-w-0 flex-col gap-0.5">
            <div className="flex min-h-8 min-w-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5">
              <button
                type="button"
                onClick={() => onToggleGroup(group.key)}
                aria-expanded={isOpen}
                aria-label={holdsCurrent ? `${group.label}. ${heldNote}` : undefined}
                title={holdsCurrent ? heldNote : undefined}
                className={cn(
                  "flex min-h-6 min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-md",
                  "transition-colors duration-150 ease-house hover:bg-surface-2",
                  "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring",
                )}
              >
                <ChevronDown
                  className={cn(
                    "size-3.5 shrink-0 text-ink-faint transition-transform duration-150 ease-house",
                    !isOpen && "-rotate-90",
                  )}
                  aria-hidden="true"
                />
                <GroupIcon className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
                <span className="font-mono text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase">
                  {group.label}
                </span>
              </button>

              {/* The mark: the account's glyph and its word. It carries no fill. */}
              <span className="flex min-w-0 shrink-0 items-center gap-1 text-ink-mid">
                <AccountGlyph className="size-3 shrink-0" aria-hidden="true" />
                <span className="font-mono text-[11px] font-bold tracking-[0.06em] uppercase">
                  {mark.word}
                </span>
              </span>
            </div>

            <motion.div
              initial={false}
              animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              {group.rows.length === 0 ? (
                <p className="m-0 px-2.5 py-1.5 font-mono text-[12px] leading-[1.45] text-ink-faint">
                  No pull request this work&apos;s own epics carry, so the change has no
                  account to read.
                </p>
              ) : (
                <ul className="m-0 flex min-w-0 list-none flex-col gap-0.5 p-0">
                  {group.rows.map((row) => (
                    <li key={row.key} className="min-w-0 list-none">
                      <RailRowButton row={row} here={here} onGo={onGo} />
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </div>
        );
      })}
    </nav>
  );
}

function RailRowButton({
  row,
  here,
  onGo,
}: {
  row: RailRow;
  /** The reader's own address. The row that opens it is the current row. */
  here: string;
  onGo: (href: string) => void;
}) {
  const Icon = ROW_ICON[row.key] ?? Target;
  /*
   * The row the reader arrived on, matched by address. A section-name match would light
   * two rows at once, because both accounts carry the same three section names.
   */
  const current = row.href === here;
  const mark = ACCOUNT_MARK[row.account];
  const name = `${row.label} · the ${mark.word.toLowerCase()} account`;

  return (
    <a
      href={row.href}
      aria-current={current ? "page" : undefined}
      aria-label={`${name} · ${row.count}`}
      title={`${name} — ${row.count}`}
      onClick={(event) => {
        /* A plain press moves the route; a modified press keeps the browser's own act. */
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onGo(row.href);
      }}
      className={cn(
        ROW_FRAME,
        current
          ? "border-l-2 border-l-primary bg-accent-wash font-bold text-accent-deep"
          : "text-ink-mid hover:bg-surface-2 hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{row.label}</span>
      {/*
        THE ROW CARRIES NO ACCOUNT CHIP. The group heading directly above states the account
        for every row under it, and a chip on the row cost the width the label needs: at
        fifteen and a half rem, "Problem & Solution" truncated to "Problem & So…". The
        account is still spoken on the row, because `name` above puts it in the label and
        the title, so a reader who never sees the group heading still hears it.
      */}
      <span
        aria-hidden="true"
        className={cn(
          "shrink-0 font-mono text-[11px] tabular-nums",
          current ? "text-accent-deep" : "text-ink-faint",
        )}
      >
        {row.count.replace(/ .*$/, "")}
      </span>
    </a>
  );
}
