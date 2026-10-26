import { GitBranch } from "lucide-react";

import { Chip, StateBadge, toneForStage } from "../atoms";
import { STATE_GLOSS } from "../gloss";
import type { TopBarProps } from "./props";

const BRANCH_CLASS =
  "hidden min-w-0 items-center gap-1.5 font-mono text-[12.5px] text-ink-dim sm:flex";
const UNKNOWN_STAGE = "A stage outside the recorded vocabulary.";

/*
 * THE BOARD CARRIES NO STAGE, and the badge is dropped rather than reworded. A
 * stage belongs to a work item, so a board badge could only state a value that
 * does not exist. The unknown badge stays for the states where nothing has
 * resolved, which is what its gloss says.
 */
function StageMark({ stage, board }: { stage: string | null; board: boolean }) {
  if (stage) {
    return <StateBadge word={stage} tone={toneForStage(stage)} gloss={STATE_GLOSS[stage] ?? UNKNOWN_STAGE} />;
  }
  if (board) return null;
  return <StateBadge word="unknown" tone="neutral" gloss="The index has not resolved." />;
}

function SupersededBy({ id }: { id: string | null }) {
  if (!id) return null;
  return (
    <Chip tone="warn" title="A later design closed this one.">
      superseded by {id}
    </Chip>
  );
}

function Supersedes({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <Chip tone="warn" title={`This work supersedes ${ids.join(", ")}.`}>
      supersedes
    </Chip>
  );
}

function ExtraBranches({ count }: { count: number }) {
  if (count <= 1) return null;
  return <span className="shrink-0 text-ink-faint">+{count - 1}</span>;
}

/*
 * The branch is quiet text. It truncates and never wraps the bar, and it hides on a
 * phone width where it would crowd the bar. Several branches show the first, with a
 * "+N" mark, and the title lists them all.
 */
function BranchMark({ branch, branches }: Pick<TopBarProps, "branch" | "branches">) {
  if (!branch) return null;
  return (
    <span title={branches.join("\n")} className={BRANCH_CLASS}>
      <GitBranch className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
      <span className="max-w-[32ch] min-w-0 truncate">{branch}</span>
      <ExtraBranches count={branches.length} />
    </span>
  );
}

export function StatusRow({ bar }: { bar: TopBarProps }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <StageMark stage={bar.stage} board={bar.board} />
      <SupersededBy id={bar.supersededBy} />
      <Supersedes ids={bar.supersedes} />
      <BranchMark branch={bar.branch} branches={bar.branches} />
    </div>
  );
}
