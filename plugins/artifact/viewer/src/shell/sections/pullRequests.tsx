import { Boxes, Compass, GitPullRequest } from "lucide-react";

import type { PullRequest } from "@/data/types";

import { Bento, Box, EmptyNote, Panel } from "../atoms";
import type { WorkItem } from "../model";
import { excerpt } from "../records";
import { PullRequestDetail } from "./pullRequestDetail";
import { FlightDeckPanel, WorkPullRequestList } from "./pullRequestRows";

const DRAFT_LEAD =
  "The pull request that the design planned before the code existed. This pull request is not open.";

const CONTRACTS_LEAD =
  "The endpoints and data models the design envisioned, written before the code existed. These are predictions grounded in the design's ADR, not checks.";

const NO_WORK_PULL_REQUESTS =
  "No epic of this work carries a pull request yet. The draft above is the one this work will open.";

/*
  The pull request this work will open leads the section. A reader who comes to this
  level wants the work's pull requests, and the draft is the one this work will open,
  so it belongs above them. The title says what it is, because a draft is not a pull
  request that exists.
*/
function DraftPanel({ work }: { work: WorkItem }) {
  const draft = work.record?.pr_draft;
  if (!draft) return null;
  return (
    <Panel span="band" title="The pull request this work will open" icon={Compass} lead={DRAFT_LEAD}>
      <Box label="Draft">{excerpt(draft, 260)}</Box>
    </Panel>
  );
}

/*
  The contracts section rides the envisioned pull request (ADR-0036). The contracts.md
  file states the endpoints and data models this work will create, so a reader sees
  what the surface will be next to the draft that describes it. A design that touched
  no public surface omits the key, and this section renders nothing: absence, not an
  error.
*/
function ContractsPanel({ work }: { work: WorkItem }) {
  const contracts = work.record?.contracts;
  if (!contracts) return null;
  return (
    <Panel span="band" title="The contracts this work will create" icon={Boxes} lead={CONTRACTS_LEAD}>
      <Box label="Contracts">{excerpt(contracts, 260)}</Box>
    </Panel>
  );
}

function WorkPullRequestsPanel({ work, onOpenPr }: { work: WorkItem; onOpenPr: (n: number) => void }) {
  const count = work.pullRequests.length;
  return (
    <Panel span="band" title={`This work's pull requests · ${count}`} icon={GitPullRequest} absent={count === 0}>
      {count > 0 ? (
        <WorkPullRequestList work={work} onOpenPr={onOpenPr} />
      ) : (
        <EmptyNote>{NO_WORK_PULL_REQUESTS}</EmptyNote>
      )}
    </Panel>
  );
}

interface PullRequestsSectionProps {
  work: WorkItem;
  focusPr: number | null;
  allPullRequests: PullRequest[];
  onOpenPr: (n: number) => void;
}

function PullRequestOverview({ work, allPullRequests, onOpenPr }: PullRequestsSectionProps) {
  const flightDeck = allPullRequests.filter((pr) => pr.state === "open");
  return (
    <Bento>
      <DraftPanel work={work} />
      <ContractsPanel work={work} />
      <WorkPullRequestsPanel work={work} onOpenPr={onOpenPr} />
      <FlightDeckPanel flightDeck={flightDeck} onOpenPr={onOpenPr} span="band" />
    </Bento>
  );
}

export function PullRequestsSection(props: PullRequestsSectionProps) {
  const { focusPr, ...rest } = props;
  if (focusPr === null) return <PullRequestOverview {...props} />;
  return <PullRequestDetail {...rest} prNumber={focusPr} />;
}
