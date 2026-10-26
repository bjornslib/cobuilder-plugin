import type { LucideIcon } from "lucide-react";

import type { StoryEntry } from "@/data/bundle";

import { ChangeFrame } from "./Frame";
import type { ChangeLevel } from "./levels";
import type { ChangeBodyProps } from "./sectionModel";

/** What one row's builder reads: the page's props, a present entry, and the row's own level. */
export interface RowContext {
  props: ChangeBodyProps;
  entry: StoryEntry;
  level: ChangeLevel | null;
  icon: LucideIcon;
}

/**
 * A level the row cannot read, as the frame's own input.
 *
 * The frame states every part it holds and every part it does not, so it needs a level to
 * read. A row whose level the bundle does not hold hands it this one: four nulls and an
 * empty narration, which the frame reads as every part absent.
 */
const EMPTY_LEVEL: ChangeLevel = {
  number: 1,
  key: "intent",
  title: "Intent",
  narration: "",
  voice: null,
  art: null,
  audio: null,
  diagram: null,
};

/** The level's picture or drawing, which leads the row's first section. */
export function narrationOf({ props, level }: RowContext) {
  return (
    <ChangeFrame
      level={level ?? EMPTY_LEVEL}
      theme={props.theme}
      artMode={props.artMode}
      onArtMode={props.onArtMode}
      failedArt={props.failedArt}
      onArtFailed={props.onArtFailed}
    />
  );
}
