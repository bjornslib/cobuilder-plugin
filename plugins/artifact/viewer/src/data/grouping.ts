import type { EpicEntity, SliceEntity } from "./types";

export function groupBy<T, K>(items: T[], keyOf: (item: T) => K | undefined): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    if (key === undefined) continue;
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

export function presentOf<K, T>(ids: Iterable<K>, byId: Map<K, T>): T[] {
  return [...ids].map((id) => byId.get(id)).filter((item): item is T => item !== undefined);
}

export function slicesOfEpics(
  epics: EpicEntity[],
  slicesByEpic: Map<string, SliceEntity[]>,
): SliceEntity[] {
  return epics
    .flatMap((epic) => slicesByEpic.get(epic.id) ?? [])
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}
