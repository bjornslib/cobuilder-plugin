# Epic Technical Solution Design: E1 — The Kanban board

Feature: kanban-board
Epic ID: E1

E1 carries all seven slices of `04-slices.md`. The epic is the whole board: one
read-only page, two levels, and a third board for the slices that belong to no
program. ADR-0050 decides the shape. The Gate 3 program design,
`docs/plans/kanban-board/03-program-design.md`, holds the file split, the type
shapes, and the call stack. This document holds the contracts that RED pins, the
slice order, and the per-slice boundary.

## Scope and Intent

The epic adds one page to the viewer at `#/board`. The page shows each program as
a card in the column of its stage. A click on a card opens the epics of that
program in the columns Planned, In progress, and Done. A switch shows the slices
in place of the epics. A third board holds the slices whose plan slug names no
design. The reader narrows, orders, and hides columns, and the address keeps
each choice. A copy icon writes the next workflow command.

The page is read only. It computes no status of its own, and it writes no
workflow state. Every column, count, empty reason, and mark comes from
`data/index.json`. The one write is the clipboard.

Inside the boundary: `plugins/artifact/viewer/src/` and two fields of
`shared/build_index.py`. Outside the boundary: the tracker, `tracker.py`, the
Work drawer's behaviour, the bundle migration, and every other plugin.

## Files Touched

The new and modified paths are listed in full in the program design. This table
names the path and the slice that owns it. A path that two slices share says so.

A viewer path in this table starts at `src/`. A viewer path in a slice block
starts one level lower, at the folder that holds it: `shell/board/model.ts` is
`src/shell/board/model.ts`. A path that starts with `tests/` or `shared/`
starts at the repository root.

| Path | Slice | New? |
|---|---|---|
| `shared/build_index.py` — `title` on each epic entity | 2 | no |
| `shared/build_index.py` — `built_at` at the top level | 6 | no |
| `src/data/types/core.ts` — `EpicEntity.title` | 2 | no |
| `src/data/types/joins.ts` — `RecordIndex.built_at` | 6 | no |
| `src/data/types/board.ts` | 1, 5, 6 | yes |
| `src/data/board.ts` | 1, 5, 6 | yes |
| `src/data/types.ts`, `src/data/bundle.ts` | 1 | no |
| `src/shell/board/address.ts` | 1, 4 | yes |
| `src/shell/board/status.ts` | 1, 2 | yes |
| `src/shell/board/search.ts` | 4 | yes |
| `src/shell/board/shape.ts` | 1, 2, 5, 6, 7 | yes |
| `src/shell/board/programBoard.ts` | 1, 2, 4, 7 | yes |
| `src/shell/board/epicBoard.ts` | 2, 3, 4, 7 | yes |
| `src/shell/board/orphanBoard.ts` | 5 | yes |
| `src/shell/board/prompt.ts` | 7 | yes |
| `src/shell/board/model.ts` | 1, 2, 4, 5, 6 | yes |
| `src/shell/board/KanbanPage.tsx` | 1, 2, 4, 5, 7 | yes |
| `src/shell/board/headingBand.tsx` | 1, 2, 5, 6 | yes |
| `src/shell/board/commandRow.tsx` | 2, 4 | yes |
| `src/shell/board/columns.tsx` | 1, 2, 4 | yes |
| `src/shell/board/programCard.tsx` | 1, 7 | yes |
| `src/shell/board/epicCard.tsx` | 2, 3, 7 | yes |
| `src/shell/board/sliceRow.tsx` | 3 | yes |
| `src/shell/board/noProgramCard.tsx` | 5 | yes |
| `src/shell/board/orphanCard.tsx` | 2, 5 | yes |
| `src/shell/board/notice.tsx` | 7 | yes |
| `src/shell/board/useBoardAddress.ts` | 1, 4 | yes |
| `src/shell/board/useCopyPrompt.ts`, `useFindFocus.ts` | 4, 7 | yes |
| `src/shell/app/state/boardModel.ts` | 1 | yes |
| `src/shell/hooks/route.ts` | 1, 4 | no |
| `src/shell/app/useShellState.ts`, `state/catalog.ts` | 1 | no |
| `src/shell/app/PaneContent.tsx`, `PopulatedShell.tsx` | 1 | no |
| `src/shell/app/topBarProps.ts`, `TopBar.tsx`, `topBar/buttons.tsx`, `topBar/props.ts` | 1 | no |
| `src/shell/model/routes.ts` | 3 | no |
| `src/shell/app/view.ts`, `WorkContent.tsx`, `pagedSections.tsx` | 3 | no |
| `src/shell/sections/epicGroup.tsx`, `epicDisclosure.tsx` | 3 | no |
| `src/shell/sections/sliceAnchor.ts` | 3 | yes |
| `src/shell/app/state/pane.ts`, `src/shell/hooks/focus.ts`, `src/shell/hooks.ts` | 3 | no |
| `plugins/artifact/viewer/index.html` | 1 to 7 | no |

`src/shell/workDeck.ts` is not touched. The board imports `LANES` and `laneOf`
from it, so the five stage lanes keep one definition and the drawer keeps its
behaviour.

## Types & Signatures

The full type set is in the program design, section "Types & signatures". This
section fixes the contracts that RED pins with a test.

### The address

`readBoardAddress(hash)` reads one `#/board` address. It returns null for every
other hash.

| Key | Values | Default | Applies to |
|---|---|---|---|
| `program` | one design id | absent | The epic board. It wins over `orphans` |
| `orphans` | `1` | absent | The No program board |
| `q` | text | `""` | Each board |
| `sort` | `name`, `open`, `progress` | `name` | The program board |
| `hide` | column keys, comma separated | `superseded` on the program board, none on the other two | Each board |
| `cards` | `epics`, `slices` | `epics` | The epic board |

An unknown key or value is ignored, and the default holds. A `hide` list that
names every column of the level drops its last key, so one column stays visible.
The list is always written in column order, so one board state has one address.

`boardHash` writes the keys in this order: `program` or `orphans`, `q`, `sort`,
`cards`, `hide`. It omits a key at its default. It writes a space as `%20`.

The search writes with `history.replaceState`. A board change, a sort, a card
grain change, and a hide each push one entry.

A `program` value that the index does not hold gives the program board and a
notice that names the value. The model carries the address it drew, so the next
address write drops the unknown value. The notice's Close button replaces the
address with `#/board`.

### The slice membership

Three rules assign a slice, in this order.

1. A slice whose `slice_to_epic` entry names an epic belongs to that epic's
   program.
2. A slice with no epic whose plan slug names a design belongs to that design.
   It is an **unjoined slice**, and it shows under the head `No epic`.
3. A slice whose plan slug names no design is an **orphan slice**, and it belongs
   to the No program board.

An unjoined slice has no epic page, so its card opens in place. The program's
slice total counts it, and the program card's slice footer counts it.

### The columns

| Column | Epic status | Slice state |
|---|---|---|
| Planned | `unstarted`, `planned` | `planned` |
| In progress | `open`, `no-pull-request` | `in_progress` |
| Done | `completed`, `merged`, `superseded` | `completed`, `skipped`, `escalated` |

A value that no row names goes to In progress. A missing epic status shows the
word `no status`. A missing slice state goes to In progress. The card always
shows the raw word.

The five stage columns are the `LANES` of `src/shell/workDeck.ts`, in their
order. A design stage that names no lane goes to the first column, and the card
shows the raw word. `build_index.py` refuses such a stage, so this path is a
guard.

The epic board maps every epic and every slice, the unjoined slices included. On
the slices grain, each status column holds one head for each epic that has a
matching slice, then one head labelled `No epic` when unjoined slices match. A
slice sits in the column of its own state, under its head. The `No epic` head
holds no page link.

### The order of the program cards

| `sort` | Order |
|---|---|
| `name` | By name, A to Z |
| `open` | By the count of epics that are not done, highest first, then by name |
| `progress` | By the share of epics that are done, highest first, then by name. A program with no epic counts as 0 |

The columns never reorder. The order applies inside each column.

### The counts

`shown` is the sum of the visible column counts after the search. `total` is
every record the board holds before the search, hidden columns included. A
hidden rail keeps the count of its own column after the search.

The lower boards scope each pair to the board. On the epic board, the band reads
`3 of 19 epics` and `9 of 40 slices` for that program, and the slice total counts
the unjoined slices. On the No program board it reads `12 of 42 slices`. The
program board keeps the index-wide totals for its epic pair and its slice pair.

On the epics grain, one line sits under the column row when the program holds
unjoined slices: `<n> slices join no epic. Switch to Slices to see them.` The line
is absent at zero. The count in the line is the program's own.

### The targets of a card

| Card | Target |
|---|---|
| A program card body | `#/board?program=<id>` |
| A program name | `#/<program>/intent` |
| An epic card head | `#/<program>/build/epics/<epic>` |
| A slice card or a slice row | `#/<program>/build/epics/<epic>/<n>` |
| A slice card under the head `No epic` | No page. It expands in place |
| An orphan slice card | No page. It expands in place |

The fifth segment is `Route.sliceN`. Every other address reads as it does today.
`sliceHref(workId, epicId, n)` is the only builder of that address.

### The start prompt

The rule reads the lifecycle and the slice states, never the column. It applies
these rows in order, and the first match wins.

| # | Record | Condition | Result |
|---|---|---|---|
| 1 | Epic | Lifecycle closed | No icon |
| 2 | Epic | A slice is not done, or the epic holds no slice | `/implement:start <program> <epic>` |
| 3 | Epic | All slices done, no pull request, and status is not `merged` | `/pr:generate <branch>` |
| 4 | Epic | All slices done, and a pull request or status `merged` | `Check that pull request <pr> of <epic> merged, then record it with tracker.py set-pull-request-state and close the epic with tracker.py set-epic-state` |
| 5 | Program | Stage `backlog`, `decided`, or `review` | `/architect:design <program>` |
| 6 | Program | Stage `approved` | `/implement:start <program>` |
| 7 | Program | Stage `implemented` or `superseded` | No icon |

`<program>` is the design id. `<epic>` is the bare epic id, as in `E1`. `<branch>`
is the epic's branch. `<pr>` is the pull request number.

Rows 1 and 7 give no icon, and one more case gives none. Row 3 with a null
branch gives no icon, because the command would name no branch.

The order is not the order of `contracts.md`. Its epic table lists the closed
case last, and a first-match rule needs it first. The two tables disagree only
for a closed epic that holds a pull request. This document puts the closed case
first, so a finished record never offers a prompt.

`SlicesDoneMark` shows when the lifecycle is not closed, the epic holds at least
one slice, and every slice is done.

### The marked slice row

`sliceRowId(epicId, sliceId)` gives `slice-<epicId>-<sliceId with "/" as "-">`.
The marked row carries that id, `aria-current="true"`, the word `Marked` in a
chip, and an open state in its accordion. The pane scrolls that element into
view after the pane reset.

### The two index fields

```json
{
  "schema_version": "1.5",
  "built_at": "2026-11-21T09:41:07Z",
  "sources": { "git_head": "...", "trees": {} },
  "entities": { "epic": [{ "id": "kanban-board/E1", "title": "The Kanban board" }] }
}
```

`built_at` is `dt.datetime.now(dt.timezone.utc)` with a second's precision, written
`...Z`. It sits at the top level, outside `sources`, and the projector does not
write it. The epic `title` comes from `TrackerRecord.title` of the record that
the build already reads. A missing record gives `null`. A reader treats both
fields as optional.

## Slice Decomposition

| Slice | Name | Depends on | Observable end |
|---|---|---|---|
| 1 | The program board shows each program by stage | — | A browser on the real bundle opens `#/board` from the top bar. Each program sits once in the column of its stage, with its epic counts and its slice count. Superseded starts hidden. The drawer still opens over the board. |
| 2 | A program card opens the epic board of that program | 1 | A card opens `#/board?program=<id>`. Each epic sits in the column of its status with its tracker title. The Cards switch shows the slices, and a slice that joins no epic sits under the head `No epic` in its own state column. The epics grain states the count of those slices under the columns. An epic card opens its page. `All programs` returns. |
| 3 | A slice card opens its epic page with the slice row marked | 2 | A slice card opens `#/<program>/build/epics/<epic>/<n>`. The epic page opens that epic, opens slice `n`, and marks its row. A reload gives the same view. |
| 4 | Find, Order, and Hide shape the board, and the address keeps them | 1 | The search narrows both boards. Order sorts the program cards three ways. Hide turns a column into a rail with its count. Each empty column states its reason. A reload restores the board. |
| 5 | The No program card opens the slices that belong to no program | 1, 2 | One card shows while orphan slices exist. It opens `#/board?orphans=1` with those slices by status. A slice card there opens in place. The card is absent when none exists. |
| 6 | The board header shows the build time of the index | 1 | The header shows `built_at`. An index without it, or without epic titles, still loads and shows `No build time in this index` and the epic id. |
| 7 | A copy icon gives the start prompt of a program or an epic | 1 | A copy press writes the exact prompt and shows `Prompt copied`. A refused write shows `Copy failed` with the text. A finished record has no icon. |

Slices 4 to 7 also read the board level that slice 1 builds, so each one starts
from a working page. The slice table of `04-slices.md` fixes these dependencies,
with one addition. The ruling of 2026-11-21 gives slice 2 the card that opens in
place, so the No program board of slice 5 reuses it and slice 5 waits for slice 2.

### Slice 1 — the program board

**Files.** New: `data/types/board.ts`, `data/board.ts`, `shell/board/address.ts`,
`shell/board/status.ts`, `shell/board/shape.ts`, `shell/board/programBoard.ts`,
`shell/board/model.ts`, `shell/board/KanbanPage.tsx`,
`shell/board/headingBand.tsx`, `shell/board/columns.tsx`,
`shell/board/programCard.tsx`, `shell/board/useBoardAddress.ts`,
`app/state/boardModel.ts`, `shell/testSupport/board/fixtures.ts`, and four test
files. Modified: `data/types.ts`, `data/bundle.ts`, `shell/hooks/route.ts`,
`shell/app/useShellState.ts`, `shell/app/state/catalog.ts`,
`shell/app/PaneContent.tsx`, `shell/app/PopulatedShell.tsx`,
`shell/app/topBarProps.ts`, `shell/TopBar.tsx`, `shell/topBar/buttons.tsx`,
`shell/topBar/props.ts`, `shell/testSupport/TopBar/renderBar.tsx`, and
`plugins/artifact/viewer/index.html`.

**Observable end.** `#/board` draws the band, the five column heads, and one
card for each program. The Superseded column shows as a rail with its count.
`shown` is lower than `total` by that count. A press on the rail shows the
column again, and the address keeps that choice. The top bar link carries
`aria-current="page"`. The Work board button opens the drawer over the board.

**Must not touch yet.** `shared/build_index.py`, the fifth route segment, the
Cards switch, Find, Order, the Hide button, the copy icon, the No program card,
and the build time.

### Slice 2 — the epic board

**Files.** New: `shell/board/EpicBoard.test.tsx`, `status.test.ts`, and
`shell/board/orphanCard.tsx` (`OrphanSliceCard`, the card for a slice with no
page). Modified: `shared/build_index.py` (the epic `title`), `data/types/core.ts`,
`data/types/board.ts` (the `BoardEpic` title), `data/board.ts`,
`shell/board/status.ts` (the three status columns), `shell/board/shape.ts` (the
group and card kinds, and `unjoinedNote`), `shell/board/programBoard.ts` (the
`unjoined` slices), `shell/board/epicBoard.ts` (new, with the `No epic` group),
`shell/board/epicCard.tsx` (new), `shell/board/commandRow.tsx` (new, the Cards
switch), `shell/board/model.ts` (the group and the note), `shell/board/KanbanPage.tsx`
(the note under the columns), `shell/board/headingBand.tsx`,
`shell/board/columns.tsx`, and `plugins/artifact/viewer/index.html`. New test:
`tests/test_build_index_epic_title.py`.

**Observable end.** A card press writes `#/board?program=<id>`. The band names
the program and shows `All programs`. Three status columns hold the epics, each
with its title, its status word, and its slice pips. An epic head opens
`#/<program>/build/epics/<epic>`. `cards=slices` groups the program's slices
under an epic head, and a slice that joins no epic sits under the head `No epic`
in its own state column. That card expands in place, because no epic page exists.
On the epics grain, one line under the columns reads `2 slices join no epic.
Switch to Slices to see them.` The board totals count the unjoined slices.

**Must not touch yet.** `sliceHref`, the fifth segment, the marked row, Find,
Order, the Hide button, the copy icon, and the No program card.

### Slice 3 — the marked slice row

**Files.** New: `shell/model/routes.board.test.ts`, `shell/SliceRow.mark.test.tsx`,
`shell/board/sliceRow.tsx`, `shell/sections/sliceAnchor.ts`. Modified:
`shell/model/routes.ts`, `shell/app/view.ts`, `shell/app/WorkContent.tsx`,
`shell/app/pagedSections.tsx`, `shell/sections/epicGroup.tsx`,
`shell/sections/epicDisclosure.tsx`, `shell/app/state/pane.ts`,
`shell/hooks/focus.ts`, `shell/hooks.ts`, `shell/board/epicCard.tsx`,
`shell/board/epicBoard.ts`,
and `plugins/artifact/viewer/index.html`.

**Observable end.** A slice card or row opens
`#/<program>/build/epics/<epic>/<n>`. The Build level pages to the epic's
section, opens the epic, opens slice `n`, marks its row, and scrolls the row into
view. A reload of that address gives the same view. Every older address reads as
it does today.

**Must not touch yet.** `shared/build_index.py`, Find, Order, the Hide button,
the copy icon, and the No program card.

### Slice 4 — Find, Order, and Hide

**Files.** New: `shell/board/search.ts`, `shell/board/search.test.ts`,
`shell/board/BoardControls.test.tsx`. Modified: `shell/board/address.ts`
(`q` and `sort`; `hide` landed in slice 1), `shell/board/programBoard.ts` (the three orders),
`shell/board/epicBoard.ts` (the search), `shell/board/model.ts` (the counts and
the empty reasons), `shell/board/columns.tsx` (`HideButton` and the rail press),
`shell/board/commandRow.tsx` (Find and Order), `shell/board/KanbanPage.tsx`,
`shell/board/useBoardAddress.ts` (the replace), `shell/board/useFindFocus.ts`
(new), and `plugins/artifact/viewer/index.html`.

**Observable end.** A key press in Find narrows both boards and replaces the
address without a history entry. Order reorders the cards inside each program
column. Hide turns a column into a rail, and the rail returns it. Each empty
column states why it holds no card. A reload of the same hash restores the board.
The header total does not fall with the search.

**Must not touch yet.** `shared/build_index.py`, the copy icon, the No program
card, and the build time.

### Slice 5 — the No program board

**Files.** New: `shell/board/orphanBoard.ts`, `shell/board/orphanBoard.test.ts`,
`shell/board/noProgramCard.tsx`, `shell/board/NoProgram.test.tsx`. Modified:
`data/types/board.ts` (`orphanSlices`), `data/board.ts`, `shell/board/shape.ts`,
`shell/board/model.ts`, `shell/board/KanbanPage.tsx`,
`shell/board/headingBand.tsx`, and `plugins/artifact/viewer/index.html`.
`shell/board/orphanCard.tsx` is not new here. Slice 2 creates it, and this slice
reuses it for the No program board.

**Observable end.** The program board shows one No program card with the orphan
count and the plan count. The card opens `#/board?orphans=1`, which groups the
slices by plan slug in the three status columns. A slice card there expands in
place and shows its end state, its score, and its attempts. The card is absent
when the index holds no orphan slice. The card never counts as a program.

**Must not touch yet.** `shared/build_index.py`, the fifth route segment, the
copy icon, and the build time.

### Slice 6 — the build time and an older index

**Files.** New: `tests/test_build_index_built_at.py`,
`shell/board/LegacyIndex.test.tsx`. Modified: `shared/build_index.py`
(`build_time`), `data/types/joins.ts`, `data/types/board.ts` (`builtAt`),
`data/board.ts`, `shell/board/shape.ts`, `shell/board/model.ts`,
`shell/board/headingBand.tsx`, and `plugins/artifact/viewer/index.html`.

**Observable end.** The index holds `built_at` at the top level, and `sources`
does not. The band shows the time in a `time` element whose `dateTime` is the ISO
value. An index without `built_at` reads `No build time in this index`. An epic
without a title shows its `epic_id`.

**Must not touch yet.** Any board control, the copy icon, and the route model.

### Slice 7 — the start prompt

**Files.** New: `shell/board/prompt.ts`, `shell/board/prompt.test.ts`,
`shell/board/notice.tsx`, `shell/board/useCopyPrompt.ts`,
`shell/board/CopyPrompt.test.tsx`. Modified: `shell/board/shape.ts` (the `prompt`
fields), `shell/board/programBoard.ts`, `shell/board/epicBoard.ts`,
`shell/board/programCard.tsx`, `shell/board/epicCard.tsx`,
`shell/board/KanbanPage.tsx`, and `plugins/artifact/viewer/index.html`.

**Observable end.** A copy press writes one line and shows `Prompt copied` for
1800 ms. A refused write shows `Copy failed` with the prompt in a `code` block
and a Close button. An open epic with every slice done shows `Slices done`. A
record with no next workflow shows no icon.

**Must not touch yet.** The tracker, `tracker.py`, and any write path. The only
write of this slice is `navigator.clipboard.writeText`.

## Test Plan

Each slice starts with RED. When a slice names a new module, RED creates that
module with the signature shown in this document and a body that returns an
empty value. The new tests then fail on an assertion, as
`plugins/implement/agents/red.md` requires, and not on a missing import. GREEN
replaces each empty body with the rule.

Each slice ends with GREEN: the same tests pass, the typecheck passes, and the
build writes the committed viewer.

### Slice 1

- `src/shell/board/address.test.ts`: the default address, the ignore rule, the
  round trip, and the one-visible-column guard.
- `src/data/boardRows.test.ts`: the flat rows, the resolved epic status, the next
  ready slice, and the orphan filter.
- `src/shell/board/programBoard.test.ts`: the stage column of each program, the
  three counts, the slice footer, and the hidden Superseded column.
- `src/shell/board/KanbanRoute.test.tsx`: the band, five columns, the top bar
  `aria-current`, and the drawer over the board.

```
cd plugins/artifact/viewer && npx vitest run src/shell/board/address.test.ts \
  src/data/boardRows.test.ts src/shell/board/programBoard.test.ts \
  src/shell/board/KanbanRoute.test.tsx
```

### Slice 2

- `src/shell/board/status.test.ts`: every epic status and slice state that the
  index emits, the unknown fallback, and the `no status` word.
- `src/shell/board/epicBoard.test.ts`: the three columns, the counts, and the
  slice grain. One case pins the `No epic` head: a program with two unjoined
  slices in different states gives one `No epic` head in each of those two
  columns, and the slices total counts both.
- `src/shell/board/EpicBoard.test.tsx`: the card target, the back control, the
  epic head target, and the Cards switch. One case pins the `No epic` card: it
  expands in place, opens no epic page, and the epics grain shows
  `2 slices join no epic. Switch to Slices to see them.` under the columns.
- `tests/test_build_index_epic_title.py`: the title from the tracker record, and
  `null` for a missing record.

```
cd plugins/artifact/viewer && npx vitest run src/shell/board/status.test.ts \
  src/shell/board/epicBoard.test.ts src/shell/board/EpicBoard.test.tsx
uv run pytest tests/test_build_index_epic_title.py -q
```

### Slice 3

- `src/shell/model/routes.board.test.ts`: `sliceN`, the older address, and
  `sliceHref`.
- `src/shell/SliceRow.mark.test.tsx`: the opened epic, the opened slice, the
  mark, the anchor id, and a second render at the same address.

```
cd plugins/artifact/viewer && npx vitest run src/shell/model/routes.board.test.ts \
  src/shell/SliceRow.mark.test.tsx
```

### Slice 4

- `src/shell/board/search.test.ts`: the program, epic, and slice predicates.
- `src/shell/board/BoardControls.test.tsx`: the replace, the push, the rail, the
  empty reasons, the stable total, and the reload.

```
cd plugins/artifact/viewer && npx vitest run src/shell/board/search.test.ts \
  src/shell/board/BoardControls.test.tsx
```

### Slice 5

- `src/shell/board/orphanBoard.test.ts`: the group by plan slug, the state map,
  and the two counts.
- `src/shell/board/NoProgram.test.tsx`: the card target, the in-place expand, the
  absent card, and the card outside the program count.

```
cd plugins/artifact/viewer && npx vitest run src/shell/board/orphanBoard.test.ts \
  src/shell/board/NoProgram.test.tsx
```

### Slice 6

- `tests/test_build_index_built_at.py`: the top-level key, the UTC shape, the
  absent key in `sources`, `is_stale` unchanged, and the second build.
- `src/shell/board/LegacyIndex.test.tsx`: the absent time, the epic id fallback,
  and no `undefined` in a cell.

```
uv run pytest tests/test_build_index_built_at.py -q
cd plugins/artifact/viewer && npx vitest run src/shell/board/LegacyIndex.test.tsx
```

### Slice 7

- `src/shell/board/prompt.test.ts`: each row of the prompt table, the null
  branch, the closed epic, and `SlicesDoneMark`.
- `src/shell/board/CopyPrompt.test.tsx`: the copied notice, the failed notice
  with the text, the dwell, and the absent icon.

```
cd plugins/artifact/viewer && npx vitest run src/shell/board/prompt.test.ts \
  src/shell/board/CopyPrompt.test.tsx
```

### The gate after each slice

```
cd plugins/artifact/viewer && npx vitest run src/data/bundle.test.tsx
cd plugins/artifact/viewer && npm run typecheck
cd plugins/artifact/viewer && npm run test
cd plugins/artifact/viewer && npm run build
uv run pytest tests/test_viewer_build.py -q
```

`bundle.test.tsx` scans every file outside `src/data/` for a resolved join. The
board files are in its scope, so a join that reaches a component fails it.

## Risks & Open Questions

1. **The two prompt tables disagree on one row.** `contracts.md` lists the closed
   epic last, and `interaction-design.md` lists it first. A first-match rule needs
   it first, or a closed record with a pull request gets a merge-check prompt. This
   design puts the closed case first. The choice changes no live record.
2. **The lower-board count scope is a reading of one ruling.** The ruling names
   the header total. This design scopes each count pair to the board, so the epic
   board reads `3 of 19 epics` and `9 of 40 slices`. A reader may expect the
   index-wide slice pair. The change is one function.
3. **The board adds a second row derivation beside `DesignRow`.** Grouping
   happens in `programBoard.ts` and `epicBoard.ts`, and the join stays in
   `data/board.ts`. The existing guard keeps the join out of the shell. The cost
   is a `groupBy` next to `designRowsOf`.
4. **Eleven slices join no epic today.** The ruling of 2026-11-21 gives them a
   home. They sit under the head `No epic` on the slices grain, the totals count
   them, and the epics grain states the count. Their cards open in place, because
   no epic page exists. The drawer's Unresolved panel still reports the join
   failure, and the board states the count and not the reason. The cost is a
   fourth kind of group head beside the epic heads.
5. **A slice whose plan slug differs from its design id lands on the No program
   board.** The board assigns a slice by its epic first, then by its plan slug
   against the design ids. A plan slug that names no design is an orphan group,
   even when the work belongs to a program whose id differs. The index resolves
   every slice's epic except eleven today, so the case is rare. A later change
   could read the design of the slice's plan record instead.
6. **Two `done` rules live side by side.** The board follows the contracts table
   and counts `completed`, `skipped`, and `escalated` slices. The drawer's
   `DesignRow.slicesDone` counts `completed` only. The projector emits only
   `completed` today, so they agree. Slice 4 does not align them, because the
   drawer is out of scope.
7. **The Superseded column starts hidden, so the first paint hides a program
   class.** The mock and ADR-0050 both require this. A reader who wants those
   programs presses the rail, and the address remembers it. The program board
   header reads `23 of 27` on the live index for this reason, because four
   designs are superseded.
8. **The address carries the search text.** A long phrase makes a long hash. The
   address has no cap, and the search reads the whole index in memory.
9. **The `/` key has three owners.** The drawer, a field, and the board. The board
   reuses `keyPressIsTaken` and yields to any `[role="dialog"]`. A second guard
   would drift from the first.
10. **The pane reset and the row scroll are two effects in one place.** The reset
    is the shell's, and the scroll is the slice row's. This design puts both in
    `usePaneEffects`, in that order. A child effect would run first and lose its
    scroll to the reset.
11. **The committed viewer moves on each slice.** `tests/test_viewer_build.py`
    compares `plugins/artifact/viewer/index.html` with a build, so each slice
    rebuilds and commits it. The self bundle's copy refreshes at the next bundle
    rebuild, which this epic does not run.
12. **Open question: the live index holds no epic title yet.** The build reads
    `TrackerRecord.title`, and the files adapter takes the plan's epic header.
    Until slice 2 lands and the engineer rebuilds, the board shows epic ids.
    Nothing in this epic writes a title back to the tracker.
