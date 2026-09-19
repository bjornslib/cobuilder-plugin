/**
 * The Build lens. The largest tile in the mosaic, because it carries the most.
 *
 * It holds the epic tree, with each epic's slices nested underneath it. Selecting an
 * epic expands its slices in place, so the epic heading stays on screen while they
 * are open. Selecting a slice reveals that slice's `ends_with`, its score, and its
 * attempt count, none of which any surface printed before this one.
 *
 * TWO JOINTS DECIDE WHAT SITS UNDER WHAT, AND BOTH COME FROM THE INDEX:
 *
 *   `joins.slice_to_epic` is the only correct source for a slice's epic. The slice's
 *   own `feature` field names the plan directory, which is not always the design id.
 *   `cobuilder-family/14` is the real example: the feature is `cobuilder-family` and
 *   the epic is `plugin-split/E6`.
 *
 *   `joins.epic_status` is the refined state. `epic.state` on the entity is the
 *   placeholder that `refine_epic_status()` overwrites when it can. This tile reads
 *   the join first and falls back to the entity, and it names which one it read.
 *
 * Slices the join cannot place are listed at the foot of the tile with their stated
 * reason. In this corpus the join resolves all 29, so that section says so rather
 * than rendering nothing.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ChevronRight,
  CircleDashed,
  FileText,
  Hammer,
  Link2Off,
} from "lucide-react";

import type { DesignRow, EpicEntity, Joins, SliceEntity } from "@/data/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { StateRail, StateLegend } from "./StateRail";
import {
  AbsentLine,
  Chip,
  CLICKABLE_ROW,
  Disclosure,
  LensTile,
  LoadingLine,
  Prose,
  ProseBox,
  ScrollList,
  SectionLabel,
  StateBadge,
} from "./primitives";
import type { DesignRecord, GoalEpic, RecordsLoad } from "./records";
import { EPIC_VOCABULARY, SLICE_VOCABULARY, epicMapping, sliceMapping } from "./vocab";

const ENTER_EASE = [0.22, 0.75, 0.3, 1] as const;
const IN_FLIGHT = new Set(["open", "no-pull-request", "in-progress", "unknown"]);

function goalEpicOf(record: DesignRecord | null, epicId: string): GoalEpic | null {
  return record?.goal.epics?.find((entry) => entry.id === epicId) ?? null;
}

/** The state the index carries, and the field it came from. */
function rawEpicState(epic: EpicEntity, joins: Joins): { state: string; source: string } {
  const joined = joins.epic_status[epic.id];
  if (joined) return { state: joined, source: "joins.epic_status" };
  return { state: epic.state, source: "epic.state" };
}

function slicesOfEpic(
  row: DesignRow,
  epicId: string,
  joins: Joins,
): SliceEntity[] {
  return row.slices.filter((slice) => joins.slice_to_epic[slice.id] === epicId);
}

export function BuildTile({
  row,
  record,
  recordsLoad,
  joins,
  epicDesignTitles,
}: {
  row: DesignRow;
  record: DesignRecord | null;
  recordsLoad: RecordsLoad;
  joins: Joins;
  epicDesignTitles: Map<string, string>;
}) {
  const reduce = useReducedMotion();
  const [openEpic, setOpenEpic] = useState<string | null>(null);
  const [openSlice, setOpenSlice] = useState<string | null>(null);
  const headerRefs = useRef(new Map<string, HTMLButtonElement>());
  const mounted = useRef(false);

  // Keep the epic heading on screen while its slices are open. `nearest` scrolls
  // only when the heading has left the viewport, so a short list does not jump.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (!openEpic) return;
    const heading = headerRefs.current.get(openEpic);
    heading?.scrollIntoView({
      block: "nearest",
      behavior: reduce ? "auto" : "smooth",
    });
  }, [openEpic, reduce]);

  const { design, epics, slices, done, pullRequests } = row;
  const inFlight = epics.filter((epic) =>
    IN_FLIGHT.has(rawEpicState(epic, joins).state),
  ).length;
  const epicCount = epics.length;

  const unresolved = Object.entries(joins.slice_to_epic_unresolved);

  return (
    <LensTile
      id={`lens-build-${design.id}`}
      icon={Hammer}
      title="Build"
      sub={
        epicCount === 0
          ? "No epic is recorded for this design in the index"
          : `${epicCount} ${epicCount === 1 ? "epic" : "epics"} · ${slices.length} ${
              slices.length === 1 ? "slice" : "slices"
            } · ${done} merged or completed · ${inFlight} in flight`
      }
      action={
        pullRequests.length > 0 ? (
          <span className="flex flex-wrap justify-end gap-1.5">
            {pullRequests.map((number) => (
              <Chip key={number} tone="accent" title="joins.epic_to_pull_request">
                PR {number}
              </Chip>
            ))}
          </span>
        ) : (
          <Chip tone="muted" title="No epic in this design resolves to a pull request.">
            no pull request
          </Chip>
        )
      }
    >
      {epicCount === 0 ? (
        <AbsentLine>
          The index records no epic for {design.id}. An approved design records its
          epics in <code className="font-mono text-[13px]">goal.json</code>, so this
          design has not reached that stage.
        </AbsentLine>
      ) : (
        <div className="flex flex-col gap-3.5">
          <Disclosure label="Intended state vocabulary" kind="prototype">
            <div className="flex flex-col gap-2.5">
              <StateLegend
                scope="epic"
                vocabulary={EPIC_VOCABULARY}
                from="plugins/implement/scripts/verify_gate.py's state set, widened by this prototype"
                note="The index epic entity carries planned, open, completed, or merged, and joins.epic_status refines that to unstarted, no-pull-request, unknown, or the pull request's own state."
              />
              <StateLegend
                scope="slice"
                vocabulary={SLICE_VOCABULARY}
                from="docs/plans/<slug>/04-slices.md, the one slice table parser"
                note="Every slice in this corpus is completed. The score and the attempt count are real and this tile prints both."
              />
            </div>
          </Disclosure>

          <ScrollList label="Epic tree" count={epics.length}>
            <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
              {epics.map((epic) => {
                const raw = rawEpicState(epic, joins);
                const goal = goalEpicOf(record, epic.epic_id);
                const own = slicesOfEpic(row, epic.id, joins);
                const isOpen = openEpic === epic.id;
                const docTitle = epic.design_doc
                  ? epicDesignTitles.get(epic.design_doc)
                  : undefined;

                return (
                  <li
                    key={epic.id}
                    className={cn(
                      "overflow-hidden rounded-lg border bg-card",
                      isOpen ? "border-primary ring-1 ring-primary/25" : "border-line",
                    )}
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`epic-body-${epic.id}`}
                      ref={(node) => {
                        if (node) headerRefs.current.set(epic.id, node);
                        else headerRefs.current.delete(epic.id);
                      }}
                      onClick={() => {
                        setOpenEpic(isOpen ? null : epic.id);
                        setOpenSlice(null);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 px-3.5 py-3 text-left",
                        CLICKABLE_ROW,
                      )}
                    >
                      <ChevronRight
                        className={cn(
                          "mt-0.5 size-4 shrink-0 text-ink-faint transition-transform duration-200 ease-house",
                          isOpen && "rotate-90 text-primary",
                        )}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="font-mono text-[13px] font-bold text-accent-deep">
                            {epic.epic_id}
                          </span>
                          <span className="font-mono text-[15.5px] leading-[1.35] font-bold underline decoration-line decoration-1 underline-offset-[3px]">
                            {goal?.slug ?? epic.epic_id}
                          </span>
                          <StateBadge
                            state={raw.state}
                            title={`Read from ${raw.source}. The rail under this epic shows where the prototype places it.`}
                          />
                        </span>
                        {goal?.outcome ? (
                          <span className="mt-1.5 block max-w-[80ch] font-serif text-[15px] leading-[1.5] text-ink-mid">
                            {goal.outcome}
                          </span>
                        ) : null}
                        <span className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Chip
                            tone={own.length > 0 ? "plain" : "muted"}
                            title="joins.slice_to_epic"
                          >
                            {own.length} {own.length === 1 ? "slice" : "slices"}
                          </Chip>
                          {epic.branch ? (
                            <Chip tone="muted" title={epic.branch}>
                              {epic.branch}
                            </Chip>
                          ) : (
                            <Chip tone="muted">no branch</Chip>
                          )}
                          {docTitle ? (
                            <Chip tone="accent" title={docTitle}>
                              <FileText className="size-3.5" aria-hidden="true" />
                              epic design
                            </Chip>
                          ) : null}
                          {goal?.note ? (
                            <Chip tone="dashed">author note</Chip>
                          ) : null}
                        </span>
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen ? (
                        <motion.div
                          key="body"
                          id={`epic-body-${epic.id}`}
                          initial={reduce ? false : { height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={reduce ? { opacity: 1 } : { height: 0, opacity: 0 }}
                          transition={{ duration: reduce ? 0 : 0.22, ease: ENTER_EASE }}
                          className="overflow-hidden border-t border-line"
                        >
                          <div className="flex flex-col gap-3 bg-surface-2 px-3.5 py-3.5">
                            {goal?.outcome ? (
                              <ProseBox
                                title="Epic outcome"
                                source="goal.json"
                              >
                                <Prose>{goal.outcome}</Prose>
                              </ProseBox>
                            ) : (
                              <AbsentLine>
                                The index carries this epic and the goal record holds no
                                outcome line for it.
                              </AbsentLine>
                            )}

                            {/*
                              The index copies the goal's note onto the epic entity, so
                              the two are usually the same sentence. Print it once, and
                              name the goal record as the source, because that is where
                              the author wrote it.
                            */}
                            {goal?.note || epic.note ? (
                              <ProseBox
                                title="Author note"
                                source={goal?.note ? "goal.json" : "index.json"}
                              >
                                <Prose>{goal?.note ?? epic.note ?? ""}</Prose>
                              </ProseBox>
                            ) : null}

                            <StateRail
                              scope="epic states"
                              vocabulary={EPIC_VOCABULARY}
                              mapping={epicMapping(raw.state)}
                              raw={raw.state}
                              rawSource={raw.source}
                            />

                            <div>
                              <SectionLabel count={own.length}>
                                Slices under {epic.epic_id}
                              </SectionLabel>
                              {own.length === 0 ? (
                                <AbsentLine>
                                  joins.slice_to_epic places no slice under this epic. The
                                  join resolves {slices.length} for this design and{" "}
                                  {Object.keys(joins.slice_to_epic).length} in the whole
                                  corpus.
                                </AbsentLine>
                              ) : (
                                <ol className="m-0 flex list-none flex-col gap-2 p-0">
                                  {own.map((slice) => (
                                    <SliceRow
                                      key={slice.id}
                                      slice={slice}
                                      open={openSlice === slice.id}
                                      onToggle={() =>
                                        setOpenSlice(openSlice === slice.id ? null : slice.id)
                                      }
                                      reduce={Boolean(reduce)}
                                    />
                                  ))}
                                </ol>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ol>
          </ScrollList>

          <UnresolvedSlices entries={unresolved} />

          {recordsLoad.state === "loading" ? (
            <LoadingLine>
              Reading data/designs.js for each epic's slug, outcome, and author note.
            </LoadingLine>
          ) : null}
          {recordsLoad.state === "failed" ? (
            <AbsentLine>
              The authored records did not load, so this tree shows the index's own
              fields: the epic id, its state, its branch, and its slices. The reason is
              in the panel above the mosaic.
            </AbsentLine>
          ) : null}
        </div>
      )}
    </LensTile>
  );
}

function SliceRow({
  slice,
  open,
  onToggle,
  reduce,
}: {
  slice: SliceEntity;
  open: boolean;
  onToggle: () => void;
  reduce: boolean;
}) {
  const score = slice.score ? Number.parseFloat(slice.score) : null;
  const belowThreshold = score !== null && score < 1;

  return (
    <li
      className={cn(
        "overflow-hidden rounded-lg border bg-card",
        open ? "border-primary" : "border-line",
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`slice-body-${slice.id}`}
        onClick={onToggle}
        className={cn("flex w-full items-start gap-2.5 px-3 py-2.5 text-left", CLICKABLE_ROW)}
      >
        <ChevronRight
          className={cn(
            "mt-0.5 size-3.5 shrink-0 text-ink-faint transition-transform duration-200 ease-house",
            open && "rotate-90 text-primary",
          )}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-mono text-[12.5px] font-bold text-ink-dim tabular-nums">
              slice {slice.n}
            </span>
            <span className="font-serif text-[15.5px] leading-[1.4] font-semibold underline decoration-line decoration-1 underline-offset-[3px]">
              {slice.title}
            </span>
            <StateBadge
              state={slice.state}
              title="The slice table's own state, from docs/plans/<slug>/04-slices.md"
            />
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Chip tone={belowThreshold ? "warn" : "good"} title="The validator's score for this slice.">
              score {slice.score ?? "not recorded"}
            </Chip>
            <Chip tone={slice.attempts > 1 ? "warn" : "plain"} title="How many attempts the slice took.">
              {slice.attempts} {slice.attempts === 1 ? "attempt" : "attempts"}
            </Chip>
            <Chip tone="muted" title="The plan directory the slice belongs to.">
              {slice.feature}
            </Chip>
          </span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="body"
            id={`slice-body-${slice.id}`}
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 1 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: ENTER_EASE }}
            className="overflow-hidden border-t border-line-soft"
          >
            <div className="flex flex-col gap-3 bg-surface-2 px-3 py-3">
              <ProseBox title="Ends with" source="04-slices.md">
                <Prose>{slice.ends_with}</Prose>
              </ProseBox>

              <div className="grid gap-2 sm:grid-cols-3">
                <MeasureCard
                  label="Validator score"
                  value={slice.score ?? "none"}
                  note={
                    slice.score
                      ? belowThreshold
                        ? "Below a clean pass. The slice was accepted anyway, on a later attempt."
                        : "A clean pass: the validator scored it at the top of its range."
                      : "The slice table records no score for this slice."
                  }
                />
                <MeasureCard
                  label="Attempts"
                  value={String(slice.attempts)}
                  note={
                    slice.attempts === 1
                      ? "Accepted on the first run."
                      : `Accepted after ${slice.attempts - 1} ${
                          slice.attempts === 2 ? "revision" : "revisions"
                        }.`
                  }
                />
                <MeasureCard
                  label="State"
                  value={slice.state}
                  note="The slice table's own state, not the intended vocabulary."
                />
              </div>

              <StateRail
                scope="slice states"
                vocabulary={SLICE_VOCABULARY}
                mapping={sliceMapping(slice.state)}
                raw={slice.state}
                rawSource="04-slices.md"
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

function MeasureCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-card px-3 py-2.5">
      <p className="m-0 font-mono text-[12px] tracking-[0.06em] text-ink-faint uppercase">
        {label}
      </p>
      <p className="m-0 mt-1 font-mono text-[20px] leading-none font-bold tabular-nums">
        {value}
      </p>
      <p className="m-0 mt-1.5 font-serif text-[14px] leading-[1.45] text-ink-dim">
        {note}
      </p>
    </div>
  );
}

/**
 * Slices the join cannot place. In this corpus the object is empty, and this
 * section says that in words rather than rendering nothing. When the join does hold
 * an entry, each one prints with the reason `build_index.py` recorded for it.
 */
function UnresolvedSlices({ entries }: { entries: Array<[string, string]> }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface-2 px-3.5 py-3">
      <div className="mb-1.5 flex items-center gap-2">
        <Link2Off className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
        <span className="font-mono text-[12.5px] font-bold text-ink-mid">
          Slices with no epic
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Chip tone={entries.length === 0 ? "good" : "warn"}>
                {entries.length}
              </Chip>
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-80 font-serif text-[14px]">
            joins.slice_to_epic_unresolved holds a slice whose epic the index could not
            derive. It carries the reason rather than a guessed epic.
          </TooltipContent>
        </Tooltip>
      </div>
      {entries.length === 0 ? (
        <p className="m-0 max-w-[80ch] font-serif text-[15px] leading-[1.5] text-ink-mid">
          The join resolves every slice in this corpus, so none is orphaned. A slice
          lands here when its plan directory names no epic that the index can find.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {entries.map(([sliceId, reason]) => (
            <li
              key={sliceId}
              className="flex items-start gap-2.5 rounded-lg border border-warn bg-warn-wash px-3 py-2.5"
            >
              <CircleDashed className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden="true" />
              <span>
                <span className="block font-mono text-[13px] font-bold">{sliceId}</span>
                <span className="mt-0.5 block font-serif text-[15px] leading-[1.5] text-ink-mid">
                  {reason}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
