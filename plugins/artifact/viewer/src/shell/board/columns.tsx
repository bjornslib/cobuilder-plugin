import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { BoardAddress } from "./address";
import { EpicCard, SliceGroup } from "./epicCard";
import { ProgramCard } from "./programCard";
import type { BoardCard, BoardColumn } from "./shape";
import { SHAPE_GLYPH } from "./status";

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

const BADGE: Record<string, string> = {
  decision: "border-warn text-warn",
  build: "border-primary text-accent-deep",
  review: "border-tint bg-tint text-tint-ink",
  shipped: "border-good text-good",
  superseded: "border-dashed border-line text-ink-dim",
  planned: "text-ink-dim",
  in_progress: "text-warn",
  done: "text-good",
};
const RAIL_UNIT: Record<BoardAddress["level"], string> = { programs: "program", epics: "epic", orphans: "slice" };
const HIDE_CLASS = cn(
  "ml-auto inline-flex h-7 shrink-0 cursor-pointer items-center rounded border border-line bg-surface px-2 font-mono text-[10.5px] text-ink-mid",
  "hover:bg-surface-2 hover:text-foreground active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

interface ColumnProps {
  column: BoardColumn;
  address: BoardAddress;
  onToggle: (key: string) => void;
}

interface ColumnRowProps {
  columns: BoardColumn[];
  address: BoardAddress;
  onToggle: (key: string) => void;
  bare: boolean;
}

function railNoun(address: BoardAddress, count: number): string {
  const unit = address.level === "epics" && address.cards === "slices" ? "slice" : RAIL_UNIT[address.level];
  return count === 1 ? unit : `${unit}s`;
}

function HiddenColumnRail({ column, address, onToggle }: ColumnProps) {
  return (
    <button type="button" onClick={() => onToggle(column.key)} aria-label={`Show ${column.label}, ${column.count} ${railNoun(address, column.count)}`} className={RAIL_CLASS}>
      <span className={RAIL_LABEL_CLASS}>{column.label}</span>
      <span className="font-mono text-[13px] font-bold tabular-nums">{column.count}</span>
    </button>
  );
}

function HideButton({ label, disabled, onHide }: { label: string; disabled: boolean; onHide: () => void }) {
  return (
    <button type="button" onClick={onHide} disabled={disabled} aria-label={`Hide ${label}`} title={disabled ? "One column stays visible" : undefined} className={HIDE_CLASS}>
      Hide
    </button>
  );
}

function cardOf(card: BoardCard, address: BoardAddress) {
  if (card.kind === "program") return <ProgramCard key={card.card.program.design.id} card={card.card} q={address.q} />;
  if (card.kind === "epic") return <EpicCard key={card.card.epic.id} card={card.card} />;
  return <SliceGroup key={card.group.key} group={card.group} programId={address.program} />;
}

function ColumnBody({ column, address }: Omit<ColumnProps, "onToggle">) {
  const empty = <p className="m-0 font-serif text-[12px] leading-[1.4] text-ink-dim">{column.emptyReason}</p>;
  const cards = <ul className="m-0 flex list-none flex-col gap-2 p-0">{column.cards.map((card) => cardOf(card, address))}</ul>;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-2">
      {column.emptyReason === null ? cards : empty}
    </div>
  );
}

function ColumnHead({ column, id, children }: { column: BoardColumn; id: string; children: ReactNode }) {
  return (
    <div className={HEAD_CLASS}>
      <div className={cn(BADGE_CLASS, BADGE[column.key])}>
        {column.shape !== null && <span aria-hidden="true">{SHAPE_GLYPH[column.shape]}</span>}
        <h3 id={`${id}-label`}>{column.label}</h3>
      </div>
      <span id={`${id}-count`} className="font-mono text-[12px] font-bold text-ink tabular-nums">{column.count}</span>
      {children}
    </div>
  );
}

function VisibleColumn({ column, address, onToggle, lastVisible, bare }: ColumnProps & { lastVisible: boolean; bare: boolean }) {
  const id = `board-column-${column.key}`;
  return (
    <section aria-labelledby={`${id}-label ${id}-count`} className={COLUMN_CLASS}>
      <ColumnHead column={column} id={id}>
        <HideButton label={column.label} disabled={lastVisible} onHide={() => onToggle(column.key)} />
      </ColumnHead>
      {!bare && <ColumnBody column={column} address={address} />}
    </section>
  );
}

export function ColumnRow({ columns, bare, ...shared }: ColumnRowProps) {
  const lastVisible = columns.filter((column) => !column.hidden).length === 1;
  const columnOf = (column: BoardColumn) =>
    column.hidden ? (
      <HiddenColumnRail key={column.key} column={column} {...shared} />
    ) : (
      <VisibleColumn key={column.key} column={column} {...shared} lastVisible={lastVisible} bare={bare} />
    );
  return <div className="flex min-h-0 min-w-0 flex-1 gap-3 overflow-x-auto overflow-y-clip px-4 py-3">{columns.map(columnOf)}</div>;
}
