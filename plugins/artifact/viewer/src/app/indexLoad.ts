import { useEffect, useState } from "react";

import { designRowsOf, loadIndex } from "@/data/bundle";
import type { DesignRow, RecordIndex } from "@/data/types";

export type Load =
  | { state: "loading" }
  | { state: "ready"; index: RecordIndex }
  | { state: "failed"; message: string };

export type Waiting = Exclude<Load, { state: "ready" }>;

function failed(error: unknown): Load {
  return {
    state: "failed",
    message: error instanceof Error ? error.message : String(error),
  };
}

function loadInto(setLoad: (load: Load) => void): () => void {
  let live = true;
  const settle = (next: Load) => {
    if (live) setLoad(next);
  };
  loadIndex()
    .then((index) => settle({ state: "ready", index }))
    .catch((error: unknown) => settle(failed(error)));
  return () => {
    live = false;
  };
}

export function useIndexState(): Load {
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => loadInto(setLoad), []);

  return load;
}

export function rowsOf(load: Load): DesignRow[] {
  return load.state === "ready" ? designRowsOf(load.index) : [];
}
