import type { DesignEntity, EpicEntity, Joins, PublicationEntity, PullRequest } from "@/data/types";
import { groupBy, presentOf, slicesOfEpics } from "../grouping";
import type { Sources } from "./sources";
import type { WorkPart } from "./types";

type Scope = WorkPart<"id" | "design" | "record" | "epics" | "slices" | "slicesByEpic" | "epicState">;

function ownEpicsOf(design: DesignEntity, sources: Sources): EpicEntity[] {
  return (sources.epicsByDesign.get(design.id) ?? [])
    .slice()
    .sort((a, b) => a.epic_id.localeCompare(b.epic_id, undefined, { numeric: true }));
}

export function scopeOf(design: DesignEntity, sources: Sources): Scope {
  const epics = ownEpicsOf(design, sources);
  return {
    id: design.id,
    design,
    record: sources.records[design.id],
    epics,
    slices: slicesOfEpics(epics, sources.slicesByEpic),
    slicesByEpic: sources.slicesByEpic,
    epicState: (epic) => sources.joins.epic_status[epic.id] ?? epic.state,
  };
}

/*
 * The work's own pull-request set. Section 3.3 states the rule: this reads
 * `epic_to_pull_request` for this work's own epics, and nothing else. A pull
 * request a decision reached is not the work's pull request, so
 * `adr_to_pull_request` never feeds this map.
 */
function viaOf(epics: EpicEntity[], joins: Joins): Map<number, string[]> {
  const byPr = groupBy(epics, (epic) => {
    const pr = joins.epic_to_pull_request[epic.id];
    return typeof pr === "number" ? pr : undefined;
  });
  return new Map([...byPr].map(([pr, list]): [number, string[]] => [pr, list.map((e) => e.epic_id)]));
}

/* Publications for this work's own pull requests, and never for another work's. */
function publicationsFor(via: Map<number, string[]>, all: PublicationEntity[]): PublicationEntity[] {
  return all.filter((p) => typeof p.pull_request === "number" && via.has(p.pull_request));
}

type PullRequestPart = WorkPart<"pullRequests" | "pullRequestVia" | "publications">;

export function pullRequestPartOf(epics: EpicEntity[], sources: Sources): PullRequestPart {
  const via = viaOf(epics, sources.joins);
  const pullRequests: PullRequest[] = presentOf(
    [...via.keys()].sort((a, b) => a - b),
    sources.prById,
  );
  return {
    pullRequests,
    pullRequestVia: via,
    publications: publicationsFor(via, sources.entities.publication),
  };
}
