import { screen } from "@testing-library/react";

import type { ChangeLevel } from "../../change/levels";

export function level(number: 1 | 2 | 3 | 4, key: ChangeLevel["key"], narration: string): ChangeLevel {
  return {
    number,
    key,
    title: key,
    narration,
    voice: "A voice script.",
    art: null,
    audio: `../data/audio/pr11_${key}.wav`,
    diagram: null,
  };
}

function narratedLevels(narrated: boolean): ChangeLevel[] {
  const said = (text: string) => (narrated ? text : "");
  return [
    level(1, "intent", said("PR intent in short.")),
    level(2, "problem_solution", said("PR problem in short.")),
    level(3, "architecture", said("PR architecture in short.")),
    level(4, "file_changes", said("PR diff in short.")),
  ];
}

function idleBundle() {
  return { state: "idle", entry: null, levels: [], diff: null, diffMessage: null, message: null };
}

export function changeBundleFor(pr: number | null, narrated: boolean) {
  if (pr === null) return idleBundle();
  return {
    state: "ready",
    entry: { pr, status: "merged", intent: { problem: "A problem." } },
    levels: narratedLevels(narrated),
    diff: null,
    diffMessage: null,
    message: null,
  };
}

export function strip(): HTMLElement | null {
  return screen.queryByRole("region", { name: "In Short" });
}
