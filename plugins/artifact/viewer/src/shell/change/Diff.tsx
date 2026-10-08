/**
 * The diff, file by file, ported as it stands.
 *
 * `intent.json` puts the diff's own rendering out of scope for this epic, so this module
 * changes no part of how a diff reads. The file list carries the counts the diff's own `+`
 * and `-` lines give, so the numbers and the hunks under them cannot disagree. A file with
 * no hunk — a binary, or a mode change — says that in place, because an empty hunk list is
 * a fact about that file and not a rendering failure.
 *
 * THE LONG FILE IS CUT, AND THE CUT IS STATED. A hunk of six hundred lines inside a pane
 * that cannot scroll sideways would push the reader past the section they came for, so a
 * hunk draws sixty lines and a file draws six hunks. The line that says how many were not
 * drawn is the difference between a cut and a hidden record.
 */

import { cn } from "@/lib/utils";
import { EmptyNote, KeyValue, Missing } from "@/shell/atoms";

import type { DiffFile } from "./levels";

/** How many hunks of one file the panel draws before it states the rest. */
const HUNKS_DRAWN = 6;

/** How many lines of one hunk the panel draws before it states the rest. */
const LINES_DRAWN = 60;

export interface ChangeDiffProps {
  /** Every file the change's diff holds, largest change first. */
  files: DiffFile[];
  /** The path the reader selected, or null for the first file. */
  selected: string | null;
  onSelect: (path: string) => void;
}

export function ChangeDiff({ files, selected, onSelect }: ChangeDiffProps) {
  const shown = files.find((file) => file.path === selected) ?? files[0] ?? null;

  /*
    THIS BLOCK IS NOT A PANEL, AND THAT IS A LAYOUT RULE. The change's four rows each
    render one `Panel`, and the shell's strip reads one link per panel heading on the page.
    This block is the fourth row's body, so it carries a sub-heading and no jump target.
  */
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {files.length === 0 ? (
        <Missing>The bundle carries no diff for this pull request.</Missing>
      ) : (
        <div className="grid min-w-0 grid-cols-12 gap-4">
          <ul className="col-span-12 m-0 flex min-w-0 list-none flex-col gap-1 p-0 @3xl:col-span-4">
            {files.map((file) => {
              const on = shown !== null && file.path === shown.path;
              return (
                <li key={file.path} className="min-w-0 list-none">
                  <button
                    type="button"
                    onClick={() => onSelect(file.path)}
                    aria-current={on ? "true" : undefined}
                    className={cn(
                      "flex min-h-9 w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors",
                      on
                        ? "border-primary bg-accent-wash"
                        : "border-line-soft bg-card hover:bg-surface-2",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink-mid">
                      {file.path}
                    </span>
                    <span className="shrink-0 font-mono text-[12px] text-good tabular-nums">
                      +{file.adds}
                    </span>
                    <span className="shrink-0 font-mono text-[12px] text-destructive tabular-nums">
                      &minus;{file.dels}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {shown === null ? null : (
            <div className="col-span-12 flex min-w-0 flex-col gap-2 @3xl:col-span-8">
              <span className="flex min-w-0 flex-wrap items-baseline gap-2">
                <span className="min-w-0 font-mono text-[12.5px] font-bold break-all text-ink">
                  {shown.path}
                </span>
                <KeyValue label="files changed" value={files.length} />
              </span>

              {shown.hunks.length === 0 ? (
                <EmptyNote>
                  This file carries no hunk. The diff records a binary file or a mode
                  change, and there is no text to show.
                </EmptyNote>
              ) : (
                <div className="min-w-0 overflow-x-auto rounded-lg border border-line bg-card">
                  {shown.hunks.slice(0, HUNKS_DRAWN).map((hunk, index) => (
                    <div key={`${index}-${hunk.header}`} className="min-w-0">
                      <div className="border-b border-line-soft bg-surface-2 px-3 py-1 font-mono text-[12px] text-ink-dim">
                        {hunk.header}
                      </div>
                      <pre className="m-0 overflow-x-auto px-3 py-1.5 font-mono text-[12px] leading-[1.5]">
                        {hunk.lines.slice(0, LINES_DRAWN).map((line, position) => (
                          <div
                            key={position}
                            className={cn(
                              line.kind === "add"
                                ? "bg-good-wash text-good"
                                : line.kind === "del"
                                  ? "bg-danger-wash text-destructive"
                                  : "text-ink-mid",
                            )}
                          >
                            {line.kind === "add" ? "+" : line.kind === "del" ? "-" : " "}
                            {line.text}
                          </div>
                        ))}
                      </pre>
                      {hunk.lines.length > LINES_DRAWN ? (
                        <div className="border-t border-line-soft px-3 py-1 font-mono text-[12px] text-ink-faint">
                          {hunk.lines.length - LINES_DRAWN} further lines in this hunk are not
                          drawn.
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {shown.hunks.length > HUNKS_DRAWN ? (
                    <div className="border-t border-line-soft px-3 py-1 font-mono text-[12px] text-ink-faint">
                      {shown.hunks.length - HUNKS_DRAWN} further hunks in this file are not
                      drawn.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
