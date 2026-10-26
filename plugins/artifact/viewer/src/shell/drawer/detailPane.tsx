import type { DesignRecord, DesignRecords } from "@/data/bundle";
import { TrackerChips } from "@/components/work/TrackerChips";
import { StageBadge } from "@/components/work/StageBadge";
import type { DesignRow, EpicEntity } from "@/data/types";

import { routeHref } from "../model";
import { RecordMarks } from "./recordMarks";

type Design = DesignRow["design"];
type EpicState = (epic: EpicEntity) => { state: string; refined: boolean };

const ASIDE_CLASS =
  "flex h-full min-w-0 flex-col gap-4 overflow-y-auto border-l border-line bg-surface-2/40 px-5 py-4";
const LINK_CLASS =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-card px-2.5 py-1.5 font-mono text-[13px] font-bold text-accent-deep transition-colors duration-150 ease-house hover:bg-accent-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const CLOSE_CLASS =
  "shrink-0 cursor-pointer self-start rounded-md border border-line px-2.5 py-1.5 font-mono text-[12.5px] text-ink-dim transition-colors duration-150 ease-house hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 font-mono text-[12px] tracking-[0.08em] text-ink-faint uppercase">
      {children}
    </p>
  );
}

function PaneTitle({ design }: { design: Design }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-2">
      <h3 className="m-0 min-w-0 font-mono text-[18px] leading-tight font-bold tracking-[-0.02em] break-words">
        {design.name}
      </h3>
      <StageBadge stage={design.stage} className="shrink-0" />
    </div>
  );
}

function PaneHeader({ design }: { design: Design }) {
  return (
    <header className="flex min-w-0 flex-col gap-2.5">
      <PaneTitle design={design} />
      <p className="m-0 font-serif text-[15.5px] leading-[1.55] text-ink-mid">{design.outcome}</p>
    </header>
  );
}

function PrNumber({ pr }: { pr: number | null }) {
  if (pr === null) return null;
  return <span className="shrink-0 font-mono text-[12px] text-ink-faint">#{pr}</span>;
}

function EpicItem({ epic, state }: { epic: EpicEntity; state: string }) {
  return (
    <li className="flex min-w-0 items-center gap-2 rounded-md bg-surface-2 px-2.5 py-2">
      <span className="min-w-0 flex-1 truncate font-mono text-[13.5px]">{epic.epic_id}</span>
      <PrNumber pr={epic.pr} />
      <span className="shrink-0 font-mono text-[12px] text-ink-dim">{state}</span>
    </li>
  );
}

function NoEpics() {
  return (
    <p className="m-0 font-serif text-[14.5px] text-ink-dim italic">
      The plan holds no epic for this design.
    </p>
  );
}

function EpicList({ epics, epicState }: { epics: EpicEntity[]; epicState: EpicState }) {
  if (epics.length === 0) return <NoEpics />;
  return (
    <ul className="m-0 flex min-w-0 list-none flex-col gap-1 p-0">
      {epics.map((epic) => (
        <EpicItem key={epic.id} epic={epic} state={epicState(epic).state} />
      ))}
    </ul>
  );
}

function EpicsSection({ row, epicState }: { row: DesignRow; epicState: EpicState }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label>
        Epics · {row.done} of {row.epics.length} closed
      </Label>
      <EpicList epics={row.epics} epicState={epicState} />
    </div>
  );
}

function TrackerSection({ row }: { row: DesignRow }) {
  if (!row.trackerRead || row.trackerPullRequests.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label>Pull requests</Label>
      <div className="flex flex-wrap gap-1.5">
        <TrackerChips row={row} />
      </div>
    </div>
  );
}

function PaneFooter({ design, onLeave }: { design: Design; onLeave: () => void }) {
  return (
    <footer className="mt-auto min-w-0 border-t border-line-soft pt-3">
      <a href={routeHref(design.id, "intent")} aria-label={`Open work item: ${design.name}`} onClick={onLeave} className={LINK_CLASS}>
        Open work item
      </a>
    </footer>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} className={CLOSE_CLASS}>
      Close
    </button>
  );
}

interface DetailProps {
  row: DesignRow;
  records: DesignRecords | Record<string, DesignRecord> | null;
  epicState: EpicState;
  /** Leave the drawer entirely: the reader chose a route, not a pane. */
  onLeave: () => void;
  onClose: () => void;
}

/**
 * The detail pane, the arrangement prototype B reviewed. The record marks are
 * the shell's own `recordVerdicts` rule from `./readiness`, so this pane and
 * the Work board cannot disagree about one record. The epic states come from
 * `resolvedJoinsOf`, which the drawer resolves once and holds.
 */
export function DetailPane({ row, records, epicState, onLeave, onClose }: DetailProps) {
  return (
    <aside aria-label={`${row.design.name} in detail`} className={ASIDE_CLASS}>
      <PaneHeader design={row.design} />
      <RecordMarks record={records?.[row.design.id]} designId={row.design.id} />
      <EpicsSection row={row} epicState={epicState} />
      <TrackerSection row={row} />
      <PaneFooter design={row.design} onLeave={onLeave} />
      <CloseButton onClose={onClose} />
    </aside>
  );
}
