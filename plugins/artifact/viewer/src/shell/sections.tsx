/**
 * The sections of the Build, Pull requests, and Shipped levels.
 *
 * These sections extend the three levels rather than replacing them, and the rail
 * keeps the levels one click away while a reader is here.
 *
 * BUILD IS AN ACCORDION OF EPICS, AND A SLICE HAS NO OTHER HOME. Section 2.1 states
 * the rule: a slice belongs to one epic and carries no meaning outside it, so the rail
 * never lists slices and `build/slices` is not a route. Each epic discloses its own
 * slices, and each slice discloses its own ends-with, score, and attempt count. The
 * nested accordion is the shape, because the content repeats twice at two depths.
 *
 * Every list in this file is an excerpt. The epic list shows all eighteen rows because
 * the row itself is the structure under review. Everything below a row states its
 * absence or its count and stops, and whatever is longer than that opens in a Sheet.
 *
 * THIS FILE IS THE PORTED PROTOTYPE at `src/variations/sections-e/sections.tsx`, with
 * two changes. `epicGroups` moved to `./model`, because the program design places every
 * work-item derivation there. The record reads use optional chaining on `goal`, because
 * the shipped record type declares it possibly absent whereas the variation's copy did
 * not. The level entry points that name these sections are `./panels/Build.tsx`,
 * `./panels/PullRequests.tsx`, and `./panels/Shipped.tsx`.
 */

import { useEffect, useMemo } from "react";

import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  ClipboardCheck,
  Compass,
  FileText,
  GitPullRequest,
  ListChecks,
  ListTree,
  PackageCheck,
  Plane,
  ShieldQuestion,
  Target,
} from "lucide-react";

import BasicAccordion from "@/components/smoothui/basic-accordion";
import type { AccordionItem } from "@/components/smoothui/basic-accordion";
import type { EpicEntity, PullRequest, SliceEntity } from "@/data/types";
import { cn } from "@/lib/utils";

import type { WorkItem } from "./model";
import { STAGE_PUBLICATIONS_DEPLOY_LEAD } from "./model";
import { MarkdownBlock } from "./markdown";
import { excerpt } from "./records";
import type { SheetSubject } from "./Sheet";
import {
  AbsentLine,
  ActionButton,
  Bento,
  Box,
  Chip,
  EmptyNote,
  KeyValue,
  Missing,
  Panel,
  StateBadge,
  SubHead,
  toneForStage,
} from "./atoms";
import type { TileSpan } from "./atoms";

/* --------------------------------------------------------------------- Build */

function SliceDisclosure({
  slices,
  idPrefix,
}: {
  slices: SliceEntity[];
  idPrefix: string;
}) {
  /* The caller gates on an empty list, so this is a guard rather than a state. */
  if (slices.length === 0) return null;

  const items = slices.map((slice) => ({
    id: slice.id,
    title: (
      <span className="flex min-w-0 flex-1 items-baseline gap-2.5">
        <span className="shrink-0 font-mono text-[14px] font-bold text-accent-deep tabular-nums">
          #{slice.n}
        </span>
        <span className="min-w-0 font-serif text-[16px] leading-[1.45]">{slice.title}</span>
      </span>
    ),
    meta: (
      <>
        {slice.score ? (
          <Chip title="The score the independent validator gave this slice.">
            {slice.score}
          </Chip>
        ) : (
          <Chip dashed className="text-ink-faint" title="No score is recorded for this slice.">
            no score
          </Chip>
        )}
        <Chip title="How many attempts the slice loop took.">
          {slice.attempts} {slice.attempts === 1 ? "attempt" : "attempts"}
        </Chip>
        <StateBadge
          word={slice.state}
          tone={slice.state === "completed" ? "good" : "neutral"}
          gloss="The slice's own state field."
        />
      </>
    ),
    content: (
      <div className="flex min-w-0 flex-col gap-3">
        <Box label="Ends with">
          {slice.ends_with ? (
            slice.ends_with
          ) : (
            <span className="text-ink-dim">The slice records no ends-with condition.</span>
          )}
        </Box>
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-5 gap-y-2">
          <KeyValue label="slice" value={slice.id} />
          <KeyValue label="n" value={slice.n} />
          <KeyValue label="feature" value={slice.feature} />
          <KeyValue label="score" value={slice.score ?? "unrecorded"} />
          <KeyValue label="attempts" value={slice.attempts} />
        </div>
      </div>
    ),
  }));

  return (
    <BasicAccordion
      items={items}
      allowMultiple={false}
      idPrefix={idPrefix}
      className="border-line-soft bg-card"
      flush
    />
  );
}

function EpicDisclosure({
  work,
  epicId,
  index,
  openSheet,
}: {
  work: WorkItem;
  epicId: string;
  index: number;
  openSheet: (subject: SheetSubject) => void;
}) {
  const epic = work.epics.find((candidate) => candidate.epic_id === epicId);
  if (!epic) return null;

  const planRow = work.record?.goal?.epics?.find((row) => row.id === epic.epic_id);
  const own = work.slicesByEpic.get(epic.id) ?? [];
  const design = work.epicDesigns.get(epic.id);
  const outcome = planRow?.outcome ?? epic.note ?? null;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="m-0 min-w-0 font-serif text-[16.5px] leading-[1.6] text-foreground">
        {outcome ?? "No outcome is recorded for this epic."}
      </p>

      {/*
        THE CARD CARRIES NO BOOKKEEPING ROW. It used to open with the refined state as a
        pill, the epic's raw state, and its branch. The engineer removed all three: a
        state of `no-pull-request` and a raw state of `planned` are the bundle talking to
        itself, and the branch is one line the top bar already states for the work. What
        is left is what the epic is: its outcome here, its slices below.
      */}

      {/*
        The slices block is absent when the epic owns no slice, on the same rule sections
        follow. An epic with no slices states the count on its own row, so a block that
        held nothing but a sentence about holding nothing is gone.
      */}
      {own.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-2">
          <SubHead count={own.length}>Slices</SubHead>
          <SliceDisclosure slices={own} idPrefix={`slice-${epic.epic_id}`} />
        </div>
      ) : null}

      {/*
        THE DESIGN BLOCK RENDERS ONLY WHEN A DESIGN EXISTS. It used to hold a sub-head
        and a sentence for the case with no document, told apart by whether the work has
        a plan directory at all. The engineer removed both sentences: a card states what
        the epic has, and an epic with no document states nothing.

        The sub-head names the document and not the gate. `Gate 4b` is a process step,
        and the document is a technical solution design.

        The two chips went as well. A character count and a plan slug are bookkeeping
        about where the document lives, and this shell names no field path and no file it
        read. The action is the whole of what a reader needs.
      */}
      {design ? (
        <div className="flex min-w-0 flex-col gap-2">
          <SubHead>Technical solution design</SubHead>
          <ActionButton
            icon={ListChecks}
            onClick={() =>
              openSheet({
                kind: "epic-design",
                doc: design,
                epic,
              })
            }
            ariaLabel={`Open the technical solution design for epic ${epic.epic_id}`}
          >
            Open the design
          </ActionButton>
        </div>
      ) : null}

      <div className="flex min-w-0 items-baseline gap-3 border-t border-line-soft pt-2.5">
        <span className="font-mono text-[12px] text-ink-faint tabular-nums">
          epic {index + 1} of {work.epics.length}
        </span>
        <span className="min-w-0 font-mono text-[12px] break-words text-ink-faint">
          {epic.id}
        </span>
      </div>
    </div>
  );
}

/**
 * How many epics one section of the paged Build level holds, and the cut itself, are
 * stated in `./model.ts` as `epicGroups`. The cut is a derivation, and the shell keeps
 * every derivation in one file. `EpicGroupSection` below states the same rule to the
 * reader, in the panel's own lead.
 */

/** The accordion rows for a set of epics, in the order the caller gives them. */
function epicRows(
  work: WorkItem,
  epics: EpicEntity[],
  openSheet: (subject: SheetSubject) => void,
): AccordionItem[] {
  return epics.map((epic) => {
    const planRow = work.record?.goal?.epics?.find((row) => row.id === epic.epic_id);
    const own = work.slicesByEpic.get(epic.id) ?? [];
    return {
      id: epic.id,
      title: (
        <span className="flex min-w-0 flex-1 items-baseline gap-2.5">
          <span className="shrink-0 font-mono text-[14px] font-bold text-accent-deep">
            {epic.epic_id}
          </span>
          <span className="min-w-0 font-serif text-[16px] leading-[1.45]">
            {excerpt(planRow?.outcome ?? epic.note ?? "No outcome recorded.", 120)}
          </span>
        </span>
      ),
      /*
        THE ROW CARRIES NO STATE PILL EITHER. It used to show the refined state beside the
        slice count, and the refined state of every epic in this work is
        `no-pull-request`, which is the join talking about the absence of a pull request
        rather than about the epic. The count is the epic's own content, so it stays.
      */
      meta: (
        <Chip title="How many slices this epic owns.">
          {own.length} {own.length === 1 ? "slice" : "slices"}
        </Chip>
      ),
      content: (
        <EpicDisclosure
          work={work}
          epicId={epic.epic_id}
          index={work.epics.indexOf(epic)}
          openSheet={openSheet}
        />
      ),
    };
  });
}

/**
 * One section of the paged Build level: a run of epics in delivery order.
 *
 * The title names the range the section holds, so the strip says which epics are in the
 * box a reader is looking at. The route's epic opens here when it falls in this run, and
 * the section the reader lands on is the one that holds it.
 */
export function EpicGroupSection({
  work,
  group,
  focusEpic,
  openSheet,
}: {
  work: WorkItem;
  group: EpicEntity[];
  focusEpic: string | null;
  openSheet: (subject: SheetSubject) => void;
}) {
  const items = useMemo(() => epicRows(work, group, openSheet), [work, group, openSheet]);
  const holds = focusEpic !== null && group.some((epic) => epic.epic_id === focusEpic);
  const first = group[0]?.epic_id ?? "";
  const last = group[group.length - 1]?.epic_id ?? "";

  return (
    <Panel
      title={`Epics ${first}–${last}`}
      icon={ListTree}
      lead={`${group.length} epics in delivery order.`}
      absent={group.length === 0}
      count={group.length}
    >
      <BasicAccordion
        /* The key remounts the accordion when the route's epic changes, because
           `defaultExpandedIds` is read once at mount. */
        key={`${work.id}:${holds ? focusEpic : ""}`}
        items={items}
        allowMultiple
        idPrefix="epic"
        defaultExpandedIds={holds && focusEpic !== null ? [`${work.id}/${focusEpic}`] : []}
      />
    </Panel>
  );
}

/** Slices that belong to no epic. It renders only while the bundle holds one. */
export function UnresolvedSlicesSection({ count }: { count: number }) {
  return (
    <Panel
      title="Unresolved slices"
      icon={ShieldQuestion}
      lead="Slices that belong to no epic."
    >
      <p className="m-0 min-w-0 font-serif text-[16px]">{count} slices belong to no epic.</p>
    </Panel>
  );
}

export function RubricsSection({
  work,
  gated,
  openSheet,
  focus = null,
}: {
  work: WorkItem;
  gated: boolean;
  openSheet: (subject: SheetSubject) => void;
  /**
   * The slice number the route's tail names, or null. A tail that names a slice
   * with a rubric opens that rubric's Sheet on arrival.
   */
  focus?: string | null;
}) {
  const steps = work.gateSteps ?? [];
  const focusSlice =
    focus !== null ? (work.slices.find((slice) => String(slice.n) === focus) ?? null) : null;
  const focusRubric =
    focusSlice === null ? null : (work.rubricBySlice.get(focusSlice.id) ?? null);

  /*
   * THE ROUTE'S SLICE OPENS ITS RUBRIC HERE. The epic-design Sheet opens only from a
   * press, and no route reaches it. A rubric tail route names a real record, so this
   * opens the Sheet through the same `openSheet` callback a press uses, on mount. That
   * needs no new state channel: the App owns the subject, and the route names which
   * one. The shell remounts this section when the tail changes, so a second arrival
   * opens the second rubric, and a Sheet the reader closed stays closed.
   */
  useEffect(() => {
    if (focusSlice === null || focusRubric === null) return;
    openSheet({ kind: "rubric", doc: focusRubric, slice: focusSlice });
  }, [focusSlice, focusRubric, openSheet]);

  /*
   * THE RUBRIC READING SURFACE. One row per slice, in slice order. A row with a rubric
   * is a button that opens the whole document in the Sheet, the same way an epic's
   * technical solution design opens, because a rubric is deep content and a panel that
   * held it would bury its own subject. A slice with no rubric keeps its row and
   * states the absence in place. It is not a button, so a press cannot open an empty
   * Sheet, and the honest-absence phrasing the interaction design pins stays where
   * the reader looks for the record.
   *
   * The block is absent when the work holds no slice, on the rule this file states
   * above: a block that held nothing but a sentence about holding nothing is gone, and
   * each epic's own row already states its slice count.
   */
  const rubricRows =
    work.slices.length > 0 ? (
      <div className="mt-4 flex min-w-0 flex-col gap-2">
        <SubHead count={work.slices.length}>Slice rubrics</SubHead>
        {work.slices.map((slice) => {
          const rubric = work.rubricBySlice.get(slice.id);
          if (!rubric) {
            return (
              <div
                key={slice.id}
                data-testid="rubric-empty"
                className="flex min-w-0 items-center gap-3 rounded-lg border border-dashed border-warn bg-warn-wash px-3.5 py-2.5"
              >
                <span className="shrink-0 font-mono text-[14px] font-bold text-accent-deep tabular-nums">
                  #{slice.n}
                </span>
                <span className="min-w-0 font-serif text-[15.5px] leading-[1.55] text-ink-mid">
                  No rubric document exists for slice {slice.n}. An absent record is not a
                  passed gate.
                </span>
              </div>
            );
          }
          return (
            <button
              key={slice.id}
              type="button"
              onClick={() => openSheet({ kind: "rubric", doc: rubric, slice })}
              aria-label={`Open the acceptance rubric for slice ${slice.n}`}
              className={cn(
                "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg border border-line-soft bg-card px-3.5 py-2 text-left",
                "transition-colors duration-150 ease-house hover:bg-surface-2",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              )}
            >
              <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
              <span className="shrink-0 font-mono text-[14px] font-bold text-accent-deep tabular-nums">
                #{slice.n}
              </span>
              <span className="min-w-0 flex-1 truncate font-serif text-[16px]">{slice.title}</span>
              <span className="flex shrink-0 flex-wrap gap-1.5">
                {slice.score ? (
                  <Chip title="The score the independent validator gave this slice.">
                    {slice.score}
                  </Chip>
                ) : (
                  <Chip dashed className="text-ink-faint" title="No score is recorded for this slice.">
                    no score
                  </Chip>
                )}
                <StateBadge
                  word={slice.state}
                  tone={slice.state === "completed" ? "good" : "neutral"}
                  gloss="The slice's own state field."
                />
              </span>
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <Bento>
      <Panel
        span="band"
        title="Rubrics"
        icon={ClipboardCheck}
        lead="The gate record this work runs under, and the rubric each slice was scored against."
        absent={!(gated && steps.length > 0)}
      >
        {gated && steps.length > 0 ? (
          <>
            <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">
              {steps.map((step) => (
                <li
                  key={step.n}
                  className="flex min-w-0 items-center gap-3 rounded-lg border border-line-soft bg-surface-2/50 px-3 py-2"
                >
                  <Chip>{step.n}</Chip>
                  <span className="min-w-0 flex-1 font-serif text-[16px]">{step.name}</span>
                  <StateBadge
                    word={step.state}
                    tone={step.state === "approved" ? "good" : "neutral"}
                  />
                </li>
              ))}
            </ul>
            {rubricRows}
          </>
        ) : (
          <>
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-dashed border-warn bg-warn-wash px-3.5 py-3">
                <p className="m-0 flex items-center gap-2 font-mono text-[12px] font-bold tracking-[0.06em] text-warn uppercase">
                  <ShieldQuestion className="size-4 shrink-0" aria-hidden="true" />
                  No gate record exists
                </p>
                <p className="m-0 min-w-0 font-serif text-[16px] leading-[1.55] text-ink-mid">
                  This work has no gate record, so this section has nothing to read. That is
                  an absent record, not a passed gate. It must not read as a pass.
                </p>
              </div>
              <AbsentLine>
                No gate record carries this work. An absent record is not a passed gate.
              </AbsentLine>
            </div>
            {rubricRows}
          </>
        )}
      </Panel>
    </Bento>
  );
}

/* ---------------------------------------------------------------------- Plan */

const PLAN_BLOCKS = [
  { kind: "product", gate: "Gate 1 — Product", noun: "product document" },
  { kind: "architecture", gate: "Gate 2 — Architecture", noun: "architecture document" },
  { kind: "program", gate: "Gate 3 — Program design", noun: "program design" },
] as const;

export function PlanSection({ work, focus = null }: { work: WorkItem; focus?: string | null }) {
  /*
   * A gate tail route names one block. The scroll runs on the next frame, after the
   * shell's own scroll reset, and with no animation.
   */
  useEffect(() => {
    if (!PLAN_BLOCKS.some((block) => block.kind === focus)) return;
    const frame = requestAnimationFrame(() => {
      document
        .querySelector(`[data-plan-block="${focus}"]`)
        ?.scrollIntoView({ behavior: "auto", block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [focus, work.id]);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {PLAN_BLOCKS.map(({ kind, gate, noun }) => {
        const doc = work.planDocs[kind];
        return (
          <section
            key={kind}
            id={`plan-${kind}`}
            data-plan-block={kind}
            className="flex min-w-0 flex-col gap-3 rounded-lg border border-line-soft bg-surface-2/50 px-4 py-3"
          >
            <p className="m-0 font-mono text-[12px] font-bold tracking-[0.06em] text-ink-mid uppercase">
              {gate}
            </p>
            {doc ? (
              <>
                {doc.source_path ? (
                  <p className="m-0 min-w-0 break-all font-mono text-[12px] text-ink-mid">
                    {doc.source_path}
                  </p>
                ) : null}
                <div className="min-w-0 overflow-x-auto">
                  <MarkdownBlock markdown={doc.body_md} />
                </div>
              </>
            ) : (
              <p data-testid="plan-empty" className="m-0 font-serif text-[16px] text-ink-dim">
                No {noun} for this work yet.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------- Pull requests */

export function PullRequestsSection({
  work,
  focusPr,
  allPullRequests,
  onOpenPr,
}: {
  work: WorkItem;
  focusPr: number | null;
  allPullRequests: PullRequest[];
  onOpenPr: (n: number) => void;
}) {
  const flightDeck = allPullRequests.filter((pr) => pr.state === "open");

  if (focusPr !== null) {
    return (
      <PullRequestDetail
        work={work}
        prNumber={focusPr}
        allPullRequests={allPullRequests}
        onOpenPr={onOpenPr}
      />
    );
  }

  return (
    <Bento>
      {/*
        THE PULL REQUEST THIS WORK WILL OPEN LEADS THE SECTION. It used to sit on the
        Architecture level as "Envisioned pull request", beside the decisions that shaped
        it. A reader who comes to this level wants the work's pull requests, and the draft
        is the one this work will open, so it belongs above them. The title says what it
        is, because a draft is not a pull request that exists.
      */}
      {work.record?.pr_draft ? (
        <Panel
          span="band"
          title="The pull request this work will open"
          icon={Compass}
          lead="The pull request that the design planned before the code existed. This pull request is not open."
        >
          <Box label="Draft">{excerpt(work.record.pr_draft, 260)}</Box>
        </Panel>
      ) : null}

      <Panel
        span="band"
        title={`This work's pull requests · ${work.pullRequests.length}`}
        icon={GitPullRequest}
        absent={work.pullRequests.length === 0}
      >
        {work.pullRequests.length > 0 ? (
          <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">
            {work.pullRequests.map((pr) => (
              <li key={pr.id} className="min-w-0 list-none">
                <button
                  type="button"
                  onClick={() => onOpenPr(pr.id)}
                  className={cn(
                    "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg border border-line-soft bg-card px-3.5 py-2 text-left",
                    "transition-colors duration-150 ease-house hover:bg-surface-2",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  )}
                >
                  <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
                  <span className="shrink-0 font-mono text-[13px] font-bold text-accent-deep">
                    PR {pr.id}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-serif text-[16px]">
                    {pr.title}
                  </span>
                  <span className="flex shrink-0 flex-wrap gap-1.5">
                    {(work.pullRequestVia.get(pr.id) ?? []).slice(0, 3).map((epicId) => (
                      <Chip key={epicId} className="text-ink-faint" title="The epic that carries it.">
                        epic {epicId}
                      </Chip>
                    ))}
                  </span>
                  <StateBadge
                    word={pr.state}
                    tone={pr.state === "merged" ? "good" : pr.state === "open" ? "accent" : "neutral"}
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote>
            No epic of this work carries a pull request yet. The draft above is the one
            this work will open.
          </EmptyNote>
        )}
      </Panel>

      <FlightDeckPanel flightDeck={flightDeck} onOpenPr={onOpenPr} span="band" />
    </Bento>
  );
}

export function FlightDeckPanel({
  flightDeck,
  onOpenPr,
  span,
}: {
  flightDeck: PullRequest[];
  onOpenPr: (n: number) => void;
  /** The bento span the caller gives this panel, when the caller lays out a grid. */
  span: TileSpan;
}) {
  return (
    <Panel
      span={span}
      title="FlightDeck"
      icon={Plane}
      absent={flightDeck.length === 0}
    >
      {flightDeck.length > 0 ? (
        <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">
          {flightDeck.map((pr) => (
            <li key={pr.id} className="min-w-0 list-none">
              <button
                type="button"
                onClick={() => onOpenPr(pr.id)}
                className={cn(
                  "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg border border-line-soft bg-card px-3.5 py-2 text-left",
                  "transition-colors duration-150 ease-house hover:bg-surface-2",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                )}
              >
                <span className="shrink-0 font-mono text-[13px] font-bold text-accent-deep">
                  PR {pr.id}
                </span>
                <span className="min-w-0 flex-1 truncate font-serif text-[16px]">{pr.title}</span>
                <Chip className="text-ink-faint">{pr.date ?? "no date"}</Chip>
                <StateBadge word={pr.state} tone="accent" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Missing>The bundle holds no open pull request.</Missing>
      )}
    </Panel>
  );
}

/**
 * One pull request, with its own three levels.
 *
 * Section 5.3 puts this in the scroll pane rather than in a Sheet, so it stays here. The
 * bundle holds a pull request's intent and assessment on the story timeline entry, which
 * this surface does not read. So each level states what it will hold and stops.
 */
function PullRequestDetail({
  work,
  prNumber,
  allPullRequests,
  onOpenPr,
}: {
  work: WorkItem;
  prNumber: number;
  allPullRequests: PullRequest[];
  onOpenPr: (n: number) => void;
}) {
  const pr = allPullRequests.find((candidate) => candidate.id === prNumber);
  const flightDeck = allPullRequests.filter((candidate) => candidate.state === "open");
  const own = work.pullRequests.some((candidate) => candidate.id === prNumber);
  const levels: Array<{ key: string; title: string; icon: LucideIcon; line: string }> = [
    {
      key: "intent",
      title: "Pull request intent",
      icon: Target,
      line: "The purpose of this pull request, in the words of its author, from before the code existed.",
    },
    {
      key: "problem-and-solution",
      title: "Pull request problem and solution",
      icon: FileText,
      line: "The problem, the approach of the diff, and the findings of the assessment.",
    },
    {
      key: "architecture",
      title: "Pull request architecture",
      icon: GitPullRequest,
      line: "The decisions of the diff, the diagrams, and the scene art.",
    },
  ];

  return (
    <Bento>
      <Panel
        span="band"
        title={`PR ${prNumber}`}
        icon={GitPullRequest}
        lead={pr?.title ?? "This pull request is not in the bundle."}
        absent={!pr}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {pr ? <StateBadge word={pr.state} tone={pr.state === "merged" ? "good" : "accent"} /> : null}
          {pr?.commit ? <Chip>{pr.commit.slice(0, 9)}</Chip> : null}
          {pr?.date ? <Chip>{pr.date}</Chip> : null}
          {own ? (
            <Chip tone="accent">
              one of this work&apos;s own epics carries it, via{" "}
              {work.pullRequestVia.get(prNumber)?.join(", ")}
            </Chip>
          ) : (
            <Chip dashed className="text-ink-faint">
              belongs to another work item
            </Chip>
          )}
        </div>
      </Panel>

      {levels.map((level) => (
        <Panel
          key={level.key}
          span="narrow"
          title={level.title}
          icon={level.icon}
          lead={level.line}
          absent
        >
          <EmptyNote>
            This surface does not read a pull request&apos;s own story records yet, so this
            level renders nothing. The pull request above is real, and its three levels are
            not.
          </EmptyNote>
        </Panel>
      ))}

      <FlightDeckPanel flightDeck={flightDeck} onOpenPr={onOpenPr} span="band" />
    </Bento>
  );
}

/* ------------------------------------------------------------------- Shipped */

export function ShippedSection({ work }: { work: WorkItem }) {
  const implemented = work.design.stage === "implemented";
  const shipped = implemented || work.publications.length > 0;
  return (
    <Bento>
      <Panel
        span="band"
        title="Release status"
        icon={PackageCheck}
        lead={STAGE_PUBLICATIONS_DEPLOY_LEAD}
        absent={!shipped}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <StateBadge word={work.design.stage} tone={toneForStage(work.design.stage)} />
          <Chip>{work.publications.length} publications</Chip>
          <Chip
            title="A publication counts here only when a pull request this work's own epics carry owns it."
          >
            keyed to this work&apos;s own pull requests
          </Chip>
        </div>

        <div className="mt-3.5 flex min-w-0 flex-col gap-2.5">
          <AbsentLine>
            No deploy record exists in this corpus. The section reports the stage and any
            publication instead, and states the gap rather than implying a release.
          </AbsentLine>
          {work.publications.length > 0 ? (
            <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">
              {work.publications.map((publication) => (
                <li
                  key={publication.id}
                  className="flex min-w-0 flex-col gap-1 rounded-lg border border-line-soft bg-surface-2/50 px-3 py-2"
                >
                  <span className="min-w-0 font-mono text-[13px] break-words text-ink-mid">
                    {publication.id}
                  </span>
                  <span className="font-mono text-[12px] text-ink-faint">
                    PR {publication.pull_request} · {publication.published_at}
                  </span>
                </li>
              ))}
            </ul>
          ) : implemented ? (
            <Box label="The stage carries this section" tone="note">
              The design&apos;s stage reads implemented, so this section renders even though
              no publication names one of this work&apos;s own pull requests.
            </Box>
          ) : (
            <AbsentLine>
              No publication names one of this work&apos;s own pull requests.
            </AbsentLine>
          )}
        </div>
      </Panel>
    </Bento>
  );
}
