/**
 * One design's record mosaic: ten tiles, one per record kind.
 *
 * The tiles are keyed to the record kinds rather than to the six lenses of the
 * approved design. That is the most literal reading of the index, and it answers the
 * question this variation exists for: which records does this design have.
 *
 * The header carries the three facts a reader needs before the tiles: what the
 * design is, whether a later design superseded it, and how many of the six authored
 * records it holds.
 */

import { ArrowLeft, History, Target } from "lucide-react";

import type { DesignModel } from "../records";
import { RECORD_KINDS } from "../types";
import type { RecordKind } from "../types";
import { ActionButton, Chip, ReadinessPill, StateBadge, plural } from "../ui";
import type { TileContext } from "./context";
import {
  AssessmentTile,
  DecisionsTile,
  DiagramsTile,
  DraftTile,
  GoalTile,
  IntentTile,
  NarrativeTile,
} from "./records";
import { EpicsTile, PullRequestsTile, UnresolvedSlicesTile } from "./work";

const RECORD_LABEL: Record<RecordKind, string> = {
  goal: "goal",
  intent: "intent",
  narrative: "narrative",
  assessment: "assessment",
  "pr-draft": "pr-draft",
  diagrams: "diagrams",
};

export function Mosaic({
  design,
  ctx,
  onBack,
}: {
  design: DesignModel;
  ctx: TileContext;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <MosaicHead design={design} ctx={ctx} onBack={onBack} />

      <div className="grid grid-cols-1 grid-flow-row-dense gap-4 md:grid-cols-2 xl:grid-cols-6">
        <GoalTile design={design} />
        <IntentTile design={design} />
        <NarrativeTile design={design} />
        <AssessmentTile design={design} />
        <DraftTile design={design} />
        <DiagramsTile design={design} ctx={ctx} />
        <EpicsTile design={design} />
        <UnresolvedSlicesTile design={design} ctx={ctx} />
        <DecisionsTile design={design} />
        <PullRequestsTile design={design} />
      </div>
    </div>
  );
}

function MosaicHead({
  design,
  ctx,
  onBack,
}: {
  design: DesignModel;
  ctx: TileContext;
  onBack: () => void;
}) {
  const goal = design.records.goal;
  const supersededBy = design.supersededBy;
  const known = supersededBy !== null && ctx.model.byId.has(supersededBy);

  return (
    <div
      className={
        supersededBy
          ? "flex flex-col gap-3 rounded-xl border border-dashed border-line bg-surface-2/60 p-4"
          : "flex flex-col gap-3 rounded-xl border border-line bg-card p-4 shadow-card"
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <ActionButton icon={ArrowLeft} onClick={onBack} ariaLabel="Back to the design board">
          Back to the board
        </ActionButton>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <Chip>{design.design.id}</Chip>
          <StateBadge state={design.design.stage} className="text-[14px]" />
          {supersededBy ? <Chip muted>history</Chip> : null}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 className="m-0 font-mono text-[26px] leading-[1.2] font-bold tracking-[-0.02em]">
          {design.design.name}
        </h2>
        {goal?.title ? (
          <p className="m-0 max-w-[90ch] font-serif text-[18px] leading-[1.5] text-ink-mid">
            {goal.title}
          </p>
        ) : null}
      </div>

      <p className="m-0 max-w-[90ch] font-serif text-[17px] leading-[1.6] text-ink-mid">
        {design.design.outcome}
      </p>

      {supersededBy ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-line bg-card px-3.5 py-3">
          <History className="size-5 shrink-0 text-ink-faint" aria-hidden />
          <p className="m-0 max-w-[70ch] font-serif text-[16px] leading-[1.55] text-ink-mid">
            <b className="font-semibold text-foreground">
              A later design superseded this one: {supersededBy}.
            </b>{" "}
            This mosaic describes work that has stopped, and the record stays as a
            true account of what was believed at the time. A superseded design holds
            no lane on the board, so the All tab is the only one that lists it.
          </p>
          {known ? (
            <ActionButton icon={Target} onClick={() => ctx.openDesign(supersededBy)}>
              Open {supersededBy}
            </ActionButton>
          ) : null}
        </div>
      ) : null}

      {design.supersedes.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[13px] tracking-[0.05em] text-ink-dim uppercase">
            this design supersedes
          </span>
          {design.supersedes.map((id) =>
            ctx.model.byId.has(id) ? (
              <ActionButton key={id} icon={History} onClick={() => ctx.openDesign(id)}>
                {id}
              </ActionButton>
            ) : (
              <Chip key={id} muted>
                {id}
              </Chip>
            ),
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-line-soft pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-mono text-[13px] font-bold tracking-[0.05em] text-ink-dim uppercase">
            records
          </span>
          <b className="font-mono text-[15px] text-foreground tabular-nums">
            {design.presentCount} of {RECORD_KINDS.length}
          </b>
          <span className="font-serif text-[15px] text-ink-dim">
            authored records are present
          </span>
          {design.partialKinds.length > 0 ? (
            <span className="font-serif text-[15px] text-ink-dim">
              · {design.partialKinds.length} of those carry an empty part:{" "}
              <span className="font-mono text-[14px] text-accent-deep">
                {design.partialKinds.map((kind) => RECORD_LABEL[kind]).join(", ")}
              </span>
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {RECORD_KINDS.map((kind) => (
            <span
              key={kind}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-2/70 px-2.5 py-1"
            >
              <span className="font-mono text-[13px] text-ink-mid">{RECORD_LABEL[kind]}</span>
              <ReadinessPill state={design.verdicts[kind].state} className="px-2 py-0 text-[11.5px]" />
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip>{plural(design.epics.length, "epic", "epics")}</Chip>
          <Chip>{plural(design.slices.length, "slice", "slices")}</Chip>
          <Chip>{plural(design.decisions.length, "decision", "decisions")}</Chip>
          <Chip>{plural(design.pullRequests.length, "pull request", "pull requests")}</Chip>
          {design.epicDesignDocs > 0 ? (
            <Chip>{plural(design.epicDesignDocs, "epic design", "epic designs")}</Chip>
          ) : null}
          {ctx.model.counts.unresolvedSlices > 0 ? (
            <Chip muted>
              {plural(ctx.model.counts.unresolvedSlices, "slice", "slices")} with no epic
            </Chip>
          ) : null}
        </div>
      </div>
    </div>
  );
}
