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
 * the order that function returns them. Every gate, disabled row, count, and address
 * comes from there too, and `model.ts` states the rules. This file decides appearance
 * alone: the frame, the icons, the current row, the collapse, and the tooltip. The
 * arrow-key traversal steps the same list, so the two cannot drift.
 *
 * THE CURRENT ROW IS THE ROW THE READER ARRIVED ON. A row is current when its address
 * is the reader's address, never when it merely names the reader's section. Two entries
 * share the Build section, and two more share Pull requests, so a section match would
 * light two rows at once.
 *
 * An available entry is a `SidebarMenuButton`, so it takes the sidebar's hover, focus,
 * and active treatment. A disabled entry is a plain anchor inside the same
 * `SidebarMenuItem`. The sidebar's own `aria-disabled` treatment sets
 * `pointer-events: none`, which would stop the tooltip that names the missing
 * records from ever opening, so the disabled row owns its own frame.
 */

import { ChevronDown, ClipboardCheck, GitPullRequest, LayoutGrid, ListTree, Network, PackageCheck, Plane, Target, TriangleAlert } from "lucide-react";
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

import type { RailEntry, RailSource } from "./model";
import { boardHref, railGroups } from "./model";

/*
 * One icon per entry key.
 *
 * The icon is decoration, so it lives here rather than in `model.ts`: that file is the
 * data layer and it imports no React. The map is keyed on the entry key, so it carries
 * no order and no gate of its own.
 */
const ICONS: Record<string, LucideIcon> = {
  work: LayoutGrid,
  intent: Target,
  "problem-and-solution": TriangleAlert,
  architecture: Network,
  epics: ListTree,
  rubrics: ClipboardCheck,
  "this-work": GitPullRequest,
  flightdeck: Plane,
  shipped: PackageCheck,
};

export interface RailProps extends RailSource {
  open: Record<string, boolean>;
  onToggleGroup: (key: string) => void;
}

/** What an entry says when its record is absent, in one short line. */
function absentLine(missing: string[]): string {
  if (missing.length === 0) return "no record";
  return missing.join(", ");
}

/**
 * The frame every rail row shares. An available row adds the sidebar's menu treatment
 * on top of it, and a disabled row keeps this frame alone.
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

export function Rail({ work, gates, levels, board, workCount, open, onToggleGroup }: RailProps) {
  const reduce = useReducedMotion();
  const { state, isMobile } = useSidebar();
  /* Icon mode is the sidebar's own collapse, and never applies to the mobile drawer. */
  const icons = state === "collapsed" && !isMobile;

  /* The one list, built by the one function. This file holds no second copy of it. */
  const groups = railGroups({ work, gates, levels, board, workCount });

  /*
   * The reader's own address, which is the hash the shell writes. A row is current when
   * it opens this address. An empty hash is the bare route, which is the board.
   */
  const here = window.location.hash || boardHref();

  const gatedOff: string[] = [];
  if (work && gates) {
    if (!gates.build) gatedOff.push("Build, because the work carries no epics");
    if (!gates.pullRequests) {
      gatedOff.push(
        "Pull requests, because no epic of this work carries one. A pull request a decision reaches is not this work's pull request",
      );
    }
    if (!gates.shipped) {
      gatedOff.push(
        "Shipped, because the stage is not implemented and no publication exists for a pull request this work's own epics carry",
      );
    }
  }

  return (
    <Sidebar
      collapsible="icon"
      className="absolute inset-y-0 left-0 h-full border-r border-line"
      style={{ zIndex: "var(--layer-fixed)" }}
    >
      <SidebarContent>
        <nav aria-label="Work sections" className="min-w-0">
          {groups.map((group) => {
            /*
             * The board's own group carries no label and no handle, so it can never be
             * folded away. Every other group is foldable, and the reader's choice is
             * remembered by its key.
             */
            if (group.label === null) {
              return (
                <SidebarGroup key={group.key} className="min-w-0 pb-0">
                  <SidebarGroupContent>
                    <SidebarMenu className="min-w-0 gap-0.5">
                      {group.entries.map((entry) => (
                        <RailItem key={entry.key} entry={entry} here={here} icons={icons} />
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            }

            const isOpen = open[group.key] ?? true;
            const shown = icons || isOpen;
            return (
              <SidebarGroup key={group.key} className="min-w-0 pb-0">
                {/* In icon mode the header would sit invisibly over the icons, so it goes. */}
                {icons ? null : (
                  <SidebarGroupLabel asChild>
                    <button
                      type="button"
                      onClick={() => onToggleGroup(group.key)}
                      aria-expanded={isOpen}
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
                    <SidebarMenu className="min-w-0 gap-0.5">
                      {group.entries.map((entry) => (
                        <RailItem key={entry.key} entry={entry} here={here} icons={icons} />
                      ))}
                    </SidebarMenu>
                  </motion.div>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}

          {/*
            A reader who cannot see the rail still learns what the work lacks. The live
            region speaks once, when the index settles and the gates resolve.
          */}
          <p aria-live="polite" className="m-0 px-4 font-mono text-[12px] text-ink-faint">
            <span className="sr-only">
              {work && gates
                ? gatedOff.length === 0
                  ? "Every section is present for this work item."
                  : `Absent for this work item: ${gatedOff.join(". ")}.`
                : ""}
            </span>
          </p>
        </nav>
      </SidebarContent>

      {/* The sidebar's own collapse handle, on the rail's edge. */}
      <SidebarCollapseHandle />
    </Sidebar>
  );
}

function RailItem({
  entry,
  here,
  icons,
}: {
  entry: RailEntry;
  /** The reader's own address. The row that opens it is the current row. */
  here: string;
  icons: boolean;
}) {
  const Icon = ICONS[entry.key];
  /*
   * The row the reader arrived on, matched by address. A section match would light two
   * rows at once, because Epics and Rubrics share the Build section and the two Pull
   * request rows share theirs.
   */
  const current = entry.href === here;

  if (!entry.available) {
    const absent = absentLine(entry.absent ?? []);
    /*
     * The reason is in a tooltip, per section 3.2's Nav item Disabled row, so the
     * reader sees the gap in place rather than discovering it on click. The absence
     * is also written on the row itself, so a reader who never opens the tooltip
     * still reads it.
     */
    return (
      <SidebarMenuItem className="min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              role="link"
              aria-disabled="true"
              aria-label={`${entry.label} is disabled. Absent: ${absent}`}
              tabIndex={0}
              href="#"
              onClick={(event) => event.preventDefault()}
              className={cn(
                ROW_FRAME,
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
                  {entry.label}
                </span>
              </span>
              <span
                className={cn(
                  "pl-6 font-mono text-[12px] leading-[1.35] text-ink-faint",
                  icons && "hidden",
                )}
              >
                {absent}
              </span>
            </a>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            style={{ zIndex: "var(--layer-panel)" }}
            className="max-w-[42ch] font-serif text-[14px] leading-[1.5]"
          >
            {entry.label} is disabled. Absent: {absent}
          </TooltipContent>
        </Tooltip>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem className="min-w-0">
      <SidebarMenuButton asChild isActive={current} tooltip={entry.label} className={ROW_FRAME}>
        <a
          href={entry.href}
          aria-current={current ? "page" : undefined}
          aria-label={entry.label}
          className={cn(
            "flex items-center",
            current
              ? "border-l-2 border-l-primary bg-accent-wash font-bold text-accent-deep"
              : "text-ink-mid",
          )}
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span className={cn("min-w-0 flex-1 truncate", icons && "hidden")}>{entry.label}</span>
        </a>
      </SidebarMenuButton>
      {entry.meta && !icons ? <SidebarMenuBadge>{entry.meta}</SidebarMenuBadge> : null}
    </SidebarMenuItem>
  );
}
