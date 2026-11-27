import { useState } from "react";

import { Maximize2, ZoomIn, ZoomOut, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The zoom steps, as multiples of the fitted size. A step list rather than a multiplying
 * factor keeps every reading a whole number a reader recognises: 100 % is the drawing
 * fitted to the dialog, and the ends are the 50 % to 400 % the engineer asked for.
 */
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4] as const;

const FIT_STEP = ZOOM_STEPS.indexOf(1);

const LAST_STEP = ZOOM_STEPS.length - 1;

const ZOOM_BASE = [
  "inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-mid",
  "transition-colors duration-150 ease-house",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
] as const;
const ZOOM_OFF = "cursor-not-allowed border-dashed bg-surface-2 text-ink-faint";
const ZOOM_ON = "cursor-pointer hover:bg-surface-3";
const PERCENT_CLASS = "min-w-[4.5ch] text-center font-mono text-[12.5px] text-ink-mid tabular-nums";

export interface Zoom {
  step: number;
  percent: number;
  factor: number;
  zoomOut: () => void;
  zoomIn: () => void;
  reset: () => void;
}

export function useZoom(): Zoom {
  const [step, setStep] = useState(FIT_STEP);
  return {
    step,
    percent: Math.round(ZOOM_STEPS[step] * 100),
    factor: ZOOM_STEPS[step],
    zoomOut: () => setStep((current) => Math.max(0, current - 1)),
    zoomIn: () => setStep((current) => Math.min(LAST_STEP, current + 1)),
    reset: () => setStep(FIT_STEP),
  };
}

interface ZoomButtonProps {
  label: string;
  icon: LucideIcon;
  disabled: boolean;
  onClick: () => void;
}

/**
 * Every target is 44 px, per section 11.2, and carries an `aria-label`, because the icon
 * is the whole control. A control at the end of the range sets `disabled` and
 * `aria-disabled` together, and drops the pointer cursor with the state.
 */
function ZoomButton({ label, icon: Icon, disabled, onClick }: ZoomButtonProps) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} aria-disabled={disabled}
      aria-label={label} title={label}
      className={cn(...ZOOM_BASE, disabled ? ZOOM_OFF : ZOOM_ON)}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}

export function ZoomControls({ zoom }: { zoom: Zoom }) {
  return (
    <>
      <ZoomButton label="Zoom out" icon={ZoomOut} disabled={zoom.step === 0} onClick={zoom.zoomOut} />
      <span className={PERCENT_CLASS} aria-live="polite">{zoom.percent}%</span>
      <ZoomButton label="Zoom in" icon={ZoomIn} disabled={zoom.step === LAST_STEP} onClick={zoom.zoomIn} />
      <ZoomButton label="Reset to fit" icon={Maximize2} disabled={zoom.step === FIT_STEP} onClick={zoom.reset} />
    </>
  );
}
