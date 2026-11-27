import { LayoutGrid } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import type { RailRow } from "../model";
import { ICONS, ROW_FRAME, absentLine, whoOf } from "./rowFrame";

interface RowProps {
  row: RailRow;
  /** The reader's own address. The row that opens it is the current row. */
  here: string;
  icons: boolean;
}

const ABSENT_FRAME = "flex cursor-not-allowed flex-col justify-center opacity-45";
const ABSENT_ICON_MODE =
  "group-data-[collapsible=icon]:flex-row group-data-[collapsible=icon]:items-center";
const TIP_STYLE = { zIndex: "var(--layer-panel)" };

function frameClass(row: RailRow): string {
  return cn(ROW_FRAME, row.key === "program-plan" && "min-h-11");
}

function absentClass(row: RailRow): string {
  return cn(frameClass(row), ABSENT_FRAME, ABSENT_ICON_MODE);
}

function AbsentTop({ row, icons }: Pick<RowProps, "row" | "icons">) {
  const Icon = ICONS[row.key] ?? LayoutGrid;
  return (
    <span className="flex w-full min-w-0 items-center gap-2">
      <Icon className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
      <span className={cn("min-w-0 flex-1 truncate font-mono text-[13.5px] text-ink-mid", icons && "hidden")}>
        {row.label}
      </span>
    </span>
  );
}

function AbsentReason({ gone, icons }: { gone: string; icons: boolean }) {
  return (
    <span
      className={cn(
        "min-w-0 pl-6 font-mono text-[12px] leading-[1.35] break-words text-ink-faint",
        icons && "hidden",
      )}
    >
      {gone}
    </span>
  );
}

function AbsentAnchor({ row, icons }: Pick<RowProps, "row" | "icons">) {
  const gone = absentLine(row.absent ?? []);
  const label = `${row.label}, the ${whoOf(row)} is disabled. Absent: ${gone}`;
  return (
    <TooltipTrigger asChild>
      <a role="link" aria-disabled="true" aria-label={label} tabIndex={0} href="#" onClick={(event) => event.preventDefault()} className={absentClass(row)}>
        <AbsentTop row={row} icons={icons} />
        <AbsentReason gone={gone} icons={icons} />
      </a>
    </TooltipTrigger>
  );
}

function AbsentTip({ row }: { row: RailRow }) {
  return (
    <TooltipContent side="right" style={TIP_STYLE} className="max-w-[42ch] font-serif text-[14px] leading-[1.5]">
      {row.label} is disabled. Absent: {absentLine(row.absent ?? [])}
    </TooltipContent>
  );
}

/*
 * The reason is in a tooltip, per section 3.2's Nav item Disabled row, so the
 * reader sees the gap in place. The absence is also written on the row, so a reader
 * who never opens the tooltip still reads it.
 */
function AbsentRow({ row, icons }: Pick<RowProps, "row" | "icons">) {
  return (
    <SidebarMenuItem className="min-w-0">
      <Tooltip>
        <AbsentAnchor row={row} icons={icons} />
        <AbsentTip row={row} />
      </Tooltip>
    </SidebarMenuItem>
  );
}

function RowCount({ count, icons }: { count: string; icons: boolean }) {
  if (count === "" || icons) return null;
  return (
    <span data-rail-count="" aria-hidden="true" className="flex-none text-xs font-medium tabular-nums text-ink-faint">
      {count.replace(/ .*$/, "")}
    </span>
  );
}

function RowBody({ row, icons }: Pick<RowProps, "row" | "icons">) {
  const Icon = ICONS[row.key] ?? LayoutGrid;
  return (
    <>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className={cn("min-w-0 flex-1 truncate", icons && "hidden")}>{row.label}</span>
      {/* The count is a flex-none sibling of the label, never positioned over it. */}
      <RowCount count={row.count} icons={icons} />
    </>
  );
}

function linkClass(current: boolean): string {
  return cn(
    "flex items-center",
    current ? "border-l-2 border-l-primary bg-accent-wash font-bold text-accent-deep" : "text-ink-mid",
  );
}

function AvailableRow({ row, here, icons, who }: RowProps & { who: string }) {
  const current = row.href === here;
  return (
    <SidebarMenuItem className="min-w-0">
      <SidebarMenuButton asChild isActive={current} tooltip={row.count === "" ? row.label : `${row.label} · ${row.count}`} className={frameClass(row)}>
        <a href={row.href} aria-current={current ? "page" : undefined} aria-label={row.count === "" ? `${row.label}, the ${who}` : `${row.label}, the ${who}, ${row.count}`} className={linkClass(current)}>
          <RowBody row={row} icons={icons} />
        </a>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/*
 * A section match would light more than one row at once, because the two groups
 * repeat three section names.
 */
export function RailRowItem({ row, here, icons }: RowProps) {
  if (!row.available) return <AbsentRow row={row} icons={icons} />;
  return <AvailableRow row={row} here={here} icons={icons} who={whoOf(row)} />;
}
