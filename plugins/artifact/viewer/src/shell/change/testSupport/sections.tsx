import { render } from "@testing-library/react";

import type { StoryEntry } from "@/data/bundle";

import type { ChangeLevel } from "../levels";
import { changeSections, type ChangeBodyProps, type ChangeKey } from "../sections";

export const LEVEL: ChangeLevel = {
  number: 1,
  key: "intent",
  title: "Intent",
  narration: "The draw gate remembers what it drew.",
  voice: "A voice script.",
  art: null,
  audio: "../data/audio/pr12_intent.wav",
  diagram: null,
};

const ENTRY: StoryEntry = { pr: 12, status: "merged", intent: { problem: "A problem." } };

const BASE_PROPS: ChangeBodyProps = {
  entry: ENTRY,
  levels: [LEVEL],
  diff: null,
  diffMessage: null,
  theme: "light",
  artMode: "image",
  onArtMode: () => {},
  failedArt: null,
  onArtFailed: () => {},
  diffFile: null,
  onDiffFile: () => {},
  joins: null,
  adrs: {},
  openSheet: () => {},
};

export const props = (over: Partial<ChangeBodyProps> = {}): ChangeBodyProps => ({
  ...BASE_PROPS,
  ...over,
});

export function text(row: ChangeKey, over: Partial<ChangeBodyProps> = {}): string {
  const { container } = render(<>{changeSections(props(over), row)}</>);
  return container.textContent ?? "";
}
