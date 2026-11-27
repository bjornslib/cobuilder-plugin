/**
 * The frame: the level's picture, its drawing, and the reader's choice between them.
 *
 * The frame carries both parts when the bundle holds both. A level with a picture and a
 * drawing offers an Image / Diagram toggle. A level with one of the two draws it and
 * offers no toggle, because a toggle between one thing and itself does nothing.
 *
 * A level with neither states that in place. The fourth level is the diff itself, and it
 * never carries a picture or a drawing. The block says so rather than drawing an empty
 * frame, so a reader meets a stated absence and not a blank box.
 *
 * This block is not a panel and carries no heading. The level's own row names the
 * picture and the drawing. The shell's section strip reads one link per panel heading,
 * so a frame heading would add a second link to the strip. ADR-0028 states the rule for
 * the whole section model.
 *
 * A picture the browser failed on is a picture that is not there. `failedArt` carries the
 * address that did not load, so the frame counts the parts it can draw rather than the
 * parts its record promised. The toggle and the body read the same condition.
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
  failedArt: string | null;
  onArtFailed: (url: string) => void;
}

/*
 * One part draws itself, whatever the reader chose on another level. The toggle exists
 * only where both parts do, and the choice is the reader's for the whole change, so a
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
