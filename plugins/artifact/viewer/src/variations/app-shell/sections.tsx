/**
 * Build, Pull requests, and Shipped.
 *
 * These sections extend the three levels rather than replacing them, and the rail
 * keeps the levels one click away while a reader is here.
 *
 * Every list in this file is an excerpt. The epic list shows all eighteen rows
 * because the row itself is the structure under review. Everything below a row states
 * its absence or its count and stops.
 */

import { useState } from "react";

import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  ClipboardCheck,
  GitBranch,
  GitPullRequest,
  ListTree,
  PackageCheck,
  Plane,
  Rows3,
  ShieldQuestion,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import type { PullRequestEntity, SliceEntity } from "@/data/types";
import { cn } from "@/lib/utils";

import type { WorkItem } from "./model";
import { excerpt } from "./records";
import {
  AbsentLine,
  Chip,
  Missing,
  Panel,
  SourceLine,
  StateBadge,
  toneForEpicState,
  toneForStage,
} from "./atoms";
import { EPIC_GLOSS } from "./gloss";

/* --------------------------------------------------------------------- Build */

function EpicRow({
  work,
  epicId,
  index,
  defaultOpen,
}: {
  work: WorkItem;
  epicId: string;
  index: number;
  defaultOpen: boolean;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(defaultOpen);
  const epic = work.epics.find((candidate) => candidate.epic_id === epicId);
  if (!epic) return null;

  const planRow = work.record?.goal.epics?.find((row) => row.id === epic.epic_id);
  const state = work.epicState(epic);
  const pr = work.epicPr(epic);
  const own = work.slicesByEpic.get(epic.id) ?? [];

  return (
    <li className="list-none">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={cn(
          "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg border border-line-soft bg-card px-3.5 py-2 text-left",
          "transition-colors duration-150 ease-house hover:bg-surface-2",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          open && "bg-accent-wash",
        )}
      >
        <ChevronRight
          className={cn(
            "size-4 shrink-0 text-ink-faint transition-transform duration-150 ease-house",
            open && "rotate-90",
          )}
          aria-hidden="true"
        />
        <span className="shrink-0 font-mono text-[13px] font-bold text-accent-deep">
          {epic.epic_id}
        </span>
        <span className="min-w-0 flex-1 truncate font-serif text-[16px] leading-[1.4]">
          {planRow?.outcome ? excerpt(planRow.outcome, 120) : excerpt(epic.note ?? "No outcome recorded.", 120)}
        </span>
        <span className="shrink-0 font-mono text-[12px] text-ink-faint tabular-nums">
          {index + 1}/{work.epics.length}
        </span>
        <Chip
          title={
            pr === null
              ? "No pull request is joined to this epic."
              : `joins.epic_to_pull_request names pull request ${pr}.`
          }
        >
          {pr === null ? "no PR" : `PR ${pr}`}
        </Chip>
        <StateBadge
          word={state}
          tone={toneForEpicState(state)}
          gloss={EPIC_GLOSS[state] ?? "A state outside the recorded vocabulary."}
        />
      </button>

      {open ? (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 0.75, 0.3, 1] }}
          className="mt-1.5 ml-5 flex flex-col gap-2 rounded-lg border border-line-soft border-l-4 border-l-primary bg-surface-2 px-3.5 py-3"
        >
          <p className="m-0 font-serif text-[16px] leading-[1.55] text-foreground">
            {planRow?.outcome ?? epic.note ?? "No outcome recorded for this epic."}
          </p>
          <SourceLine>
            outcome read from <code>goal.epics[]</code> in <code>designs.js</code>. The index
            holds no epic outcome. state read from <code>joins.epic_status</code>.
          </SourceLine>
          <div className="flex flex-wrap items-center gap-2">
            <Chip dashed title="The refined join reads this epic's state; the entity field does not.">
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
          </div>
          {own.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {own.map((slice) => (
                <li key={slice.id} className="font-mono text-[13px] text-ink-mid">
                  #{slice.n} {slice.title}
                </li>
              ))}
            </ul>
          ) : (
            <AbsentLine>
              This epic carries no slices. <code>joins.slice_to_epic</code> names no slice for
              {" "}
              {epic.id}.
            </AbsentLine>
          )}
        </motion.div>
      ) : null}
    </li>
  );
}

export function EpicsSection({
  work,
  focusEpic,
}: {
  work: WorkItem;
  focusEpic: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Panel
        title={`Epics · ${work.epics.length}`}
        icon={ListTree}
        lead="One row per epic, with its refined state and the pull request a join names for it."
      >
        {work.epics.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {work.epics.map((epic, index) => (
              <EpicRow
                key={epic.id}
                work={work}
                epicId={epic.epic_id}
                index={index}
                defaultOpen={focusEpic === epic.epic_id}
              />
            ))}
          </ul>
        ) : (
          <Missing detail="No entities.epic row carries this design id.">
            This work carries no epics, so the rail gates Build.
          </Missing>
        )}
        <SourceLine>
          read from <code>entities.epic</code>, <code>joins.epic_status</code>, and{" "}
          <code>joins.epic_to_pull_request</code>.
        </SourceLine>
      </Panel>
    </div>
  );
}

export function SlicesSection({
  work,
  unresolvedSlices,
}: {
  work: WorkItem;
  unresolvedSlices: number;
}) {
  const unresolved = unresolvedSlices;
  return (
    <div className="flex flex-col gap-4">
      <Panel
        title={`Slices · ${work.slices.length}`}
        icon={Rows3}
        lead="One row per slice, joined to the epic that owns it."
      >
        {work.slices.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {work.slices.map((slice: SliceEntity) => (
              <li
                key={slice.id}
                className="flex min-h-11 items-center gap-3 rounded-lg border border-line-soft bg-card px-3.5 py-2"
              >
                <span className="font-mono text-[13px] font-bold text-accent-deep tabular-nums">
                  {slice.id}
                </span>
                <span className="min-w-0 flex-1 font-serif text-[16px]">{slice.title}</span>
                <Chip>{slice.state}</Chip>
              </li>
            ))}
          </ul>
        ) : (
          <Missing detail="joins.slice_to_epic names no slice for any epic of this design.">
            This work records no slice, so the list is empty. The build has not started, and
            an empty list is stated rather than implied.
          </Missing>
        )}
        <SourceLine>
          read from <code>entities.slice</code> and the <code>slice_to_epic</code> join.
        </SourceLine>
      </Panel>

      {unresolved > 0 ? (
        <Panel title="Unresolved slices" icon={ShieldQuestion}>
          <p className="m-0 font-serif text-[16px]">
            {unresolved} slices belong to no epic.
          </p>
        </Panel>
      ) : null}
    </div>
  );
}

export function RubricsSection({ work, gated }: { work: WorkItem; gated: boolean }) {
  const steps = work.gateSteps ?? [];
  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Rubrics"
        icon={ClipboardCheck}
        lead="The blind acceptance rubric each slice is scored against."
      >
        {gated && steps.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {steps.map((step) => (
              <li key={step.n} className="flex min-h-11 items-center gap-3">
                <Chip>{step.n}</Chip>
                <span className="font-serif text-[16px]">{step.name}</span>
                <StateBadge
                  word={step.state}
                  tone={step.state === "approved" ? "good" : "neutral"}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-warn bg-warn-wash px-3.5 py-3">
              <p className="m-0 flex items-center gap-2 font-mono text-[12px] font-bold tracking-[0.06em] text-warn uppercase">
                <ShieldQuestion className="size-4 shrink-0" aria-hidden="true" />
                No gate record exists
              </p>
              <p className="m-0 font-serif text-[16px] leading-[1.55] text-ink-mid">
                <code>joins.feature_gates</code> holds no entry for the plan slug{" "}
                <code>{work.planSlug}</code>, so this section has nothing to read. That is an
                absent record, not a passed gate. It must not read as a pass.
              </p>
            </div>
            <AbsentLine>
              The join holds {Object.keys(work.gateSlugs).length} other features, and none of
              them is <code>{work.planSlug}</code>.
            </AbsentLine>
            <SourceLine>
              plan slug resolved via <code>{work.planSlugVia}</code>. Read from{" "}
              <code>joins.feature_gates</code>.
            </SourceLine>
          </div>
        )}
      </Panel>
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
    <div className="flex flex-col gap-4">
      <Panel
        title={`This work's pull requests · ${work.pullRequests.length}`}
        icon={GitPullRequest}
        lead="Every pull request a join names for this work, and which join named it."
      >
        {work.pullRequests.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {work.pullRequests.map((pr) => (
              <li key={pr.id} className="list-none">
                <button
                  type="button"
                  onClick={() => onOpenPr(pr.id)}
                  className={cn(
                    "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg border border-line-soft bg-card px-3.5 py-2 text-left",
                    "transition-colors duration-150 ease-house hover:bg-surface-2",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    focusPr === pr.id && "bg-accent-wash",
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
                    {(work.pullRequestVia.get(pr.id) ?? []).slice(0, 2).map((via) => (
                      <Chip key={via} className="text-ink-faint">
                        via {via}
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
          <Missing detail="No epic_to_pull_request or adr_to_pull_request entry names a pull request for this work.">
            No pull request is joined to this work, so the rail gates this group.
          </Missing>
        )}
        <SourceLine>
          read from <code>joins.epic_to_pull_request</code> and{" "}
          <code>joins.adr_to_pull_request</code>, resolved against{" "}
          <code>entities.pull_request</code>.
        </SourceLine>
      </Panel>

      <FlightDeckPanel flightDeck={flightDeck} onOpenPr={onOpenPr} />
    </div>
  );
}

export function FlightDeckPanel({
  flightDeck,
  onOpenPr,
}: {
  flightDeck: PullRequestEntity[];
  onOpenPr: (n: number) => void;
}) {
  return (
    <Panel
      title="FlightDeck"
      icon={Plane}
      lead="The whole open set, one click away from this work. FlightDeck reads every open pull request, not only this work's."
    >
      {flightDeck.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {flightDeck.map((pr) => (
            <li key={pr.id} className="list-none">
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
        <Missing detail="No entities.pull_request row carries state open.">
          The bundle holds no open pull request.
        </Missing>
      )}
      <SourceLine>
        read from <code>entities.pull_request</code> where <code>state</code> is{" "}
        <code>open</code>.
      </SourceLine>
    </Panel>
  );
}

/**
 * One pull request, with its own three levels.
 *
 * The bundle holds a pull request's intent and assessment on the story timeline
 * entry, and this mockup does not load `story.json`. So each level states what it
 * reads and what is not wired here.
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
  const levels: Array<{ key: string; title: string; icon: LucideIcon; line: string; source: string }> = [
    {
      key: "intent",
      title: "Pull request intent",
      icon: GitPullRequest,
      line: "The author's own statement of what this pull request is for, captured by Generate mode before the code existed.",
      source: "story.json → the timeline entry's intent block. Not wired into this mockup.",
    },
    {
      key: "problem-and-solution",
      title: "Pull request problem and solution",
      icon: Rows3,
      line: "The assessed problem, the approach the diff takes, and the findings the assessment recorded against it.",
      source: "story.json → intent.drift and the assessment block. Not wired into this mockup.",
    },
    {
      key: "architecture",
      title: "Pull request architecture",
      icon: GitPullRequest,
      line: "The decisions the diff lands, the diagram levels for this pull request, and the scene art beside them.",
      source: "data/diagrams.js and data/adrs.js. Not wired into this mockup.",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Panel title={`PR ${prNumber}`} icon={GitPullRequest} lead={pr?.title ?? "This pull request is not an entity in the index."}>
        <div className="flex flex-wrap items-center gap-2">
          {pr ? <StateBadge word={pr.state} tone={pr.state === "merged" ? "good" : "accent"} /> : null}
          {pr?.commit ? <Chip>{pr.commit.slice(0, 9)}</Chip> : null}
          {pr?.date ? <Chip>{pr.date}</Chip> : null}
          {work.pullRequests.some((candidate) => candidate.id === prNumber) ? (
            <Chip tone="accent">names this work via {work.pullRequestVia.get(prNumber)?.join(", ")}</Chip>
          ) : (
            <Chip dashed className="text-ink-faint">
              belongs to another work item
            </Chip>
          )}
        </div>
        <SourceLine>read from entities.pull_request in data/index.json.</SourceLine>
      </Panel>

      {levels.map((level) => (
        <Panel key={level.key} title={level.title} icon={level.icon} lead={level.line}>
          <AbsentLine>{level.source}</AbsentLine>
        </Panel>
      ))}

      <FlightDeckPanel flightDeck={flightDeck} onOpenPr={onOpenPr} />
    </div>
  );
}

/* ------------------------------------------------------------------- Shipped */

export function ShippedSection({ work }: { work: WorkItem }) {
  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Release status"
        icon={PackageCheck}
        lead="The stage the record carries, the publications the bundle holds, and the deploy record that does not exist."
      >
        <div className="flex flex-wrap items-center gap-2">
          <StateBadge word={work.design.stage} tone={toneForStage(work.design.stage)} />
          <Chip>{work.publications.length} publications</Chip>
        </div>

        <div className="mt-3.5 flex flex-col gap-2.5">
          <AbsentLine>
            No deploy record exists in this corpus. The section reports the stage and any
            publication instead, and states the gap rather than implying a release.
          </AbsentLine>
          {work.publications.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {work.publications.map((publication) => (
                <li key={publication.id} className="font-mono text-[12.5px] text-ink-mid">
                  {publication.id} → PR {publication.pull_request} · {publication.published_at}
                </li>
              ))}
            </ul>
          ) : (
            <AbsentLine>
              No publication entity names one of this work's pull requests.
            </AbsentLine>
          )}
        </div>
        <SourceLine>
          read from <code>entities.design.stage</code> and <code>entities.publication</code>.
        </SourceLine>
      </Panel>
    </div>
  );
}
