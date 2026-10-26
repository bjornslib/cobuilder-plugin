import type { ReactNode } from "react";

import { ChevronRight, Plane } from "lucide-react";

import type { PullRequest } from "@/data/types";

import { Chip, Missing, Panel, StateBadge, type TileSpan, toneForState } from "../atoms";
import type { WorkItem } from "../model";
import { ROW_BUTTON_SHORT, ROW_BUTTON_TALL } from "./common";

type OpenPr = (n: number) => void;

interface PullRequestItemProps {
  pr: PullRequest;
  onOpenPr: OpenPr;
  className: string;
  children: ReactNode;
}

function PullRequestItem({ pr, onOpenPr, className, children }: PullRequestItemProps) {
  return (
    <li className="min-w-0 list-none">
      <button type="button" onClick={() => onOpenPr(pr.id)} className={className}>
        {children}
      </button>
    </li>
  );
}

function PullRequestLabel({ pr }: { pr: PullRequest }) {
  return (
    <>
      <span className="shrink-0 font-mono text-[13px] font-bold text-accent-deep">PR {pr.id}</span>
      <span className="min-w-0 flex-1 truncate font-serif text-[16px]">{pr.title}</span>
    </>
  );
}

function ViaChips({ via }: { via: string[] }) {
  return (
    <span className="flex shrink-0 flex-wrap gap-1.5">
      {via.slice(0, 3).map((epicId) => (
        <Chip key={epicId} className="text-ink-faint" title="The epic that carries it.">
          epic {epicId}
        </Chip>
      ))}
    </span>
  );
}

interface WorkPullRequestRowProps {
  pr: PullRequest;
  via: string[];
  onOpenPr: OpenPr;
}

function WorkPullRequestRow({ pr, via, onOpenPr }: WorkPullRequestRowProps) {
  return (
    <PullRequestItem pr={pr} onOpenPr={onOpenPr} className={ROW_BUTTON_TALL}>
      <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
      <PullRequestLabel pr={pr} />
      <ViaChips via={via} />
      <StateBadge word={pr.state} tone={toneForState(pr.state)} />
    </PullRequestItem>
  );
}

export function WorkPullRequestList({ work, onOpenPr }: { work: WorkItem; onOpenPr: OpenPr }) {
  return (
    <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">
      {work.pullRequests.map((pr) => (
        <WorkPullRequestRow key={pr.id} pr={pr} via={work.pullRequestVia.get(pr.id) ?? []} onOpenPr={onOpenPr} />
      ))}
    </ul>
  );
}

function FlightDeckRow({ pr, onOpenPr }: { pr: PullRequest; onOpenPr: OpenPr }) {
  return (
    <PullRequestItem pr={pr} onOpenPr={onOpenPr} className={ROW_BUTTON_SHORT}>
      <PullRequestLabel pr={pr} />
      <Chip className="text-ink-faint">{pr.date ?? "no date"}</Chip>
      <StateBadge word={pr.state} tone="accent" />
    </PullRequestItem>
  );
}

function FlightDeckList({ flightDeck, onOpenPr }: { flightDeck: PullRequest[]; onOpenPr: OpenPr }) {
  return (
    <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">
      {flightDeck.map((pr) => (
        <FlightDeckRow key={pr.id} pr={pr} onOpenPr={onOpenPr} />
      ))}
    </ul>
  );
}

interface FlightDeckPanelProps {
  flightDeck: PullRequest[];
  onOpenPr: OpenPr;
  /** The bento span the caller gives this panel, when the caller lays out a grid. */
  span: TileSpan;
}

export function FlightDeckPanel({ flightDeck, onOpenPr, span }: FlightDeckPanelProps) {
  return (
    <Panel span={span} title="FlightDeck" icon={Plane} absent={flightDeck.length === 0}>
      {flightDeck.length > 0 ? (
        <FlightDeckList flightDeck={flightDeck} onOpenPr={onOpenPr} />
      ) : (
        <Missing>The bundle holds no open pull request.</Missing>
      )}
    </Panel>
  );
}
