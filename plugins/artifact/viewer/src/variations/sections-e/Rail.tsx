/**
 * The rail, as a shadcn sidebar. It never scrolls the pane, and it never moves.
 *
 * The rail is a `Sidebar` inside the shell's `SidebarProvider`, so three things come
 * from the sidebar rather than from this file. Below 768 px the rail is a drawer
 * behind one control in the top bar. Between 768 px and 1200 px it collapses to
 * icons, and the reader may also collapse it at any width. `Cmd` or `Ctrl` plus `B`
 * toggles it. The rail keeps its own scroll, per section 11.3.
 *
 * The rail's first entry is the Work board, and it is not a section. It opens the bare
 * route, it is current when the route names no work item, and it always renders, because
 * it is the way back from every level.
 *
 * ON THE BOARD THE RAIL HOLDS THAT ONE ENTRY. Every other row needs a work item, so the
 * board drops the groups whole rather than disable three levels that have nothing to
 * name. Four rules decide what appears below the board entry, once a work item is chosen.
 *
 *   Sections are gated. Build, Pull requests, and Shipped appear only when the work
 *   fills them, because an empty section teaches nothing and costs a click.
 *
 *   Levels are disabled, never gated. Intent, Problem & Solution, and Architecture
 *   always sit in the rail. When a level's record is absent the item reads disabled
 *   and names the record it could not find, because an absent record is a fact the
 *   reader needs in place. The tooltip says which records are absent, and it is not
 *   shortened.
 *
 *   The Rubrics item is a third case. It always renders, and it states that no gate
 *   record exists when the join is empty. A missing gate record must not read as a pass.
 *
 *   A record that only exists inside another one gets no item. Section 2.1 states the
 *   rule, and a slice is its case: a slice belongs to one epic and carries no meaning
 *   outside it, so the rail lists epics and each epic discloses its own slices in the
 *   scroll pane. There is no Slices item, and `build/slices` is not a route.
 *
 * An available item is a `SidebarMenuButton`, so it takes the sidebar's hover, focus,
 * and active treatment. A disabled item is a plain anchor inside the same
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

import type { Gates, LevelState, SectionKey, WorkItem } from "./model";
import { SECTION_LABEL, boardHref, routeHref } from "./model";

interface Item {
  key: string;
  label: string;
  /** The section this item opens. Absent on the board entry, which opens no section. */
  section?: SectionKey;
  /** True on the board entry. It is current when the route names no work item. */
  board?: boolean;
  tail?: string;
  icon: LucideIcon;
  /** False turns the item disabled and fills `absent`. */
  available: boolean;
  /** The records the item could not read. Rendered under a disabled label. */
  absent?: string[];
  /** A short count or state shown at the item's right edge. */
  meta?: string;
}

interface Group {
  key: string;
  label: string;
  items: Item[];
}

export interface RailProps {
  work: WorkItem | null;
  gates: Gates | null;
  levels: Record<string, LevelState> | null;
  section: SectionKey;
  /** True while the route names no work item, which is the board. */
  board: boolean;
  /** How many work items the board lists, or null while the index is in flight. */
  workCount: number | null;
  open: Record<string, boolean>;
  onToggleGroup: (key: string) => void;
}

/** What each level item says when its record is absent, in one short line. */
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

export function Rail({ work, gates, levels, section, board, workCount, open, onToggleGroup }: RailProps) {
  const reduce = useReducedMotion();
  const { state, isMobile } = useSidebar();
  /* Icon mode is the sidebar's own collapse, and never applies to the mobile drawer. */
  const icons = state === "collapsed" && !isMobile;

  const levelItem = (key: SectionKey, label: string, icon: LucideIcon): Item => {
    const level = levels?.[key];
    const available = !work ? false : (level?.available ?? true);
    return {
      key,
      label,
      section: key,
      icon,
      available,
      /*
       * A route whose id the bundle lacks resolves no work item, so no level can fill. That
       * is not a missing record, and the row says so rather than naming a file nobody
       * asked for.
       */
      absent: available ? undefined : (level?.missing ?? ["no work item is selected"]),
    };
  };

  /*
   * The board, above every group and above the work item's own levels.
   *
   * It is the top entry because it is the way back: a reader who is three levels deep
   * needs one press to reach the list again, and it must not sit at the bottom of a
   * section they have to scroll to find. It carries no group and no collapse handle of
   * its own, so it can never be folded away.
   */
  const boardItem: Item = {
    key: "work",
    label: "Work",
    board: true,
    icon: LayoutGrid,
    available: true,
    meta: workCount === null ? undefined : `${workCount}`,
  };

  const groups: Group[] = [
    {
      key: "the-work",
      label: "The work",
      items: [
        levelItem("intent", SECTION_LABEL.intent, Target),
        levelItem("problem-and-solution", SECTION_LABEL["problem-and-solution"], TriangleAlert),
        levelItem("architecture", SECTION_LABEL.architecture, Network),
      ],
    },
  ];

  if (gates?.build) {
    groups.push({
      key: "build",
      label: "Build",
      items: [
        {
          key: "epics",
          label: "Epics",
          section: "build",
          tail: "epics",
          icon: ListTree,
          available: true,
          /* The epics each disclose their own slices, so the count sits on the item. */
          meta: `${work?.epics.length ?? 0}`,
        },
        {
          key: "rubrics",
          label: "Rubrics",
          section: "build",
          tail: "rubrics",
          icon: ClipboardCheck,
          available: true,
          /* The count is 0 for both work items today, and the item says so. */
          meta: gates.rubrics ? `${gates.gateSteps?.length ?? 0}` : "none",
        },
      ],
    });
  }

  if (gates?.pullRequests) {
    groups.push({
      key: "pull-requests",
      label: "Pull requests",
      items: [
        {
          key: "this-work",
          label: "This work's pull requests",
          section: "pull-requests",
          icon: GitPullRequest,
          available: true,
          meta: `${work?.pullRequests.length ?? 0}`,
        },
        {
          key: "flightdeck",
          label: "FlightDeck",
          section: "pull-requests",
          tail: "flightdeck",
          icon: Plane,
          available: true,
          meta: "open set",
        },
      ],
    });
  }

  if (gates?.shipped) {
    groups.push({
      key: "shipped",
      label: "Shipped",
      items: [
        {
          key: "shipped",
          label: "Release status",
          section: "shipped",
          icon: PackageCheck,
          available: true,
        },
      ],
    });
  }

  /*
   * THE BOARD SHOWS THE WORK ENTRY ALONE. A level needs a work item, so on the board the
   * three level rows would read as absent records when the true state is that nothing is
   * selected. Three inert rows above a board that lists every item are noise, so they go
   * whole. They return with the first work item, and the groups below keep their gates.
   */
  const shownGroups = board ? [] : groups;

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
          <SidebarGroup className="min-w-0 pb-0">
            <SidebarGroupContent>
              <SidebarMenu className="min-w-0 gap-0.5">
                <RailItem
                  item={boardItem}
                  board={board}
                  work={work}
                  section={section}
                  icons={icons}
                />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {shownGroups.map((group) => {
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
                      {group.items.map((item) => (
                        <RailItem
                          key={item.key}
                          item={item}
                          board={board}
                          work={work}
                          section={section}
                          icons={icons}
                        />
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
  item,
  board,
  work,
  section,
  icons,
}: {
  item: Item;
  board: boolean;
  work: WorkItem | null;
  section: SectionKey;
  icons: boolean;
}) {
  const current = item.board ? board : work !== null && item.section === section;
  const href = item.board
    ? boardHref()
    : work && item.section
      ? routeHref(work.id, item.section, item.tail)
      : "#";

  if (!item.available) {
    const absent = absentLine(item.absent ?? []);
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
              aria-label={`${item.label} is disabled. Absent: ${absent}`}
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
                <item.icon className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
                <span
                  className={cn(
                    "min-w-0 font-mono text-[13.5px] text-ink-mid",
                    icons && "hidden",
                  )}
                >
                  {item.label}
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
            {item.label} is disabled. Absent: {absent}
          </TooltipContent>
        </Tooltip>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem className="min-w-0">
      <SidebarMenuButton asChild isActive={current} tooltip={item.label} className={ROW_FRAME}>
        <a
          href={href}
          aria-current={current ? "page" : undefined}
          aria-label={item.label}
          className={cn(
            "flex items-center",
            current
              ? "border-l-2 border-l-primary bg-accent-wash font-bold text-accent-deep"
              : "text-ink-mid",
          )}
        >
          <item.icon className="size-4 shrink-0" aria-hidden="true" />
          <span className={cn("min-w-0 flex-1 truncate", icons && "hidden")}>{item.label}</span>
        </a>
      </SidebarMenuButton>
      {item.meta && !icons ? <SidebarMenuBadge>{item.meta}</SidebarMenuBadge> : null}
    </SidebarMenuItem>
  );
}
