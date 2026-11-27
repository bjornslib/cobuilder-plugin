import { ShieldQuestion } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { GateStep } from "@/data/types";
import { cn } from "@/lib/utils";

import { AbsentLine, Chip, TONE_MARK, TONE_PILL, type Tone } from "../atoms";
import { splitGateState } from "../gateState";

const GATE_PILL_CLASS =
  "inline-flex min-h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[12.5px] font-bold";

function gatePill(short: string, tone: Tone) {
  const Mark = TONE_MARK[tone];
  return (
    <span tabIndex={0} className={cn(GATE_PILL_CLASS, TONE_PILL[tone])}>
      <Mark className="size-3.5 shrink-0" aria-hidden="true" />
      {short}
    </span>
  );
}

/**
 * A gate state, as a short pill with the status word and the date only.
 *
 * The full state text sits in a tooltip that opens on hover and on keyboard focus. The
 * pill does not wrap, so a long note never squeezes the gate name beside it.
 */
function GateStatePill({ state, tone }: { state: string; tone: Tone }) {
  const { short, full } = splitGateState(state);
  return (
    <Tooltip>
      <TooltipTrigger asChild>{gatePill(short, tone)}</TooltipTrigger>
      <TooltipContent className="max-w-[42ch]">{full}</TooltipContent>
    </Tooltip>
  );
}

const GATE_ROW_CLASS =
  "flex min-w-0 items-center gap-3 rounded-lg border border-line-soft bg-surface-2/50 px-3 py-2";

function GateStepRow({ step }: { step: GateStep }) {
  return (
    <li className={GATE_ROW_CLASS}>
      <Chip>{step.n}</Chip>
      <span className="min-w-0 flex-1 font-serif text-[16px]">{step.name}</span>
      <GateStatePill state={step.state} tone={step.state === "approved" ? "good" : "neutral"} />
    </li>
  );
}

export function GateSteps({ steps }: { steps: GateStep[] }) {
  return (
    <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">
      {steps.map((step) => (
        <GateStepRow key={step.n} step={step} />
      ))}
    </ul>
  );
}

const NO_GATE_HEAD_CLASS =
  "m-0 flex items-center gap-2 font-mono text-[12px] font-bold tracking-[0.06em] text-warn uppercase";

const NO_GATE_TEXT =
  "This work has no gate record, so this section has nothing to read. That is an absent record, not a passed gate. It must not read as a pass.";

function NoGateNotice() {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-dashed border-warn bg-warn-wash px-3.5 py-3">
      <p className={NO_GATE_HEAD_CLASS}>
        <ShieldQuestion className="size-4 shrink-0" aria-hidden="true" />
        No gate record exists
      </p>
      <p className="m-0 min-w-0 font-serif text-[16px] leading-[1.55] text-ink-mid">{NO_GATE_TEXT}</p>
    </div>
  );
}

export function NoGateRecord() {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <NoGateNotice />
      <AbsentLine>No gate record carries this work. An absent record is not a passed gate.</AbsentLine>
    </div>
  );
}
