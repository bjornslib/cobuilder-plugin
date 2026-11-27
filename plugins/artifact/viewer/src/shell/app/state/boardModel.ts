import { useMemo } from "react";

import type { BoardRows } from "@/data/types";

import type { BoardAddress } from "../../board/address";
import { boardModelOf } from "../../board/model";
import type { BoardModel } from "../../board/shape";

export function useBoardModel(rows: BoardRows | null, address: BoardAddress | null): BoardModel | null {
  return useMemo(() => (rows !== null && address !== null ? boardModelOf(rows, address) : null), [rows, address]);
}
