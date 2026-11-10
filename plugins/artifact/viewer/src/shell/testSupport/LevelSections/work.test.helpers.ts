import { expect } from "vitest";

import { buildWorkItems, type WorkItem } from "../../model";
import { DESIGNS } from "./designRecords";
import { INDEX } from "./recordIndex";

export function workOf(id: string): WorkItem {
  const work = buildWorkItems(INDEX, DESIGNS).get(id);
  expect(work, `the index resolves the work item ${id}`).toBeTruthy();
  return work as WorkItem;
}
