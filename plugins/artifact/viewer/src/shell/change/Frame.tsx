/**
 * The frame: the level's picture, its drawing, and the reader's choice between them.
 *
 * THE FRAME CARRIES BOTH PARTS WHEN THE BUNDLE HOLDS BOTH. A level with a picture and a
 * drawing offers the reader an Image / Diagram toggle, exactly as the viewer this replaces
 * did. A level with one of the two draws it and offers no toggle, because a toggle between
 * one thing and itself is a control that does nothing.
 *
 * A LEVEL WITH NEITHER STATES THAT IN PLACE. The fourth level is the diff itself, and it
 * has never carried a picture or a drawing. The block says so rather than drawing an empty
 * frame, so a reader meets a stated absence and not a blank box.
 *
 * THIS BLOCK IS NOT A PANEL, AND IT CARRIES NO HEADING. The picture and the drawing need no
 * caption, because the level's own row names them. The change's four rows each render one
 * `Panel`, and the shell's section strip reads one link per panel heading on the page, so a
 * frame heading would also add a second link to the strip. ADR-0028 states the rule for
 * the whole section model.
 *
 * A PICTURE THE BROWSER FAILED ON IS A PICTURE THAT IS NOT THERE. `failedArt` carries the
 * address that did not load, so the frame counts the parts it can draw rather than the
 * parts its record promised. The toggle and the body read the same condition, so the two
 * cannot disagree.
 */

import { cn } from "@/lib/utils";
import { Missing, NotPresentPill } from "@/shell/atoms";
import { DiagramTiles } from "@/shell/DiagramTiles";
import type { Theme } from "@/shell/DiagramTiles";

import type { ChangeLevel } from "./levels";

/** Which of the frame's two parts the reader is looking at. */
export type ArtMode = "image" | "diagram";

export interface ChangeFrameProps {
  level: ChangeLevel;
  theme: Theme;
  artMode: ArtMode;
  onArtMode: (mode: ArtMode) => void;
  /** The picture address that did not load, or null. */
  failedArt: string | null;
  onArtFailed: (url: string) => void;
}

export function ChangeFrame({
  level,
  theme,
  artMode,
  onArtMode,
  failedArt,
  onArtFailed,
}: ChangeFrameProps) {
  const hasImage = level.art !== null && failedArt !== level.art;
  const hasDiagram = level.diagram !== null;
  const parts = Number(hasImage) + Number(hasDiagram);
  /*
   * ONE PART DRAWS ITSELF, WHATEVER THE READER CHOSE ON ANOTHER LEVEL. The toggle only
   * exists where both parts do, and the choice is the reader's for the whole change, so a
   * level holding one part resolves to that part rather than to a choice it never offered.
   */
  const mode: ArtMode = hasImage && hasDiagram ? artMode : hasImage ? "image" : "diagram";

  return (
    <div className="mb-4 flex min-w-0 flex-col gap-3">
      {hasImage && hasDiagram ? (
        <span className="flex items-center gap-1" role="group" aria-label="Frame mode">
          {(["image", "diagram"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-current={mode === value ? "true" : undefined}
              onClick={() => onArtMode(value)}
              className={cn(
                "cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[11.5px] font-bold tracking-[0.04em] uppercase transition-colors",
                mode === value
                  ? "border-primary bg-accent-wash text-accent-deep"
                  : "border-line text-ink-dim hover:border-primary/40 hover:text-ink",
              )}
            >
              {value}
            </button>
          ))}
        </span>
      ) : null}

      {parts === 0 ? (
        <div className="flex min-w-0 flex-col gap-2">
          <NotPresentPill className="self-start" />
          <Missing>
            This level carries no scene art and no diagram. The fourth level is the diff
            itself, and it has never carried either.
          </Missing>
        </div>
      ) : mode === "image" && level.art ? (
        <figure className="m-0 flex min-w-0 flex-col gap-2">
          <img
            src={level.art}
            alt={`Scene art for level ${level.number}`}
            loading="lazy"
            onError={() => onArtFailed(level.art ?? "")}
            className="block h-auto w-full rounded-lg border border-line"
          />
          <figcaption className="font-mono text-[12px] text-ink-faint">{level.art}</figcaption>
        </figure>
      ) : (
        <div className="min-w-0">
          <DiagramTiles
            levels={level.number <= 3 ? [String(level.number)] : []}
            sources={level.number <= 3 ? { [String(level.number)]: level.diagram ?? "" } : {}}
            theme={theme}
          />
        </div>
      )}
    </div>
  );
}
