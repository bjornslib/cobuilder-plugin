import type { ReactElement } from "react";

import { LANES } from "../workDeck";
import { hideToggled } from "./address";
import { ColumnRow } from "./columns";
import { CommandRow } from "./commandRow";
import { BoardHeadingBand } from "./headingBand";
import type { BoardModel } from "./shape";
import { useBoardAddress } from "./useBoardAddress";

export interface KanbanPageProps {
  /** Null while the index loads. */
  model: BoardModel | null;
  go: (href: string) => void;
}

const SKELETON_COLUMN = "flex min-w-[176px] flex-1 basis-0 flex-col gap-2 rounded-lg border border-line bg-surface-2 p-2";
const SKELETON_CARD = "h-20 animate-pulse rounded-lg bg-surface-3 motion-reduce:animate-none";

function SkeletonColumn() {
  return (
    <div className={SKELETON_COLUMN}>
      <div className={SKELETON_CARD} />
      <div className={SKELETON_CARD} />
    </div>
  );
}

function LoadingColumns() {
  return (
    <div aria-busy="true" className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <p role="status" className="sr-only">Loading the record index</p>
      <div className="flex min-h-0 min-w-0 flex-1 gap-3 overflow-x-auto px-4 py-3">
        {LANES.map((lane) => <SkeletonColumn key={lane.key} />)}
      </div>
    </div>
  );
}

function BoardRegion({ model, go }: { model: BoardModel; go: (href: string) => void }) {
  const { write } = useBoardAddress(go);
  return (
    <>
      <CommandRow address={model.address} write={write} />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <ColumnRow columns={model.columns} address={model.address} onShow={(key) => write(hideToggled(model.address, key))} />
        {model.unjoinedNote !== null && <p className="m-0 shrink-0 px-4 pb-3 font-serif text-[12px] text-ink-dim">{model.unjoinedNote}</p>}
      </div>
    </>
  );
}

export function KanbanPage({ model, go }: KanbanPageProps): ReactElement {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-ground">
      <BoardHeadingBand key={model?.level ?? "programs"} model={model} />
      {model === null ? <LoadingColumns /> : <BoardRegion model={model} go={go} />}
    </div>
  );
}
