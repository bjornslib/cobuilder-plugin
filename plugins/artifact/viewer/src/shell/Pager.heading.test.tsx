import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DESIGN } from "./testSupport/Pager/fixtures";
import { PAGED, open, setupPagerHooks } from "./testSupport/Pager/page";
import {
  HEADING_ID,
  JUMP_BAR_NAME,
  PANE_ID,
  contentRootOf,
  hasStrip,
  levelTitle,
  pagerText,
  strip,
} from "./testSupport/Pager/queries";

setupPagerHooks();

function expectSrOnlyHeading(heading: HTMLElement) {
  expect(heading, "the level keeps one heading element").not.toBeNull();
  expect(heading.tagName).toBe("H1");
  expect(heading.className, "the heading is sr-only, so no band renders").toContain("sr-only");
  expect(heading.textContent?.trim()).toBe("Intent");
  expect(
    heading.closest("header"),
    "no band element renders above the strip",
  ).toBeNull();
}

/*
  C5's first two pieces of evidence. A paged level repeats nothing: the strip names the
  sections, so the banner above them is gone, and the level's one `h1` survives as
  `sr-only` for a screen reader and for the focus move. The case reads the heading's tag,
  its class, its words, and whether a `<header>` band still wraps it — the last of which
  is exactly the difference between a paged level and a stacked one.
*/
async function dropsBandKeepsHeading() {
  await open(PAGED[0].hash);
  await waitFor(() => expect(hasStrip()).toBe(true));

  expectSrOnlyHeading(document.getElementById(HEADING_ID) as HTMLElement);
  expect(document.querySelectorAll("h1"), "the document keeps one h1").toHaveLength(1);
}

/*
  The other half of C5's rule, and the reason the case above can fail. Pull requests
  stacks its panels in the pane's own scroll, so it draws the band the paged level drops
  and keeps its heading in the flow rather than out of it.
*/
async function keepsBandOnStackedLevel() {
  await open(`#/${DESIGN}/pull-requests`);
  await waitFor(() => expect(levelTitle()).toBe("Pull requests"));

  const heading = document.getElementById(HEADING_ID) as HTMLElement;
  expect(heading.closest("header"), "a stacked level draws its band").not.toBeNull();
  expect(heading.className, "and its heading is not sr-only").not.toContain("sr-only");
}

function expectFocusOnArchitectureHeading() {
  expect(document.activeElement?.id, "focus lands on the level's heading").toBe(HEADING_ID);
}

/*
  THE RAIL'S ROW IS THE ONE THIS FIXTURE FILLS. The work's own epics carry no pull
  request, so this bundle holds no change's account and the rail draws one
  Architecture row: the program's. Its accessible name carries the row's own account
  and the count it read, so the name is matched on its opening words rather than on
  the bare section word, which no row carries any more.
*/
function pressArchitectureRow() {
  fireEvent.click(screen.getByRole("link", { name: /^Architecture,/ }));
}

/*
  C5's third piece of evidence. A level change is a section change in the shell's own
  vocabulary, and the shell moves focus to the level's heading for it. The address is
  opened first, so the case proves the move rather than the first paint.

  THIS CASE PASSES, AND THE MOUNT IS WHY. The hook that moves focus is
  `useFocusOnMount`, and it focuses the heading the arriving subtree owns when that
  subtree mounts. The hook used to run one animation frame after the route changed and
  resolve its target by id. `AnimatePresence mode="wait"` in `App.tsx` keeps the
  outgoing subtree mounted until its exit animation finishes, and that subtree owns the
  `h1#work-section-heading` of the level being left. So that frame focused the old
  heading, and the exit then let focus fall to the body. The id is ambiguous during the
  transition, so the move now belongs to the arriving heading inside the keyed subtree.
*/
async function movesFocusOnLevelChange() {
  await open(PAGED[0].hash);
  await waitFor(() => expect(document.activeElement?.id).toBe(HEADING_ID));

  pressArchitectureRow();

  await waitFor(() => expect(levelTitle()).toBe("Architecture"));
  await waitFor(expectFocusOnArchitectureHeading);
  expect(document.activeElement?.textContent?.trim()).toBe("Architecture");
  expect(document.activeElement?.className, "and the element it lands on is the sr-only one").toContain("sr-only");
}

describe("Slice 8 · a paged level drops the band and keeps the heading element", () => {
  it("draws no band above the strip, and keeps one sr-only h1 carrying the level's title", dropsBandKeepsHeading);
  it("keeps the band on a stacked level, where the strip does not say the words", keepsBandOnStackedLevel);
  it("moves focus to the level heading when the level changes", movesFocusOnLevelChange);
});

function expectNoPagedControls() {
  expect(hasStrip(), "Rubrics draws no strip").toBe(false);
  expect(pagerText(), "Rubrics draws no pager bar").toBeNull();
  expect(screen.queryByRole("button", { name: "Previous" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  expect(screen.getByRole("region", { name: "Rubrics" })).toBeTruthy();
}

function expectOneBarBesideJumpBar() {
  const jumpBar = screen.getByRole("navigation", { name: JUMP_BAR_NAME });
  const bars = screen.queryAllByRole("progressbar");
  expect(bars, "one bar, and it is not a level's").toHaveLength(1);
  expect(
    bars[0].parentElement,
    "the bar sits beside the jump bar, so it measures the pane",
  ).toBe(jumpBar.parentElement);
}

async function openRubrics() {
  await open(`#/${DESIGN}/build/rubrics`);
  await waitFor(() => expect(levelTitle()).toBe("Build"));
}

/*
  C6's first evidence. The Rubrics sub-view is not paged: it draws none of the three
  controls, and the one progress bar on the page is the pane's own reading strip, which
  sits beside the jump bar in the pane's sticky band rather than inside a paged column.
  A level progress bar is the only one of the two that a paged level draws, so its
  position in the tree is what tells them apart here.
*/
async function drawsNoPagedControls() {
  await openRubrics();

  expectNoPagedControls();
  expectOneBarBesideJumpBar();
}

function expectPaneOwnsScroll(pane: HTMLElement) {
  const region = screen.getByRole("region", { name: "Rubrics" });
  const root = contentRootOf(pane, region);

  expect(pane.className, "the pane is the scrolling region").toContain("overflow-auto");
  expect(root.className, "the content root is not bounded by the pane's height").not.toContain("h-full");
  expect(
    Array.from(pane.querySelectorAll("nav")).map((nav) => nav.getAttribute("aria-label")),
    "the pane keeps the jump bar and draws no strip",
  ).toContain(JUMP_BAR_NAME);
}

async function expectPagedRootBounded() {
  cleanup();
  await open(PAGED[0].hash);
  await waitFor(() => expect(hasStrip()).toBe(true));
  const pagedRoot = contentRootOf(document.getElementById(PANE_ID) as HTMLElement, strip());
  expect(pagedRoot.className, "a paged level's root takes the pane's height and no more").toContain("h-full");
}

/*
  C6's second evidence. The pane owns its scroll, and the tree states why: the Rubrics
  content root carries no height of its own, so it may stand taller than the pane and the
  pane takes the overflow. The paged column does carry one, and its absence here is the
  difference. The scroll heights themselves are jsdom's zero and belong to the browser,
  which the report says.
*/
async function keepsPaneScroll() {
  await openRubrics();

  expectPaneOwnsScroll(document.getElementById(PANE_ID) as HTMLElement);

  /* The contrast: a paged level's root is bounded, because its pane never scrolls. */
  await expectPagedRootBounded();
}

describe("Slice 8 · Rubrics keeps the stacking shape", () => {
  it("draws no strip, no pager, and no level progress bar", drawsNoPagedControls);
  it("keeps the pane's own scroll, with no bounded-height column under it", keepsPaneScroll);
});
