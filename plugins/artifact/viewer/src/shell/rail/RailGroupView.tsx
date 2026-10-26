import { ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import type { RailGroup } from "../model";
import { RailRowItem } from "./RailRowItem";

export interface RailView {
  here: string;
  icons: boolean;
  open: Record<string, boolean>;
  onToggleGroup: (key: string) => void;
  reduce: boolean | null;
}

interface GroupProps {
  group: RailGroup;
  view: RailView;
}

const TOGGLE_CLASS = cn(
  "min-h-8 w-full min-w-0 cursor-pointer gap-1.5 rounded-md px-3 py-1.5 text-left",
  "transition-colors duration-150 ease-house hover:bg-surface-2",
  "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring",
);

export function useRailView(open: RailView["open"], onToggleGroup: RailView["onToggleGroup"]): RailView {
  const reduce = useReducedMotion();
  const { state, isMobile } = useSidebar();
  /* Icon mode is the sidebar's own collapse, and never applies to the mobile drawer. */
  const icons = state === "collapsed" && !isMobile;
  /*
   * The reader's own address, which is the hash the shell writes. A row is current when
   * it opens this address. An empty hash is the bare route — the drawer — where no work
   * row is current.
   */
  return { here: window.location.hash, icons, open, onToggleGroup, reduce };
}

function GroupChevron({ isOpen }: { isOpen: boolean }) {
  const turned = cn(
    "size-3.5 shrink-0 text-ink-faint transition-transform duration-150 ease-house",
    !isOpen && "-rotate-90",
  );
  return <ChevronDown className={turned} aria-hidden="true" />;
}

function GroupName({ label }: { label: string }) {
  return (
    <span className="font-mono text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase">
      {label}
    </span>
  );
}

interface HeaderProps {
  group: RailGroup;
  isOpen: boolean;
  holdsCurrent: boolean;
  onToggle: () => void;
}

function GroupHeader({ group, isOpen, holdsCurrent, onToggle }: HeaderProps) {
  const pinned = holdsCurrent ? group.label : undefined;
  return (
    <SidebarGroupLabel asChild>
      <button type="button" onClick={onToggle} aria-expanded={isOpen} aria-label={pinned} title={pinned} className={TOGGLE_CLASS}>
        <GroupChevron isOpen={isOpen} />
        <GroupName label={group.label} />
      </button>
    </SidebarGroupLabel>
  );
}

function railMotion(shown: boolean, reduce: boolean | null) {
  return {
    initial: false,
    animate: { height: shown ? "auto" : 0, opacity: shown ? 1 : 0 },
    transition: reduce ? { duration: 0 } : { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const },
  };
}

function RowList({ group, view }: GroupProps) {
  return (
    <SidebarMenu className="min-w-0 gap-0.5">
      {group.rows.map((row) => (
        <RailRowItem key={row.key} row={row} here={view.here} icons={view.icons} />
      ))}
    </SidebarMenu>
  );
}

function GroupRows({ group, view, shown }: GroupProps & { shown: boolean }) {
  return (
    <SidebarGroupContent>
      <motion.div {...railMotion(shown, view.reduce)} className="overflow-hidden">
        <RowList group={group} view={view} />
      </motion.div>
    </SidebarGroupContent>
  );
}

/* A control that silently did nothing would read as broken. */
function toggleHandler(holdsCurrent: boolean, onToggleGroup: RailView["onToggleGroup"], key: string) {
  return () => {
    if (holdsCurrent) return;
    onToggleGroup(key);
  };
}

/*
 * THE READER'S OWN GROUP NEVER CLOSES. The rule is enforced twice on purpose:
 * the control refuses the press, and the open state ignores a fold the reader
 * set before they arrived here, so a deep link and a walked step obey it too.
 */
export function RailGroupView({ group, view }: GroupProps) {
  const holdsCurrent = group.rows.some((row) => row.href === view.here);
  const isOpen = holdsCurrent || (view.open[group.key] ?? true);
  const onToggle = toggleHandler(holdsCurrent, view.onToggleGroup, group.key);
  return (
    <SidebarGroup className="min-w-0 pb-0">
      {/* In icon mode the header would sit invisibly over the icons, so it goes. */}
      {view.icons ? null : <GroupHeader group={group} isOpen={isOpen} holdsCurrent={holdsCurrent} onToggle={onToggle} />}
      <GroupRows group={group} view={view} shown={view.icons || isOpen} />
    </SidebarGroup>
  );
}
