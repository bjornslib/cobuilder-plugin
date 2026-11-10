/**
 * The diff, file by file, ported as it stands.
 *
 * `intent.json` puts the diff's own rendering out of scope for this epic, so this module
 * changes no part of how a diff reads. The file list carries the counts the diff's own
 * `+` and `-` lines give, so the numbers and the hunks under them cannot disagree. A file
 * with no hunk, such as a binary or a mode change, says that in place, because an empty
 * hunk list is a fact about that file and not a rendering failure.
 *
 * A long file is cut, and the cut is stated. A hunk of six hundred lines in a pane that
 * cannot scroll sideways would push the reader past the section they came for, so a hunk
 * draws sixty lines and a file draws six hunks. The line that counts the rest is the
 * difference between a cut and a hidden record.
 */

import { Missing } from "@/shell/atoms";

import { DiffGrid } from "./DiffPane";
import type { DiffFile } from "./levels";

export interface ChangeDiffProps {
  /** Every file the change's diff holds, largest change first. */
  files: DiffFile[];
  /** The path the reader selected, or null for the first file. */
  selected: string | null;
  onSelect: (path: string) => void;
}

/*
  This block is not a panel, as a layout rule. The change's four rows each render one
  `Panel`, and the shell's strip reads one link per panel heading on the page. This block
  is the fourth row's body, so it carries a sub-heading and no jump target.
*/
export function ChangeDiff({ files, selected, onSelect }: ChangeDiffProps) {
  const shown = files.find((file) => file.path === selected) ?? files[0] ?? null;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {files.length === 0 ? <Missing>The bundle carries no diff for this pull request.</Missing> : <DiffGrid files={files} shown={shown} onSelect={onSelect} />}
    </div>
  );
}
