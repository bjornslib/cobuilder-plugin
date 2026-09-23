# Epic Technical Solution Design: E19 — The Work board

Feature: cobuilder-viewer
Epic ID: cobuilder-viewer/E19

## Scope and Intent

E19 is the surface that lists every work item before a reader picks one. The shell had no
landing surface. A route that named a work item rendered it. A route that named none
fell through to the error the shell keeps for an unknown id. A reader arriving on the
bundle had nowhere to start.

**The board is the landing surface.** The bare route `#/` renders it, and the
rail's top entry returns to it from any level. The route that names an unknown id keeps
its own error, because an address that resolved to nothing is not the board. The shipped
shell owns the bare route, because the prototype's `#/sections-e` address belonged to the
comparison harness it sat behind.

**The board is a flat list, not four lanes.** The approved lane rule survives as the
order. A lane board does not fit this bundle. A superseded design holds no lane, and
this bundle holds four of them, so a lane arrangement would need a tab for work every
reader must still reach. A row also carries more than a card does: a stage, six record
marks, and an epic and a slice figure.

The boundary. The board is not a paged level: it draws no section strip, no pager, and no
level progress bar. It draws no reading-progress strip and no section-link bar either,
because the page is a list of short rows and a progress reading would sit at one value. It
opens the Work surface and changes nothing inside it. It does not list records: it says
which records an item holds and opens the item.

`plugins/artifact/viewer/src/variations/sections-e/Board.tsx` and its `readiness.ts` are
the working reference. Both were built and measured.

## Files Touched

- `plugins/artifact/viewer/src/shell/Board.tsx` — new. The board, ported from
  the prototype with no change of behaviour.
- `plugins/artifact/viewer/src/shell/readiness.ts` — new. The six record kinds,
  the three readiness words, and the one derivation. Moved with the board, because the
  board is its only reader.
- `plugins/artifact/viewer/src/shell/Board.test.tsx` — new. The board's own
  cases.
- `plugins/artifact/viewer/src/shell/readiness.test.ts` — new. The readiness
  rule's cases, which need no DOM.
- `plugins/artifact/viewer/src/shell/App.tsx` — modified. `board = route.workId === null`
  selects the board, and the pane renders it instead of the unknown-id error. The
  work-item branch keeps that error.
- `plugins/artifact/viewer/src/shell/Rail.tsx` — modified. The top entry `Work` opens the
  board, and it takes `board` and `workCount` props.
- `plugins/artifact/viewer/src/shell/TopBar.tsx` — modified. The bar states the board
  rather than a missing work item.
- `plugins/artifact/viewer/src/shell/model.ts` — modified. `boardHref()` returns the bare
  route prefix.
- `plugins/artifact/viewer/src/shell/records.ts` — modified. `MinWork` and the `min_work`
  field on `goal`, which the goal verdict reads.
- `plugins/artifact/viewer/src/shell/atoms.tsx` — modified. `TONE_MARK`, `TONE_PILL`,
  `StateBadge`, and `toneForStage`, which the row's marks and badge read.

## Types & Signatures

```ts
/* readiness.ts — the six authored records, and how complete each one is. */
export type RecordKind =
  | "goal" | "intent" | "narrative" | "assessment" | "pr-draft" | "diagrams";

export const RECORD_KINDS: RecordKind[];
export const RECORD_LABEL: Record<RecordKind, string>;

export type Readiness = "present" | "partial" | "absent";

export interface Verdict {
  state: Readiness;
  /** The parts the record is missing. Empty unless the state is `partial`. */
  missing: string[];
}

export type RecordVerdicts = Record<RecordKind, Verdict>;

/** One verdict per kind. A design `designs.js` misses reads absent on all six. */
export function recordVerdicts(record: DesignRecord | undefined): RecordVerdicts;

/** How many of the six records exist, whole or in part. */
export function presentCount(verdicts: RecordVerdicts): number;

/* Board.tsx — the props, as the component takes them. */
export interface BoardProps {
  /** The resolved rows the record index yields, one per design. */
  rows: DesignRow[];
  /** The per-design record map `data/designs.js` carries. */
  records: DesignRecords;
  /** False while the index is in flight, so the board states that and nothing else. */
  ready: boolean;
  /** The heading the shell moves focus to on a route change. */
  headingId: string;
}

export function Board(props: BoardProps): JSX.Element;

/* The row type, and the records it reads. Both are the shipped data layer. */
export interface DesignRow {
  design: DesignEntity;
  epics: EpicEntity[];
  slices: SliceEntity[];
  /** Epics whose joined status is completed or merged. */
  done: number;
  /** Pull requests this design's epics point at, deduplicated and sorted. */
  pullRequests: number[];
}

export type DesignRecord = /* one design's authored records, as designs.js writes them */;
export type DesignRecords = Record<string, DesignRecord>;

/* model.ts */
/** The bare route: the one destination that states no section. */
export function boardHref(): string;

/* records.ts */
export interface MinWork {
  derived_from?: string;
  alternatives_explored?: number;
  boundary_rules_checked?: boolean;
  challenge_stage_run?: boolean;
  note?: string;
}
```

**The board reads the shipped data layer, not the variation's scaffolding.** An earlier
draft of this design took `works: Map<string, WorkItem>`, and `WorkItem` belongs to
`variations/sections-e/model.ts`. That is the mockup's own copy, held together for the
reason `atoms.tsx` gives: every directory under `variations/` stays independently
removable. The plan deletes the variations once the shipped surface exists. A shipped
component that took their type would break on the day the scaffolding went. The board
therefore takes `rows: DesignRow[]` from `@/data/types`, and it takes the record map
beside them. `src/components/work/WorkBoard.tsx` and `src/components/work/DesignCard.tsx`
are the pattern, and the board follows it.
The board takes no address prop, for the reason the rail takes none: `src/shell/Board.tsx`
imports `routeHref` from `./model`, so the shell keeps routing and the board keeps
presentation.

**A row's address names a level the design can fill, not a fixed level.** The board holds a
`rowSection(row, records)` rule with three cases. `intent` comes first, because Intent is
available exactly when `data/designs.js` carries a record for the design, and the record map
sits beside the rows already. A design that file misses fills no level, so its row names
`build`, which fills when the row carries an epic. `intent` is the shell's own last resort.
A single fixed address would be wrong for the second case: the shell would land on a gated
level, redirect away from it, and state the redirect.

**Where the modules live.** The board is a surface of the shell, so its two modules
live in `src/shell/`, beside `Sheet.tsx` and `DiagramTiles.tsx`. The approved program
design states the rule: the slices port what the prototype proved into `src/shell/`
(`03-program-design.md`, Files). `src/components/` holds the reusable primitives and
the prototype areas: `ui/`, `smoothui/`, and the older lane board at `work/`.

**The order rule, and its two edges.** `STAGE_ORDER` holds `backlog`, `decided`,
`approved`, `review`, `implemented`, `superseded`. A superseded design sorts after every
live stage, because no work waits on it. A stage outside that vocabulary sorts after even
superseded, so a newer bundle still renders rather than disappearing. Two designs of one
stage sort by id, so the order is total and stable.

**The six marks, one per kind, in one order.** A mark states the record's name, whether
it exists, and whether it is whole. A whole record takes a solid mark; a gap takes a
dashed mark with a shape marker beside it, which survives greyscale. A `partial` verdict
names the empty part in its tooltip. One derivation produces every verdict, and every row
renders it, so two rows cannot disagree about one record.

**The row carries the item's figures.** The stage comes from `work.design.stage`. The
record count comes from `presentCount`. The epic figure counts epics whose refined state
is `completed` or `merged`, read from the join and never from the entity. The slice
figure counts slices whose state is `completed`, and it hides when the item carries none.

## Slice Decomposition

Per `docs/plans/cobuilder-viewer/04-slices.md`, in build order.

- **Slice 6 — The shell lands on the bundle's designs.** Depends on: slice 4 (the typed
  model). The bare route renders the board: one row per design, each row stating its
  stage and its six record marks, and no error state. The board's key renders beside the
  list, because the three readiness words are new to a reader here.
- **Slice 7 — A row opens the item's Work surface.** Depends on: slice 6, and slice 8
  (the section model the opened surface renders). Pressing a row lands on that item's
  Work surface at its first level, with the route naming the item.

Slice 7 is not slice 6's interaction detail. Two states: a bundle a reader can survey,
and one item a reader can enter. Slice 6 renders the list with no navigation out of it,
and slice 7 is the transition the board exists for.

## Test Plan

The suite is **vitest**, beside the modules it tests: `npm test` runs `vitest run` in
`plugins/artifact/viewer/`, over `src/shell/Board.test.tsx` and
`src/shell/readiness.test.ts`. Vitest is already a dependency of this package.
The two files sit in the same directory as the code they cover.

`readiness.test.ts` needs no DOM, because the rule is pure. `Board.test.tsx` renders the
component with `@testing-library/react` inside a `TooltipProvider`, and it reads the rows
by role.

- **`readiness.test.ts`** — slice 6. `recordVerdicts` and `presentCount` against fixtures
  written the way `data/designs.js` writes a record: a whole record reads `present`, a
  record with an empty named part reads `partial` and names it, an absent record reads
  `absent`, and a design `designs.js` does not carry reads absent on all six.
- **`Board.test.tsx`** — slice 6. The row count equals the designs it was given, one row
  per design. Each row states the stage its design records. Each row carries one mark per
  `RECORD_KINDS` entry, in that order. A design with no record renders six dashed marks
  and a design with all six renders six solid ones. A `goal.json`-only design's goal mark
  names the empty part, because the goal records `challenge_stage_run` false. The order
  follows the lane rule, and a superseded design sorts after every live stage. A stage
  outside the vocabulary sorts last. The board draws no section strip, no pager bar, no
  level progress bar, and no reading-progress strip.
- **The rendered page** — slices 6 and 7. The bare route renders the board and not the
  unknown-id error. The rail's `Work` entry returns to it. A row's href is that item's
  route, and a press lands on that item's Work surface at its first level. A sparse design
  opens. The pane owns the scroll, and the document does not.

**The third group has no runner yet, and that gap is known.** The repository holds no
browser driver. The Python suite under `tests/` checks packaging invariants, and vitest
runs in jsdom without a served bundle. The Gate 4c rubrics therefore score the page-level
claims above, through the ChromeDevTools MCP tools. A later session that adds a browser
harness should move them there. Their absence from CI is a known gap, not an
oversight.

## Risks & Open Questions

- **Two board implementations exist in the tree.** `src/components/work/WorkBoard.tsx`
  holds the lane arrangement with cards, taken from the approved static prototype, and
  `src/shell/Board.tsx` holds the flat list this epic ships. Two boards that
  disagree about one bundle is a real hazard. Either somebody deletes the lane board when E19
  lands, or it stays as a named alternative the way `variations/app-shell/` is. This
  design ships
  the flat list and leaves the older file in place, and that is a decision a reader should
  confirm.
- **The readiness derivation reaches into record shapes.** `narrative.json` wraps its
  three levels under `levels` in one design and authors them at the top level in others.
  The rule reads both shapes, because a rule that saw only the flat one reported three
  levels missing while the text sat one key away. A third shape would need the same
  treatment.
- **`challenge_stage_run` is the one goal field that decides `partial`.** A backlog entry
  records it false, and the verdict names design mode's stages 2 to 7 as the missing part.
  A design whose goal omits the field entirely reads `present`, which may be generous.
  Measured on 2026-09-22: of the seven sparse designs, five record the field false and read
  `partial`, and two record it true and read `present` while no `intent.json`,
  `narrative.json`, or `assessment.json` exists beside their goal. The rule trusts the
  recorded field, so the board reports those two as whole. A stricter rule would
  cross-check the sibling records. That change is not made here.
- **The board has no filter and no search.** Fifteen rows is a readable list. A bundle
  with sixty designs would not be, and nothing in this epic says what happens then.
- **The board states completeness, which no other panel does.** Every panel in this shell
  states absence and never presence. The board breaks that rule on purpose, because its
  job is to let a reader compare two items before opening either. A later session that
  "fixes" the board to state absence only would remove the reason it exists.
- **The three readiness words are new to a reader here.** The key explains them, and the
  key is a paragraph of prose above the list. If a later change removes the key, the marks
  become unreadable.
- **The board's address rule repeats two rules the model owns.** `model.ts` sets
  `levelsOf`'s `intent.available` to `record !== undefined`, and `gatesOf`'s `build` to
  `work.epics.length >= 1`. `Board.tsx`'s `rowSection` states both again. They agree today,
  so no row names a section the shell redirects away from. A later change to either model
  rule would not reach the board. The board cannot call `levelsOf`, because that function
  takes a `WorkItem` and the board takes `DesignRow[]`. The fix is to lift the rule into one
  exported function in `model.ts` that both callers use. It is not made here.
