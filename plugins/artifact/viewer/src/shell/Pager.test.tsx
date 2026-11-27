/**
 * Slice 8: the section model, stated as cases. The slice's end, from the ladder in
 * `docs/plans/cobuilder-viewer/04-slices.md`: "One box is on screen, the strip, the pager
 * bar, and the two arrow keys move one index, and the pane reports no scroll at all." The
 * rubric `.cobuilder/rubrics/cobuilder-viewer/slice-8.md` has six criteria, and they are
 * the six groups of cases.
 *
 * The subject is `Pager.tsx`, and the cases render the shell. `PagedLevel` in `App.tsx` is
 * the one caller that mounts the pager parts, and a section model with no level around it
 * is not a state a reader can meet. Only the last arrow-key case calls the guard directly.
 *
 * Geometry is browser-only. jsdom has no layout engine: it reports zero for `scrollHeight`,
 * `clientHeight`, and every bounding rect, so a case that compared them would pass whatever
 * the tree did. The rubric reaches those claims through the ChromeDevTools MCP tools on a
 * served bundle. This file reads the tree, the roles, the attributes, and the class
 * contract the layout rests on. Three claims stay with the browser: the pane's scroll
 * range, the box's rect inside the pane's, and the track's transform offset.
 *
 * The track's transform was measured before these cases were written. Motion writes no
 * inline transform under jsdom, so `track.style.transform` reads `none` at every index. The
 * step is therefore read from the index and from the class contract that makes `-100%` one
 * box.
 *
 * The fixture holds seven epics. Six fill one section of the paged Build level
 * (`EPICS_PER_SECTION`), so seven give two sections, and the case is not a one-box special
 * case. The other three paged levels are fixed lists of four.
 *
 * The `App` tests cover the arrow keys that never move the rail, and the board that draws
 * none of the three controls. This file does not restate them.
 *
 * jsdom implements neither `matchMedia` nor `ResizeObserver`, and the shell asks both on its
 * first render. The stubs answer the query false and observe nothing, which gives the desktop
 * rail and a diagram tile whose box is never measured.
 */

import { cleanup, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PAGED, open, setupPagerHooks, type PagedLevel } from "./testSupport/Pager/page";
import {
  PANE_ID,
  boxesOf,
  columnOf,
  contentRootOf,
  hasStrip,
  onScreenIndex,
  pagerCount,
  pagerText,
  stageOf,
  stripLinks,
} from "./testSupport/Pager/queries";

setupPagerHooks();

function expectTrackShape(level: PagedLevel) {
  expect(boxesOf(), `${level.label} lays its sections on the track`).toHaveLength(level.count);
  expect(stripLinks(), `${level.label} names one link per box`).toHaveLength(level.count);
  expect(pagerCount(), `${level.label} counts the boxes it laid down`).toBe(level.count);
}

function expectOnlyFirstShows(level: PagedLevel) {
  expect(
    boxesOf().filter((box) => box.hasAttribute("inert")),
    `${level.label} hides every box but the one on screen`,
  ).toHaveLength(level.count - 1);
  expect(onScreenIndex(), `${level.label} starts on its first box`).toBe(0);
  expect(pagerText(), `${level.label} states its first section`).toBe(`Section 1 of ${level.count}`);
}

async function checkLevel(level: PagedLevel) {
  cleanup();
  await open(level.hash);
  await waitFor(() => expect(hasStrip()).toBe(true));
  expectTrackShape(level);
  expectOnlyFirstShows(level);
}

/*
  C1, at the level of the tree. The rubric counts boxes inside the pane's rect with a
  browser. This counts the boxes on the track and reads which one the stage left reachable.
  A track with no box fails the count, and a stage that stopped marking the others `inert`
  reports four boxes on screen instead of one.
*/
async function putsOneBoxOnScreen() {
  for (const level of PAGED) {
    await checkLevel(level);
  }

  /* The three fixed levels page four each, and the Build level pages its two epic runs. */
  expect(PAGED.map((level) => level.count)).toEqual([4, 4, 4, 2]);
}

function expectRootAndColumn(pane: HTMLElement, column: HTMLElement) {
  const root = contentRootOf(pane, column);
  expect(pane.contains(column), "the column sits inside the pane").toBe(true);
  expect(root.className, "the level's root takes the pane's own height").toContain("h-full");
  expect(root.className, "and may shrink, so nothing pushes the pane taller").toContain("min-h-0");
  expect(root.contains(column), "the column is built inside that root").toBe(true);
  expect(column.className, "the column takes the height the chrome left").toContain("flex-1");
  expect(column.className, "and never grows past it").toContain("min-h-0");
}

function expectBoxesScrollThemselves() {
  const clipped = boxesOf().filter((box) => box.className.includes("overflow-y-auto"));
  expect(clipped, "every box scrolls its own overflow").toHaveLength(boxesOf().length);
  expect(
    boxesOf().map((box) => box.className.includes("overscroll-contain")),
    "a box's scroll never chains to the pane",
  ).toEqual(boxesOf().map(() => true));
}

/*
  The class contract the layout rests on. jsdom measures nothing, so the pane's scroll
  height cannot be compared with its client height. This case reads the contract that
  makes them equal: the level's column takes the pane's height and no more, the stage is
  the one clip box, and every box is its own scroll container. Break one and it fails.
*/
async function boundsLevelByPane() {
  await open(PAGED[3].hash);
  await waitFor(() => expect(hasStrip()).toBe(true));

  expectRootAndColumn(document.getElementById(PANE_ID) as HTMLElement, columnOf());
  expect(stageOf().className, "the stage is the one clip box").toContain("overflow-hidden");
  expectBoxesScrollThemselves();
}

/*
  The document must own no scroll. `useDocumentNoScroll` sets `overflow: hidden` on the root
  and the body while the shell is mounted, and hands both back on unmount. Without the hook
  the document scrolls behind a pane that cannot, and this case fails.
*/
async function takesDocumentScroll() {
  const before = document.documentElement.style.overflow;

  await open(PAGED[0].hash);
  await waitFor(() => expect(hasStrip()).toBe(true));

  expect(document.documentElement.style.overflow, "the root owns no scroll").toBe("hidden");
  expect(document.body.style.overflow, "the body owns no scroll").toBe("hidden");

  cleanup();
  expect(document.documentElement.style.overflow, "the host gets its scroll back").toBe(before);
}

describe("Slice 8 · one box is on screen, and the pane does not scroll", () => {
  it("puts one box on screen on each of the four paged levels", putsOneBoxOnScreen);
  it(
    "bounds the level by the pane, clips at the stage, and lets each box scroll itself",
    boundsLevelByPane,
  );
  it("takes the document's scroll, so no page scroll sits behind the pane", takesDocumentScroll);
});
