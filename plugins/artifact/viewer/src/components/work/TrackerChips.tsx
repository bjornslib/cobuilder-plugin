import type { DesignRow } from "@/data/types";

import { PrChip } from "./PrChip";

export function TrackerChips({ row }: { row: DesignRow }) {
  if (!row.trackerRead) return null;
  return row.trackerPullRequests.map((pr) => <PrChip key={pr.ref} pr={pr} />);
}
