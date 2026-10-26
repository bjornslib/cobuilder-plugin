import type { WorkItem } from "@/data/works";
import type { ChangeKey } from "../change/sections";
import type { ChangeLevel } from "../change/levels";
import type { ProgramKey } from "./accounts";
import { architectureLists, problemSolutionFields } from "./levels";

const RECORD_PARTS = [
  "goal",
  "intent",
  "narrative",
  "assessment",
  "diagrams",
  "pr_draft",
  "contracts",
] as const;

function planCount(work: WorkItem): string {
  const docs = work.planDocs;
  const held = [docs.product, docs.architecture, docs.program].filter(Boolean).length;
  return `${held} of 3 documents`;
}

/*
 * The row names the rubric documents the page reads. A work that holds none keeps
 * an absence word, because a zero would read as a count of records the rail read
 * and the row below states the absence per slice in place.
 */
function rubricCount(work: WorkItem): string {
  return work.rubrics.length > 0 ? `${work.rubrics.length} rubrics` : "none";
}

function intentCount(work: WorkItem): string {
  const parts = RECORD_PARTS.filter((key) => work.record?.[key] !== undefined).length;
  return `${parts} records`;
}

function problemSolutionCount(work: WorkItem): string {
  const held = problemSolutionFields(work.record).filter(Boolean).length;
  return `${held} of 7 fields`;
}

function architectureCount(work: WorkItem): string {
  const held = architectureLists(work).reduce((total, list) => total + list.length, 0);
  return `${held} records`;
}

const PROGRAM_COUNTS: Record<ProgramKey, (work: WorkItem) => string> = {
  intent: intentCount,
  "problem-and-solution": problemSolutionCount,
  architecture: architectureCount,
  epics: (work) => `${work.epics.length} epics`,
  rubrics: rubricCount,
  plan: planCount,
};

/**
 * How many records one program row reads, in the row's own terms.
 *
 * The count is the section's own list length, and never a number this file picks: a row
 * whose record is absent reads zero, and the body under the row states the absence in
 * place.
 */
export function programCount(work: WorkItem, section: ProgramKey): string {
  return PROGRAM_COUNTS[section](work);
}

/**
 * How many records one change row reads.
 *
 * A COUNT THE RAIL HAS NOT READ IS NO COUNT. The change's records load when the route
 * names the change's account, and the rail addresses the change's rows from a program row
 * too. There the rail holds no level and no diff, and a row that said `0 of 4 parts` would
 * state a number nobody read. So it states nothing, and the row's own name still says what
 * it opens.
 *
 * WHEN IT HAS READ THEM, the count names the level's own parts and every part it cannot
 * reach counts zero. The audio is the one part no record can settle on its own: a level's
 * `voice` script says the level was voiced and names the address, and only the browser can
 * say whether a file answers there. So the audio counts only once `servedAudio` has
 * confirmed it.
 */
interface ChangeCountInput {
  level: ChangeLevel | null;
  diffFiles: number | null;
  section: ChangeKey;
  servedAudio: Record<string, boolean>;
  read: boolean;
}

function partsHeld(level: ChangeLevel, servedAudio: Record<string, boolean>): number {
  return [
    level.narration.length > 0,
    level.art !== null,
    level.audio !== null && servedAudio[level.audio] === true,
    level.diagram !== null,
  ].filter(Boolean).length;
}

export function changeCount(input: ChangeCountInput): string {
  const { level, diffFiles, section, servedAudio, read } = input;
  if (!read) return "";
  if (section === "file-diffs") return diffFiles === null ? "no diff" : `${diffFiles} files`;
  if (level === null) return "no level";
  return `${partsHeld(level, servedAudio)} of 4 parts`;
}
