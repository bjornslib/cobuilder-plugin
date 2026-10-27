import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import { Chip, toneForStage } from "../atoms";
import { STATE_GLOSS } from "../gloss";
import type { SwitcherDesign, SwitcherEpic } from "../model";
import { FOCUS_RING } from "./buttons";
import type { TopBarProps } from "./props";

const ROW_CLASS = cn(
  "flex min-h-11 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left",
  "transition-colors duration-150 ease-house hover:bg-surface-2",
  FOCUS_RING,
);

const NAME_CLASS = "min-w-0 flex-1 truncate font-mono text-[13.5px]";

interface ListProps {
  bar: TopBarProps;
  needle: string;
  onPick: () => void;
}

function EmptyLine({ text }: { text: string }) {
  return <p className="m-0 px-2 py-2 font-mono text-[12.5px] text-ink-dim">{text}</p>;
}

function DesignCheck({ current }: { current: boolean }) {
  const mark = cn("size-4 shrink-0", current ? "text-accent-deep" : "text-transparent");
  return <Check className={mark} aria-hidden="true" />;
}

function DesignMeta({ design }: { design: SwitcherDesign }) {
  return (
    <>
      <span className="shrink-0 font-mono text-[12px] text-ink-faint">
        {design.epicCount} {design.epicCount === 1 ? "epic" : "epics"}
      </span>
      <Chip tone={toneForStage(design.stage)} title={STATE_GLOSS[design.stage]}>
        {design.stage}
      </Chip>
    </>
  );
}

interface DesignRowProps {
  design: SwitcherDesign;
  current: boolean;
  onChoose: () => void;
}

function DesignRow({ design, current, onChoose }: DesignRowProps) {
  return (
    <button type="button" aria-current={current ? "true" : undefined} onClick={onChoose} className={cn(ROW_CLASS, current && "bg-accent-wash")}>
      <DesignCheck current={current} />
      <span className={NAME_CLASS}>{design.id}</span>
      <DesignMeta design={design} />
    </button>
  );
}

function pickWork(bar: TopBarProps, id: string, onPick: () => void) {
  return () => {
    bar.onChooseWork(id);
    onPick();
  };
}

function DesignHeading() {
  return (
    <p className="m-0 px-2 pt-1 pb-1.5 font-mono text-[12px] tracking-[0.08em] text-ink-faint uppercase">
      Designs
    </p>
  );
}

export function DesignList({ bar, needle, onPick }: ListProps) {
  const shown = needle ? bar.designs.filter((d) => d.id.toLowerCase().includes(needle)) : bar.designs;
  return (
    <>
      <DesignHeading />
      {shown.length === 0 ? <EmptyLine text="The bundle holds no design with that id." /> : null}
      {shown.map((design) => (
        <DesignRow key={design.id} design={design} current={design.id === bar.workId} onChoose={pickWork(bar, design.id, onPick)} />
      ))}
    </>
  );
}

function EpicRow({ epic, onChoose }: { epic: SwitcherEpic; onChoose: () => void }) {
  return (
    <button type="button" onClick={onChoose} className={ROW_CLASS}>
      <span className="w-4 shrink-0" aria-hidden="true" />
      <span className={NAME_CLASS}>{epic.id}</span>
      <Chip>{epic.state}</Chip>
    </button>
  );
}

function pickEpic(bar: TopBarProps, epic: SwitcherEpic, onPick: () => void) {
  return () => {
    bar.onChooseEpic(epic.design, epic.epicId);
    onPick();
  };
}

function matchingEpics(epics: SwitcherEpic[], needle: string): SwitcherEpic[] {
  if (!needle) return epics.slice(0, 8);
  return epics.filter((e) => e.id.toLowerCase().includes(needle) || e.epicId.toLowerCase().includes(needle));
}

function EpicHeading({ needle }: { needle: string }) {
  return (
    <p className="m-0 mt-2 border-t border-line-soft px-2 pt-2.5 pb-1.5 font-mono text-[12px] tracking-[0.08em] text-ink-faint uppercase">
      Epics {needle ? "" : "(first 8)"}
    </p>
  );
}

export function EpicList({ bar, needle, onPick }: ListProps) {
  const shown = matchingEpics(bar.epics, needle);
  return (
    <>
      <EpicHeading needle={needle} />
      {shown.length === 0 ? <EmptyLine text="No epic matches. Clear the filter to see the whole list." /> : null}
      {shown.map((epic) => (
        <EpicRow key={epic.id} epic={epic} onChoose={pickEpic(bar, epic, onPick)} />
      ))}
    </>
  );
}
