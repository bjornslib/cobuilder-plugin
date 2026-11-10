/**
 * The three diagram levels, as three tiles.
 *
 * A tile is a miniature of one drawing, and a press opens that drawing whole. A tile
 * holds the drawing and one word for its kind. The engineer removed the old header bar,
 * lead sentence, Render button, and source block, because none of them helped a reader
 * who came to see the shape.
 *
 * The runtime loads when this section mounts. Interaction-design section 2.3 had Mermaid
 * load on the reader's press, because the runtime is large. A tile cannot wait for a
 * press, because the tile is the drawing. So no other level, and nothing before this
 * section mounts, pays for the runtime.
 *
 * The offline fallback survives. Mermaid shows the plain source when the CDN is
 * unreachable. Without it, a failed render would leave three empty boxes. So a failed
 * tile states the failure in one line, and its dialog shows the source as text. No
 * reader sees the source unless the drawing could not be made.
 *
 * All three levels go through the same `loadMermaid` call, one after the other. Mermaid
 * writes a temporary element per render, so the renders are sequential, not concurrent.
 *
 * The drawing is Mermaid's output for this repository's own authored source, produced
 * with `securityLevel: "strict"`. It is written with `dangerouslySetInnerHTML`, which is
 * the only inner-HTML write in this shell.
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
  /** The level numbers in ascending order: `"1"`, `"2"`, `"3"`. */
  levels: string[];
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
  The row keeps three columns whatever the count. A tile is a fixed 200 px tall window
  onto a drawing laid out at its own size, so a wider tile shows less of the drawing:
  a lone tile at the full pane width scaled this drawing to 94 % and left only its
  title strip in view. So a shorter row is simply short.
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
