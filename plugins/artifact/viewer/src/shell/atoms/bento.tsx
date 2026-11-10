import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The bento grid a content section lays its tiles in.
 *
 * An explicit twelve-column grid, not a row of flex children. Each tile names its own
 * span, so the widths are written down rather than left to the content. The grid is
 * the container the spans measure against, so a span follows the pane and not the
 * viewport.
 *
 * Section 11.3's rule 4 is why every tile carries `min-w-0`: a grid child defaults to
 * its content width, so one wide row would stretch the pane. Rule 3 is the tile's own
 * job: a table, a code fence, or a diagram keeps its own `overflow-x: auto` wrapper.
 */
export function Bento({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("@container grid min-w-0 grid-cols-12 gap-4", className)}>{children}</div>
  );
}

/**
 * The named spans. One tile names its content weight, and the weight decides the span.
 *
 * `band` runs the full width. `wide` takes two thirds beside a `narrow` tile of one
 * third, and `half` splits a row with one other tile. Below a 48 rem pane every span
 * falls back to the full width, so a narrow pane stacks rather than squeezing.
 */
export const TILE_SPAN = {
  band: "col-span-12",
  wide: "col-span-12 @3xl:col-span-8",
  half: "col-span-12 @3xl:col-span-6",
  narrow: "col-span-12 @3xl:col-span-4",
} as const;

export type TileSpan = keyof typeof TILE_SPAN;

interface TileProps {
  span: TileSpan;
  children: ReactNode;
  className?: string;
}

/**
 * One tile of the bento, and the container its own inner grids measure against.
 *
 * An inner grid reads the tile's width and not the viewport's. A `sm:` breakpoint inside
 * a one-third tile would otherwise fire on a wide viewport and crush the tile's columns.
 */
export function Tile({ span, children, className }: TileProps) {
  return (
    <div className={cn("@container flex min-w-0 flex-col", TILE_SPAN[span], className)}>
      {children}
    </div>
  );
}
