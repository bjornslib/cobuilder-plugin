/**
 * The change's account: the four rows of one work item's pull request.
 *
 * A work item and the pull request its own epics carry are two accounts of one surface.
 * The work's own records are the program's account, and `src/shell/sections.tsx` renders
 * them. This module renders the change's account, with each row read from that pull
 * request's own records.
 *
 * The four rows are Intent, Problem & Solution, Architecture, and File Diffs. The fourth
 * name stands in this account alone, and the first three repeat in the program's own
 * levels. That repetition makes a same-named jump across the two accounts possible, so
 * the names are fixed once in `CHANGE_LABEL`.
 *
 * One row is one paged level, and one section is one panel. The shell's paged level reads
 * its section strip from the panel headings on the page and its box count from the list
 * this module returns. So `changeSections` returns the sections of one row, each a
 * `Panel`, and every part inside a section is a heading, a box, or a statement rather
 * than a second panel. A level reads the same way in both accounts.
 *
 * Every part a row cannot reach is stated in place. An open pull request carries fewer
 * records than a merged one, a level never voiced carries no audio, and a picture the
 * browser failed on is not there. A reader meets a sentence where the record would be,
 * and never a blank frame.
 *
 * `CHANGE_LEVEL_KEY` holds the level key behind each row, and nothing derives it. The
 * two rows whose words differ from their keys have one table that holds the difference.
 *
 * The decisions this change landed come from the index's join. `entry.adrs` is a second
 * list of the same fact, and this module does not read it. The shell resolves the
 * index's `adr_to_pull_request` once and hands it in, so this row and the index agree.
 */

import type { ReactNode } from "react";

import { FileText, GitPullRequest, ScrollText, Target, type LucideIcon } from "lucide-react";

import { Missing, Panel } from "@/shell/atoms";

import { architectureSections } from "./architectureRow";
import { diffSections } from "./diffRow";
import { intentSections } from "./intentRow";
import { problemSections } from "./problemRow";
import type { RowContext } from "./rowContext";
import { CHANGE_LABEL, CHANGE_LEVEL_KEY, type ChangeBodyProps, type ChangeKey } from "./sectionModel";

export { CHANGE_KEYS, CHANGE_LABEL, CHANGE_LEVEL_KEY } from "./sectionModel";
export type { ChangeBodyProps, ChangeKey } from "./sectionModel";

const NO_ENTRY =
  "The bundle holds no story entry for this pull request, so this row has no record to read.";

/** One icon per row, so a row's heading and its rail entry name it the same way. */
const ROW_ICON: Record<ChangeKey, LucideIcon> = {
  intent: Target,
  "problem-and-solution": GitPullRequest,
  architecture: ScrollText,
  "file-diffs": FileText,
};

const ROW_SECTIONS: Record<ChangeKey, (ctx: RowContext) => ReactNode[]> = {
  intent: intentSections,
  "problem-and-solution": problemSections,
  architecture: architectureSections,
  "file-diffs": diffSections,
};

function absentSections(row: ChangeKey): ReactNode[] {
  return [
    <Panel key={row} title={CHANGE_LABEL[row]} icon={ROW_ICON[row]} absent>
      <Missing>{NO_ENTRY}</Missing>
    </Panel>,
  ];
}

/**
 * One row's sections, one element per panel, in the order the reader walks them.
 *
 * Each row is a paged level of its own, as in the program's account. The section strip
 * of a level names that level's own sections. When a row was one long panel, the strip
 * repeated the rail's four names and told the reader nothing new.
 *
 * The entry's absence is one stated section, and not an empty list. A route can name a
 * change the bundle holds no story entry for, and the reader who asked for that row
 * wants to see what it could not read. An empty list would leave the pane with no strip,
 * no boxes, and no statement at all.
 */
export function changeSections(props: ChangeBodyProps, row: ChangeKey): ReactNode[] {
  const { entry, levels } = props;
  if (entry === null) return absentSections(row);
  const level = levels.find((candidate) => candidate.key === CHANGE_LEVEL_KEY[row]) ?? null;
  return ROW_SECTIONS[row]({ props, entry, level, icon: ROW_ICON[row] });
}
