import { useCallback, useEffect, useState } from "react";

import type { RecordIndex } from "@/data/types";
import { loadDesigns, loadIndex, type DesignRecords } from "@/data/bundle";

import { loadAdrs, type AdrRecords } from "../records";

export type IndexLoad =
  | { state: "loading" }
  | { state: "ready"; index: RecordIndex; designs: DesignRecords; adrs: AdrRecords }
  | { state: "failed"; message: string };

function failedLoad(error: unknown): IndexLoad {
  return {
    state: "failed",
    message: error instanceof Error ? error.message : String(error),
  };
}

function readAll(setLoad: (load: IndexLoad) => void): void {
  setLoad({ state: "loading" });
  Promise.all([loadIndex(), loadDesigns(), loadAdrs()])
    .then(([index, designs, adrs]) => setLoad({ state: "ready", index, designs, adrs }))
    .catch((error: unknown) => setLoad(failedLoad(error)));
}

/**
 * The three files the shell reads, and the retry that reads them again.
 *
 * The shell never waits for this. It renders the top bar and the rail from the route
 * at first paint, and the index fills in behind them, which is the loading state of
 * section 3.1.
 */
export function useIndexLoad(): { load: IndexLoad; reload: () => void } {
  const [load, setLoad] = useState<IndexLoad>({ state: "loading" });
  const reload = useCallback(() => readAll(setLoad), []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { load, reload };
}
