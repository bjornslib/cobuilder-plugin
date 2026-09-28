/**
 * The rail, as a shadcn sidebar. It never scrolls the pane, and it never moves.
 *
 * The rail is a `Sidebar` inside the shell's `SidebarProvider`, so three things come
 * from the sidebar rather than from this file. Below 768 px the rail is a drawer
 * behind one control in the top bar. Between 768 px and 1200 px it collapses to
 * icons, and the reader may also collapse it at any width. `Cmd` or `Ctrl` plus `B`
 * toggles it. The rail keeps its own scroll, per section 11.3.
 *
 * THE RAIL HOLDS NO ORDER OF ITS OWN. It renders the groups `railGroups` returns, in
 * the order that function returns them. Every address and count comes from there too, and
 * `model.ts` states the rules. This file decides appearance alone: the frame, the icons,
 * the current row, the fold, and the tooltip.
 *
 * TWO ACCOUNTS, GROUPED UNDER BUILD AND REVIEW. Build reads the program's account and
 * Review reads the change's, and three section names stand in both groups. So a reader
 * who cannot tell the groups apart cannot tell the accounts apart either, and each group
 * states the account it reads.
 *
 * THE CURRENT ROW IS THE ROW THE READER ARRIVED ON. A row is current when its address is
 * the reader's address, never when it merely names the reader's section. The two groups
 * repeat Intent, Problem & Solution, and Architecture, so a section match would light more
 * than one row at once.
 *
 * THE FOLD AND THE WALK OBEY ONE CONVENTION, and the rail keeps both halves of it.
 *
 *   1. THE GROUP HOLDING THE CURRENT ROW IS ALWAYS OPEN. The fold refuses to close it,
 *      and the control states that reason rather than doing nothing in silence. The open
 *      state is therefore `holdsCurrent || the reader's own choice`, so a row the reader
 *      arrives on is never hidden by a fold, however the address arrived.
 *   2. A FOLDED GROUP IS NOT A GAP. The arrow walk steps the flat list `rowsOf` returns,
 *      so it reaches every row of both groups whether a group is open or closed. One rule,
 *      one place, and the walk stays a walk.
 *
 * THE BOARD'S ROW IS THE RAIL'S OWN, AND NOT A ROW OF EITHER ACCOUNT. The board reads the
 * work list and not a work item's records, so it belongs to no group and no group folds it
 * away. It sits above both groups, and it is the one way back from three sections deep.
 *
 * An available row is a `SidebarMenuButton`, so it takes the sidebar's hover, focus, and
 * active treatment. A row whose record is absent is a plain anchor inside the same
 * `SidebarMenuItem`. The sidebar's own `aria-disabled` treatment sets
 * `pointer-events: none`, which would stop the tooltip that names the missing records from
 * ever opening, so the absent row owns its own frame.
 */

import { ChevronDown, ClipboardCheck, FileText, LayoutGrid, ListTree, Network, ScrollText, Target, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail as SidebarCollapseHandle,
  useSidebar,
} from "@/components/ui/sidebar";

import type { RailRow, RailSource } from "./model";
import { boardHref, railGroups } from "./model";

/*
 * One icon per row key.
 *
 * The icon is decoration, so it lives here rather than in `model.ts`: that file is the
 * data layer and it imports no React. The map is keyed on the row key, so it carries no
 * order of its own, and the two accounts share the three shapes their shared sections use.
 */
const ICONS: Record<string, LucideIcon> = {
  "program-intent": Target,
  "program-problem-and-solution": TriangleAlert,
  "program-architecture": Network,
  "program-epics": ListTree,
  "program-rubrics": ClipboardCheck,
  "program-plan": ScrollText,
  "change-intent": Target,
  "change-problem-and-solution": TriangleAlert,
  "change-architecture": Network,
  "change-file-diffs": FileText,
};

export interface RailProps extends RailSource {
  open: Record<string, boolean>;
  onToggleGroup: (key: string) => void;
}

/** What a row says when its record is absent, in one short line. */
function absentLine(missing: string[]): string {
  if (missing.length === 0) return "no record";
  return missing.join(", ");
}

/**
 * The frame every rail row shares. An available row adds the sidebar's menu treatment
 * on top of it, and a row whose record is absent keeps this frame alone.
 *
 * `min-h-9` is section 11.2's 36 px floor for an expanded item. `group-data-[collapsible=icon]:size-11!`
 * is the same table's 44 px floor for a collapsed one, and it has to carry `!` because
 * the sidebar ships its own collapsed size as important.
 *
 * `outline-solid` is not decoration. The sidebar's own rows carry `outline-hidden`,
 * which sets `--tw-outline-style: none`, and `outline-2` reads that variable for its
 * style. Without this line the focus ring would be two pixels of no outline at all.
 */
const ROW_FRAME = cn(
  "min-h-9 min-w-0 gap-2.5 rounded-md px-2.5 py-1.5",
  "cursor-pointer font-mono text-[13px] leading-[1.3]",
  "transition-colors duration-150 ease-house",
  "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring",
  "group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!",
);

export function Rail(props: RailProps) {
  const { work, workCount, open, onToggleGroup } = props;
  const reduce = useReducedMotion();
  const { state, isMobile } = useSidebar();
  /* Icon mode is the sidebar's own collapse, and never applies to the mobile drawer. */
  const icons = state === "collapsed" && !isMobile;

  /* The one list, built by the one function. This file holds no second copy of it. */
  const groups = railGroups(props);

  /*
   * The reader's own address, which is the hash the shell writes. A row is current when
   * it opens this address. An empty hash is the bare route, which is the board.
   */
  const here = window.location.hash || boardHref();

  /* The rows whose record the rail could not read, for the live region below. */
  const absent = groups.flatMap((group) => group.rows).filter((row) => !row.available);

  return (
    <Sidebar
      collapsible="icon"
      className="absolute inset-y-0 left-0 h-full border-r border-line"
      style={{ zIndex: "var(--layer-fixed)" }}
    >
      <SidebarContent>
        <nav aria-label="Work sections" className="min-w-0">
          {/* The board's own row: the way back, above both accounts, and never folded. */}
          <BoardRow here={here} icons={icons} count={workCount} />

          {groups.map((group) => {
            /*
             * THE READER'S OWN GROUP NEVER CLOSES. The rule is enforced twice on purpose:
             * the control refuses the press, and the open state ignores a fold the reader
             * set before they arrived here, so a deep link and a walked step obey it too.
             */
            const holdsCurrent = group.rows.some((row) => row.href === here);
            const isOpen = holdsCurrent || (open[group.key] ?? true);
            const shown = icons || isOpen;

            return (
              <SidebarGroup key={group.key} className="min-w-0 pb-0">
                {/* In icon mode the header would sit invisibly over the icons, so it goes. */}
                {icons ? null : (
                  <SidebarGroupLabel asChild>
                    <button
                      type="button"
                      onClick={() => {
                        /* A control that silently did nothing would read as broken. */
                        if (holdsCurrent) return;
                        onToggleGroup(group.key);
                      }}
                      aria-expanded={isOpen}
                      aria-label={holdsCurrent ? group.label : undefined}
                      title={holdsCurrent ? group.label : undefined}
                      className={cn(
                        "min-h-8 w-full min-w-0 cursor-pointer gap-1.5 rounded-md px-3 py-1.5 text-left",
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
                      <span className="font-mono text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase">
                        {group.label}
                      </span>
                    </button>
                  </SidebarGroupLabel>
                )}

                <SidebarGroupContent>
                  <motion.div
                    initial={false}
                    animate={{ height: shown ? "auto" : 0, opacity: shown ? 1 : 0 }}
                    transition={
                      reduce ? { duration: 0 } : { duration: 0.22, ease: [0.4, 0, 0.2, 1] }
                    }
                    className="overflow-hidden"
                  >
                    {group.rows.length === 0 ? (
                      /*
                        AN EMPTY GROUP STATES THE ABSENCE. A work whose own epics carry no
                        pull request has no change account, and four rows that open nothing
                        are worse than one sentence that says why.
                      */
                      <p className="m-0 px-3 py-1.5 font-mono text-[12px] leading-[1.45] text-ink-faint">
                        {group.account === "change"
                          ? "No pull request this work's own epics carry, so the change has no account to read."
                          : "This group holds no row for this work item."}
                      </p>
                    ) : (
                      <SidebarMenu className="min-w-0 gap-0.5">
                        {group.rows.map((row) => (
                          <RailRowItem key={row.key} row={row} here={here} icons={icons} />
                        ))}
                      </SidebarMenu>
                    )}
                  </motion.div>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}

          {/*
            A reader who cannot see the rail still learns what the work lacks. The live
            region speaks once, when the index settles and the rows resolve.
          */}
          <p aria-live="polite" className="m-0 px-4 font-mono text-[12px] text-ink-faint">
            <span className="sr-only">
              {work === null
                ? ""
                : absent.length === 0
                  ? "All rows in this rail have a record."
                  : `Absent for this work item: ${absent
                      .map((row) => `${row.label}: ${absentLine(row.absent ?? [])}`)
                      .join(". ")}.`}
            </span>
          </p>
        </nav>
      </SidebarContent>

      {/* The sidebar's own collapse handle, on the rail's edge. */}
      <SidebarCollapseHandle />
    </Sidebar>
  );
}

/**
 * The rail's own row back to the board.
 *
 * IT IS NOT A ROW OF EITHER ACCOUNT, so it is not a `RailRow` and no group holds it. The
 * board reads the work list, not a work item's records, and a reader who has chosen a work
 * item still needs one press to reach the list again.
 */
function BoardRow({
  here,
  icons,
  count,
}: {
  /** The reader's own address. The board's row is current when it opens this one. */
  here: string;
  icons: boolean;
  /** How many work items the board lists, or null while the index is in flight. */
  count: number | null;
}) {
  const current = here === boardHref();
  return (
    <SidebarGroup className="min-w-0 pb-0">
      <SidebarGroupContent>
        <SidebarMenu className="min-w-0 gap-0.5">
          <SidebarMenuItem className="min-w-0">
            <SidebarMenuButton asChild isActive={current} tooltip="Work" className={ROW_FRAME}>
              <a
                href={boardHref()}
                aria-current={current ? "page" : undefined}
                aria-label="Work"
                className={cn(
                  "flex items-center",
                  current
                    ? "border-l-2 border-l-primary bg-accent-wash font-bold text-accent-deep"
                    : "text-ink-mid",
                )}
              >
                <LayoutGrid className="size-4 shrink-0" aria-hidden="true" />
                <span className={cn("min-w-0 flex-1 truncate", icons && "hidden")}>Work</span>
              </a>
            </SidebarMenuButton>
            {count !== null && !icons ? <SidebarMenuBadge>{count}</SidebarMenuBadge> : null}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function RailRowItem({
  row,
  here,
  icons,
}: {
  row: RailRow;
  /** The reader's own address. The row that opens it is the current row. */
  here: string;
  icons: boolean;
}) {
  const Icon = ICONS[row.key] ?? LayoutGrid;
  /*
   * The row the reader arrived on, matched by address. A section match would light more
   * than one row at once, because the two groups repeat three section names.
   */
  const current = row.href === here;

  if (!row.available) {
    const gone = absentLine(row.absent ?? []);
    /*
     * The reason is in a tooltip, per section 3.2's Nav item Disabled row, so the reader
     * sees the gap in place rather than discovering it on click. The absence is also
     * written on the row itself, so a reader who never opens the tooltip still reads it.
     */
    return (
      <SidebarMenuItem className="min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              role="link"
              aria-disabled="true"
              aria-label={`${row.label} is disabled. Absent: ${gone}`}
              tabIndex={0}
              href="#"
              onClick={(event) => event.preventDefault()}
              className={cn(
                ROW_FRAME,
                row.key === "program-plan" && "min-h-11",
                "flex cursor-not-allowed flex-col justify-center opacity-45",
                "group-data-[collapsible=icon]:flex-row group-data-[collapsible=icon]:items-center",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
                <span
                  className={cn(
                    "min-w-0 font-mono text-[13.5px] text-ink-mid",
                    icons && "hidden",
                  )}
                >
                  {row.label}
                </span>
              </span>
              <span
                className={cn(
                  "pl-6 font-mono text-[12px] leading-[1.35] text-ink-faint",
                  icons && "hidden",
                )}
              >
                {gone}
              </span>
            </a>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            style={{ zIndex: "var(--layer-panel)" }}
            className="max-w-[42ch] font-serif text-[14px] leading-[1.5]"
          >
            {row.label} is disabled. Absent: {gone}
          </TooltipContent>
        </Tooltip>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem className="min-w-0">
      <SidebarMenuButton
        asChild
        isActive={current}
        tooltip={row.count === "" ? row.label : `${row.label} · ${row.count}`}
        className={cn(ROW_FRAME, row.key === "program-plan" && "min-h-11")}
      >
        <a
          href={row.href}
          aria-current={current ? "page" : undefined}
          aria-label={
            row.count === ""
              ? `${row.label}, the ${row.account} account`
              : `${row.label}, the ${row.account} account · ${row.count}`
          }
          className={cn(
            "flex items-center",
            current
              ? "border-l-2 border-l-primary bg-accent-wash font-bold text-accent-deep"
              : "text-ink-mid",
          )}
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span className={cn("min-w-0 flex-1 truncate", icons && "hidden")}>{row.label}</span>
        </a>
      </SidebarMenuButton>
      {/*
        THE BADGE CARRIES THE COUNT'S FIRST WORD, AND THE ROW'S NAME CARRIES THE REST. The
        rail is fifteen and a half rem wide, and the sidebar's badge is absolutely
        positioned over the row. A full count such as `7 of 7 fields` covered the last two
        words of `Problem & Solution`, which is what the reviewed prototype's own note about
        a row-level chip records. The number is decoration, so it is `aria-hidden`, and the
        whole count travels in the row's accessible name and its tooltip.
      */}
      {row.count === "" || icons ? null : (
        <SidebarMenuBadge aria-hidden="true">{row.count.replace(/ .*$/, "")}</SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
}
