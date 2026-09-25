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
  the prototype with no change of behaviour. Slice 18 extends it with a second row source,
  a tab strip, and a kind control.
- `plugins/artifact/viewer/src/shell/readiness.ts` — new. The six record kinds,
  the three readiness words, and the one derivation. Moved with the board, because the
  board is its only reader. Slice 18 widens it into the board's one pure rule module. It
  gains the row kind, a row's status, the PR-alone source, and the tab predicates. The
  module keeps its name, because the readiness rule stays its largest part.
- `plugins/artifact/viewer/src/shell/Board.test.tsx` — new. The board's own
  cases. Slice 18 extends them with the row count, the state on a PR-alone row, the tab
  strip, and the kind control.
- `plugins/artifact/viewer/src/shell/readiness.test.ts` — new. The readiness
  rule's cases, which need no DOM. Slice 18 extends them with the pure rules the tab strip
  reads. Those cases need no DOM either, which is why the readiness rule lives in this file.
- `plugins/artifact/viewer/src/shell/App.tsx` — modified. `board = route.workId === null`
  selects the board, and the pane renders it instead of the unknown-id error. The
  work-item branch keeps that error. Slice 18 hands the board the index's pull request
  entities beside its rows, which is the second row source's only input.
- `plugins/artifact/viewer/src/shell/Rail.tsx` — modified. The top entry `Work` opens the
  board, and it takes `board` and `workCount` props.
- `plugins/artifact/viewer/src/shell/TopBar.tsx` — modified. The bar states the board
  rather than a missing work item.
- `plugins/artifact/viewer/src/shell/model.ts` — modified. `boardHref()` returns the bare
  route prefix.
- `plugins/artifact/viewer/src/shell/records.ts` — modified. `MinWork` and the `min_work`
  field on `goal`, which the goal verdict reads.
- `plugins/artifact/viewer/src/shell/atoms.tsx` — modified. `TONE_MARK`, `TONE_PILL`,
  `StateBadge`, and `toneForStage`, which the row's marks and badge read. Slice 18 adds
  `toneForState`, which a PR-alone row's badge reads.

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

/* readiness.ts — slice 18. The board's pure rules: which rows it lists, and
   which rows a tab keeps. They live here because the readiness rule does, and
   because none of them needs a DOM to be read. */
export type RowKind = "design" | "pull-request";

/** The two kinds, in the order the kind control lists them. */
export const ROW_KINDS: RowKind[];

/** The word a row states for its kind. `PR` names the kind and never a status. */
export const ROW_KIND_LABEL: Record<RowKind, string>;

// One board row, whether it carries a design or a pull request of its own.
export type BoardSource =
  | { kind: "design"; row: DesignRow }
  | { kind: "pull-request"; row: PullRequest };

/** A design's stage, or a pull request's own state. One row, one status word. */
export function boardStatus(source: BoardSource): string;

/** Every status the board's rows record, deduplicated, in reading order. */
export function statusTabs(sources: BoardSource[]): string[];

/** The predicate behind one status tab. `All` is the caller's own predicate. */
export function matchesStatus(source: BoardSource, status: string): boolean;

/** The predicate behind one kind tab. */
export function matchesKind(source: BoardSource, kind: RowKind): boolean;

// Every pull request the index holds that no design's epics point at, one source
// each, in id order. The subtraction runs against each design row's own
// `pullRequests`, so no pull request earns two rows.
export function prAloneSources(
  rows: DesignRow[],
  pullRequests: PullRequest[],
): BoardSource[];

/* Board.tsx — the props, as the component takes them. */
export interface BoardProps {
  /** The resolved rows the record index yields, one per design. */
  rows: DesignRow[];
  /** The index's pull request entities, which the PR-alone row source reads. */
  pullRequests: PullRequest[];
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
export type PullRequest = /* one pull request, as the index's pull_request entity holds it */;

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

**The second row source.** Slice 18 adds a row for each pull request that no design's
epics point at. The subtraction runs against `DesignRow.pullRequests`, which the data layer
already resolves, so no pull request earns two rows. `Board.tsx` takes the index's
`pull_request` entities as a prop beside its rows, and `prAloneSources` derives the
PR-alone set from those two inputs alone. A design's own pull request reads inside that
design's row, and nowhere else. A PR-alone row carries the pull request's id, its title,
and its state, and no six record marks. Those marks read a design directory, and a pull
request holds none.

**Two filters, one flat list.** The board keeps its flat list, and the tab strip filters
that list rather than restating it as lanes. The strip selects by status, and its
vocabulary is the six design stages plus the two pull request states, `open` and `merged`.
A design row's status is its stage. A PR-alone row's status is its own state. So one tab
selects both kinds by one rule.

**The kind group rides beside the strip.** It selects `design` or `pull-request`, and the
two groups combine with AND. So a reader reaches the PR-alone rows and then narrows them
by status. `All` leads each group and clears that group alone. The board's key and its
header state rows rather than designs, because the list now holds both.

**The strip reuses the prototype's mechanism.** The lens prototype's lane strip is
`Tabs`/`TabsList`/`TabsTrigger` from `@/components/ui/tabs`. It sits in
`src/variations/lens-mosaic/index.tsx`, with `variant="line"` on the list and a count
beside each label. Slice 18 reuses that mechanism and drops the lane vocabulary. The count
beside a status tab is how many rows that tab keeps. A count waits for the index to
resolve, because a count of zero would claim an empty board while the index is still in
flight.

## Slice Decomposition

Per `docs/plans/cobuilder-viewer/04-slices.md`, in build order.

- **Slice 6 — The shell lands on the bundle's designs.** Depends on: slice 4 (the typed
  model). The bare route renders the board: one row per design, each row stating its
  stage and its six record marks, and no error state. The board's key renders beside the
  list, because the three readiness words are new to a reader here.
- **Slice 7 — A row opens the item's Work surface.** Depends on: slice 6, and slice 8
  (the section model the opened surface renders). Pressing a row lands on that item's
  Work surface at its first level, with the route naming the item.
- **Slice 18 — A pull request with no design is a row of its own.** Depends on: slices 6,
  7, and 15 to 17. Slices 15 to 17 land the surface that reads a pull request's own
  records. The board gains a second row source. It lists every pull request the index holds
  that no design's epics point at, one row each, beside the design rows. Each such row
  states the pull request's own state, `open` or `merged`, and the kind word `PR`. A tab
  strip filters the rows by status. A kind control narrows the board to the PR-alone rows,
  and the status tabs keep working inside that set.

Slice 7 is not slice 6's interaction detail. Two states: a bundle a reader can survey,
and one item a reader can enter. Slice 6 renders the list with no navigation out of it,
and slice 7 is the transition the board exists for.

Slice 18 is not slice 6's leftover. Two row sources feed one list, and the status
vocabulary grows from the six design stages to those six plus the two pull request states.
The row source also answers a question no design row asks: whether a pull request already
belongs to a design. A row that answered it twice would list one pull request as two rows.

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
- **`readiness.test.ts`** — slice 18. The pure rules the tab strip reads, against fixtures
  written the way `data/index.json` writes them. `boardStatus` reads a design's stage and a
  pull request's own state. `statusTabs` names each status the rows record once, and names
  no status that no row carries. `matchesStatus` keeps every source that carries the status
  and drops every other one. `matchesKind` keeps one kind alone, and the two predicates
  together keep the PR-alone rows of one state. `prAloneSources` drops a pull request that
  a design row already carries in its own `pullRequests`, so one pull request yields one
  source. The file gains these cases because the readiness rule is the module's other pure
  rule, and neither rule needs a DOM.
- **`Board.test.tsx`** — slice 6. The row count equals the designs it was given, one row
  per design. Each row states the stage its design records. Each row carries one mark per
  `RECORD_KINDS` entry, in that order. A design with no record renders six dashed marks
  and a design with all six renders six solid ones. A `goal.json`-only design's goal mark
  names the empty part, because the goal records `challenge_stage_run` false. The order
  follows the lane rule, and a superseded design sorts after every live stage. A stage
  outside the vocabulary sorts last. The board draws no section strip, no pager bar, no
  level progress bar, and no reading-progress strip.
- **`Board.test.tsx`** — slice 18. The row count equals the design rows plus the PR-alone
  pull requests. A PR-alone row states its own state and its kind word, and it carries no
  six-mark signature. A design row whose epics carry a pull request renders no second row
  for that pull request. A status tab keeps only the rows that carry its status. `All`
  holds every row, and the status tabs' counts sum to `All`'s count. The kind control
  narrows the board to `pull-request`, a status tab still filters that set, and releasing
  the kind control returns every row. The design rows still render, still state their
  stage, and still open a work item. The board still draws no section strip, no pager bar,
  and no level progress bar.
- **The rendered page** — slices 6, 7, and 18. The bare route renders the board and not the
  unknown-id error. The rail's `Work` entry returns to it. A row's href is that item's
  route, and a press lands on that item's Work surface at its first level. A sparse design
  opens. A PR-alone row's href names that pull request, and one press opens that pull
  request's own records. A press on each status tab leaves the rows that carry it, and the
  address line names the pull request a pressed PR-alone row stated. The pane owns the
  scroll, and the document does not.

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
- **The board holds one status filter and one kind filter, and no search.** An earlier
  version of this design said the board had no filter. Slice 18 makes that false for status
  and for kind. The tab strip keeps the board a flat list, because `All` holds every row
  within one press. The lane board the Scope section rules out stays ruled out. The board
  still carries no free-text search. A bundle with sixty designs would need one, and
  nothing in this epic says what it looks like.
- **A design's own pull request must not become a second row.** Slice 18 adds one row per
  pull request that no design's epics point at. The set difference runs against
  `DesignRow.pullRequests`, which the data layer resolves from `joins.epic_to_pull_request`
  and the epic's own `pr` field. A row source that read the index's `pull_request` entities
  alone would list a design's own pull request twice. It would appear once inside that
  design's row and once beside it.
- **The fixture is thin, so the first paint changes shape.** Measured on 2026-09-25:
  twelve of the index's seventeen pull requests belong to no design. They are 1 to 10, 17,
  and 22. The PR-alone set is therefore larger than the design set, and the board's first
  paint gains twelve rows beside the fifteen it holds today. Ten of those twelve read
  `merged` and two read `open`. So one status tab carries most of the board, and a board
  that read as a design list now reads as a pull request list.
- **A PR-alone row's address needs a work id.** A pull request with no design has no work
  item. Slice 16 owns that address's shape, and slice 18 reads it rather than inventing
  one. What the address names for a pull request no epic carries stays open here. Slice 18
  therefore cannot ship its row's href before slice 16 answers that question.
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
