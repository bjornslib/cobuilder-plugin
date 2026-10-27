import { useEffect } from "react";

import type { ProgramDesignEntity } from "@/data/types";

import type { WorkItem } from "../model";
import { MarkdownBlock } from "../markdown";

const PLAN_BLOCKS = [
  { kind: "product", gate: "Gate 1 — Product", noun: "product document" },
  { kind: "architecture", gate: "Gate 2 — Architecture", noun: "architecture document" },
  { kind: "program", gate: "Gate 3 — Program design", noun: "program design" },
] as const;

function scrollToBlock(kind: string | null) {
  document
    .querySelector(`[data-plan-block="${kind}"]`)
    ?.scrollIntoView({ behavior: "auto", block: "start" });
}

/*
 * A gate tail route names one block. The scroll runs on the next frame, after the
 * shell's own scroll reset, and with no animation.
 */
function usePlanScroll(workId: string, focus: string | null) {
  useEffect(() => {
    if (!PLAN_BLOCKS.some((block) => block.kind === focus)) return;
    const frame = requestAnimationFrame(() => scrollToBlock(focus));
    return () => cancelAnimationFrame(frame);
  }, [focus, workId]);
}

function PlanDocument({ doc }: { doc: ProgramDesignEntity }) {
  return (
    <>
      {doc.source_path ? (
        <p className="m-0 min-w-0 break-all font-mono text-[12px] text-ink-mid">{doc.source_path}</p>
      ) : null}
      <div className="min-w-0 overflow-x-auto">
        <MarkdownBlock markdown={doc.body_md} />
      </div>
    </>
  );
}

function PlanEmpty({ noun }: { noun: string }) {
  return (
    <p data-testid="plan-empty" className="m-0 font-serif text-[16px] text-ink-dim">
      No {noun} for this work yet.
    </p>
  );
}

const PLAN_BLOCK_CLASS =
  "flex min-w-0 flex-col gap-3 rounded-lg border border-line-soft bg-surface-2/50 px-4 py-3";

const PLAN_GATE_CLASS =
  "m-0 font-mono text-[12px] font-bold tracking-[0.06em] text-ink-mid uppercase";

type PlanBlockSpec = (typeof PLAN_BLOCKS)[number];

function PlanBlock({ block, doc }: { block: PlanBlockSpec; doc: ProgramDesignEntity | null }) {
  return (
    <section id={`plan-${block.kind}`} data-plan-block={block.kind} className={PLAN_BLOCK_CLASS}>
      <p className={PLAN_GATE_CLASS}>{block.gate}</p>
      {doc ? <PlanDocument doc={doc} /> : <PlanEmpty noun={block.noun} />}
    </section>
  );
}

export function PlanSection({ work, focus = null }: { work: WorkItem; focus?: string | null }) {
  usePlanScroll(work.id, focus);
  return (
    <div className="flex min-w-0 flex-col gap-6">
      {PLAN_BLOCKS.map((block) => (
        <PlanBlock key={block.kind} block={block} doc={work.planDocs[block.kind]} />
      ))}
    </div>
  );
}
