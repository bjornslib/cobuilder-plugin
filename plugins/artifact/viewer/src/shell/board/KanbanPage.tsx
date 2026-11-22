import type { ReactElement } from "react";

import { columnKeysOf, hideToggled, type BoardLevel } from "./address";
import { ColumnRow } from "./columns";
import { CommandRow, LoadingCommandRow } from "./commandRow";
import { BoardHeadingBand } from "./headingBand";
import { InPlaceCardScope } from "./inPlaceCard";
import { noMatchSentenceOf } from "./model";
import { NoProgramCard } from "./noProgramCard";
import type { BoardModel } from "./shape";
import { useBoardAddress, type BoardAddressWrites } from "./useBoardAddress";

export interface KanbanPageProps {
  /** Null while the index loads. */
  model: BoardModel | null;
  level: BoardLevel;
  go: (href: string) => void;
}

const SKELETON_COLUMN = "flex min-w-[176px] flex-1 basis-0 flex-col gap-2 rounded-lg border border-line bg-surface-2 p-2";
const SKELETON_CARD = "h-20 animate-pulse rounded-lg bg-surface-3 motion-reduce:animate-none";
const NO_MATCH_CLASS = "absolute inset-x-4 top-[52px] bottom-3 flex flex-col items-center justify-center gap-2 px-6 py-10 text-center";
const CLEAR_CLASS =
  "inline-flex h-8 cursor-pointer items-center rounded-md border border-line bg-surface px-3 font-mono text-[12.5px] font-bold text-ink-mid hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function SkeletonColumn() {
  return (
    <div className={SKELETON_COLUMN}>
      <div className={SKELETON_CARD} />
      <div className={SKELETON_CARD} />
    </div>
  );
}

function LoadingColumns({ level }: { level: BoardLevel }) {
  return (
    <div aria-busy="true" className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <p role="status" className="sr-only">Loading the record index</p>
      <div className="flex min-h-0 min-w-0 flex-1 gap-3 overflow-x-auto px-4 py-3">
        {columnKeysOf(level).map((key) => <SkeletonColumn key={key} />)}
      </div>
    </div>
  );
}

function BoardNoMatch({ sentence, onClear }: { sentence: string; onClear: () => void }) {
  return (
    <div className={NO_MATCH_CLASS}>
      <p className="m-0 max-w-[52ch] font-serif text-[15px] text-ink-mid">{sentence}</p>
      <button type="button" onClick={onClear} className={CLEAR_CLASS}>Clear the search</button>
    </div>
  );
}

function BoardColumns({ model, writes }: { model: BoardModel; writes: BoardAddressWrites }) {
  const sentence = noMatchSentenceOf(model);
  return (
    <InPlaceCardScope q={model.address.q}>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <ColumnRow columns={model.columns} address={model.address} onToggle={(key) => writes.write(hideToggled(model.address, key))} bare={sentence !== null} />
        {sentence !== null && <BoardNoMatch sentence={sentence} onClear={() => writes.replace({ ...model.address, q: "" })} />}
      </div>
    </InPlaceCardScope>
  );
}

function BoardBody({ model, writes }: { model: BoardModel; writes: BoardAddressWrites }) {
  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <BoardColumns model={model} writes={writes} />
      {model.unjoinedNote !== null && <p className="m-0 shrink-0 px-4 pb-3 font-serif text-[12px] text-ink-dim">{model.unjoinedNote}</p>}
    </div>
  );
}

function BoardRegion({ model, go }: { model: BoardModel; go: (href: string) => void }) {
  const writes = useBoardAddress(go);
  return (
    <>
      <CommandRow address={model.address} write={writes.write} replace={writes.replace} />
      {model.noProgram !== null && <NoProgramCard card={model.noProgram} />}
      <BoardBody model={model} writes={writes} />
    </>
  );
}

export function KanbanPage({ model, level, go }: KanbanPageProps): ReactElement {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-ground">
      <BoardHeadingBand key={model?.level ?? "programs"} model={model} />
      {model === null && <LoadingCommandRow />}
      {model === null ? <LoadingColumns level={level} /> : <BoardRegion model={model} go={go} />}
    </div>
  );
}
