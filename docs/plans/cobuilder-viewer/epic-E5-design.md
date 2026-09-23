# Epic Technical Solution Design: E5 — The Work surface

Feature: cobuilder-viewer
Epic ID: cobuilder-viewer/E5

## Scope and Intent

E5 is the Work surface: one work item, four levels that page their sections, and the
panels that read the bundle's records. It carries the section model ADR-0028 decided,
and it is the largest epic in the narrowed program at six slices.

The three claims the epic exists for:

1. **A level is a sequence of sections.** One section is on screen at a time, on a
   horizontal track, and the box owns the scroll rather than the pane.
2. **One index drives the strip, the pager bar, and the two arrow keys.** The index is
   view state, so a step writes no route.
3. **The progress strip measures the level**, as `(index + within) / count`, where a box
   with no scroll range counts as fully read.

The boundary. E5 renders one work item that a reader already chose. It does not own the
board that lists them (E19), the FlightDeck surface (E6, E7), the record Sheet's own
layout beyond the row that opens it, or any publishing path. It reads the record index
and derives no join.

`plugins/artifact/viewer/src/variations/sections-e/` is the built reference. The
prototype holds the model as measured, and the numbers in this design come from it.

## Files Touched

- `plugins/artifact/viewer/src/shell/App.tsx` — new. The boot, the route, the frame,
  the rail, the top bar, and the pane.
- `plugins/artifact/viewer/src/shell/Pager.tsx` — new. `SectionStrip`, `SectionStage`,
  `SectionPager`, `LevelProgress`, `useSectionPaging`, and `withinOf`.
- `plugins/artifact/viewer/src/shell/model.ts` — new. `buildWorkItems`, `gatesOf`,
  `levelsOf`, `readRoute`, `routeHref`, `epicGroups`, `boardHref`.
- `plugins/artifact/viewer/src/shell/hooks.ts` — new. `useIndexLoad`, `useHashRoute`,
  `useDocumentNoScroll`, `useVisibleWidthCap`, `useCollapsedRail`, `useFocusOnChange`,
  `useScrollResetOnRoute`, `useSectionAvailability`.
- `plugins/artifact/viewer/src/shell/panels/Intent.tsx` — new. Why, Done when, Abort if,
  Out of scope.
- `plugins/artifact/viewer/src/shell/panels/ProblemSolution.tsx` — new. Problem and
  solution, Risks, Assessment, Unknowns.
- `plugins/artifact/viewer/src/shell/panels/Architecture.tsx` — new. Diagrams,
  Architecture Decisions, Boundaries, Districts and alternatives considered.
- `plugins/artifact/viewer/src/shell/panels/Build.tsx` — new. The epic runs, the slices,
  the rubrics.
- `plugins/artifact/viewer/src/shell/panels/PullRequests.tsx` — new. The envisioned pull
  request first, then the real ones, then the FlightDeck entry.
- `plugins/artifact/viewer/src/shell/panels/Shipped.tsx` — new. The stage, the
  publications, and the missing deploy record.
- `plugins/artifact/viewer/src/shell/atoms.tsx` — new. `Panel`, `Box`, `Chip`,
  `TextList`, `StateBadge`, `TONE_PILL`, `TONE_MARK`, and the band and tint classes.
- `plugins/artifact/viewer/src/shell/DiagramTiles.tsx` — new. The tiles, the dialog, the
  zoom, and the offline source fallback.
- `plugins/artifact/viewer/src/shell/Sheet.tsx` — new. The record sheet and its
  jumplink row.
- `plugins/artifact/viewer/src/shell/Rail.tsx`, `TopBar.tsx` — new. The traverse and the
  work item.
- `plugins/artifact/viewer/src/index.css` — modified. The token set the surface reads.
- `tests/test_sections.py` — new. The section model's claims against the served viewer.

## Types & Signatures

```ts
/* Pager.tsx — ADR-0028's shape. */
export interface Paging {
  index: number;
  count: number;
  select(index: number): void;
  previous(): void;
  next(): void;
}

/** The active section. It clamps to the list, and a route change resets it to `start`. */
export function useSectionPaging(count: number, routeKey: string, start?: number): Paging;

/** How far through one box the reader is. A box with no scroll range counts as read. */
export function withinOf(box: HTMLElement | null): number;

export function SectionStrip(props: {
  targets: JumpTarget[]; activeIndex: number; onSelect(index: number): void;
}): JSX.Element;

export function SectionStage(props: {
  index: number;
  activeBoxRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}): JSX.Element;

export function SectionPager(props: {
  index: number; count: number; onPrevious(): void; onNext(): void;
}): JSX.Element;

/* model.ts */
export type SectionKey =
  | "intent" | "problem-and-solution" | "architecture"
  | "build" | "pull-requests" | "shipped";

export type LevelKey = "intent" | "problem-and-solution" | "architecture";

export interface Route {
  workId: string | null; section: SectionKey;
  sub: string | null; subId: string | null;
}

export interface LevelState { key: LevelKey; available: boolean; missing: string[] }
export interface Gates { build: boolean; pullRequests: boolean; shipped: boolean; rubrics: boolean }

export function readRoute(): Route;
export function routeHref(workId: string, section: SectionKey, tail?: string): string;
export function levelsOf(work: WorkItem): Record<LevelKey, LevelState>;
export function gatesOf(work: WorkItem): Gates;
/** The Build level's sections: the epics in delivery order, six to a section. */
export function epicGroups(work: WorkItem): EpicEntity[][];

/* DiagramTiles.tsx */
export function loadMermaid(theme: Theme): Promise<MermaidApi>;
export function uncap(svg: string): string;
export function DiagramTiles(props: {
  levels: string[]; sources: Record<string, string>; theme: Theme;
}): JSX.Element;

/* Sheet.tsx */
export interface SheetSubject { /* one member per record kind */ }
export function useSheetHeadings(scroll: HTMLElement | null, keys: readonly unknown[]): SheetHeading[];
```

**The section lists, and where each comes from.** Intent holds Diagrams (the bundle's
first diagram level), Why, Done when, Abort if, and Out of scope. Problem & Solution
holds Problem and solution, Risks, Assessment, and Unknowns. Architecture holds the
mechanism diagrams, Architecture Decisions, Boundaries, and Districts and alternatives
considered. Build holds its epic runs. The first three are fixed lists; Build's comes
from `epicGroups`.

**A paged section carries no fold.** Every panel of a paged section renders open, so
`Panel` receives no `collapsible` prop on these levels.

## Slice Decomposition

Per `docs/plans/cobuilder-viewer/04-slices.md`, in build order.

- **Slice 8 — The section model.** Depends on: slice 7 (E19 opens a work item), slice 4
  (the typed model), slice 5 (the approved prototype). The track, the strip, the pager,
  the arrow keys, one box on screen, and no pane scroll.
- **Slice 9 — The level's progress.** Depends on: slice 8, because the strip measures
  the box the model puts on screen.
- **Slice 10 — Every level renders its own sections.** Depends on: slice 8. The six
  sections' panels, and the envisioned pull request leading Pull requests.
- **Slice 11 — The diagram tiles open their drawing.** Depends on: slice 10, because the
  tiles live in Architecture's Diagrams section and Intent's first section.
- **Slice 12 — A record opens in the Sheet.** Depends on: slice 10, because a Sheet
  opens from a control inside a panel.
- **Slice 13 — A goal.json-only design renders.** Depends on: slice 10. Seven designs in
  this repository carry one record, and each must render every level it can fill.

Slice 9 does not fold into slice 8. They are two states: a model that moves one box, and
a reading that reports the level's position. ADR-0028 states them as two claims.

## Test Plan

`tests/test_sections.py`, run by `uv run --with pytest pytest tests/ -v`. The harness
serves the bundle rooted at `.cobuilder-architect/self/`, which is the parent of
`viewer/`, and measures the DOM. The Gate 4c rubrics score the same claims on the built
surface, because the repository's suite holds no browser driver today.

**What `tests/test_sections.py` can measure, and what it cannot.** The file cannot
measure the served page. The repository holds no browser driver, and a Python test
reaches the DOM only through jsdom, which holds no layout engine. jsdom reports zero
for `scrollHeight`, for `clientHeight`, and for a bounding rect, and its computed style
carries no layout-derived value. So the file measures the tree, the roles, the
attributes, and the class logic. The geometry claims in this document's test list — a
pane whose scroll height equals its client height, one box's rect inside the pane's, a
track transform of one box width, and a progress reading — need a real browser. Those
claims belong to the Gate 4c rubrics, scored through the ChromeDevTools MCP tools, and
`epic-E19-design.md` states the same rule.

- `test_paged_level_pane_does_not_scroll` — slice 8. On each of the four paged levels,
  the pane's `scrollHeight - clientHeight` is zero.
- `test_one_box_is_in_view` — slice 8. One box's rect sits inside the pane's, and no
  other box's does.
- `test_strip_count_matches_box_count` — slice 8. The strip's headings equal the boxes,
  and the pager reads `Section 1 of N` for that N.
- `test_next_moves_exactly_one_box` — slice 8. The track's transform moves by exactly
  one box width, forward and back.
- `test_arrow_keys_step_and_are_guarded` — slice 8. The two arrow keys step, and a press
  inside an `input`, a `textarea`, or a `select`, or with a modifier held, does not.
- `test_progress_is_level_progress` — slice 9. The reading is 0 at the first section's
  top, one count's share higher mid-box, and the full walk never decreases.
- `test_box_with_no_range_reads_as_read` — slice 9. A section that fits one screen
  contributes its whole share.
- `test_every_level_renders_its_own_sections` — slice 10. Each section of each level
  renders its own panels from the bundle's records.
- `test_the_envisioned_pull_request_leads` — slice 10. On the Pull requests level, the
  drafted pull request renders above the real ones.
- `test_diagram_tile_opens_the_dialog` — slice 11. A press opens the dialog with the
  drawing; Escape and the backdrop close it.
- `test_diagram_zoom_steps` — slice 11. The zoom reads 50, 100, and 400 percent, and the
  drawing's box grows with it.
- `test_diagram_failure_shows_the_source` — slice 11. With the CDN blocked, the tile
  states the failure and the dialog shows the authored source.
- `test_record_opens_in_the_sheet` — slice 12. A press opens the record, and a part link
  scrolls the sheet and moves focus to that heading.
- `test_sparse_design_renders` — slice 13. A `goal.json`-only design renders every level
  it can fill, and the rail gates the rest.

## Risks & Open Questions

- **The DOM claims have no runner in the suite.** The repository's tests are Python and
  check packaging invariants. The cases above need a served page and a DOM read. Until a
  driver lands, the Gate 4c rubrics carry the scoring, and the pytest cases are stated
  for the day a driver arrives.
- **The diagram runtime loads when the Diagrams section mounts.** It used to load on the
  reader's press. A tile cannot wait for a press, so the rule changed, and a reader who
  opens Architecture for the decisions pays for a runtime they never use. A lazy
  per-tile load is the obvious alternative and this design does not take it.
- **The section index lives in component state.** A reader cannot share a link to one
  section of one level. A record inside a section is still shareable, and an epic deep
  link lands on the run that holds it.
- **A box that cannot scroll reads as a full bar.** Honest, and it reads as complete on a
  short section. No work in this epic changes it.
- **The strip reads the DOM.** `useJumpTargets` observes the pane, so a section that
  renames itself renames its own link. The cost is a one-frame lag after a section
  change: the strip holds the previous section's labels until the observer fires. The
  pager's count comes from the sections array, so a count never disagrees.
- **Six sections in one slice is a large slice.** Slice 10 crosses every panel the Work
  surface holds. It is one observable state, and no smaller cut leaves a state a reader
  can see.
