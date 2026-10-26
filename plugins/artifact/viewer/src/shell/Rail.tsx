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
 * THREE GROUPS: LEVELS, ALSO, AND REVIEW. Levels holds the three levels of the work.
 * Also holds Plan, Epics, and Rubrics. Review holds the four rows of the pull request.
 *
 * THE CURRENT ROW IS THE ROW THE READER ARRIVED ON. A row is current when its address is
 * the reader's address, never when it merely names the reader's section. The two accounts
 * can repeat a section name, so a section match would light more
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
 * THE WORK BOARD IS NOT IN THE RAIL, and it is not a row of either account. ADR-0034
 * makes the board a drawer over the shell, and the top bar's Work icon is the one
 * control that opens it from any level, so the rail renders the two groups alone.
 *
 * An available row is a `SidebarMenuButton`, so it takes the sidebar's hover, focus, and
 * active treatment. A row whose record is absent is a plain anchor inside the same
 * `SidebarMenuItem`. The sidebar's own `aria-disabled` treatment sets
 * `pointer-events: none`, which would stop the tooltip that names the missing records from
 * ever opening, so the absent row owns its own frame.
 */

import { SidebarContent, Sidebar, SidebarRail as SidebarCollapseHandle } from "@/components/ui/sidebar";

import { railGroups, type RailRow, type RailSource } from "./model";
import { RailGroupView, useRailView, type RailView } from "./rail/RailGroupView";
import { absentLine } from "./rail/rowFrame";

export interface RailProps extends RailSource {
  open: Record<string, boolean>;
  onToggleGroup: (key: string) => void;
}

function absenceSentence(work: RailSource["work"], absent: RailRow[]): string {
  if (work === null) return "";
  if (absent.length === 0) return "All rows in this rail have a record.";
  const parts = absent.map((row) => `${row.label}: ${absentLine(row.absent ?? [])}`).join(". ");
  return `Absent for this work item: ${parts}.`;
}

/*
 * A reader who cannot see the rail still learns what the work lacks. The live
 * region speaks once, when the index settles and the rows resolve.
 */
function AbsenceNote({ work, absent }: { work: RailSource["work"]; absent: RailRow[] }) {
  return (
    <p aria-live="polite" className="m-0 px-4 font-mono text-[12px] text-ink-faint">
      <span className="sr-only">{absenceSentence(work, absent)}</span>
    </p>
  );
}

function RailNav({ source, view }: { source: RailProps; view: RailView }) {
  const groups = railGroups(source);
  const absent = groups.flatMap((group) => group.rows).filter((row) => !row.available);
  return (
    <nav aria-label="Work sections" className="min-w-0">
      {groups.map((group) => (
        <RailGroupView key={group.key} group={group} view={view} />
      ))}
      <AbsenceNote work={source.work} absent={absent} />
    </nav>
  );
}

export function Rail(props: RailProps) {
  const view = useRailView(props.open, props.onToggleGroup);
  return (
    <Sidebar collapsible="icon" className="absolute inset-y-0 left-0 h-full border-r border-line" style={{ zIndex: "var(--layer-fixed)" }}>
      <SidebarContent>
        <RailNav source={props} view={view} />
      </SidebarContent>
      {/* The sidebar's own collapse handle, on the rail's edge. */}
      <SidebarCollapseHandle />
    </Sidebar>
  );
}
