import { AlertTriangle, Loader2 } from "lucide-react";
import { useReducedMotion } from "motion/react";
import type { CSSProperties, RefObject } from "react";

import type { Drawn } from "./drawn";

const SERIF_NOTE = "m-0 font-serif text-[15.5px] leading-[1.55] text-ink-mid";
const OFFLINE_NOTE =
  "Mermaid is fetched from the CDN when this section mounts, so a machine with no network draws nothing. The source below is the authored file.";

function zoomStyle(scale: number, reduce: boolean): CSSProperties {
  return {
    transform: `scale(${scale})`,
    transition: reduce ? "none" : "transform 150ms var(--ease-house)",
  };
}

interface ZoomedProps {
  svg: string;
  scale: number;
  drawingRef: RefObject<HTMLDivElement | null>;
}

function ZoomedDrawing({ svg, scale, drawingRef }: ZoomedProps) {
  const reduce = useReducedMotion() ?? false;
  const style = zoomStyle(scale, reduce);
  return (
    <div ref={drawingRef} className="w-max origin-top-left" style={style} dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

function DialogPending({ level }: { level: string }) {
  return (
    <p className="m-0 flex items-center gap-2 font-mono text-[12.5px] text-ink-dim">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      Drawing level {level}.
    </p>
  );
}

function FailedHeading() {
  return (
    <p className="m-0 flex items-start gap-2 font-mono text-[12px] font-bold tracking-[0.06em] text-warn uppercase">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      The render failed, so the source is here
    </p>
  );
}

function DialogFailed({ message, source }: { message: string; source: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <FailedHeading />
      <p className={SERIF_NOTE}>{message}</p>
      <p className={SERIF_NOTE}>{OFFLINE_NOTE}</p>
      <pre className="m-0 overflow-auto rounded-lg border border-line-soft bg-surface-2 px-3.5 py-3 font-mono text-[12.5px] leading-[1.65] text-ink-mid">
        {source}
      </pre>
    </div>
  );
}

export interface DialogBodyProps {
  drawn: Drawn;
  level: string;
  source: string;
  scale: number;
  bodyRef: RefObject<HTMLDivElement | null>;
  drawingRef: RefObject<HTMLDivElement | null>;
}

/*
  The drawing keeps its own size on both scroll axes, and `w-max` stops a flex parent
  from squeezing its width.

  The zoom scales the drawing, not the body. The body keeps its own scroll, and the
  drawing's box is sized in pixels, so a zoomed drawing grows the scrollable area and the
  reader can reach every part of it. A `transform` would leave the layout size alone and
  put the rest of the drawing out of reach.

  The transition is the only thing reduced motion turns off: the zoom itself is a
  discrete step.
*/
export function DialogBody({ drawn, level, source, scale, bodyRef, drawingRef }: DialogBodyProps) {
  return (
    <div ref={bodyRef} className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain bg-surface p-4">
      {drawn.state === "ready" ? <ZoomedDrawing svg={drawn.svg} scale={scale} drawingRef={drawingRef} /> : null}
      {drawn.state === "pending" ? <DialogPending level={level} /> : null}
      {drawn.state === "failed" ? <DialogFailed message={drawn.message} source={source} /> : null}
    </div>
  );
}
