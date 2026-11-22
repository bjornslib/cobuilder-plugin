import { describe, expect, it } from "vitest";

import { readBoardAddress, type BoardAddress } from "../board/address";
import { readRoute, type Route } from "../model";

interface Hop {
  route: Route;
  kanban: BoardAddress | null;
}

type Travel = "forward" | "back" | null;
type TravelOf = (from: Hop, to: Hop) => Travel;

const TRAVEL = import.meta.glob<{ travelOf?: TravelOf }>("./travel.ts", { eager: true });

const PROGRAM_BOARD = "#/board";
const EPIC_BOARD = "#/board?program=beta";
const NO_PROGRAM_BOARD = "#/board?orphans=1";
const EPIC_PAGE = "#/beta/build/epics/E2";
const SLICE_PAGE = "#/beta/build/epics/E2/4";
const INTENT_PAGE = "#/beta/intent";

interface Case {
  name: string;
  from: string;
  to: string;
  want: Travel;
}

const CASES: Case[] = [
  { name: "the program board to the epic board", from: PROGRAM_BOARD, to: EPIC_BOARD, want: "forward" },
  { name: "the epic board to the program board", from: EPIC_BOARD, to: PROGRAM_BOARD, want: "back" },
  { name: "the program board to the No program board", from: PROGRAM_BOARD, to: NO_PROGRAM_BOARD, want: "forward" },
  { name: "the No program board to the program board", from: NO_PROGRAM_BOARD, to: PROGRAM_BOARD, want: "back" },
  { name: "the epic board to an epic page", from: EPIC_BOARD, to: EPIC_PAGE, want: "forward" },
  { name: "the epic board to a slice address", from: EPIC_BOARD, to: SLICE_PAGE, want: "forward" },
  { name: "the program board to an epic page", from: PROGRAM_BOARD, to: EPIC_PAGE, want: "forward" },
  { name: "an epic page to the epic board", from: EPIC_PAGE, to: EPIC_BOARD, want: "back" },
  { name: "an epic page to the program board", from: EPIC_PAGE, to: PROGRAM_BOARD, want: "back" },
  { name: "a slice address to the epic board", from: SLICE_PAGE, to: EPIC_BOARD, want: "back" },
  { name: "an epic page to a slice address", from: EPIC_PAGE, to: SLICE_PAGE, want: null },
  { name: "a work item's Intent page to an epic page", from: INTENT_PAGE, to: EPIC_PAGE, want: null },
  { name: "the epic board to the No program board", from: EPIC_BOARD, to: NO_PROGRAM_BOARD, want: null },
  { name: "the program board to itself", from: PROGRAM_BOARD, to: PROGRAM_BOARD, want: null },
  { name: "the program board to the program board with a search", from: PROGRAM_BOARD, to: "#/board?q=be", want: null },
  { name: "the epic board to the epic board in the Slices grain", from: EPIC_BOARD, to: "#/board?program=beta&cards=slices", want: null },
];

function hopAt(hash: string): Hop {
  window.location.hash = hash;
  return { route: readRoute(), kanban: readBoardAddress(window.location.hash) };
}

function loadedTravelOf(): TravelOf {
  const travelOf = TRAVEL["./travel.ts"]?.travelOf;
  expect(travelOf, "app/travel.ts exports travelOf").toBeTypeOf("function");
  return travelOf as TravelOf;
}

function readsTheTravel({ from, to, want }: Case) {
  const travelOf = loadedTravelOf();
  expect(travelOf(hopAt(from), hopAt(to)), `${from} to ${to}`).toBe(want);
}

describe("travelOf", () => {
  it.each(CASES)("reads $name", readsTheTravel);
});
