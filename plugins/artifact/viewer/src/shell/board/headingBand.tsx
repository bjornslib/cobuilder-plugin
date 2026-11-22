import { ArrowLeft } from "lucide-react";

import { useFocusOnMount } from "../hooks";
import { boardChangeHref } from "./address";
import type { BoardBuildTime, BoardCount, BoardCounts, BoardModel } from "./shape";

const BAND_CLASS = "flex min-h-14 min-w-0 shrink-0 items-center gap-3 bg-band px-4 py-1.5 text-band-ink";
const TITLE_CLASS = "m-0 shrink-0 font-mono text-[13px] font-bold tracking-[0.02em] uppercase outline-none";
const SUBJECT_CLASS = "m-0 min-w-0 truncate font-serif text-[15px] leading-tight text-band-ink outline-none";
const BACK_CLASS =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-1.5 font-mono text-[12.5px] font-bold text-band-ink hover:underline active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const BUILD_TIME_CLASS = "m-0 font-mono text-[11px] text-band-ink";

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
    <dl aria-label="Shown counts" className="m-0 flex shrink-0 items-baseline gap-5">
      {pairs.map(({ key, label }) => <CountPair key={key} label={label} pair={counts?.[key]} />)}
    </dl>
  );
}

function BuildTime({ builtAt }: { builtAt: BoardBuildTime | null }) {
  if (builtAt === null) return <p className={BUILD_TIME_CLASS}>No build time in this index</p>;
  return (
    <p className={BUILD_TIME_CLASS}>
      Index built <time dateTime={builtAt.iso}>{builtAt.label}</time>
    </p>
  );
}

function BandFacts({ model }: { model: BoardModel | null }) {
  return (
    <div className="ml-auto flex shrink-0 flex-col items-end gap-0.5">
      <CountsBlock counts={model?.counts ?? null} />
      {model !== null && <BuildTime builtAt={model.builtAt} />}
    </div>
  );
}

function BackLink({ q }: { q: string }) {
  return (
    <a href={boardChangeHref("programs", null, q)} className={BACK_CLASS}>
      <ArrowLeft aria-hidden="true" className="size-3.5" />
      All programs
    </a>
  );
}

function BandHeadings({ subject }: { subject: string | null }) {
  const focusRef = useFocusOnMount<HTMLHeadingElement>();
  return (
    <>
      <h1 ref={subject === null ? focusRef : undefined} tabIndex={-1} className={TITLE_CLASS}>Kanban board</h1>
      {subject !== null && <span aria-hidden="true" className="h-4 w-px shrink-0 bg-band-ink/40" />}
      {subject !== null && <h2 ref={focusRef} tabIndex={-1} className={SUBJECT_CLASS}>{subject}</h2>}
    </>
  );
}

export function BoardHeadingBand({ model }: { model: BoardModel | null }) {
  const subject = model?.subject ?? null;
  return (
    <div className={BAND_CLASS}>
      {model !== null && subject !== null && <BackLink q={model.address.q} />}
      <BandHeadings subject={subject} />
      <BandFacts model={model} />
    </div>
  );
}
