import { useFocusOnMount } from "../hooks";
import type { BoardCount, BoardCounts } from "./shape";

const BAND_CLASS = "flex min-h-14 min-w-0 shrink-0 items-center gap-3 bg-band px-4 py-1.5 text-band-ink";
const TITLE_CLASS = "m-0 shrink-0 font-mono text-[13px] font-bold tracking-[0.02em] uppercase outline-none";

const PAIRS = [
  { key: "programs", label: "Programs" },
  { key: "epics", label: "Epics" },
  { key: "slices", label: "Slices" },
] as const;

function CountPair({ label, pair }: { label: string; pair: BoardCount | undefined }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="font-mono text-[10px] tracking-[0.12em] uppercase">{label}</dt>
      <dd className="m-0 font-mono text-[13px] font-semibold tabular-nums">{pair ? `${pair.shown} of ${pair.total}` : "—"}</dd>
    </div>
  );
}

function CountsBlock({ counts }: { counts: BoardCounts | null }) {
  const pairs = counts === null ? PAIRS : PAIRS.filter(({ key }) => counts[key] !== undefined);
  return (
    <dl aria-label="Shown counts" className="m-0 ml-auto flex shrink-0 items-baseline gap-5">
      {pairs.map(({ key, label }) => <CountPair key={key} label={label} pair={counts?.[key]} />)}
    </dl>
  );
}

export function BoardHeadingBand({ counts }: { counts: BoardCounts | null }) {
  const titleRef = useFocusOnMount<HTMLHeadingElement>();
  return (
    <div className={BAND_CLASS}>
      <h1 ref={titleRef} tabIndex={-1} className={TITLE_CLASS}>
        Kanban board
      </h1>
      <CountsBlock counts={counts} />
    </div>
  );
}
