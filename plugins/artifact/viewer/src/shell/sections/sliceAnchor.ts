import type { WorkItem } from "../model";

export function sliceRowId(epicId: string, sliceId: string): string {
  return `slice-${epicId}-${sliceId.replaceAll("/", "-")}`;
}

export function markedRowId(work: WorkItem | null, epicId: string | null, sliceN: string | null): string | null {
  const epic = work?.epics.find((one) => one.epic_id === epicId);
  if (!work || !epic || sliceN === null) return null;
  const slice = work.slicesByEpic.get(epic.id)?.find((one) => String(one.n) === sliceN);
  return slice ? sliceRowId(epic.epic_id, slice.id) : null;
}
