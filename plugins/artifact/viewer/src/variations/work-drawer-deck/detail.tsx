/**
 * Prototype B's detail pane.
 *
 * THE DETAIL PANE IS WHY THE DECK EXPANDS. The board row is one line, so the
 * deck stays a departure board; the record behind the row is prose, and prose
 * needs room. Selecting a row opens this pane beside the board and expands the
 * drawer to its tall snap, so the reader never reads the record through a
 * letterbox. Pressing the row again, or Esc, closes the pane and drops the
 * drawer back to its working snap.
 *
 * THE RECORD MARKS ARE THE SHIPPED SHELL'S OWN RULE. `recordVerdicts` reads
 * the six authored records of `data/designs.js` and returns the three-state
 * verdicts the Work board states today, so a reader comparing this pane with
 * the shipped board reads the same words. A record the file does not carry
 * reads absent, never an error.
 */

import { useEffect, useState } from "react";
import { CornerDownRight, GitMerge } from "lucide-react";

import { StageBadge } from "@/components/work/StageBadge";
import { loadDesigns } from "@/data/bundle";
import type { DesignRecord, DesignRecords } from "@/data/bundle";
import type { DesignRow, EpicEntity } from "@/data/types";
import { RECORD_KINDS, RECORD_LABEL, recordVerdicts } from "@/shell/readiness";
import type { Readiness } from "@/shell/readiness";
import { cn } from "@/lib/utils";

export interface RecordsLoad {
  state: "loading" | "ready" | "failed";
  records?: DesignRecords;
}

/** The one hook that reads `data/designs.js` for the pane. */
export function useDesignRecords(attempt: number): RecordsLoad {
  const [load, setLoad] = useState<RecordsLoad>({ state: "loading" });

  useEffect(() => {
    let live = true;
    setLoad({ state: "loading" });
    loadDesigns()
      .then((records) => {
        if (live) setLoad({ state: "ready", records });
      })
      .catch(() => {
        if (live) setLoad({ state: "failed" });
      });
    return () => {
      live = false;
    };
  }, [attempt]);

  return load;
}

/*
 * The three verdict states, as the shell's own tone table paints them. A whole
 * record takes the good wash, a gap takes the accent wash, and a record that
 * does not exist takes the plain surface.
 */
const VERDICT_CLASS: Record<Readiness, string> = {
  present: "border-good/60 bg-good/10 text-good",
  partial: "border-primary/60 bg-accent-wash/40 text-accent-deep",
  absent: "border-line bg-surface-2/60 text-ink-faint",
};

function RecordMarks({
  record,
  designId,
}: {
  record: DesignRecord | undefined;
  designId: string;
}) {
  const verdicts = recordVerdicts(record);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="m-0 font-mono text-[12px] tracking-[0.08em] text-ink-faint uppercase">
        The six authored records
      </p>
      <ul className="m-0 flex min-w-0 list-none flex-wrap gap-1.5 p-0">
        {RECORD_KINDS.map((kind) => {
          const verdict = verdicts[kind];
          const said =
            verdict.missing.length === 0
              ? `${RECORD_LABEL[kind]}: ${verdict.state}`
              : `${RECORD_LABEL[kind]}: ${verdict.state}, missing ${verdict.missing.join(", ")}`;
          return (
            <li
              key={kind}
              title={said}
              className={cn(
                "inline-flex min-w-0 items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[12px]",
                VERDICT_CLASS[verdict.state],
              )}
            >
              {verdict.state === "present" ? "●" : verdict.state === "partial" ? "◐" : "○"}
              <span aria-hidden="true">{RECORD_LABEL[kind]}</span>
              <span className="sr-only">{said}</span>
            </li>
          );
        })}
      </ul>
      <p className="m-0 font-serif text-[13.5px] leading-[1.45] text-ink-faint">
        {record === undefined
          ? `data/designs.js carries no record for ${designId}, so every mark reads absent.`
          : "A whole record takes a full mark; a dashed part names what it misses."}
      </p>
    </div>
  );
}

function DetailPane({
  row,
  recordsLoad,
  epicState,
  onClose,
}: {
  row: DesignRow;
  recordsLoad: RecordsLoad;
  /** The data layer's own refined epic answer, one epic at a time. */
  epicState: (epic: EpicEntity) => { state: string; refined: boolean };
  onClose: () => void;
}) {
  const { design, epics, done, pullRequests } = row;
  const record = recordsLoad.records?.[design.id];

  return (
    <aside
      aria-label={`${design.name} in detail`}
      className="flex h-full min-w-0 flex-col gap-4 overflow-y-auto border-l border-line bg-surface-2/40 px-5 py-4"
    >
      <header className="flex min-w-0 flex-col gap-2.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <h3 className="m-0 min-w-0 font-mono text-[18px] leading-tight font-bold tracking-[-0.02em] break-words">
            {design.name}
          </h3>
          <StageBadge stage={design.stage} className="shrink-0" />
        </div>
        <p className="m-0 font-serif text-[15.5px] leading-[1.55] text-ink-mid">
          {design.outcome}
        </p>
      </header>

      <RecordMarks record={record} designId={design.id} />

      <div className="flex min-w-0 flex-col gap-2">
        <p className="m-0 font-mono text-[12px] tracking-[0.08em] text-ink-faint uppercase">
          Epics · {done} of {epics.length} done
        </p>
        {epics.length === 0 ? (
          <p className="m-0 font-serif text-[14.5px] text-ink-dim italic">
            The plan holds no epic for this design.
          </p>
        ) : (
          <ul className="m-0 flex min-w-0 list-none flex-col gap-1 p-0">
            {epics.map((epic) => (
              <li
                key={epic.id}
                className="flex min-w-0 items-center gap-2 rounded-md bg-surface-2 px-2.5 py-2"
              >
                <span className="min-w-0 flex-1 truncate font-mono text-[13.5px]">
                  {epic.epic_id}
                </span>
                {epic.pr !== null ? (
                  <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[12px] text-ink-faint">
                    <GitMerge className="size-3" aria-hidden="true" />
                    #{epic.pr}
                  </span>
                ) : null}
                <span className="shrink-0 font-mono text-[12px] text-ink-dim">
                  {epicState(epic).state}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pullRequests.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-2">
          <p className="m-0 font-mono text-[12px] tracking-[0.08em] text-ink-faint uppercase">
            Pull requests
          </p>
          <p className="m-0 font-mono text-[13.5px] text-ink-dim">
            {pullRequests.map((id) => `#${id}`).join(", ")} merged
          </p>
        </div>
      ) : null}

      <footer className="mt-auto min-w-0 border-t border-line-soft pt-3">
        <a
          href={`#/${design.id}/build`}
          aria-label={`Open work item: ${design.name}`}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-card px-2.5 py-1.5 font-mono text-[13px] font-bold text-accent-deep transition-colors duration-150 ease-house hover:bg-accent-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <CornerDownRight className="size-3.5" aria-hidden="true" />
          Open work item
        </a>
      </footer>

      <button
        type="button"
        onClick={onClose}
        className="shrink-0 cursor-pointer self-start rounded-md border border-line px-2.5 py-1.5 font-mono text-[12.5px] text-ink-dim transition-colors duration-150 ease-house hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Close
      </button>
    </aside>
  );
}

export default DetailPane;