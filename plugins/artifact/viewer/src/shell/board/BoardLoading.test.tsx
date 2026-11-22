import { cleanup, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { installAdrs } from "../testSupport/App/fixtures";
import { renderAt } from "../testSupport/App/render";
import { BOARD_DESIGNS } from "../testSupport/board/fixtures";
import { found } from "../testSupport/board/queries";
import { installJsdomStubs } from "../testSupport/jsdom";

const servedFetch = globalThis.fetch;

beforeAll(installJsdomStubs);

beforeEach(() => {
  Reflect.deleteProperty(window, "INDEX");
  window.DESIGNS = BOARD_DESIGNS;
  installAdrs();
  globalThis.fetch = (() => new Promise<Response>(() => undefined)) as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = servedFetch;
});

async function disablesFindWhileTheIndexLoads() {
  renderAt("#/board");
  await found(() => screen.queryByText("Loading the record index"), "the loading board");
  const field = screen.queryByRole<HTMLInputElement>("searchbox", { name: "Find" });
  expect(field, "the command row shows Find while the index loads").not.toBeNull();
  expect(field?.disabled, "Find is disabled, not gated, while the index loads").toBe(true);
}

async function skeletonColumnsAt(hash: string): Promise<number> {
  renderAt(hash);
  await found(() => screen.queryByText("Loading the record index"), "the loading board");
  const busy = document.querySelector('[aria-busy="true"]');
  const row = Array.from(busy?.children ?? []).find((child) => child.getAttribute("role") !== "status");
  const count = row?.children.length ?? 0;
  cleanup();
  return count;
}

async function drawsTheColumnCountOfTheAddressedBoard() {
  expect(await skeletonColumnsAt("#/board"), "five stage columns on the program board").toBe(5);
  expect(await skeletonColumnsAt("#/board?orphans=1"), "three status columns on the No program board").toBe(3);
  expect(await skeletonColumnsAt("#/board?program=x"), "three status columns on the epic board").toBe(3);
}

describe("the board while the index loads", () => {
  it("shows the command row with Find disabled", disablesFindWhileTheIndexLoads);
  it("draws five skeleton columns, or three on an address with program or orphans", drawsTheColumnCountOfTheAddressedBoard);
});
