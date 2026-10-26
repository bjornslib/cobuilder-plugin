import { cn } from "@/lib/utils";
import { Missing, NotPresentPill } from "@/shell/atoms";
import { DiagramTiles, type Theme } from "@/shell/DiagramTiles";

import type { ChangeLevel } from "./levels";

/** Which of the frame's two parts the reader is looking at. */
export type ArtMode = "image" | "diagram";

const FRAME_MODES = ["image", "diagram"] as const;
const MODE_BASE =
  "cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[11.5px] font-bold tracking-[0.04em] uppercase transition-colors";
const MODE_ON = "border-primary bg-accent-wash text-accent-deep";
const MODE_OFF = "border-line text-ink-dim hover:border-primary/40 hover:text-ink";

interface ModeButtonProps {
  value: ArtMode;
  on: boolean;
  onArtMode: (mode: ArtMode) => void;
}

function ModeButton({ value, on, onArtMode }: ModeButtonProps) {
  return (
    <button
      type="button"
      aria-current={on ? "true" : undefined}
      onClick={() => onArtMode(value)}
      className={cn(MODE_BASE, on ? MODE_ON : MODE_OFF)}
    >
      {value}
    </button>
  );
}

export function FrameToggle({ mode, onArtMode }: Omit<ModeButtonProps, "value" | "on"> & { mode: ArtMode }) {
  return (
    <span className="flex items-center gap-1" role="group" aria-label="Frame mode">
      {FRAME_MODES.map((value) => (
        <ModeButton key={value} value={value} on={mode === value} onArtMode={onArtMode} />
      ))}
    </span>
  );
}

function EmptyFrame() {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <NotPresentPill className="self-start" />
      <Missing>
        This level carries no scene art and no diagram. The fourth level is the diff
        itself, and it has never carried either.
      </Missing>
    </div>
  );
}

interface ArtProps {
  art: string;
  number: number;
  onArtFailed: (url: string) => void;
}

function ArtImage({ art, number, onArtFailed }: ArtProps) {
  return (
    <img
      src={art}
      alt={`Scene art for level ${number}`}
      loading="lazy"
      onError={() => onArtFailed(art)}
      className="block h-auto w-full rounded-lg border border-line"
    />
  );
}

function ArtFigure(props: ArtProps) {
  return (
    <figure className="m-0 flex min-w-0 flex-col gap-2">
      <ArtImage {...props} />
      <figcaption className="font-mono text-[12px] text-ink-faint">{props.art}</figcaption>
    </figure>
  );
}

function DrawnDiagram({ level, theme }: { level: ChangeLevel; theme: Theme }) {
  const drawn = level.number <= 3;
  const key = String(level.number);
  const sources = drawn ? { [key]: level.diagram ?? "" } : {};
  return (
    <div className="min-w-0">
      <DiagramTiles levels={drawn ? [key] : []} sources={sources} theme={theme} />
    </div>
  );
}

export interface FrameBodyProps {
  level: ChangeLevel;
  theme: Theme;
  mode: ArtMode;
  empty: boolean;
  onArtFailed: (url: string) => void;
}

export function FrameBody({ level, theme, mode, empty, onArtFailed }: FrameBodyProps) {
  if (empty) return <EmptyFrame />;
  if (mode === "image" && level.art) {
    return <ArtFigure art={level.art} number={level.number} onArtFailed={onArtFailed} />;
  }
  return <DrawnDiagram level={level} theme={theme} />;
}
