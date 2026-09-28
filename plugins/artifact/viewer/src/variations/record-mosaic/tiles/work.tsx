/**
 * The three tiles that carry planned and shipped work: epics with their slices,
 * the slices that belong to no epic, and the pull requests the design reaches.
 *
 * Two habits hold here.
 *
 *   - Real states render, and the wider vocabulary is named as intended. Not one
 *     epic in this bundle carries `in-progress`, `blocked`, or `in-review`, and not
 *     one slice carries `red`, `green`, or `validated`. The badges accept those
 *     values already, so a newer index renders correctly with no code change. The
 *     legend states which values the bundle holds today, so nothing is invented.
 *   - A slice is selectable. Every slice sits under its own epic, and a click opens
 *     its ends-with statement, its score, and its attempt count. Nothing surfaced
 *     those three fields before this variation.
 */

import AnimatedProgressBar from "@/components/smoothui/animated-progress-bar";
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  GitPullRequest,
  Layers,
  Link2,
} from "lucide-react";
import { useState } from "react";

import type { DesignModel, EpicModel, SliceModel } from "../records";
import { SCORE_THRESHOLD, EPIC_STATES_INTENDED, EPIC_STATES_REAL, SLICE_STATES_INTENDED } from "../types";
import { Chip, InfoBox, Reveal, SPAN, StateBadge, SubHead, Tile, plural } from "../ui";
import type { TileContext } from "./context";

const SPANS = {
  epics: SPAN[4],
  slices: SPAN[2],
  pullRequests: SPAN[3],
};

/* ------------------------------------------------------------------- epics */

export function EpicsTile({ design }: { design: DesignModel }) {
  const [openEpic, setOpenEpic] = useState<string | null>(design.epics[0]?.epic.id ?? null);
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);

  if (design.epics.length === 0) {
    return (
      <Tile
        label="Epics"
        icon={Layers}
        verdict={design.verdicts.epics}
        span={SPANS.epics}
        absentHint="goal.epics lists the units of work a design plans. This goal lists none, so there is nothing to build and no slice can hang from one."
      />
    );
  }

  const sliceCount = design.epics.reduce((total, epic) => total + epic.slices.length, 0);

  return (
    <Tile
      label="Epics"
      icon={Layers}
      verdict={design.verdicts.epics}
      span={SPANS.epics}
      absentHint=""
      headerExtra={
        <span className="flex flex-wrap items-center gap-2">
          {design.epicStatusCounts.map((entry) => (
            <span key={entry.status} className="inline-flex items-center gap-1.5">
              <StateBadge state={entry.status} />
              <span className="font-mono text-[13px] font-bold text-ink-dim tabular-nums">
                {entry.count}
              </span>
            </span>
          ))}
          <Chip>{sliceCount} slices nested</Chip>
        </span>
      }
      note={`${design.verdicts.epics.note} State comes from joins.epic_status, the refined value that build_index.py derives from the pull-request list. The epic entity's own state field is the unrefined placeholder.`}
    >
      <VocabularyLegend
        title="Intended epic states"
        chain={EPIC_STATES_INTENDED}
        present={EPIC_STATES_REAL}
        sentence="This UI renders all six values today. This bundle carries four."
      />

      <div className="flex flex-col gap-2">
        {design.epics.map((epic) => (
          <EpicRow
            key={epic.epic.id}
            epic={epic}
            open={openEpic === epic.epic.id}
            onToggle={() =>
              setOpenEpic((current) => (current === epic.epic.id ? null : epic.epic.id))
            }
            selectedSlice={selectedSlice}
            onSelectSlice={(sliceId) =>
              setSelectedSlice((current) => (current === sliceId ? null : sliceId))
            }
          />
        ))}
      </div>
    </Tile>
  );
}

function EpicRow({
  epic,
  open,
  onToggle,
  selectedSlice,
  onSelectSlice,
}: {
  epic: EpicModel;
  open: boolean;
  onToggle: () => void;
  selectedSlice: string | null;
  onSelectSlice: (sliceId: string) => void;
}) {
  const outcome = epic.goalEpic?.outcome ?? epic.epic.note ?? "The goal states no outcome for this epic.";
  const selected = epic.slices.find((entry) => entry.slice.id === selectedSlice) ?? null;

  return (
    <div className="rounded-lg border border-line bg-surface-2/40">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-3.5 py-3 text-left transition-colors duration-150 ease-house hover:bg-accent-wash/50"
      >
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-accent-deep" aria-hidden />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-accent-deep" aria-hidden />
        )}
        <span className="font-mono text-[15px] font-bold text-foreground">
          {epic.epic.epic_id}
        </span>
        <StateBadge
          state={epic.status}
          title={epic.resolved ? "refined by joins.epic_status" : "no refined state in the index"}
          className={epic.resolved ? undefined : "border-dashed"}
        />
        {epic.slices.length > 0 ? (
          <Chip>{plural(epic.slices.length, "slice", "slices")}</Chip>
        ) : null}
        {epic.designDoc ? <Chip>epic design</Chip> : null}
        {epic.pullRequest !== null ? (
          <Chip>
            <GitPullRequest className="size-3.5" aria-hidden />
            PR {epic.pullRequest}
          </Chip>
        ) : (
          <Chip muted>no PR</Chip>
        )}
        <span className="ml-auto font-mono text-[12.5px] text-ink-faint">{open ? "hide" : "open"}</span>
      </button>

      <p className="m-0 px-3.5 pb-3 pl-11 font-serif text-[16px] leading-[1.55] text-ink-mid">
        {outcome}
      </p>

      <Reveal show={open}>
        <div className="flex flex-col gap-3 px-3.5 pt-1 pb-3.5 pl-11">
          {epic.goalEpic?.note && epic.goalEpic.note !== outcome ? (
            <InfoBox label="Note in the goal" tone="note">
              {epic.goalEpic.note}
            </InfoBox>
          ) : null}

          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5">
            <span className="font-mono text-[12.5px] tracking-[0.05em] text-ink-faint uppercase">
              branch
            </span>
            <span className="font-mono text-[13.5px] text-ink-mid">
              {epic.epic.branch ?? "none recorded"}
            </span>
            <span className="font-mono text-[12.5px] tracking-[0.05em] text-ink-faint uppercase">
              refined state source
            </span>
            <span className="font-mono text-[13.5px] text-ink-mid">
              {epic.resolved ? "joins.epic_status" : `entity state: ${epic.epic.state}`}
            </span>
          </div>

          {epic.slices.length === 0 ? (
            <p className="m-0 font-serif text-[15.5px] leading-[1.55] text-ink-dim">
              No slice table entry names this epic. Nothing has been cut into slices for it.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <SubHead count={epic.slices.length}>Slices</SubHead>
              <div className="flex flex-col gap-1.5" role="list">
                {epic.slices.map((entry) => (
                  <SliceRow
                    key={entry.slice.id}
                    entry={entry}
                    selected={entry.slice.id === selectedSlice}
                    onSelect={() => onSelectSlice(entry.slice.id)}
                  />
                ))}
              </div>
              <Reveal show={selected !== null}>
                {selected ? <SliceDetail entry={selected} /> : null}
              </Reveal>
            </div>
          )}

          {epic.designDoc ? (
            <p className="m-0 flex items-center gap-2 font-mono text-[13px] text-ink-dim">
              <Link2 className="size-3.5 text-ink-faint" aria-hidden />
              The index records an epic technical solution design for{" "}
              {epic.epic.id}.
            </p>
          ) : null}
        </div>
      </Reveal>
    </div>
  );
}

function SliceRow({
  entry,
  selected,
  onSelect,
}: {
  entry: SliceModel;
  selected: boolean;
  onSelect: () => void;
}) {
  const cleared = entry.score !== null && entry.score >= SCORE_THRESHOLD;
  return (
    <div role="listitem">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={
          selected
            ? "flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-primary bg-accent-wash/70 px-3 py-2 text-left transition-colors duration-150 ease-house"
            : "flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-line-soft bg-card px-3 py-2 text-left transition-colors duration-150 ease-house hover:border-primary hover:bg-accent-wash/40"
        }
      >
        <span className="font-mono text-[13px] font-bold text-ink-faint tabular-nums">
          #{entry.slice.n}
        </span>
        <span className="min-w-[12ch] flex-1 font-serif text-[16px] leading-[1.5] text-foreground">
          {entry.slice.title}
        </span>
        <StateBadge state={entry.slice.state} />
        <span
          className={
            cleared
              ? "font-mono text-[13px] font-bold text-good tabular-nums"
              : "font-mono text-[13px] text-ink-dim tabular-nums"
          }
          title="validate score"
        >
          {entry.score === null ? "no score" : entry.score.toFixed(2)}
        </span>
        <span className="font-mono text-[13px] text-ink-dim tabular-nums" title="attempts">
          {entry.attempts} {entry.attempts === 1 ? "attempt" : "attempts"}
        </span>
        <span className="font-mono text-[12.5px] text-ink-faint">
          {selected ? "selected" : "select"}
        </span>
      </button>
    </div>
  );
}

function SliceDetail({ entry }: { entry: SliceModel }) {
  const percent = entry.score === null ? 0 : Math.round(entry.score * 100);
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/60 bg-accent-wash/40 px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Boxes className="size-4 text-accent-deep" aria-hidden />
        <SubHead>
          {entry.slice.id} — {entry.slice.title}
        </SubHead>
        <StateBadge state={entry.slice.state} className="ml-auto" />
      </div>

      <InfoBox label="Ends with" tone="note">
        {entry.slice.ends_with}
      </InfoBox>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <SubHead>Validate score</SubHead>
          <span className="font-mono text-[13.5px] text-ink-dim tabular-nums">
            {entry.score === null ? "no score recorded" : `${entry.score.toFixed(2)} of 1.00`}{" "}
            <span className="text-ink-faint">
              · threshold {SCORE_THRESHOLD.toFixed(2)}
            </span>
          </span>
        </div>
        <AnimatedProgressBar
          className="[&>div]:h-2"
          color="var(--good)"
          value={percent}
        />
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5">
          <span className="font-mono text-[13px] text-ink-dim">
            attempts{" "}
            <b className="text-foreground tabular-nums">{entry.attempts}</b>
          </span>
          <span className="font-mono text-[13px] text-ink-dim">
            feature <span className="text-ink-mid">{entry.slice.feature}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------- slices that belong to none */

export function UnresolvedSlicesTile({
  design,
  ctx,
}: {
  design: DesignModel;
  ctx: TileContext;
}) {
  const unresolved = ctx.model.unresolvedSlices;
  const verdict = design.verdicts.slices;

  return (
    <Tile
      label="Slices with no epic"
      icon={Boxes}
      verdict={verdict}
      pillWord={unresolved.length === 0 ? "none" : undefined}
      span={SPANS.slices}
      absentHint={`Nothing is missing here. joins.slice_to_epic resolves all ${ctx.model.counts.slices} slices in this bundle to an epic, so the unresolved set is empty and this tile has nothing to list.`}
      headerExtra={<Chip muted>bundle-wide, not design-scoped</Chip>}
      note={
        unresolved.length === 0
          ? "An unresolved slice is one no epic claims. This tile is empty because the join is complete."
          : verdict.note
      }
    >
      <VocabularyLegend
        title="Intended slice states"
        chain={SLICE_STATES_INTENDED}
        present={["completed"]}
        sentence={`Every slice in this bundle reads completed. Score and attempts are real and surfaced here.`}
      />

      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <span className="font-mono text-[13px] text-ink-dim">
          resolved{" "}
          <b className="text-foreground tabular-nums">
            {ctx.model.counts.slices - unresolved.length}
          </b>{" "}
          of <span className="tabular-nums">{ctx.model.counts.slices}</span>
        </span>
        <span className="font-mono text-[13px] text-ink-dim">
          unresolved <b className="text-foreground tabular-nums">{unresolved.length}</b>
        </span>
      </div>

      {unresolved.length > 0 ? (
        <div className="flex flex-col gap-2">
          {unresolved.map((slice) => (
            <div
              key={slice.id}
              className="flex flex-col gap-1 rounded-lg border border-line bg-surface-2/50 px-3.5 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[13px] font-bold text-ink-faint tabular-nums">
                  #{slice.n}
                </span>
                <StateBadge state={slice.state} className="ml-auto" />
              </div>
              <span className="font-serif text-[16px] leading-[1.5] text-foreground">
                {slice.title}
              </span>
              <span className="font-mono text-[13px] text-ink-dim">
                {slice.id} · no epic claims this slice
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </Tile>
  );
}

/* ------------------------------------------------------------ pull requests */

export function PullRequestsTile({ design }: { design: DesignModel }) {
  if (design.pullRequests.length === 0) {
    return (
      <Tile
        label="Pull requests"
        icon={GitPullRequest}
        verdict={design.verdicts["pull-requests"]}
        span={SPANS.pullRequests}
        absentHint="A pull request reaches a design through joins.epic_to_pull_request or joins.adr_to_pull_request. Neither join reaches one for this design, so no pull request carries its work."
      />
    );
  }

  return (
    <Tile
      label="Pull requests"
      icon={GitPullRequest}
      verdict={design.verdicts["pull-requests"]}
      span={SPANS.pullRequests}
      absentHint=""
      note={design.verdicts["pull-requests"].note}
    >
      <div className="flex flex-col gap-2">
        {design.pullRequests.map((entry) => (
          <div
            key={entry.pr}
            className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface-2/50 px-3.5 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[14px] font-bold text-accent-deep">
                PR {entry.pr}
              </span>
              {entry.entity ? (
                <StateBadge state={entry.entity.state} className="ml-auto" />
              ) : (
                <Chip muted className="ml-auto">
                  no entity in the index
                </Chip>
              )}
            </div>
            <span className="font-serif text-[16.5px] leading-[1.5] font-semibold text-foreground">
              {entry.entity?.title ?? "The index holds no pull_request entity for this number."}
            </span>
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5">
              {entry.entity?.date ? (
                <span className="font-mono text-[13px] text-ink-dim">{entry.entity.date}</span>
              ) : null}
              {entry.entity?.commit ? (
                <span className="font-mono text-[13px] text-ink-faint">
                  {entry.entity.commit}
                </span>
              ) : null}
            </div>
            <span className="font-mono text-[13px] text-ink-dim">
              reached through {entry.routes.join(", ")}
            </span>
            {entry.publication ? (
              <a
                href={entry.publication.artifact_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex cursor-pointer items-center gap-1.5 self-start rounded-md border border-line bg-card px-2.5 py-1 font-mono text-[13px] font-bold text-accent-deep underline-offset-2 transition-colors duration-150 ease-house hover:border-primary hover:bg-accent-wash hover:underline"
              >
                <Link2 className="size-4" aria-hidden />
                Published artifact, {entry.publication.published_at.slice(0, 10)}
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </Tile>
  );
}

/* ------------------------------------------------------------------ legend */

/**
 * The intended vocabulary, marked as intended. The chain shows the states this UI
 * is built to render, and `present` names the values the bundle carries today. A
 * reviewer sees both, so the wider vocabulary is visible without a fake record
 * behind it.
 */
export function VocabularyLegend({
  title,
  chain,
  present,
  sentence,
}: {
  title: string;
  chain: string[];
  present: string[];
  sentence: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-primary/60 bg-accent-wash/30 px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <CircleDashed className="size-4 text-accent-deep" aria-hidden />
        <span className="font-mono text-[13px] font-bold tracking-[0.05em] text-accent-deep uppercase">
          {title} — a prototype target, not data
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {chain.map((state, index) => (
          <span key={state} className="inline-flex items-center gap-1.5">
            <StateBadge state={state} />
            {index < chain.length - 1 ? (
              <ChevronRight className="size-3.5 text-ink-faint" aria-hidden />
            ) : null}
          </span>
        ))}
      </div>
      <p className="m-0 max-w-[80ch] font-serif text-[15px] leading-[1.55] text-ink-dim">
        {sentence} The bundle records these values today:{" "}
        <span className="font-mono text-[14px] text-ink-mid">{present.join(", ")}</span>.
      </p>
    </div>
  );
}
