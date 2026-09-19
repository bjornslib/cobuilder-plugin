/**
 * The rail. It never scrolls the pane, and it never moves.
 *
 * Four rules decide what appears here.
 *
 *   Sections are gated. Build, Pull requests, and Shipped appear only when the work
 *   fills them, because an empty section teaches nothing and costs a click.
 *
 *   Levels are disabled, never gated. Intent, Problem & Solution, and Architecture
 *   always sit in the rail. When a level's record is absent the item reads disabled
 *   and names the record it could not find, because an absent record is a fact the
 *   reader needs in place.
 *
 *   The Rubrics item is a third case. It always renders, and it states that no gate
 *   record exists when the join is empty. A missing gate record must not read as a pass.
 *
 *   A record that only exists inside another one gets no item. Section 2.1 states the
 *   rule, and a slice is its case: a slice belongs to one epic and carries no meaning
 *   outside it, so the rail lists epics and each epic discloses its own slices in the
 *   scroll pane. There is no Slices item, and `build/slices` is not a route.
 */

import type { ReactNode } from "react";

import type { LucideIcon } from "lucide-react";
import {
  ChevronDown,
  ClipboardCheck,
  GitPullRequest,
  ListTree,
  Network,
  PackageCheck,
  Plane,
  Target,
  TriangleAlert,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import type { Gates, LevelState, SectionKey, WorkItem } from "./model";
import { SECTION_LABEL, routeHref } from "./model";

interface Item {
  key: string;
  label: string;
  section: SectionKey;
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
  /** True below 1200 px: the rail shows icons and puts the names in tooltips. */
  collapsed: boolean;
  open: Record<string, boolean>;
  onToggleGroup: (key: string) => void;
}

/** What each level item says when its record is absent, in one short line. */
function absentLine(missing: string[]): string {
  if (missing.length === 0) return "no record";
  return missing.join(", ");
}

export function Rail({
  work,
  gates,
  levels,
  section,
  collapsed,
  open,
  onToggleGroup,
}: RailProps) {
  const reduce = useReducedMotion();

  const levelItem = (key: SectionKey, label: string, icon: LucideIcon): Item => {
    const state = levels?.[key];
    const available = !work ? false : (state?.available ?? true);
    return {
      key,
      label,
      section: key,
      icon,
      available,
      absent: available ? undefined : (state?.missing ?? ["the index has not resolved"]),
    };
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
    <nav
      aria-label="Work sections"
      className={cn(
        "flex min-w-0 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface",
        collapsed ? "w-[56px] items-center py-3" : "w-[248px] py-3",
      )}
      style={{ zIndex: "var(--layer-fixed)" }}
    >
      {groups.map((group) => {
        const isOpen = open[group.key] ?? true;
        return (
          <div key={group.key} className={cn("mb-2 min-w-0", collapsed && "w-full")}>
            <button
              type="button"
              onClick={() => onToggleGroup(group.key)}
              aria-expanded={isOpen}
              title={collapsed ? group.label : undefined}
              className={cn(
                "flex min-h-8 w-full cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-left",
                "transition-colors duration-150 ease-house hover:bg-surface-2",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                collapsed && "justify-center px-0",
              )}
            >
              {collapsed ? null : (
                <>
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
                </>
              )}
            </button>

            {collapsed ? null : (
              <motion.div
                initial={false}
                animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { duration: 0.22, ease: [0.4, 0, 0.2, 1] }
                }
                className="overflow-hidden"
              >
                <ul className="m-0 flex min-w-0 list-none flex-col gap-0.5 p-0 pr-2 pl-2">
                  {group.items.map((item) => (
                    <li key={item.key}>
                      <RailItem item={item} work={work} section={section} />
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {collapsed
              ? group.items.map((item) => (
                  <RailIcon key={item.key} item={item} work={work} section={section} />
                ))
              : null}
          </div>
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
  );
}

function RailItem({
  item,
  work,
  section,
}: {
  item: Item;
  work: WorkItem | null;
  section: SectionKey;
}) {
  const current = work !== null && item.section === section;

  if (!item.available) {
    const reason = `Absent: ${absentLine(item.absent ?? [])}`;
    /*
     * The reason is in a tooltip, per section 3.2's Nav item Disabled row, so the
     * reader sees the gap in place rather than discovering it on click.
     */
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            role="link"
            aria-disabled="true"
            tabIndex={0}
            href="#"
            onClick={(event) => event.preventDefault()}
            className={cn(
              "flex min-h-9 min-w-0 cursor-not-allowed flex-col justify-center gap-0.5 rounded-md px-2.5 py-1.5",
              "opacity-45 outline-none",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            )}
          >
            <span className="flex items-center gap-2">
              <item.icon className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
              <span className="font-mono text-[13.5px] text-ink-mid">{item.label}</span>
            </span>
            <span className="pl-6 font-mono text-[12px] leading-[1.35] text-ink-faint">
              {absentLine(item.absent ?? [])}
            </span>
          </a>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          style={{ zIndex: "var(--layer-panel)" }}
          className="max-w-[42ch] font-serif text-[14px] leading-[1.5]"
        >
          {item.label} is disabled. {reason}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <a
      href={work ? routeHref(work.id, item.section, item.tail) : "#"}
      aria-current={current ? "page" : undefined}
      title={item.label}
      className={cn(
        "flex min-h-9 min-w-0 cursor-pointer items-start gap-2 rounded-md px-2.5 py-1.5",
        "transition-colors duration-150 ease-house hover:bg-surface-2 hover:text-foreground",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        current
          ? "border-l-2 border-l-primary bg-accent-wash pl-2 font-bold text-accent-deep"
          : "text-ink-mid",
      )}
    >
      <item.icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 font-mono text-[13px] leading-[1.3]">{item.label}</span>
      {item.meta ? (
        <span className="shrink-0 font-mono text-[12px] text-ink-faint tabular-nums">
          {item.meta}
        </span>
      ) : null}
    </a>
  );
}

function RailIcon({
  item,
  work,
  section,
}: {
  item: Item;
  work: WorkItem | null;
  section: SectionKey;
}) {
  const current = work !== null && item.section === section;
  const body: ReactNode = (
    <item.icon className="size-5" aria-hidden="true" />
  );
  if (!item.available) {
    return (
      <span
        title={`${item.label} is disabled. Absent: ${absentLine(item.absent ?? [])}`}
        aria-disabled="true"
        className="flex size-11 items-center justify-center opacity-45"
      >
        {body}
      </span>
    );
  }
  return (
    <a
      href={work ? routeHref(work.id, item.section, item.tail) : "#"}
      aria-current={current ? "page" : undefined}
      aria-label={item.label}
      title={item.label}
      className={cn(
        "flex size-11 cursor-pointer items-center justify-center rounded-lg",
        "transition-colors duration-150 ease-house hover:bg-surface-2",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        current ? "bg-accent-wash text-accent-deep" : "text-ink-mid",
      )}
    >
      {body}
    </a>
  );
}
