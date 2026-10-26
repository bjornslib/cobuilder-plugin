import { resolvedJoinsOf, type ResolvedJoins } from "../joins";
import type { DesignEntity, DesignRow, DesignTracker, Entities, EpicEntity, Joins, RecordIndex, SliceEntity } from "../types";
import { groupBy, slicesOfEpics } from "../grouping";
import { entitiesOf, joinsOf } from "./entities";

const DONE_STATES = new Set(["completed"]);

function sortedUnique(numbers: number[]): number[] {
  return [...new Set(numbers)].sort((a, b) => a - b);
}

/**
 * One row per design, for the board, resolved from the index alone.
 *
 * `designRows` below is the derivation. This is the whole of what a board needs, so a
 * surface hands over the index and never the joins it carries.
 */
export function designRowsOf(index: RecordIndex): DesignRow[] {
  const entities = entitiesOf(index);
  return designRows(
    entities.design,
    entities.epic,
    entities.slice,
    joinsOf(index),
    resolvedJoinsOf(index),
  );
}

interface RowSources {
  slices: SliceEntity[];
  joins: Joins;
  resolved: ResolvedJoins;
  epicsByDesign: Map<string, EpicEntity[]>;
  slicesByEpic: Map<string, SliceEntity[]>;
}

type DesignRowsArgs = [
  designs: Entities["design"],
  epics: EpicEntity[],
  slices: SliceEntity[],
  joins: Joins,
  resolved: ResolvedJoins,
];

function ownEpicsOf(epics: EpicEntity[] | undefined): EpicEntity[] {
  return (epics ?? []).slice().sort((a, b) => a.epic_id.localeCompare(b.epic_id));
}

function epicTotals(epics: EpicEntity[], joins: Joins): Pick<DesignRow, "done" | "pullRequests"> {
  const done = epics.filter((epic) =>
    DONE_STATES.has(joins.epic_status[epic.id] ?? epic.state),
  ).length;
  const pullRequests = epics
    .map((epic) => joins.epic_to_pull_request[epic.id] ?? epic.pr)
    .filter((pr): pr is number => typeof pr === "number");
  return { done, pullRequests: sortedUnique(pullRequests) };
}

function sliceCounts(slices: SliceEntity[]): Pick<DesignRow, "slicesDone" | "slicesTotal"> {
  const slicesDone = slices.filter((slice) => slice.state === "completed").length;
  return { slicesDone, slicesTotal: slices.length };
}

function nextReadyOf(tracker: DesignTracker | null, slices: SliceEntity[]): SliceEntity | null {
  const id = tracker?.next_ready;
  return (id ? slices.find((slice) => slice.id === id) : undefined) ?? null;
}

function trackerFieldsOf(
  designId: string,
  sources: RowSources,
): Pick<DesignRow, "nextReady" | "trackerPullRequests" | "stageSource" | "trackerRead"> {
  const tracker = sources.resolved.designTracker(designId);
  return {
    nextReady: nextReadyOf(tracker, sources.slices),
    trackerPullRequests: tracker?.pull_requests ?? [],
    stageSource: tracker?.stage_source ?? "goal",
    trackerRead: sources.resolved.trackerRead(),
  };
}

function rowOf(design: DesignEntity, sources: RowSources): DesignRow {
  const epics = ownEpicsOf(sources.epicsByDesign.get(design.id));
  const slices = slicesOfEpics(epics, sources.slicesByEpic);
  return {
    design,
    epics,
    slices,
    ...epicTotals(epics, sources.joins),
    ...sliceCounts(slices),
    ...trackerFieldsOf(design.id, sources),
  };
}

function rowSourcesOf(input: Pick<RowSources, "slices" | "joins" | "resolved"> & { epics: EpicEntity[] }): RowSources {
  const { epics, slices, joins, resolved } = input;
  return {
    slices,
    joins,
    resolved,
    epicsByDesign: groupBy(epics, (epic) => epic.design),
    slicesByEpic: groupBy(slices, (slice) => joins.slice_to_epic[slice.id] || undefined),
  };
}

/**
 * Resolve one row per design. Every join the Work board needs is computed here and
 * nowhere else, because ADR-0018 already computed them in `index.json` and a second
 * derivation in a component is how the two drift.
 */
export function designRows(...[designs, epics, slices, joins, resolved]: DesignRowsArgs): DesignRow[] {
  const sources = rowSourcesOf({ epics, slices, joins, resolved });
  return designs.map((design) => rowOf(design, sources));
}
