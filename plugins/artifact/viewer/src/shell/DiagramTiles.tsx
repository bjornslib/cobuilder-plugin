/**
 * The three diagram levels, as three tiles.
 *
 * A tile is a miniature of one drawing, and a press opens that drawing whole. The level
 * used to be three stacked blocks, and each one carried a header bar, a lead sentence, a
 * Render button, and a source block that stood in until a press replaced it. The
 * engineer removed all of that: none of it added any value to a reader who came to see
 * the shape. So a tile holds the drawing and one word for its kind, and nothing else.
 *
 * THE RUNTIME LOADS WHEN THIS SECTION MOUNTS. The old rule, recorded in the prototype's
 * `Diagram.tsx` and in interaction-design section 2.3, was that Mermaid loads on the
 * reader's press and at no other moment, because the runtime is large. A tile cannot wait
 * for a press: the tile IS the drawing. So the rule becomes: the runtime loads when the
 * reader reaches the Diagrams section, and at no other moment. No other level, and
 * nothing before this section mounts, pays for it.
 *
 * THE OFFLINE FALLBACK SURVIVES. A recorded rule says Mermaid shows the plain source
 * when the CDN is unreachable. With the source block gone, a failed render would leave
 * three empty boxes and a reader with nothing. So a failed tile states the failure in
 * one line, and its dialog shows the source as text. That is the only place the source
 * survives, and it is the fallback, not a feature: the working case has no source
 * toggle, and no reader sees the source unless the drawing could not be made.
 *
 * ONE RUNTIME, THREE RENDERS. All three levels go through the same `loadMermaid` call,
 * one after the other. Mermaid writes a temporary element per render, so the renders
 * are sequential rather than concurrent.
 *
 * The drawing itself is Mermaid's output for this repository's own authored source,
 * produced with `securityLevel: "strict"`. It is written with `dangerouslySetInnerHTML`,
 * which is the only inner-HTML write in this shell.
 *
 * THIS FILE IS TWO PROTOTYPES MERGED. The port folds `src/variations/sections-e/Diagram.tsx`
 * into this file, so the runtime, the theme, and the tiles have one home. The
 * prototype's `Diagram` component is not ported: it drew one level on a press, with a
 * source toggle beside it, and no surface in the shell ever read it. Its place is the
 * dialog below, and `loadMermaid`, `uncap`, `Theme`, and `MermaidApi` keep their names.
 */

import { useState } from "react";

import { DiagramDialog } from "./diagramTiles/Dialog";
import { useDrawn, type Drawn } from "./diagramTiles/drawn";
import { DiagramTile } from "./diagramTiles/Tile";
import { labelFor } from "./diagramTiles/svgText";
import type { Theme } from "./diagramTiles/runtime";

export { loadMermaid } from "./diagramTiles/runtime";
export type { MermaidApi, Theme } from "./diagramTiles/runtime";
export { labelFor, sizeFromViewBox, uncap } from "./diagramTiles/svgText";

const PENDING: Drawn = { state: "pending" };

interface DiagramTilesProps {
  /** The level numbers the bundle records, in ascending order: `"1"`, `"2"`, `"3"`. */
  levels: string[];
  /** The Mermaid source, per level. */
  sources: Record<string, string>;
  theme: Theme;
}

interface TileGridProps {
  levels: string[];
  sources: Record<string, string>;
  drawn: Record<string, Drawn>;
  onOpen: (level: string) => void;
}

interface LevelTileProps {
  level: string;
  sources: Record<string, string>;
  drawn: Drawn | undefined;
  onOpen: (level: string) => void;
}

function LevelTile({ level, sources, drawn, onOpen }: LevelTileProps) {
  const label = labelFor(sources[level] ?? "");
  return <DiagramTile level={level} label={label} drawn={drawn ?? PENDING} onOpen={() => onOpen(level)} />;
}

/*
  THE ROW KEEPS THREE COLUMNS WHATEVER THE COUNT. A tile is a fixed 200 px tall
  window onto a drawing laid out at its own size, so a wider tile shows LESS of the
  drawing, not more: a lone tile at the full pane width scaled this drawing to 94 %
  and left only its title strip in view. A tile therefore keeps the width it has in
  a row of three, and a shorter row is simply short.
*/
function TileGrid({ levels, sources, drawn, onOpen }: TileGridProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3.5 @3xl:grid-cols-3">
      {levels.map((level) => (
        <LevelTile key={level} level={level} sources={sources} drawn={drawn[level]} onOpen={onOpen} />
      ))}
    </div>
  );
}

interface OpenDialogProps {
  open: string | null;
  sources: Record<string, string>;
  drawn: Record<string, Drawn>;
  onClose: () => void;
}

function OpenDialog({ open, sources, drawn, onClose }: OpenDialogProps) {
  if (open === null) return null;
  return (
    <DiagramDialog
      level={open}
      label={labelFor(sources[open] ?? "")}
      drawn={drawn[open] ?? PENDING}
      source={sources[open] ?? ""}
      onClose={onClose}
    />
  );
}

export function DiagramTiles({ levels, sources, theme }: DiagramTilesProps) {
  const drawn = useDrawn(levels, sources, theme);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <TileGrid levels={levels} sources={sources} drawn={drawn} onOpen={setOpen} />
      <OpenDialog open={open} sources={sources} drawn={drawn} onClose={() => setOpen(null)} />
    </>
  );
}
