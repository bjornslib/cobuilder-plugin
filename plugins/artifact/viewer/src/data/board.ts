import { entitiesOf } from "./bundle/entities";
import { resolvedJoinsOf, type ResolvedJoins } from "./joins";
import type { DesignEntity, EpicEntity, RecordIndex, SliceEntity } from "./types";
import type { BoardEpic, BoardRows } from "./types/board";

function boardEpicOf(epic: EpicEntity, resolved: ResolvedJoins): BoardEpic {
  return {
    id: epic.id,
    epicId: epic.epic_id,
    design: epic.design,
    title: epic.title ?? null,
    branch: epic.branch,
    pr: resolved.epicPullRequest(epic),
    status: resolved.epicState(epic).state,
    lifecycle: epic.state,
  };
}

function epicOfSliceMap(slices: SliceEntity[], resolved: ResolvedJoins): Map<string, string> {
  const map = new Map<string, string>();
  for (const slice of slices) {
    const epicId = resolved.epicOfSlice(slice.id);
    if (epicId) map.set(slice.id, epicId);
  }
  return map;
}

function nextReadyMap(designs: DesignEntity[], slices: SliceEntity[], resolved: ResolvedJoins): Map<string, SliceEntity | null> {
  return new Map(
    designs.map((design) => {
      const wanted = resolved.designTracker(design.id)?.next_ready;
      return [design.id, slices.find((slice) => slice.id === wanted) ?? null];
    }),
  );
}

type SliceJoins = Pick<BoardRows, "epicOfSlice" | "orphanSlices" | "nextReady">;

function sliceJoinsOf(designs: DesignEntity[], slices: SliceEntity[], resolved: ResolvedJoins): SliceJoins {
  const epicOfSlice = epicOfSliceMap(slices, resolved);
  const designIds = new Set(designs.map((design) => design.id));
  return {
    epicOfSlice,
    orphanSlices: slices.filter((slice) => !epicOfSlice.has(slice.id) && !designIds.has(slice.feature)),
    nextReady: nextReadyMap(designs, slices, resolved),
  };
}

export function boardRowsOf(index: RecordIndex): BoardRows {
  const { design, epic, slice } = entitiesOf(index);
  const resolved = resolvedJoinsOf(index);
  return {
    programs: design,
    epics: epic.map((one) => boardEpicOf(one, resolved)),
    slices: slice,
    ...sliceJoinsOf(design, slice, resolved),
    builtAt: index.built_at ?? null,
  };
}
