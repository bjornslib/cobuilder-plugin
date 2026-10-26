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

import type { Theme } from "@/shell/DiagramTiles";

import { FrameBody, FrameToggle, type ArtMode } from "./FrameParts";
import type { ChangeLevel } from "./levels";

export type { ArtMode } from "./FrameParts";

export interface ChangeFrameProps {
  level: ChangeLevel;
  theme: Theme;
  artMode: ArtMode;
  onArtMode: (mode: ArtMode) => void;
  /** The picture address that did not load, or null. */
  failedArt: string | null;
  onArtFailed: (url: string) => void;
}

/*
 * ONE PART DRAWS ITSELF, WHATEVER THE READER CHOSE ON ANOTHER LEVEL. The toggle only
 * exists where both parts do, and the choice is the reader's for the whole change, so a
 * level holding one part resolves to that part rather than to a choice it never offered.
 */
function resolveMode(hasImage: boolean, hasDiagram: boolean, artMode: ArtMode): ArtMode {
  return hasImage && hasDiagram ? artMode : hasImage ? "image" : "diagram";
}

export function ChangeFrame(props: ChangeFrameProps) {
  const { level, theme, artMode, onArtMode, failedArt, onArtFailed } = props;
  const hasImage = level.art !== null && failedArt !== level.art;
  const hasDiagram = level.diagram !== null;
  const mode = resolveMode(hasImage, hasDiagram, artMode);
  return (
    <div className="mb-4 flex min-w-0 flex-col gap-3">
      {hasImage && hasDiagram ? <FrameToggle mode={mode} onArtMode={onArtMode} /> : null}
      <FrameBody level={level} theme={theme} mode={mode} empty={!hasImage && !hasDiagram} onArtFailed={onArtFailed} />
    </div>
  );
}
