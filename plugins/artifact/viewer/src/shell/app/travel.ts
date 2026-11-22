import type { BoardAddress } from "../board/address";
import type { Route } from "../model";

export type Travel = "forward" | "back" | null;

export interface Hop {
  route: Route;
  kanban: BoardAddress | null;
}

function depthOf({ route, kanban }: Hop): number | null {
  if (kanban !== null) return kanban.level === "programs" ? 0 : 1;
  return route.workId === null ? null : 2;
}

export function travelOf(from: Hop, to: Hop): Travel {
  const was = depthOf(from);
  const is = depthOf(to);
  if (was === null || is === null || was === is) return null;
  return is > was ? "forward" : "back";
}
