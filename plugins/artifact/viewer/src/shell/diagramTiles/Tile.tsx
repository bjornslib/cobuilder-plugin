import type { ReactNode } from "react";

import { AlertTriangle, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import type { Drawn } from "./drawn";
import { useFitScale } from "./useFitScale";

/** The miniature's height, in pixels. The drawing is clipped to it. */
const TILE_HEIGHT = 200;

const TILE_CLASS = cn(
  "relative block h-[200px] w-full cursor-pointer overflow-hidden rounded-lg border border-line bg-surface",
  "transition-colors duration-150 ease-house hover:border-accent-deep hover:bg-surface-2",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

type Fit = ReturnType<typeof useFitScale<HTMLSpanElement, HTMLSpanElement>>;

export interface TileProps {
  level: string;
  label: string;
  drawn: Drawn;
  onOpen: () => void;
}

function TileDrawing({ drawn, fit }: { drawn: Drawn; fit: Fit }) {
  return (
    <span ref={fit.boxRef} className="absolute inset-0 block">
      {drawn.state === "ready" ? (
        <span className="block w-max origin-top-left" style={{ transform: `scale(${fit.scale})` }}>
          <span ref={fit.drawingRef} className="pointer-events-none block w-max" dangerouslySetInnerHTML={{ __html: drawn.svg }} />
        </span>
      ) : null}
    </span>
  );
}

function TilePending() {
  return (
    <span className="absolute inset-0 flex items-center justify-center gap-2 font-mono text-[12.5px] text-ink-dim">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      Drawing
    </span>
  );
}

function TileFailed() {
  return (
    <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center">
      <AlertTriangle className="size-4 text-warn" aria-hidden="true" />
      <span className="font-mono text-[12px] font-bold tracking-[0.06em] text-warn uppercase">The drawing did not load</span>
      <span className="font-serif text-[15px] leading-[1.45] text-ink-dim">The source opens on a press.</span>
    </span>
  );
}

function TileStatus({ drawn }: { drawn: Drawn }) {
  if (drawn.state === "pending") return <TilePending />;
  return drawn.state === "failed" ? <TileFailed /> : null;
}

function TileButton({ level, label, onOpen, children }: Omit<TileProps, "drawn"> & { children: ReactNode }) {
  return (
    <button
      type="button" onClick={onOpen}
      aria-label={`Open the ${label} drawing for level ${level}`}
      className={TILE_CLASS}
      style={{ height: TILE_HEIGHT }}
    >
      {children}
    </button>
  );
}

/**
 * One tile: a word, then the drawing scaled to fit.
 *
 * The drawing is laid out at its real size and then scaled. Mermaid is asked for an
 * uncapped SVG (`useMaxWidth: false` in `loadMermaid`), so the element carries the
 * drawing's own pixel width. The miniature is that drawing under `transform: scale(k)`,
 * with `k` the tile's width over the drawing's width, measured after the SVG lands and
 * re-measured when the tile resizes. A drawing laid out for a 380 px box would compose
 * its labels for 380 px and then shrink to nothing legible.
 *
 * `pointer-events: none` on the drawing keeps the whole tile one press target, so a
 * press anywhere in it opens the drawing.
 */
export function DiagramTile({ level, label, drawn, onOpen }: TileProps) {
  const fit = useFitScale<HTMLSpanElement, HTMLSpanElement>(drawn.state === "ready" ? drawn.svg : "", 0);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="font-mono text-[12px] tracking-[0.05em] text-ink-dim uppercase">{label}</span>
      <TileButton level={level} label={label} onOpen={onOpen}>
        <TileDrawing drawn={drawn} fit={fit} />
        <TileStatus drawn={drawn} />
      </TileButton>
    </div>
  );
}
