import { expect } from "vitest";

import { buildWorkItems, type WorkItem } from "../../model";
import { DESIGNS } from "./designRecords";
import { INDEX } from "./recordIndex";

/** The work item the shell builds for an id, from the same index and records. */
export function workOf(id: string): WorkItem {
  const work = buildWorkItems(INDEX, DESIGNS).get(id);
  expect(work, `the index resolves the work item ${id}`).toBeTruthy();
  return work as WorkItem;
}
