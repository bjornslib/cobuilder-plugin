/**
 * Build, Pull requests, and Shipped.
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
 */

import { useMemo } from "react";

import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  ClipboardCheck,
  FileText,
  GitBranch,
  GitPullRequest,
  ListChecks,
  ListTree,
  PackageCheck,
  Plane,
  ShieldQuestion,
  Target,
} from "lucide-react";

import BasicAccordion from "@/components/smoothui/basic-accordion";
import type { PullRequestEntity, SliceEntity } from "@/data/types";
import { cn } from "@/lib/utils";

import type { WorkItem } from "./model";
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
  toneForEpicState,
  toneForStage,
} from "./atoms";
import type { TileSpan } from "./atoms";
import { EPIC_GLOSS } from "./gloss";

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

  const planRow = work.record?.goal.epics?.find((row) => row.id === epic.epic_id);
  const state = work.epicState(epic);
  const pr = work.epicPr(epic);
  const own = work.slicesByEpic.get(epic.id) ?? [];
  const design = work.epicDesigns.get(epic.id);
  const outcome = planRow?.outcome ?? epic.note ?? null;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="m-0 min-w-0 font-serif text-[16.5px] leading-[1.6] text-foreground">
        {outcome ?? "No outcome is recorded for this epic."}
      </p>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <StateBadge
          word={state}
          tone={toneForEpicState(state)}
          gloss={EPIC_GLOSS[state] ?? "A state outside the recorded vocabulary."}
        />
        <Chip dashed title="This is the refined state. The epic's raw recorded state can differ.">
          entity state {epic.state}
        </Chip>
        {epic.branch ? (
          <Chip title={epic.branch}>
            <GitBranch className="size-3.5" aria-hidden="true" />
            {excerpt(epic.branch, 34)}
          </Chip>
        ) : (
          <Chip dashed className="text-ink-faint">
            no branch
          </Chip>
        )}
        {pr === null ? (
          <Chip
            dashed
            className="text-ink-faint"
            title="No pull request is recorded for this epic."
          >
            no PR
          </Chip>
        ) : (
          <Chip tone="accent" title={`Pull request ${pr} carries this epic.`}>
            <GitPullRequest className="size-3.5" aria-hidden="true" />
            PR {pr}
          </Chip>
        )}
      </div>

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

      {/* ------------------------------------------------------- Gate 4b */}
      <div className="flex min-w-0 flex-col gap-2">
        <SubHead>Gate 4b technical solution design</SubHead>
        {design ? (
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Chip tone="accent">
                <ListChecks className="size-3.5" aria-hidden="true" />
                {design.body_md.length.toLocaleString()} characters
              </Chip>
              <Chip title={`This design belongs to the plan ${design.feature_slug}.`}>
                {design.feature_slug}
              </Chip>
            </div>
            <ActionButton
              icon={ListChecks}
              onClick={() =>
                openSheet({
                  kind: "epic-design",
                  doc: design,
                  epic,
                })
              }
              ariaLabel={`Open the Gate 4b design for epic ${epic.epic_id}`}
            >
              Open the design
            </ActionButton>
          </div>
        ) : (
          /*
            Two situations reach here, and the panel tells them apart rather than
            guessing. An epic of a work whose plan directory does not exist cannot have a
            design document, and no amount of looking will find one. An epic of a work
            that does have a plan directory is genuinely missing its own document. The
            first is a fact about the work, and the second is a gap in this epic.
          */
          <Missing>
            {work.hasPlan
              ? "This epic has no design document."
              : "This work has no plan directory yet, so no epic design documents exist for it."}
          </Missing>
        )}
      </div>

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

export function EpicsSection({
  work,
  focusEpic,
  openSheet,
  unresolvedSlices,
}: {
  work: WorkItem;
  focusEpic: string | null;
  openSheet: (subject: SheetSubject) => void;
  unresolvedSlices: number;
}) {
  /*
   * A route that names an epic opens that epic. The key remounts the accordion when
   * the route's epic changes, because `defaultExpandedIds` is read once at mount.
   */
  const items = useMemo(
    () =>
      work.epics.map((epic) => {
        const planRow = work.record?.goal.epics?.find((row) => row.id === epic.epic_id);
        const state = work.epicState(epic);
        const pr = work.epicPr(epic);
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
          meta: (
            <>
              {pr === null ? (
                <Chip dashed className="text-ink-faint">
                  no PR
                </Chip>
              ) : (
                <Chip tone="accent">PR {pr}</Chip>
              )}
              <Chip title="How many slices this epic owns.">
                {own.length} {own.length === 1 ? "slice" : "slices"}
              </Chip>
              <StateBadge
                word={state}
                tone={toneForEpicState(state)}
                gloss={EPIC_GLOSS[state] ?? "A state outside the recorded vocabulary."}
              />
            </>
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
      }),
    [work, openSheet],
  );

  return (
    <Bento>
      <Panel
        span="band"
        title={`Epics · ${work.epics.length}`}
        icon={ListTree}
        lead="One row per epic, with its refined state. An epic discloses its own slices, and a slice discloses its own ends-with, score, and attempts."
        absent={work.epics.length === 0}
      >
        {work.epics.length > 0 ? (
          <BasicAccordion
            key={`${work.id}:${focusEpic ?? ""}`}
            items={items}
            allowMultiple
            idPrefix="epic"
            defaultExpandedIds={focusEpic ? [`${work.id}/${focusEpic}`] : []}
          />
        ) : (
          <Missing>This work carries no epics, so the rail gates Build.</Missing>
        )}
      </Panel>

      {unresolvedSlices > 0 ? (
        <Panel
          span="narrow"
          title="Unresolved slices"
          icon={ShieldQuestion}
          lead="Slices that belong to no epic. This panel renders only while the bundle holds one."
        >
          <p className="m-0 min-w-0 font-serif text-[16px]">
            {unresolvedSlices} slices belong to no epic.
          </p>
        </Panel>
      ) : null}
    </Bento>
  );
}

export function RubricsSection({ work, gated }: { work: WorkItem; gated: boolean }) {
  const steps = work.gateSteps ?? [];
  return (
    <Bento>
      <Panel
        span="band"
        title="Rubrics"
        icon={ClipboardCheck}
        lead="The blind acceptance rubric each slice is scored against."
        absent={!(gated && steps.length > 0)}
      >
        {gated && steps.length > 0 ? (
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
        ) : (
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
        )}
      </Panel>
    </Bento>
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
  allPullRequests: PullRequestEntity[];
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
      <Panel
        span="band"
        title={`This work's pull requests · ${work.pullRequests.length}`}
        icon={GitPullRequest}
        lead="Only a pull request one of this work's own epics carries. A decision's pull request is not the work's, so it stays beside that decision in the Architecture level."
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
          <div className="flex min-w-0 flex-col gap-3">
            <EmptyNote>
              No epic of this work carries a pull request, so the rail gates this group.
              A pull request reached through a decision belongs to that decision instead.
            </EmptyNote>
            {work.decisionCarriers.size > 0 ? (
              <AbsentLine>
                {work.decisionCarriers.size} of this work&apos;s decisions reach a pull
                request. Each one is shown beside its decision in the Architecture level,
                labelled as the pull request that carried it.
              </AbsentLine>
            ) : null}
          </div>
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
  flightDeck: PullRequestEntity[];
  onOpenPr: (n: number) => void;
  /** The bento span the caller gives this panel, when the caller lays out a grid. */
  span: TileSpan;
}) {
  return (
    <Panel
      span={span}
      title="FlightDeck"
      icon={Plane}
      lead="The whole open set, one click away from this work. FlightDeck reads every open pull request, not only this work's."
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
  allPullRequests: PullRequestEntity[];
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
      line: "The author's own statement of what this pull request is for, captured by Generate mode before the code existed.",
    },
    {
      key: "problem-and-solution",
      title: "Pull request problem and solution",
      icon: FileText,
      line: "The assessed problem, the approach the diff takes, and the findings the assessment recorded against it.",
    },
    {
      key: "architecture",
      title: "Pull request architecture",
      icon: GitPullRequest,
      line: "The decisions the diff lands, the diagram levels for this pull request, and the scene art beside them.",
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
        lead="The stage the record carries, the publications the bundle holds, and the deploy record that does not exist."
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
