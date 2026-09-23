/**
 * The Build region: the anchor of this variation.
 *
 * Every epic the design owns is a card here, in order, with its slices nested under
 * it and selectable. This is the largest region on the page, because the work is what
 * the page is about. The lens tiles arrange around it and follow whatever is selected
 * here.
 *
 * Three honest states live in this file:
 *
 *   - An epic with no design document says so in its record strip and in its body.
 *   - A design that is superseded says who closed it, and its card reads differently
 *     from a live design.
 *   - A slice that resolves to no epic is listed at the foot of the region, under its
 *     own heading, rather than dropped.
 */

import { useEffect, useMemo, useState } from "react";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ChevronDown,
  FileText,
  GitBranch,
  GitMerge,
  Layers,
  Notebook,
  Play,
  ScrollText,
  Split,
} from "lucide-react";

import TiltCard from "@/components/smoothui/tilt-card";
import { cn } from "@/lib/utils";
import type { SliceEntity } from "@/data/types";

import {
  Chip,
  ENTER_EASE,
  LinkButton,
  Panel,
  PrototypeNote,
  RecordStrip,
  SectionLabel,
  StatePill,
  Stat,
  TextButton,
  Unavailable,
} from "./atoms";
import { epicSlots, type EpicDetail } from "./data";
import { designScope, type Scope, type ScopeData } from "./scope";
import { epicMove } from "./states";

/* ---------------------------------------------------------------- the strip */

/** One epic's four records, as a row of chips. */
export function EpicSlots({ detail, plan }: { detail: EpicDetail; plan: ScopeData["plan"] }) {
  return <RecordStrip slots={epicSlots(detail, plan)} label="epic records" />;
}

/* ------------------------------------------------------------ slice button */

/**
 * One slice, as a selectable row.
 *
 * The number is the slice's own `n`: its position in the plan. The index records no
 * epic-relative number, so this board shows `#4` and never invents `E4.2`.
 */
export function SliceButton({
  slice,
  epicId,
  selected,
  onSelect,
}: {
  slice: SliceEntity;
  epicId: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      title={`Select slice #${slice.n}: ${slice.title}`}
      className={cn(
        "group flex w-full cursor-pointer flex-col gap-1.5 rounded-lg border px-3 py-2.5 text-left transition-colors duration-150 ease-house",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        selected
          ? "border-primary bg-accent-wash"
          : "border-line-soft bg-surface hover:border-line hover:bg-surface-2",
      )}
    >
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[12.5px] font-bold text-accent-deep tabular-nums">
          {epicId} · #{slice.n}
        </span>
        <Chip tone="good" title={`The plan records this slice as ${slice.state}.`}>
          {slice.state}
        </Chip>
        {slice.score ? (
          <Chip title={`The validator scored this slice ${slice.score}.`}>
            score {slice.score}
          </Chip>
        ) : (
          <Chip dashed title="The plan records no score for this slice.">
            no score
          </Chip>
        )}
        <Chip
          title={`The slice loop took ${slice.attempts} ${slice.attempts === 1 ? "attempt" : "attempts"} to reach an accepted state.`}
        >
          {slice.attempts} {slice.attempts === 1 ? "attempt" : "attempts"}
        </Chip>
        <Play
          className={cn(
            "ml-auto size-4 shrink-0 transition-colors duration-150 ease-house",
            selected ? "text-accent-deep" : "text-ink-faint group-hover:text-accent-deep",
          )}
        />
      </span>
      <span className="font-serif text-[16px] leading-[1.5] text-foreground">
        {slice.title}
      </span>
      <span className="font-mono text-[12px] leading-[1.55] text-ink-dim">
        ends with: {slice.ends_with}
      </span>
    </button>
  );
}

/* --------------------------------------------------------------- epic card */

function EpicCard({
  detail,
  data,
  open,
  selected,
  onToggle,
  onSelectEpic,
  onSelectSlice,
}: {
  detail: EpicDetail;
  data: ScopeData;
  open: boolean;
  selected: boolean;
  onToggle: () => void;
  onSelectEpic: () => void;
  onSelectSlice: (sliceId: string) => void;
}) {
  const reduce = useReducedMotion();
  const { epic, status, pr, pullRequest, slices, doc, indexPath, planRow } = detail;
  const move = epicMove(status);
  const superseded = status === "superseded";
  const selectedSliceId =
    data.scope.kind === "slice" ? data.scope.sliceId : null;

  /**
   * The outcome line lives in the goal record, not in the index. The index's epic
   * entity carries no outcome field at all. So a missing line has two causes, and the
   * board states which one it is.
   */
  const outcome = planRow?.outcome ?? null;
  const outcomeGap =
    data.records === null
      ? "designs.js did not load, so this epic's outcome line is not available. The index carries no outcome field for an epic."
      : "The goal record carries no outcome line for this epic.";

  /*
   * THE EPIC CARD CARRIES A TILT, on the same reasoning as the design card. It is
   * an object in a list, and the tilt hints that it opens, which it does: the
   * chevron beside it discloses the epic's slices.
   *
   * `glare={false}` is the tilt-without-glare variant. The component renders its
   * glare overlay only when `glare` is true, so that one prop is the whole
   * difference between the two variants.
   */
  return (
    <TiltCard glare={false}>
      <article
        className={cn(
          "overflow-hidden rounded-xl border bg-card shadow-card transition-shadow duration-150 ease-house hover:shadow-raise",
          selected ? "border-primary ring-1 ring-primary/40" : "border-line",
          superseded && "border-dashed opacity-80",
        )}
      >
        <div className="flex items-stretch">
          <button
            type="button"
            onClick={onSelectEpic}
            title={`Select epic ${epic.epic_id} and scope the lens tiles to it`}
            className={cn(
              "flex min-w-0 flex-1 cursor-pointer flex-col gap-2 px-4 py-3.5 text-left transition-colors duration-150 ease-house",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
              selected ? "bg-accent-wash" : "hover:bg-surface-2",
            )}
          >
            <span className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-[15px] font-bold tracking-[-0.01em]">
                {epic.epic_id}
              </span>
              <StatePill
                value={status}
                intended={move?.intended ?? null}
                intendedWhy={move?.because}
              />
              {pr !== null ? (
                <Chip icon={GitMerge} title={`Pull request ${pr} carries this epic.`}>
                  PR {pr}
                </Chip>
              ) : (
                <Chip dashed icon={GitBranch} title="No pull request reaches this epic in the index.">
                  no PR
                </Chip>
              )}
              {slices.length > 0 ? (
                <Chip icon={Layers} title={`${slices.length} slices resolve to this epic.`}>
                  {slices.length} {slices.length === 1 ? "slice" : "slices"}
                </Chip>
              ) : (
                <Chip dashed icon={Layers} title="No slice in the index resolves to this epic.">
                  no slices
                </Chip>
              )}
              {doc ? (
                <Chip icon={FileText} title={doc.title}>
                  design doc
                </Chip>
              ) : (
                <Chip
                  dashed
                  icon={FileText}
                  className="text-warn"
                  title={`No Gate 4b document for this epic. docs/plans/${data.plan.slug}/epic-${epic.epic_id}-design.md is not in the index.`}
                >
                  no design doc
                </Chip>
              )}
            </span>
            <span className="font-serif text-[16.5px] leading-[1.5] text-foreground">
              {outcome ?? outcomeGap}
            </span>
            <span className="font-mono text-[12px] text-ink-faint">
              {epic.id}
              {epic.branch ? ` · ${epic.branch}` : " · no branch"}
              {indexPath && indexPath !== epic.id ? ` · index says design_doc ${indexPath}` : ""}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            title={open ? "Collapse this epic" : "Expand this epic's slices and records"}
            className={cn(
              "flex w-12 shrink-0 cursor-pointer items-center justify-center border-l border-line-soft text-ink-dim transition-colors duration-150 ease-house",
              "hover:bg-surface-2 hover:text-foreground",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
            )}
          >
            <ChevronDown
              className={cn(
                "size-5 transition-transform duration-200 ease-house",
                open && "rotate-180",
              )}
            />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="body"
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.24, ease: ENTER_EASE }}
              className="overflow-hidden border-t border-line-soft"
            >
              <div className="flex flex-col gap-3.5 bg-surface-2/60 px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Panel title="What this epic ends with" tone="accent" icon={ScrollText}>
                    <p className="m-0">{outcome ?? outcomeGap}</p>
                    {planRow?.slug ? (
                      <p className="mt-2 mb-0 font-mono text-[12px] text-ink-faint">
                        goal.epics[].slug = {planRow.slug}
                      </p>
                    ) : null}
                  </Panel>
                  <Panel title="The author's note" icon={Notebook}>
                    <p className="m-0 text-[15.5px] leading-[1.6] text-ink-mid">
                      {epic.note ?? "The goal record carries no note for this epic."}
                    </p>
                  </Panel>
                </div>

                <div className="rounded-lg border border-line-soft bg-surface px-3.5 py-3">
                  <EpicSlots detail={detail} plan={data.plan} />
                  {indexPath && indexPath !== epic.id ? (
                    <PrototypeNote className="mt-2.5">
                      The index&apos;s own <span className="font-bold">design_doc</span> field reads{" "}
                      {indexPath}, and this board resolved {epic.id} instead. The field compares
                      the design id against the plan slug, and this design&apos;s slug is{" "}
                      {data.plan.slug}. The document on disk is the one this board shows.
                    </PrototypeNote>
                  ) : null}
                </div>

                <div>
                  <SectionLabel icon={Layers}>
                    Slices under {epic.epic_id}
                    <span className="ml-1 text-ink-faint normal-case">
                      {slices.length === 0
                        ? "none resolve here"
                        : `${slices.length} selectable`}
                    </span>
                  </SectionLabel>
                  {slices.length === 0 ? (
                    <Unavailable
                      reason="No slice in the index resolves to this epic."
                      detail={`joins.slice_to_epic holds ${Object.keys(data.joins.slice_to_epic).length} entries across the whole index, and none of them names ${epic.id}.`}
                    />
                  ) : (
                    <div className="flex flex-col gap-2">
                      {slices.map((slice) => (
                        <SliceButton
                          key={slice.id}
                          slice={slice}
                          epicId={epic.epic_id}
                          selected={selectedSliceId === slice.id}
                          onSelect={() => onSelectSlice(slice.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {doc ? (
                    <TextButton
                      icon={FileText}
                      onClick={onSelectEpic}
                      title="Select this epic and read its design document in the Intent tile."
                    >
                      Read the design document in the Intent tile
                    </TextButton>
                  ) : null}
                  {pullRequest ? (
                    <Chip icon={GitMerge}>
                      PR {pullRequest.id} · {pullRequest.state}
                      {pullRequest.commit ? ` · ${pullRequest.commit}` : ""}
                      {pullRequest.date ? ` · ${pullRequest.date}` : ""}
                    </Chip>
                  ) : null}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </article>
    </TiltCard>
  );
}

/* ------------------------------------------------------------ the region */

export function BuildRegion({
  data,
  onSelect,
}: {
  data: ScopeData;
  onSelect: (scope: Scope) => void;
}) {
  const { epics, design, designRecord, supersede, scope } = data;

  const [open, setOpen] = useState<string[]>([]);

  /**
   * Open the epic a selection points at, and nothing else. A reader who selects a
   * slice in the tiles sees its epic open here, under the selection.
   */
  const focusEpicId = useMemo(() => {
    if (scope.kind === "epic") return scope.epicId;
    if (scope.kind === "slice") {
      const found = [...data.slicesByEpic.entries()].find(([, list]) =>
        list.some((slice) => slice.id === scope.sliceId),
      );
      return found ? found[0] : null;
    }
    return null;
  }, [scope, data.slicesByEpic]);

  useEffect(() => {
    if (!focusEpicId) return;
    setOpen((current) =>
      current.includes(focusEpicId) ? current : [...current, focusEpicId],
    );
  }, [focusEpicId]);

  const toggle = (epicId: string) =>
    setOpen((current) =>
      current.includes(epicId)
        ? current.filter((id) => id !== epicId)
        : [...current, epicId],
    );

  const title = designRecord?.goal.title ?? design.name;
  const superseded = design.stage === "superseded";

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* ------------------------------------------------ the design itself */}
      <section
        className={cn(
          "overflow-hidden rounded-2xl border bg-card shadow-card",
          superseded ? "border-dashed border-line" : "border-line",
        )}
      >
        <div className="flex flex-col gap-3.5 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <Chip
              tone={superseded ? "neutral" : "accent"}
              icon={superseded ? Split : GitBranch}
              title={
                superseded
                  ? `This design's stage is superseded.`
                  : `This design's stage is ${design.stage}.`
              }
            >
              {design.stage}
            </Chip>
            <LinkButton
              onClick={() => onSelect(designScope(design.id))}
              icon={Split}
              title="Select the whole design and return every lens tile to design scope"
            >
              whole design
            </LinkButton>
            <span className="ml-auto font-mono text-[12px] text-ink-faint">
              plan {data.plan.slug}
              {data.plan.via === "slice" ? " (derived from slice ids)" : ""}
            </span>
          </div>

          <h2 className="m-0 font-mono text-[26px] leading-[1.15] font-bold tracking-[-0.03em]">
            {design.name}
          </h2>
          <p className="m-0 max-w-[86ch] font-serif text-[19px] leading-[1.5] text-ink-mid">
            {title}
          </p>

          {superseded ? (
            <div className="rounded-lg border border-dashed border-line bg-surface-2 px-3.5 py-3">
              <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12px] tracking-[0.06em] text-ink-dim uppercase">
                <Split className="size-4 shrink-0" />
                superseded by
                {supersede.by ? (
                  <LinkButton
                    onClick={() =>
                      onSelect(designScope(supersede.by as string))
                    }
                    title={`Select ${supersede.by}, the design that closed this one`}
                  >
                    {supersede.by}
                  </LinkButton>
                ) : (
                  <span className="text-warn normal-case">
                    a design this record does not name
                  </span>
                )}
              </p>
              <p className="mt-2 mb-0 font-serif text-[15.5px] leading-[1.55] text-ink-mid">
                {supersede.byNote ??
                  "The record names no note. goal.superseded_by carries the id and nothing more."}
              </p>
            </div>
          ) : null}

          <p className="m-0 max-w-[92ch] font-serif text-[16.5px] leading-[1.6] text-foreground">
            {design.outcome}
          </p>

          <div className="flex flex-wrap items-start gap-x-9 gap-y-4">
            <Stat value={epics.length} label="epics" />
            <Stat value={data.doneEpics} label="epics merged" tone="good" />
            <Stat value={data.designSlices.length} label="slices" />
            <Stat value={supersede.supersedes.length} label="designs closed" />
            <Stat value={data.diagrams.length} label="diagram levels" />
            <Stat
              value={`${data.slots.filter((slot) => slot.present).length}/6`}
              label="records"
              tone={data.allSlotsPresent ? "good" : "warn"}
            />
          </div>

          {/*
           * Which of the six authored records exist, named one by one. A missing record
           * is a chip that states so in its tooltip, and this strip is what makes
           * "six of six" a claim a reader can check rather than a number to trust.
           */}
          <div className="rounded-lg border border-line-soft bg-surface-2 px-3.5 py-3">
            <RecordStrip
              slots={data.slots}
              label={`authored records in docs/architecture/designs/${design.id}/`}
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- the epic list */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <SectionLabel className="mb-0" icon={Layers}>
            The build
          </SectionLabel>
          <span className="font-mono text-[12.5px] text-ink-dim">
            {epics.length} {epics.length === 1 ? "epic" : "epics"} in{" "}
            <span className="text-foreground">{design.name}</span>, each with its
            slices nested. Select one to scope the tiles to it.
          </span>
        </div>

        {epics.length === 0 ? (
          <Unavailable
            reason="This design owns no epic."
            detail="docs/architecture/designs/<name>/goal.json holds an empty epics list, so this design has no work to show."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {epics.map((detail) => (
              <EpicCard
                key={detail.epic.id}
                detail={detail}
                data={data}
                open={open.includes(detail.epic.id)}
                selected={
                  scope.kind === "epic"
                    ? scope.epicId === detail.epic.id
                    : scope.kind === "slice"
                      ? (data.slicesByEpic.get(detail.epic.id) ?? []).some(
                          (slice) => slice.id === scope.sliceId,
                        )
                      : false
                }
                onToggle={() => toggle(detail.epic.id)}
                onSelectEpic={() =>
                  onSelect({
                    kind: "epic",
                    designId: data.designId,
                    epicId: detail.epic.id,
                  })
                }
                onSelectSlice={(sliceId) =>
                  onSelect({ kind: "slice", designId: data.designId, sliceId })
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------ unresolved slices */}
      <section className="rounded-xl border border-line bg-card px-4 py-3.5 shadow-card">
        <SectionLabel icon={Layers}>Slices that resolve to no epic</SectionLabel>
        <p className="m-0 max-w-[86ch] font-serif text-[15.5px] leading-[1.55] text-ink-mid">
          {data.unresolved.length === 0
            ? `Every slice in the index resolves to an epic. joins.slice_to_epic holds ${Object.keys(data.joins.slice_to_epic).length} entries and the index holds ${data.entities.slice.length} slice rows, so nothing is dropped from this board.`
            : `${data.unresolved.length} slice rows resolve to no epic. They are listed here rather than dropped.`}
        </p>
        {data.unresolved.length > 0 ? (
          <ul className="mt-3 flex list-none flex-col gap-2 p-0">
            {data.unresolved.map((row) => (
              <li key={row.slice.id}>
                <TextButton
                  onClick={() =>
                    onSelect({
                      kind: "slice",
                      designId: data.designId,
                      sliceId: row.slice.id,
                    })
                  }
                  icon={Play}
                  title="Select this slice"
                >
                  {row.slice.id} — {row.slice.title}
                </TextButton>
                <span className="ml-2 font-mono text-[12px] text-ink-faint">
                  {row.unresolvedReason ?? "the index records no reason"}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------- design tile */

/**
 * The design rail: every design in the lane, as a selectable card.
 *
 * It sits above the two columns rather than inside either one, because it belongs to
 * the lane tabs. A superseded design never appears in a lane, so it appears here only
 * under All, and it carries its own dashed treatment.
 */
export function DesignRail({
  rows,
  activeId,
  onSelect,
}: {
  rows: Array<{
    id: string;
    name: string;
    stage: string;
    epics: number;
    done: number;
    supersededBy: string | null;
  }>;
  activeId: string;
  onSelect: (designId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {rows.map((row) => {
        const current = row.id === activeId;
        const superseded = row.stage === "superseded";
        return (
          <button
            key={row.id}
            type="button"
            onClick={() => onSelect(row.id)}
            aria-current={current ? "true" : undefined}
            title={
              superseded
                ? `${row.name} is superseded by ${row.supersededBy ?? "a design it does not name"}. Select it anyway to read it as history.`
                : `Select ${row.name}`
            }
            className={cn(
              "flex cursor-pointer flex-col gap-1 rounded-xl border px-3.5 py-2.5 text-left transition-colors duration-150 ease-house",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              current
                ? "border-primary bg-accent-wash"
                : "border-line bg-card hover:bg-surface-2",
              superseded && !current && "border-dashed",
            )}
          >
            <span className="flex items-center gap-2">
              <span className="font-mono text-[13px] font-bold">{row.name}</span>
              <Chip tone={superseded ? "neutral" : "accent"} dashed={superseded}>
                {row.stage}
              </Chip>
            </span>
            <span className="font-mono text-[12px] text-ink-dim tabular-nums">
              {superseded
                ? `superseded by ${row.supersededBy ?? "unnamed"}`
                : `${row.done}/${row.epics} epics merged`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
