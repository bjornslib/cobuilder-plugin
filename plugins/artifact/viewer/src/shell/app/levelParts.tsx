import type { ReactNode } from "react";

import { InShort } from "../InShort";
import { narrativeLevel } from "../readiness";
import { CHANGE_KEYS, CHANGE_LEVEL_KEY } from "../change/sections";
import type { ChangeLevel } from "../change/levels";
import type { WorkItem } from "../model";
import type { PagedLevelKey } from "./pagedSections";

type ChangeRow = (typeof CHANGE_KEYS)[number];

export function changeInShort(levels: ChangeLevel[], row: ChangeRow, servedAudio: Record<string, boolean>): ReactNode {
  if (row === "file-diffs") return null;
  const level = levels.find((candidate) => candidate.key === CHANGE_LEVEL_KEY[row]);
  if (level === undefined) return null;
  const audio = level.audio !== null && servedAudio[level.audio] === true ? level.audio : null;
  return <InShort key={`${level.key}`} text={level.narration} audio={audio} />;
}

export function workInShort(work: WorkItem, level: PagedLevelKey): ReactNode {
  if (level === "build") return null;
  const key = level === "problem-and-solution" ? "problem_solution" : level;
  const text = work.record ? narrativeLevel(work.record, key)?.narration : undefined;
  return typeof text === "string" ? <InShort text={text} /> : null;
}
