/**
 * Slice 8 — the section model, stated as cases.
 *
 * The slice's end, from the ladder in `docs/plans/cobuilder-viewer/04-slices.md`: "One box
 * is on screen, the strip, the pager bar, and the two arrow keys move one index, and the
 * pane reports no scroll at all." The rubric that scores it is
 * `.cobuilder/rubrics/cobuilder-viewer/slice-8.md`, and its six criteria are the six
 * groups below.
 *
 * THE SUBJECT IS `Pager.tsx`, AND THE CASES RENDER THE SHELL. `useSectionPaging`,
 * `SectionStrip`, `SectionStage`, `SectionPager`, and `keyPressIsTaken` are that file's,
 * and `PagedLevel` in `App.tsx` is the one caller that mounts them. A section model with
 * no level around it is not a state a reader can meet, so every case below renders
 * `Shell` at a real address. The one exception is the last case in the arrow-key group,
 * which calls the guard directly.
 *
 * GEOMETRY IS BROWSER-ONLY, AND THIS FILE DOES NOT PRETEND OTHERWISE. jsdom has no layout
 * engine: it reports zero for `scrollHeight`, for `clientHeight`, and for every bounding
 * rect, so a case that compared the pane's scroll height against its client height would
 * pass here whatever the tree did. The rubric reaches those claims through the
 * ChromeDevTools MCP tools on a served bundle, and no runner in this package holds a
 * browser. What this file carries instead is the tree, the roles, the attributes, and the
 * class contract the layout rests on — each case below says which of those it reads, and
 * the ones that stand in for a geometry claim name the claim they stand in for. The three
 * claims left to the browser are stated in the report: the pane's own scroll range, the
 * box's rect inside the pane's, and the track's transform offset.
 *
 * THE TRACK'S TRANSFORM IS ONE OF THOSE THREE, and it was measured before these cases were
 * written: motion writes no inline transform under jsdom, so `track.style.transform` reads
 * `none` at every index. The step is therefore read from what the transform is derived from
 * — the index — and from the class contract that makes `-100%` one box.
 *
 * THE FIXTURE HOLDS SEVEN EPICS. Six fill one section of the paged Build level
 * (`EPICS_PER_SECTION` in `model.ts`), so seven give that level two sections and the case
 * for it is not a one-box special case. The other three paged levels are fixed lists of
 * four, and each is opened in its own right.
 *
 * `App.test.tsx` already carries two cases that touch this model — the arrow keys step the
 * pager and never move the rail, and the board draws none of the three controls. They are
 * its cases and this file does not restate them. What is here is the slice's own end: the
 * box, the index, the three controls, and the shape each level keeps.
 *
 * jsdom implements neither `matchMedia` nor `ResizeObserver`, and the shell asks both
 * questions on its first render. The stubs answer the query false and observe nothing,
 * which is the desktop rail and a diagram tile whose box is never measured.
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
  C1's first evidence, at the level of the tree. The rubric counts boxes inside the
  pane's rect with a browser; this counts the boxes on the track and reads which one the
  stage left reachable. Both halves can fail: a track that rendered no box fails the
  count, and a stage that stopped marking the others `inert` reports four boxes on
  screen instead of one.
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
  C1's second and third evidence, as the class contract the layout rests on. jsdom
  measures nothing, so the pane's scroll height against its client height cannot be
  compared here. What can be read is the contract that makes those two equal: the
  level's column takes the pane's height and no more, the stage is the one clip box,
  and every box is its own scroll container. Break any one of the three and this case
  fails.
*/
async function boundsLevelByPane() {
  await open(PAGED[3].hash);
  await waitFor(() => expect(hasStrip()).toBe(true));

  expectRootAndColumn(document.getElementById(PANE_ID) as HTMLElement, columnOf());
  expect(stageOf().className, "the stage is the one clip box").toContain("overflow-hidden");
  expectBoxesScrollThemselves();
}

/*
  C1's third evidence rests on the document owning no scroll. `useDocumentNoScroll` is
  the mechanism, and it is readable: the root and the body both carry `overflow: hidden`
  while the shell is mounted, and both are handed back on unmount. Remove the hook and
  the document scrolls behind a pane that cannot, which this case fails on.
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
