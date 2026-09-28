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
 * THIS BLOCK IS NOT A PANEL, AND THAT IS A LAYOUT RULE RATHER THAN A STYLE CHOICE. The
 * change's four rows each render one `Panel`, and the shell's section strip reads one link
 * per panel heading on the page. A frame that were a panel of its own would put a second
 * link on the strip for one step of the pager, so this block carries a sub-heading and no
 * jump target. ADR-0028 states the rule for the whole section model.
 *
 * A PICTURE THE BROWSER FAILED ON IS A PICTURE THAT IS NOT THERE. `failedArt` carries the
 * address that did not load, so the frame counts the parts it can draw rather than the
 * parts its record promised. The count beside the heading and the line above it read the
 * same condition, so the two cannot disagree.
 *
 * THE LINE ABOVE THE BODY IS DERIVED FROM THE PARTS THE FRAME HOLDS, so it cannot promise a
 * part the count beside it denies. A frame with a picture and a drawing says the reader
 * picks between them; a frame with one says which one is missing; a frame with neither says
 * that neither exists.
 */

import { cn } from "@/lib/utils";
import { Missing, NotPresentPill, SubHead } from "@/shell/atoms";
import { DiagramTiles } from "@/shell/DiagramTiles";
import type { Theme } from "@/shell/DiagramTiles";

import type { ChangeLevel } from "./levels";

/** Which of the frame's two parts the reader is looking at. */
export type ArtMode = "image" | "diagram";

/** The frame's own heading. One name for one thing, read by every row that draws it. */
export const FRAME_HEADING = "The picture";

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
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <SubHead count={parts}>{FRAME_HEADING}</SubHead>
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
      </span>

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
