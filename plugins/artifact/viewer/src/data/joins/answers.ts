import type { ResolvedJoins } from "../joins";
import type { AdrToPullRequest, Joins } from "../types";

export function sliceAnswers(
  joins: Joins,
): Pick<ResolvedJoins, "epicOfSlice" | "resolvedSliceIds" | "sliceToEpicCount" | "unresolvedSlices"> {
  const sliceToEpic = new Map(Object.entries(joins.slice_to_epic));
  const unresolved = new Map(Object.entries(joins.slice_to_epic_unresolved));
  return {
    epicOfSlice: (sliceId) => sliceToEpic.get(sliceId),
    resolvedSliceIds: () => new Set(sliceToEpic.keys()),
    sliceToEpicCount: () => sliceToEpic.size,
    unresolvedSlices: () => unresolved,
  };
}

function numericEntries(table: Record<string, number>): Map<string, number> {
  return new Map(
    Object.entries(table).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number",
    ),
  );
}

function epicStateAnswer(joins: Joins): ResolvedJoins["epicState"] {
  const epicStatus = new Map(Object.entries(joins.epic_status));
  return (epic) => {
    const refined = epicStatus.get(epic.id);
    return refined === undefined
      ? { state: epic.state, refined: false }
      : { state: refined, refined: true };
  };
}

function epicPullRequestAnswer(table: Map<string, number>): ResolvedJoins["epicPullRequest"] {
  return (epic) => {
    const resolved = table.get(epic.id);
    if (resolved !== undefined) return resolved;
    return typeof epic.pr === "number" ? epic.pr : null;
  };
}

export function epicAnswers(
  joins: Joins,
): Pick<ResolvedJoins, "epicState" | "epicPullRequest" | "epicToPullRequestCount"> {
  const epicToPullRequest = numericEntries(joins.epic_to_pull_request);
  return {
    epicState: epicStateAnswer(joins),
    epicPullRequest: epicPullRequestAnswer(epicToPullRequest),
    epicToPullRequestCount: () => epicToPullRequest.size,
  };
}

function adrIdsFor(table: Map<string, AdrToPullRequest>, pr: number): string[] {
  return [...table.entries()]
    .filter(([, entry]) => entry.pr === pr)
    .map(([id]) => id)
    .sort();
}

export function adrAnswers(
  joins: Joins,
): Pick<ResolvedJoins, "adrPullRequest" | "adrPullRequests" | "adrIdsForPullRequest"> {
  const adrToPullRequest = new Map(Object.entries(joins.adr_to_pull_request));
  return {
    adrPullRequest: (adrId) => adrToPullRequest.get(adrId) ?? null,
    adrPullRequests: () => adrToPullRequest,
    adrIdsForPullRequest: (pr) => adrIdsFor(adrToPullRequest, pr),
  };
}

export function gateAnswers(
  joins: Joins,
): Pick<ResolvedJoins, "featureGates" | "featureGateSlugs"> {
  const featureGates = new Map(Object.entries(joins.feature_gates));
  return {
    featureGates: (slug) => featureGates.get(slug) ?? null,
    featureGateSlugs: () => [...featureGates.keys()],
  };
}

export function trackerAnswers(
  joins: Joins,
): Pick<ResolvedJoins, "designTracker" | "trackerRead" | "trackerAdapter"> {
  const designTracker = joins.design_tracker ?? {};
  return {
    designTracker: (designId) => designTracker[designId] ?? null,
    trackerRead: () => joins.tracker?.read ?? false,
    trackerAdapter: () => joins.tracker?.adapter ?? null,
  };
}
