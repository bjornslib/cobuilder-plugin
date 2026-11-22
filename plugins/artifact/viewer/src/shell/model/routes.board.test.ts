import { describe, expect, it } from "vitest";

import * as routes from "./routes";
import { readRoute } from "./routes";

type SliceHref = (workId: string, epicId: string, n: number | string) => string;

function readAt(hash: string) {
  window.location.hash = hash;
  return readRoute();
}

function sliceHrefOf(): SliceHref {
  const builder = (routes as unknown as Record<string, unknown>).sliceHref;
  expect(typeof builder, "routes.ts exports sliceHref").toBe("function");
  return builder as SliceHref;
}

function readsTheFifthSegment() {
  expect(readAt("#/w/build/epics/E1/3")).toMatchObject({ workId: "w", section: "build", sub: "epics", subId: "E1", sliceN: "3" });
}

function keepsTheEpicAddress() {
  expect(readAt("#/w/build/epics/E1")).toMatchObject({ workId: "w", section: "build", sub: "epics", subId: "E1", sliceN: null });
}

function keepsTheOlderAddresses() {
  expect(readAt("#/w/build/epics")).toMatchObject({ workId: "w", section: "build", sub: "epics", subId: null, sliceN: null });
  expect(readAt("#/w/intent")).toMatchObject({ workId: "w", section: "intent", sub: null, subId: null, sliceN: null });
  expect(readAt("#/w/pull-requests/3/architecture")).toMatchObject({ workId: "w", section: "pull-requests", sub: "3", subId: "architecture", sliceN: null });
  expect(readAt("#/")).toMatchObject({ workId: null, section: "intent", sub: null, subId: null, sliceN: null });
}

function buildsTheSliceAddress() {
  const sliceHref = sliceHrefOf();
  expect(sliceHref("w", "E1", 3)).toBe("#/w/build/epics/E1/3");
  expect(sliceHref("w", "E1", "3"), "a string number builds the same address").toBe("#/w/build/epics/E1/3");
}

function roundTripsTheSliceAddress() {
  const sliceHref = sliceHrefOf();
  expect(readAt(sliceHref("beta", "E2", 5))).toMatchObject({ workId: "beta", sub: "epics", subId: "E2", sliceN: "5" });
}

describe("the slice address", () => {
  it("reads the fifth segment of an epic address into sliceN", readsTheFifthSegment);
  it("keeps sliceN null at the epic address", keepsTheEpicAddress);
  it("reads every older address as before, with sliceN null", keepsTheOlderAddresses);
  it("builds #/<work>/build/epics/<epic>/<n> with sliceHref", buildsTheSliceAddress);
  it("reads back the address that sliceHref builds", roundTripsTheSliceAddress);
});
