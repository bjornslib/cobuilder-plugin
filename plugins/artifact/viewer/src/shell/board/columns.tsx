import { cn } from "@/lib/utils";

import { ProgramCard } from "./programCard";
import type { BoardColumn } from "./shape";

const COLUMN_CLASS = "flex min-h-0 min-w-[176px] flex-1 basis-0 flex-col rounded-lg border border-line bg-surface-2";
const HEAD_CLASS = "flex h-10 shrink-0 items-center gap-1.5 overflow-clip rounded-t-lg border-b border-line bg-surface px-2.5";
const BADGE_CLASS = cn(
  "m-0 inline-flex shrink-0 items-center gap-1 rounded border border-line bg-surface-2 px-1.5 py-px",
  "font-mono text-[10px] font-normal tracking-[0.06em] text-ink-mid uppercase",
);
const RAIL_CLASS = cn(
  "flex w-11 shrink-0 cursor-pointer flex-col items-center gap-2 overflow-clip rounded-lg border border-line bg-surface-2 py-3 text-ink-dim",
  "transition-colors duration-150 ease-house hover:bg-accent-wash hover:text-accent-deep active:bg-tint",
  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
);
const RAIL_LABEL_CLASS = "rotate-180 font-mono text-[10.5px] tracking-[0.1em] whitespace-nowrap uppercase [writing-mode:vertical-rl]";

const STAGE_BADGE: Record<string, string> = {
  decision: "border-warn text-warn",
  build: "border-primary text-accent-deep",
  review: "border-tint bg-tint text-tint-ink",
  shipped: "border-good text-good",
  superseded: "border-dashed border-line text-ink-dim",
};

function HiddenColumnRail({ column, onShow }: { column: BoardColumn; onShow: (key: string) => void }) {
  const noun = column.count === 1 ? "program" : "programs";
  return (
    <button type="button" onClick={() => onShow(column.key)} aria-label={`Show ${column.label}, ${column.count} ${noun}`} className={RAIL_CLASS}>
      <span className={RAIL_LABEL_CLASS}>{column.label}</span>
      <span className="font-mono text-[13px] font-bold tabular-nums">{column.count}</span>
    </button>
  );
}

function CardList({ column }: { column: BoardColumn }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {column.cards.map(({ card }) => <ProgramCard key={card.program.design.id} card={card} />)}
    </ul>
  );
}

function ColumnBody({ column }: { column: BoardColumn }) {
  const empty = <p className="m-0 font-serif text-[12px] leading-[1.4] text-ink-dim">{column.emptyReason}</p>;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-2">
      {column.emptyReason === null ? <CardList column={column} /> : empty}
    </div>
  );
}

function ColumnHead({ column, id }: { column: BoardColumn; id: string }) {
  return (
    <div className={HEAD_CLASS}>
      <h3 id={`${id}-label`} className={cn(BADGE_CLASS, STAGE_BADGE[column.key])}>{column.label}</h3>
      <span id={`${id}-count`} className="font-mono text-[12px] font-bold text-ink tabular-nums">{column.count}</span>
    </div>
  );
}

function VisibleColumn({ column }: { column: BoardColumn }) {
  const id = `board-column-${column.key}`;
  return (
    <section aria-labelledby={`${id}-label ${id}-count`} className={COLUMN_CLASS}>
      <ColumnHead column={column} id={id} />
      <ColumnBody column={column} />
    </section>
  );
}

export function ColumnRow({ columns, onShow }: { columns: BoardColumn[]; onShow: (key: string) => void }) {
  const columnOf = (column: BoardColumn) =>
    column.hidden ? <HiddenColumnRail key={column.key} column={column} onShow={onShow} /> : <VisibleColumn key={column.key} column={column} />;
  return <div className="flex min-h-0 min-w-0 flex-1 gap-3 overflow-x-auto overflow-y-clip px-4 py-3">{columns.map(columnOf)}</div>;
}
