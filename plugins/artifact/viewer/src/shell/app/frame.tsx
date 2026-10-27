import type { CSSProperties, ReactNode } from "react";

import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

import { useVisibleWidthCap } from "../hooks";

/*
 * The sidebar ships 16 rem and 3 rem. The spec fixes 248 px expanded and 56 px
 * collapsed (sections 9.1 and 9.2), so the shell sets the two variables rather than
 * editing the added component.
 */
const RAIL_WIDTHS = {
  "--sidebar-width": "15.5rem",
  "--sidebar-width-icon": "3.5rem",
} as CSSProperties;

const EASES = {
  "--ease-out": "cubic-bezier(0.22, 0.75, 0.3, 1)",
  "--ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
};

const FRAME_CLASS =
  "relative flex h-full max-h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-ground text-ink";

/**
 * The timing and layering tokens of sections 4.2 and 11.1.
 *
 * They are declared here rather than in `index.css`, because the shipped viewer's
 * stylesheet is not this application's to change. Under `prefers-reduced-motion:
 * reduce` every duration resolves to zero except the arrival highlight, which marks a
 * location rather than moving anything.
 *
 * The layering scale lives in src/index.css, on the root. Portalled content such as the
 * Sheet and the tooltip reads it from outside the shell, where a token scoped to this
 * element would be undefined.
 */
function shellTokens(reduce: boolean): CSSProperties {
  const timed = (ms: string) => (reduce ? "0ms" : ms);
  return {
    "--dur-instant": "0ms",
    "--dur-fast": timed("150ms"),
    "--dur-base": timed("200ms"),
    "--dur-slow": timed("250ms"),
    "--dur-expand": timed("220ms"),
    "--dur-highlight": "1200ms",
    ...EASES,
  } as CSSProperties;
}

export interface FrameProps {
  reduce: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

/**
 * The shell's frame, and the sidebar's provider.
 *
 * The provider is the frame rather than a wrapper inside it, because the top bar holds
 * the mobile drawer's trigger and `useSidebar` reads the provider's context. Three
 * states render through here, so the frame is written once.
 *
 * Rule 1 of section 11.3 holds: the frame carries `h-full` and never `h-dvh`. The
 * sidebar ships `min-h-svh` on its wrapper, so the shell sets `min-h-0` over it.
 *
 * The height cap is rule 1's own guard, and the height mirror of rule 5's width cap. A
 * host can hand the frame a height taller than the visible screen. `max-h-dvh` then caps
 * the shell to the viewport, the row's `flex-1 min-h-0` fills the cap, and the pane takes
 * that height. One unit serves here, where the width cap needs `useVisibleWidthCap` and
 * a measurement, because the visible height has a CSS unit and the visible width has none.
 *
 * The floor is the page's, not the frame's. `h-full` needs a definite height from an
 * ancestor, and `src/index.css` supplies it on `html`, `body`, and `#root`.
 */
function Frame({ reduce, open, onOpenChange, children }: FrameProps) {
  // The frame owns the cap, because the frame is what spans the window.
  const widthCap = useVisibleWidthCap();

  return (
    <SidebarProvider open={open} onOpenChange={onOpenChange} className={FRAME_CLASS} style={{ ...shellTokens(reduce), ...RAIL_WIDTHS, ...widthCap }}>
      {children}
    </SidebarProvider>
  );
}

export function ProvidedFrame(props: FrameProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Frame {...props} />
    </TooltipProvider>
  );
}

/* The scroll pane for the two states with no rail. It scrolls on both axes, like the populated pane. */
export function Pane({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain px-6 py-6">
      {children}
    </div>
  );
}
