import { FileText, GitPullRequest, Target, type LucideIcon } from "lucide-react";

import type { PullRequest } from "@/data/types";

import { Bento, Chip, EmptyNote, Panel, StateBadge } from "../atoms";
import type { WorkItem } from "../model";
import { FlightDeckPanel } from "./pullRequestRows";

interface PullRequestLevelSpec {
  key: string;
  title: string;
  icon: LucideIcon;
  line: string;
}

const PR_LEVELS: PullRequestLevelSpec[] = [
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

const NO_STORY_RECORDS =
  "This surface does not read a pull request's own story records yet, so this level renders nothing. The pull request above is real, and its three levels are not.";

function PullRequestLevel({ level }: { level: PullRequestLevelSpec }) {
  return (
    <Panel span="narrow" title={level.title} icon={level.icon} lead={level.line} absent>
      <EmptyNote>{NO_STORY_RECORDS}</EmptyNote>
    </Panel>
  );
}

function PullRequestFacts({ pr }: { pr: PullRequest | undefined }) {
  return (
    <>
      {pr ? <StateBadge word={pr.state} tone={pr.state === "merged" ? "good" : "accent"} /> : null}
      {pr?.commit ? <Chip>{pr.commit.slice(0, 9)}</Chip> : null}
      {pr?.date ? <Chip>{pr.date}</Chip> : null}
    </>
  );
}

function OwnershipChip({ work, prNumber }: { work: WorkItem; prNumber: number }) {
  const own = work.pullRequests.some((candidate) => candidate.id === prNumber);
  if (!own) return <Chip dashed className="text-ink-faint">belongs to another work item</Chip>;
  return (
    <Chip tone="accent">
      one of this work&apos;s own epics carries it, via{" "}
      {work.pullRequestVia.get(prNumber)?.join(", ")}
    </Chip>
  );
}

interface PullRequestHeaderProps {
  work: WorkItem;
  prNumber: number;
  pr: PullRequest | undefined;
}

function PullRequestHeader({ work, prNumber, pr }: PullRequestHeaderProps) {
  const lead = pr?.title ?? "This pull request is not in the bundle.";
  return (
    <Panel span="band" title={`PR ${prNumber}`} icon={GitPullRequest} lead={lead} absent={!pr}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <PullRequestFacts pr={pr} />
        <OwnershipChip work={work} prNumber={prNumber} />
      </div>
    </Panel>
  );
}

interface PullRequestDetailProps {
  work: WorkItem;
  prNumber: number;
  allPullRequests: PullRequest[];
  onOpenPr: (n: number) => void;
}

/**
 * One pull request, with its own three levels.
 *
 * Section 5.3 puts this in the scroll pane rather than in a Sheet. The bundle holds a
 * pull request's intent and assessment on the story timeline entry, which this surface
 * does not read. So each level states what it will hold and stops.
 */
export function PullRequestDetail({ work, prNumber, allPullRequests, onOpenPr }: PullRequestDetailProps) {
  const pr = allPullRequests.find((candidate) => candidate.id === prNumber);
  const flightDeck = allPullRequests.filter((candidate) => candidate.state === "open");
  return (
    <Bento>
      <PullRequestHeader work={work} prNumber={prNumber} pr={pr} />
      {PR_LEVELS.map((level) => <PullRequestLevel key={level.key} level={level} />)}
      <FlightDeckPanel flightDeck={flightDeck} onOpenPr={onOpenPr} span="band" />
    </Bento>
  );
}
