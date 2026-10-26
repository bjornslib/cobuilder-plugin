import { SidebarInset } from "@/components/ui/sidebar";

import { Rail } from "../Rail";
import { RecordSheet } from "../Sheet";
import { TopBar } from "../TopBar";
import { WorkDrawer } from "../WorkDrawer";
import { ProvidedFrame } from "./frame";
import { PANE_ID } from "./ids";
import { PaneContent } from "./PaneContent";
import { populatedBarProps } from "./topBarProps";
import type { ShellState } from "./useShellState";
import { viewOf, type ShellView } from "./view";

const PANE_CLASS = "min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain bg-ground outline-none";

function paneLabel(v: ShellView): string {
  if (v.board) return "Work board";
  const name = v.work?.design.name ?? (v.worklessPr === null ? "No work item" : `Pull request ${v.worklessPr.id}`);
  return `${name}, ${v.section}`;
}

/* The only scrolling region. Both axes belong to this pane. */
function PaneInset({ v }: { v: ShellView }) {
  return (
    <SidebarInset id={PANE_ID} ref={v.paneRef} tabIndex={-1} aria-label={paneLabel(v)} className={PANE_CLASS}>
      <PaneContent v={v} />
    </SidebarInset>
  );
}

/*
 * The body row. It is the sidebar's positioned ancestor, so the rail starts
 * under the top bar and the pane sits beside it.
 */
function ShellBody({ v }: { v: ShellView }) {
  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <Rail {...v.railSource} open={v.openGroups} onToggleGroup={v.onToggleGroup} />
      <PaneInset v={v} />
    </div>
  );
}

/*
 * THE WORK BOARD'S DRAWER, mounted once. The rows, the index, and the
 * records are the shell's own answers, and the drawer holds none of
 * them when it is closed.
 */
function ShellDrawer({ v }: { v: ShellView }) {
  const { load } = v;
  const index = load.state === "ready" ? load.index : null;
  const records = load.state === "ready" ? load.designs : null;
  return <WorkDrawer open={v.workDrawerOpen} onOpenChange={v.setWorkDrawerOpen} rows={v.boardRows} index={index} records={records} />;
}

export function PopulatedShell({ s }: { s: ShellState }) {
  const v = viewOf(s);
  return (
    <ProvidedFrame reduce={v.reduce} open={v.railOpen} onOpenChange={v.setRailOpen}>
      <TopBar {...populatedBarProps(v)} />
      <ShellBody v={v} />
      <RecordSheet subject={v.sheet} onOpenChange={v.closeSheet} />
      <ShellDrawer v={v} />
    </ProvidedFrame>
  );
}
