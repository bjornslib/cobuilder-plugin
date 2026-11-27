# Program Design: Kanban board

The board is a read-only page of the viewer at `#/board`. It shows the five stage
columns of the record index. A click on a program card shows the epics or slices
of that program in three status columns. ADR-0050 decides the surface. The seven
slices of `04-slices.md` build it in order.

Two rules shape every file below.

1. **One source for each rule.** The columns, the counts, the empty reasons, the
   sorts, the address, and the start prompt are pure modules under
   `src/shell/board/`. They read no React and no DOM.
2. **The index is the only data.** Each row comes from `data/index.json`
   through `src/data/`. No board file resolves a join. The existing guard in
   `src/data/bundle.test.tsx` scans every file outside `src/data/` and fails
   when one does.

The five stage lanes keep one definition. `src/shell/workDeck.ts` already holds
`LANES` and `laneOf`, and this design does not move or change them. The board
imports both, so the drawer behaves as it does today and the board cannot drift
from it.

## Files

New files carry "(new)". Every other path exists today.

### The data layer

| File | Change |
|---|---|
| `plugins/artifact/viewer/src/data/types/board.ts` (new) | The board row types: one epic as a card reads it, and the flat board rows. |
| `plugins/artifact/viewer/src/data/board.ts` (new) | `boardRowsOf(index)`. It resolves each epic's status through the existing joins, the epic of each slice, the next ready slice of each design, and the orphan slices. |
| `plugins/artifact/viewer/src/data/types.ts` | Re-exports the new board types. |
| `plugins/artifact/viewer/src/data/types/core.ts` | `EpicEntity` gains the optional `title`. |
| `plugins/artifact/viewer/src/data/types/joins.ts` | `RecordIndex` gains the optional `built_at`. |
| `plugins/artifact/viewer/src/data/bundle.ts` | Exports `boardRowsOf` beside `designRowsOf`. |

### The pure rules

| File | Change |
|---|---|
| `src/shell/board/address.ts` (new) | The address codec: `readBoardAddress`, `boardHash`, the defaults, and the hide set. |
| `src/shell/board/status.ts` (new) | The one status map of `docs/architecture/designs/kanban-board/contracts.md`: the three columns, `epicColumnOf`, `sliceColumnOf`, and `isDoneSlice`. |
| `src/shell/board/search.ts` (new) | The text predicate for a program, an epic, and a slice. |
| `src/shell/board/programBoard.ts` (new) | Grouping into programs, the card counts, the three orders, and the five stage columns. |
| `src/shell/board/epicBoard.ts` (new) | The epic cards, the three status columns, and the slice grain. |
| `src/shell/board/orphanBoard.ts` (new) | The No program groups: one head for each plan slug, and the three status columns. |
| `src/shell/board/prompt.ts` (new) | The start-prompt table of the design's `contracts.md`, and the `slicesDone` rule. |
| `src/shell/board/shape.ts` (new) | The model types only: `BoardColumn`, `BoardCard`, `BoardCounts`, `BoardModel`, and the card models. |
| `src/shell/board/model.ts` (new) | `boardModelOf(rows, address)`. It assembles one model for one address, with the counts, the empty reasons, and the notice. |

### The components

| File | Change |
|---|---|
| `src/shell/board/KanbanPage.tsx` (new) | The page frame: the band, the command row, the no-program card, the column row, the `No epic` note, and the notice layer. |
| `src/shell/board/headingBand.tsx` (new) | `BoardHeadingBand`, `CountsBlock`, `BuildTime`, and `BackLink`. |
| `src/shell/board/commandRow.tsx` (new) | `FindField`, `OrderSelect`, and `CardsSwitch`. Each control is gated by its board. |
| `src/shell/board/columns.tsx` (new) | `ColumnHead`, `HideButton`, `HiddenColumnRail`, `EmptyColumnNotice`, and `BoardNoMatch`. |
| `src/shell/board/programCard.tsx` (new) | `ProgramCard` and `ProgramNameLink`. |
| `src/shell/board/epicCard.tsx` (new) | `EpicCard`, `SlicePipsToggle`, and `SlicesDoneMark`. |
| `src/shell/board/sliceRow.tsx` (new) | The slice row of an epic card and the slice card that opens its page. |
| `src/shell/board/noProgramCard.tsx` (new) | `NoProgramCard`. |
| `src/shell/board/orphanCard.tsx` (new) | `OrphanSliceCard`, the button that expands in place. It serves a slice with no page: the No program board and the `No epic` group. |
| `src/shell/board/notice.tsx` (new) | `CopyNotice` and `UnknownProgramNotice`. |

### The hooks

| File | Change |
|---|---|
| `src/shell/board/useBoardAddress.ts` (new) | Writes the address: a push for a board change, and a replace for each search key press. |
| `src/shell/board/useCopyPrompt.ts` (new) | The clipboard write, the notice state, and the `--hold-ack` timer. |
| `src/shell/board/useFindFocus.ts` (new) | The `/` key. The drawer and a field keep the key. |
| `src/shell/app/state/boardModel.ts` (new) | `useBoardModel(rows, address)`, one memo of `boardModelOf`. |

### The shell

| File | Change |
|---|---|
| `src/shell/hooks/route.ts` | `RouteControl` gains `kanban` (the board address) and `replace`. One hash read fills both. |
| `src/shell/app/useShellState.ts` | Calls `useBoardModel` and returns it as `boardModel`. |
| `src/shell/app/state/catalog.ts` | Returns `boardRows: BoardRows \| null`, and renames the drawer's rows to `designRows`. |
| `src/shell/app/PopulatedShell.tsx` | The pane label names the board. The drawer reads `designRows`. |
| `src/shell/app/view.ts` | `focusSlice` from the route, and `kanban` reaches `ShellView` through the state. |
| `src/shell/app/PaneContent.tsx` | The board branch comes before the bare route and the work branch. |
| `src/shell/app/topBarProps.ts` | Names the Kanban page in the bar, so no work item reads as selected on it. |
| `src/shell/TopBar.tsx`, `src/shell/topBar/buttons.tsx`, `src/shell/topBar/props.ts` | One link to `#/board`, with `aria-current="page"` on the page. |
| `src/shell/model/routes.ts` | `Route` gains `sliceN`, `readRoute` reads the fifth segment, and `sliceHref` builds it. |
| `src/shell/app/state/pane.ts` | Watches `sliceN` and calls the slice-row scroll after the pane reset. |
| `src/shell/hooks/focus.ts` | `useSliceRowInView(elementId)`, beside `useScrollResetOnRoute`. |
| `src/shell/hooks.ts` | Re-exports `useSliceRowInView`, so `pane.ts` keeps one import path. |
| `src/shell/sections/sliceAnchor.ts` (new) | `sliceRowId(epicId, sliceId)`, the one DOM id of a slice row. |
| `src/shell/app/WorkContent.tsx`, `src/shell/app/pagedSections.tsx` | Carry `focusSlice` to the Build level. |
| `src/shell/sections/epicGroup.tsx`, `src/shell/sections/epicDisclosure.tsx` | Open the epic, expand the marked slice, and mark its row. |
| `src/shell/testSupport/TopBar/renderBar.tsx` | One default for the new bar field. |

### The index build and the committed viewer

| File | Change |
|---|---|
| `shared/build_index.py` | `built_at` at the top level of the index, and `title` on each epic entity from the tracker record. |
| `plugins/artifact/viewer/index.html` | Rebuilt after `npm run build`, and committed. `tests/test_viewer_build.py` compares it. |

`shared/build_index.py` stays the one writer of the index. `built_at` sits at the
top level, outside `sources`, so `is_stale` never sees it. The projector does not
write it. `schema_version` stays `1.5`, because both new fields are optional for
a reader.

## Types & signatures

The index shape changes by two optional fields.

```ts
// data/types/core.ts — modified
export interface EpicEntity {
  // ... the seven fields it holds today
  /** The tracker record's title. Null when the tracker holds none. Absent in an older index. */
  title?: string | null;
}

// data/types/joins.ts — modified
export interface RecordIndex {
  schema_version: string;
  /** The build time, ISO 8601 in UTC. Never inside `sources`, and never from the projector. */
  built_at?: string;
  sources: { git_head: string; trees: Record<string, string> };
  entities: Entities;
  joins: Joins;
}
```

The board rows, resolved once per index.

```ts
// data/types/board.ts — new
import type { DesignEntity, SliceEntity } from "./core";

/** One epic as a card reads it. Status and lifecycle stay two fields. */
export interface BoardEpic {
  /** The design-scoped id, as in `kanban-board/E1`. */
  id: string;
  /** The bare id, as in `E1`. */
  epicId: string;
  design: string;
  title: string | null;
  branch: string | null;
  pr: number | null;
  /** `joins.epic_status` when it answers, else the entity's own `state`. */
  status: string;
  /** The tracker lifecycle: `open`, `closed`, or null when the tracker holds no record. */
  lifecycle: string | null;
}

/** The flat rows of one index. The shell groups them. */
export interface BoardRows {
  programs: DesignEntity[];
  epics: BoardEpic[];
  slices: SliceEntity[];
  /** The epic of each slice, from the index's own join. */
  epicOfSlice: Map<string, string>;
  /** Slices whose plan slug names no design. */
  orphanSlices: SliceEntity[];
  /** The next ready slice of each design, or null. */
  nextReady: Map<string, SliceEntity | null>;
  /** The build time, or null for an index built before the field existed. */
  builtAt: string | null;
}

// data/board.ts — new
export function boardRowsOf(index: RecordIndex): BoardRows;
```

The rules. Each function is pure, and each takes the rows a caller resolved.

```ts
// shell/board/address.ts — new
export type BoardLevel = "programs" | "epics" | "orphans";
export type ProgramOrder = "name" | "open" | "progress";
export type CardGrain = "epics" | "slices";

export interface BoardAddress {
  level: BoardLevel;
  /** The design id of the epic board. Null on the other two boards. */
  program: string | null;
  q: string;
  order: ProgramOrder;
  cards: CardGrain;
  /** Column keys, in column order. */
  hide: readonly string[];
}

export function readBoardAddress(hash: string): BoardAddress | null;
export function boardHash(address: BoardAddress): string;
/** Add a key to the hide set, or remove it. The last visible column refuses. */
export function hideToggled(address: BoardAddress, key: string): BoardAddress;
export function columnKeysOf(level: BoardLevel): readonly string[];

// shell/board/status.ts — new
export type StatusColumnKey = "planned" | "in_progress" | "done";
export type StatusShape = "circle" | "half" | "filled";
export interface StatusColumn {
  key: StatusColumnKey;
  label: string;
  shape: StatusShape;
}
export const STATUS_COLUMNS: readonly StatusColumn[];
/** The raw word on the card. A missing value reads "no status". */
export function epicStatusWord(status: string | null | undefined): string;
export function epicColumnOf(status: string | null | undefined): StatusColumnKey;
export function sliceColumnOf(state: string | null | undefined): StatusColumnKey;
export function isDoneSlice(state: string | null | undefined): boolean;

// shell/board/search.ts — new
export function programMatches(program: ProgramRows, needle: string): boolean;
export function epicMatches(epic: BoardEpic, needle: string): boolean;
export function sliceMatches(slice: SliceEntity, needle: string, labels: readonly string[]): boolean;

// shell/board/programBoard.ts — new
export interface ProgramRows {
  design: DesignEntity;
  epics: BoardEpic[];
  /** Every slice of the program, including the slices that join no epic. */
  slices: SliceEntity[];
  /** The slices of this program that join no epic. Their cards open in place. */
  unjoined: SliceEntity[];
  /** The epic of each slice that joins one, from the index's own join. */
  epicOfSlice: Map<string, string>;
  nextReady: SliceEntity | null;
}
/** Assigns each slice by its epic, then by its plan slug, so no slice joins two programs. */
export function programRowsOf(rows: BoardRows): ProgramRows[];
export function programCardOf(program: ProgramRows): ProgramCardModel;
export function orderPrograms(cards: ProgramCardModel[], order: ProgramOrder): ProgramCardModel[];
export function programColumns(cards: ProgramCardModel[], matched: Set<string>, address: BoardAddress): BoardColumn[];

// shell/board/epicBoard.ts — new
export function epicCardsOf(program: ProgramRows): EpicCardModel[];
export function epicColumns(program: ProgramRows, matched: Set<string>, address: BoardAddress): BoardColumn[];
/** One group head for each epic with a matching slice, then the group "No epic". */
export function sliceColumns(program: ProgramRows, matched: Set<string>, address: BoardAddress): BoardColumn[];

// shell/board/orphanBoard.ts — new
export function orphanColumns(rows: BoardRows, matched: Set<string>, address: BoardAddress): BoardColumn[];

// shell/board/prompt.ts — new
export function programPrompt(design: DesignEntity): string | null;
export function epicPrompt(epic: BoardEpic, slices: readonly SliceEntity[]): string | null;
export function slicesDoneOf(epic: BoardEpic, slices: readonly SliceEntity[]): boolean;

// shell/board/model.ts — new
export function boardModelOf(rows: BoardRows, address: BoardAddress): BoardModel;
```

The one model that a component draws. The components take no rows and no join.

```ts
// shell/board/shape.ts — new
export interface BoardCount {
  shown: number;
  total: number;
}
export interface BoardCounts {
  programs?: BoardCount;
  epics?: BoardCount;
  slices?: BoardCount;
}

export interface ProgramCardModel {
  program: ProgramRows;
  counts: { planned: number; inProgress: number; done: number };
  slices: { total: number; done: number; nextReadyN: number | null };
  prompt: string | null;
}

export interface EpicCardModel {
  epic: BoardEpic;
  /** The epic's slices, ordered by slice number. */
  slices: SliceEntity[];
  statusWord: string;
  slicesDone: boolean;
  prompt: string | null;
}

export interface SliceCardModel {
  slice: SliceEntity;
  /** The epic page of the slice. Null when the slice joins no epic, and the card opens in place. */
  epicId: string | null;
  /** The label of the epic, or "No epic". */
  epicLabel: string;
}

export interface SliceGroupModel {
  /** A stable head id: the epic id, `no-epic`, or the plan slug of an orphan group. */
  key: string;
  /** The head text: the epic label, "No epic", or the plan slug. */
  label: string;
  /** The epic of the group. Null for "No epic" and for an orphan group. */
  epicId: string | null;
  slices: SliceEntity[];
}

export type BoardCard =
  | { kind: "program"; card: ProgramCardModel }
  | { kind: "epic"; card: EpicCardModel }
  | { kind: "slice-group"; group: SliceGroupModel }
  | { kind: "slice"; card: SliceCardModel };

export interface BoardColumn {
  key: string;
  label: string;
  kind: "stage" | "status";
  shape: StatusShape | null;
  count: number;
  hidden: boolean;
  /** `null` on a hidden column, and on a column that holds a card. */
  emptyReason: string | null;
  cards: BoardCard[];
}

export type AddressNotice = { kind: "unknown-program"; value: string };
export type CopyNotice = { kind: "copied" } | { kind: "failed"; prompt: string };

export interface BoardModel {
  /** The address the model drew. After the unknown-program fallback, this is the program board. */
  address: BoardAddress;
  level: BoardLevel;
  /** The `h2` on the lower boards: the program name, or "No program". Null on the program board. */
  subject: string | null;
  cards: CardGrain;
  columns: BoardColumn[];
  counts: BoardCounts;
  /** The records the visible columns show. */
  shown: number;
  /** The records the board holds before the search, hidden columns included. */
  total: number;
  noProgram: { count: number; plans: number; href: string } | null;
  /** The line under the columns on the epics grain, when slices join no epic. */
  unjoinedNote: string | null;
  addressNotice: AddressNotice | null;
  noMatch: string | null;
  builtAt: { iso: string; label: string } | null;
}
```

The route and the hooks.

```ts
// shell/model/routes.ts — modified
export interface Route {
  workId: string | null;
  section: SectionKey;
  sub: string | null;
  subId: string | null;
  /** The fifth segment: the slice number on an epic page. */
  sliceN: string | null;
}
export function sliceHref(workId: string, epicId: string, n: number | string): string;

// shell/hooks/route.ts — modified
export interface RouteControl {
  route: Route;
  /** The board address of the current hash, or null on every other address. */
  kanban: BoardAddress | null;
  replace: (href: string) => void; // history.replaceState, then one hash read for both fields
  // ... the fields it holds today
}

// shell/hooks/focus.ts — modified
export function useSliceRowInView(elementId: string | null): void;

// shell/sections/sliceAnchor.ts — new
export function sliceRowId(epicId: string, sliceId: string): string;

// shell/app/state/boardModel.ts — new
export function useBoardModel(rows: BoardRows | null, address: BoardAddress | null): BoardModel | null;

// shell/board/useBoardAddress.ts — new
export interface BoardWriters {
  go: (href: string) => void;      // one history entry
  replace: (href: string) => void; // no history entry
}
export interface BoardAddressWrites {
  /** Push one entry for a board, order, card-grain, or hide change. */
  write: (next: BoardAddress) => void;
  /** Replace the entry for each search key press. */
  search: (q: string) => void;
}
export function useBoardAddress(base: BoardAddress, writers: BoardWriters): BoardAddressWrites;

// shell/board/KanbanPage.tsx — new
import type { ReactElement } from "react";

export interface KanbanPageProps {
  load: IndexLoad;
  /** Null while the index loads. */
  model: BoardModel | null;
  go: (href: string) => void;
  replace: (href: string) => void;
}
export function KanbanPage(props: KanbanPageProps): ReactElement;

// shell/board/useCopyPrompt.ts — new
export interface CopyPrompt {
  notice: CopyNotice | null;
  copy: (prompt: string) => Promise<void>;
  dismiss: () => void;
}
export function useCopyPrompt(): CopyPrompt;
```

The build writes the two new index fields.

```python
# shared/build_index.py
def build_time() -> str:
    """The index build time, ISO 8601 in UTC. It sits outside `sources`."""

# in design_epic_entities(): one more key
{"title": held.title if held is not None else None}
```

## Call stack

```
ShellApp
└─ useShellState
   ├─ useIndexLoad ────────────────── one read of data/*.js
   ├─ useHashRoute
   │  ├─ readRoute ────────────────── Route, with sliceN
   │  └─ readBoardAddress ─────────── BoardAddress | null
   ├─ useCatalog
   │  └─ boardRowsOf(index) ───────── BoardRows, memoized on the load
   └─ useBoardModel(boardRows, kanban)
      └─ boardModelOf ─────────────── BoardModel, memoized on rows and address
         ├─ programRowsOf ─────────── groups epics, and marks the unjoined slices
         ├─ programCardOf × N ─────── counts, slices, prompt
         ├─ orderPrograms ─────────── name | open | progress
         ├─ epicColumns ───────────── the three status columns of epics
         ├─ sliceColumns ──────────── epic heads, then the "No epic" head
         ├─ orphanColumns ─────────── the No program groups
         └─ programColumns ────────── the five stage columns

PopulatedShell
├─ TopBar ───────────────────────── <a href="#/board">
├─ PaneContent
│  └─ KanbanPage (kanban !== null)
│     ├─ BoardHeadingBand ──────── subject, counts, builtAt, back
│     ├─ CommandRow ────────────── useFindFocus, useBoardAddress
│     ├─ NoProgramCard ─────────── pushes #/board?orphans=1
│     ├─ column row
│     │  ├─ ColumnHead → HideButton
│     │  ├─ HiddenColumnRail → hideToggled
│     │  ├─ ProgramCard ───── writes the epic board address
│     │  ├─ EpicCard → SlicePipsToggle, SlicesDoneMark, sliceRow
│     │  └─ OrphanSliceCard → local expanded state
│     └─ CopyNotice ← useCopyPrompt
└─ WorkDrawer ───────────────────── unchanged, over the board
```

The marked slice row, from the board to the epic page:

```
slice card  → sliceHref → #/<program>/build/epics/<epic>/<n>
useHashRoute → readRoute().sliceN
usePaneEffects
├─ useScrollResetOnRoute ────── pane to 0
└─ useSliceRowInView(sliceRowId(epic, n))
EpicDisclosure → SliceDisclosure → the marked row, expanded
```

The pane reset and the row scroll run as two effects in one component, in that
order. A child effect would run first, and the reset would undo its scroll.

## Test plan

Each block names one slice of `04-slices.md`. The viewer commands run from the
repository root. The Python commands run on `uv`'s managed Python.

### Slice 1 — the program board

| Test file (new) | Assertions |
|---|---|
| `src/shell/board/address.test.ts` | `#/board` reads the program level with `superseded` hidden. An unknown key or value is ignored. `boardHash` round-trips a program, a phrase with a space, and a sort. A full hide list keeps one column. |
| `src/data/boardRows.test.ts` | One index gives the program, epic, slice, and orphan rows. The epic status is the join's word. The next ready slice is the design's own. |
| `src/shell/board/programBoard.test.ts` | Each program sits in the column of its stage. The counts follow the status map. The slice footer reads `3 of 6 done` and `next #4`. The Superseded column starts hidden, and `shown` falls by its count. |
| `src/shell/board/KanbanRoute.test.tsx` | `renderAt("#/board")` draws the band and five column heads. The top bar link carries `aria-current`. The Work board button opens the drawer over the board. |

```
cd plugins/artifact/viewer && npx vitest run src/shell/board/address.test.ts \
  src/data/boardRows.test.ts src/shell/board/programBoard.test.ts \
  src/shell/board/KanbanRoute.test.tsx
```

### Slice 2 — a program card opens the epic board

| Test file (new) | Assertions |
|---|---|
| `src/shell/board/status.test.ts` | Each epic status of the current index maps to the table in `contracts.md`. Each slice state maps too. An unknown value and a missing value go to In progress, and the word stays raw or reads `no status`. |
| `src/shell/board/epicBoard.test.ts` | A program of three epics gives three columns with the contract's counts. `cards=slices` groups the slices under an epic head. A slice that joins no epic sits under the head `No epic` in its own state column. The slices total counts it. `unjoinedNote` is null in the slices grain. |
| `src/shell/board/EpicBoard.test.tsx` | A press on a program card writes `#/board?program=<id>`. The band names the program. `All programs` writes `#/board`. An epic card links to `#/<program>/build/epics/<epic>`. The Cards switch writes `cards=slices`. A `No epic` card expands in place and opens no page. The epics grain shows `2 slices join no epic. Switch to Slices to see them.` under the columns. |
| `tests/test_build_index_epic_title.py` | One epic entity carries the tracker record's title. A missing record gives `null`. |

```
cd plugins/artifact/viewer && npx vitest run src/shell/board/status.test.ts \
  src/shell/board/epicBoard.test.ts src/shell/board/EpicBoard.test.tsx
uv run pytest tests/test_build_index_epic_title.py -q
```

### Slice 3 — a slice card opens its epic page with the row marked

| Test file (new) | Assertions |
|---|---|
| `src/shell/model/routes.board.test.ts` | `readRoute` reads the fifth segment into `sliceN`. `#/<w>/build/epics/E1` keeps `sliceN` null. `sliceHref` gives `#/<w>/build/epics/E1/3`. |
| `src/shell/SliceRow.mark.test.tsx` | `renderAt("#/w/build/epics/E1/3")` opens the epic, opens slice 3, and marks that row. The anchor id is `sliceRowId("E1", "w/3")`. A reload gives the same view. |

```
cd plugins/artifact/viewer && npx vitest run src/shell/model/routes.board.test.ts \
  src/shell/SliceRow.mark.test.tsx
```

### Slice 4 — Find, Order, and Hide

| Test file (new) | Assertions |
|---|---|
| `src/shell/board/search.test.ts` | A program matches on its name, an epic title, or a slice title. An epic matches on its title, its epic id, or a slice title. Slice matching reads the plan slug. |
| `src/shell/board/BoardControls.test.tsx` | Each search key press replaces the address and adds no history entry. A sort and a hide push one entry. A hidden column becomes a rail with its count. The header total does not fall with the search, and each empty column states its reason. A second `renderAt` with the same hash restores the board. |

```
cd plugins/artifact/viewer && npx vitest run src/shell/board/search.test.ts \
  src/shell/board/BoardControls.test.tsx
```

### Slice 5 — the No program card

| Test file (new) | Assertions |
|---|---|
| `src/shell/board/orphanBoard.test.ts` | Slices whose plan slug names no design group by that slug. Their states map to the three columns. The card count is the orphan count, and the plan count is the number of slugs. |
| `src/shell/board/NoProgram.test.tsx` | The card shows the count and opens `#/board?orphans=1`. A slice card there expands in place and opens no page. The card is absent when the index holds no orphan slice. The card never counts as a program. |

```
cd plugins/artifact/viewer && npx vitest run src/shell/board/orphanBoard.test.ts \
  src/shell/board/NoProgram.test.tsx
```

### Slice 6 — the build time, and an older index

| Test file (new) | Assertions |
|---|---|
| `tests/test_build_index_built_at.py` | The index holds `built_at` at the top level, as an ISO 8601 string in UTC. `sources` holds no such key. `is_stale` ignores `built_at`. A second build gives a later or equal time. |
| `src/shell/board/LegacyIndex.test.tsx` | An index without `built_at` shows `No build time in this index`. An epic without `title` shows its `epic_id`. No cell reads `undefined`. |

```
uv run pytest tests/test_build_index_built_at.py -q
cd plugins/artifact/viewer && npx vitest run src/shell/board/LegacyIndex.test.tsx
```

### Slice 7 — the start prompt

| Test file (new) | Assertions |
|---|---|
| `src/shell/board/prompt.test.ts` | Each row of the prompt table gives its exact line: `backlog`, `decided`, `review`, `approved`, `implemented`, `superseded`. An epic needs a start prompt, a merge check, or no icon. An epic with all slices done and no branch shows no icon and keeps `Slices done`. |
| `src/shell/board/CopyPrompt.test.tsx` | A copy press writes the prompt, and the notice reads `Prompt copied`. A refused write reads `Copy failed` and holds the prompt in a `code` block. A record with no next workflow shows no button. |

```
cd plugins/artifact/viewer && npx vitest run src/shell/board/prompt.test.ts \
  src/shell/board/CopyPrompt.test.tsx
```

### The shared gates

| Command | Claim |
|---|---|
| `cd plugins/artifact/viewer && npx vitest run src/data/bundle.test.tsx` | No file outside `src/data/` resolves a join. The new board files are in its scope. |
| `cd plugins/artifact/viewer && npm run typecheck` | The new types hold. |
| `cd plugins/artifact/viewer && npm run test` | The whole viewer suite passes. |
| `cd plugins/artifact/viewer && npm run build` | The committed `index.html` is the build's output. |
| `uv run pytest tests/test_viewer_build.py -q` | The committed viewer equals a fresh build. |
| `uv run pytest tests -q` | The Python suite passes. |

### Each `done_when` line and its evidence

| Line of `docs/architecture/designs/kanban-board/goal.json` | Evidence |
|---|---|
| Every program sits in its stage column, with epic counts and slice count | `programBoard.test.ts` |
| A program card opens the epic board, and one control leads back | `EpicBoard.test.tsx` |
| Each epic sits in its status column, and a switch shows the slices | `status.test.ts`, `epicBoard.test.ts` |
| A search narrows both boards, a sort changes the order, a column hides | `search.test.ts`, `BoardControls.test.tsx` |
| The board is a full page, and the drawer opens over it | `KanbanRoute.test.tsx` |
| The board changes no state, and a card opens the program, epic, or slice level | `routes.board.test.ts`, `SliceRow.mark.test.tsx`, and the browser check below |
| Slices with no program show in No program, and the group is absent when none exists | `orphanBoard.test.ts`, `NoProgram.test.tsx` |
| The board reads the index only, with no second source | `bundle.test.tsx` (C1) and `boardRows.test.ts` |
| The header shows the build time | `test_build_index_built_at.py`, `LegacyIndex.test.tsx` |
| The address holds the search, sort, hidden columns, and program, and a reload restores | `address.test.ts`, `BoardControls.test.tsx` |
| A copy icon copies a start prompt and shows the notice | `prompt.test.ts`, `CopyPrompt.test.tsx` |

Two browser checks cover what jsdom cannot. Load the served bundle at
`#/board` at 1280 by 800, and read five columns with no sideways scroll of the
page. Then press a program card with a real pointer inside its padding, and read
`#/board?program=<id>` and the three columns. The same pass reads the epic card
and slice card targets in the address bar.

## Least confident decisions

1. **The board rows are a second row source beside `DesignRow`.** `data/board.ts`
   returns flat rows, and `programBoard.ts` groups them. The alternative extends
   `DesignRow` with a resolved status for each epic, which changes the drawer's
   row. The flat shape keeps the index and the shell apart, and it costs one
   `groupBy` next to `designRowsOf`. If a reviewer prefers one row type, the
   change is local to `data/board.ts` and the two board modules.
2. **The lower boards scope every count pair to the board.** On the epic board the
   band reads `3 of 19 epics` and `9 of 40 slices`, for that program. The program
   board keeps the index-wide totals for its epic and slice pairs. The ruling
   names the header total on the lower boards, and this reading applies it to each
   pair rather than to one. A reader may expect an index-wide slice pair on the
   epic board. The change is one function, `countsOf` in `model.ts`.
3. **An epic with all slices done, no pull request, and no branch shows no icon.**
   The prompt row reads `/pr:generate <branch>`, and a null branch gives an
   incomplete command. The card keeps `Slices done` and offers no copy. The other
   reading writes a prompt with a placeholder, which a person could paste by
   mistake.
4. **A stage that names no lane goes to the first column.** `build_index.py`
   refuses such a stage, so a built index cannot hold one. The board still has to
   place a row, because its rules are total. It uses Needs a decision and keeps
   the raw word on the card, on the same rule as an unknown epic status. A reader
   who sees this sees a build fault, not a board guess.
5. **The board's Done count follows the contracts table, and the drawer's does
   not.** The board counts `completed`, `skipped`, and `escalated` slices as done.
   The drawer's `DesignRow.slicesDone` counts `completed` only, and this design
   does not touch it. The projector emits only `completed`, `in_progress`, and
   `planned` today, so the two agree on live data. A later change should give both
   surfaces one rule.
6. **The drawer's module holds the lane list, and the board imports it.** Moving
   `LANES` to `shell/board/` would rewrite five drawer imports for no behavioural
   gain, and the assignment forbids a change to the drawer. The cost is that a
   deck change reaches the board's module graph. The gain is one lane definition
   with no copy.
7. **`built_at` makes the committed index change on each build.** ADR-0050
   accepted this. No test compares the committed index bytes, and `is_stale`
   ignores the field. A release that rebuilds the bundle therefore commits a new
   `index.json` each time, which is noise in the diff.
8. **A slice of a program that joins no epic shows under the head `No epic`.** The
   ruling of the engineer on 2026-11-21 settles this. On the slices grain the
   group sits in each slice's own state column, and its cards open in place,
   because no epic page exists. The epics grain states the count in one line under
   the columns. The board totals count these slices. The index reports 11 such
   slices today. The cost is a fourth group head beside the epic heads, and a
   second home for the in-place card.
