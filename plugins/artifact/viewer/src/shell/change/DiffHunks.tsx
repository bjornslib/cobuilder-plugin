import { EmptyNote } from "@/shell/atoms";

import type { DiffHunk } from "./levels";

/** How many hunks of one file the panel draws before it states the rest. */
const HUNKS_DRAWN = 6;

/** How many lines of one hunk the panel draws before it states the rest. */
const LINES_DRAWN = 60;

const NO_HUNK_NOTE =
  "This file carries no hunk. The diff records a binary file or a mode change, and there is no text to show.";

const LINE_STYLE = {
  add: { mark: "+", className: "bg-good-wash text-good" },
  del: { mark: "-", className: "bg-danger-wash text-destructive" },
  context: { mark: " ", className: "text-ink-mid" },
} as const;

interface FurtherProps {
  total: number;
  limit: number;
  what: string;
}

function Further({ total, limit, what }: FurtherProps) {
  if (total <= limit) return null;
  const className = "border-t border-line-soft px-3 py-1 font-mono text-[12px] text-ink-faint";
  return <div className={className}>{total - limit}{` further ${what} are not drawn.`}</div>;
}

function LineRow({ line }: { line: DiffHunk["lines"][number] }) {
  const style = LINE_STYLE[line.kind];
  return (
    <div className={style.className}>
      {style.mark}
      {line.text}
    </div>
  );
}

const HEADER_CLASS =
  "border-b border-line-soft bg-surface-2 px-3 py-1 font-mono text-[12px] text-ink-dim";

function HunkLines({ lines }: { lines: DiffHunk["lines"] }) {
  return (
    <pre className="m-0 overflow-x-auto px-3 py-1.5 font-mono text-[12px] leading-[1.5]">
      {lines.slice(0, LINES_DRAWN).map((line, position) => (
        <LineRow key={position} line={line} />
      ))}
    </pre>
  );
}

function HunkView({ hunk }: { hunk: DiffHunk }) {
  return (
    <div className="min-w-0">
      <div className={HEADER_CLASS}>{hunk.header}</div>
      <HunkLines lines={hunk.lines} />
      <Further total={hunk.lines.length} limit={LINES_DRAWN} what="lines in this hunk" />
    </div>
  );
}

export function HunkList({ hunks }: { hunks: DiffHunk[] }) {
  if (hunks.length === 0) return <EmptyNote>{NO_HUNK_NOTE}</EmptyNote>;
  return (
    <div className="min-w-0 overflow-x-auto rounded-lg border border-line bg-card">
      {hunks.slice(0, HUNKS_DRAWN).map((hunk, index) => (
        <HunkView key={`${index}-${hunk.header}`} hunk={hunk} />
      ))}
      <Further total={hunks.length} limit={HUNKS_DRAWN} what="hunks in this file" />
    </div>
  );
}
