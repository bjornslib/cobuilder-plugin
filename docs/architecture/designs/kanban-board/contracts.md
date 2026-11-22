# Contracts: kanban-board

Every entry below is a prediction from ADR-0050. No code exists yet. Gate 3
of the build may change an entry.

The design touches one public surface: the address scheme of the viewer. It
also changes one durable data shape: the record index.

## Endpoints

### The address of the board

The board owns the first segment `board`. Everything else is a query after a
`?`, so no program id is reserved.

| Address | Shows |
|---|---|
| `#/board` | The program board: each program as a card in the column of its stage. |
| `#/board?program=<id>` | The epic board of one program: its epics by status. |
| `#/board?orphans=1` | The slices that belong to no program, by status. |

| Key | Values | Applies to |
|---|---|---|
| `program` | A design id that the index holds. | Selects the epic board |
| `orphans` | `1` | Selects the No program board. `program` wins when both are set |
| `q` | The search text. | Each board |
| `sort` | `name` (the default), `open`, or `progress`. | The program board |
| `hide` | Column keys with commas between them. The program board hides `superseded` when the key is absent. | Each board |
| `cards` | `epics` (the default) or `slices`. | The epic board |

An unknown key or value is ignored. A `program` value that the index does not
hold shows the program board with a notice that names the value.

The search writes the address with a replace, so each key press adds no
history entry. A change of board, sort, card switch, or hidden column pushes
one history entry, so the back button returns to the last board.

### The order of program cards

| `sort` | Order |
|---|---|
| `name` | By name, A to Z |
| `open` | By the count of epics that are not done, highest first, then by name |
| `progress` | By the share of epics that are done, highest first, then by name. A program with no epic counts as 0 |

### The status columns

The epic board maps each value that the index emits. The raw word stays on the
card.

| Column | Epic status (`joins.epic_status`) | Slice state |
|---|---|---|
| Planned | `unstarted`, `planned` | `planned` |
| In progress | `open`, `no-pull-request` | `in_progress` |
| Done | `completed`, `merged`, `superseded` | `completed`, `skipped`, `escalated` |

A value that no row names goes to In progress, and the card shows the raw
word. A test lists each value that the current index emits.

### The targets of a card

| Card | Target |
|---|---|
| A program card | The epic board, `#/board?program=<id>`. The name on the card opens the program at `#/<program>/intent`. |
| An epic card | The page of the epic, `#/<program>/build/epics/<epic>`. |
| A slice card of a program | The page of its epic with one more segment, `#/<program>/build/epics/<epic>/<n>`. The page opens the section of the epic, brings the row of slice `n` into view, and marks it. |
| A slice card with no program | No page exists. The card opens in place and shows its end state, score, and attempts. |

The route model gains one field, `sliceN`, for the fifth segment. Every other
address reads as before.

### The start prompt

A copy icon shows on a program card or an epic card that has a next workflow.
A click copies one line of text, and the board shows the notice "Prompt
copied". When the clipboard refuses the write, the board shows the notice
"Copy failed" with the prompt text, so the reader can copy it by hand.

| Record | State | Prompt |
|---|---|---|
| Program | `backlog`, `decided`, or `review` | `/architect:design <program>` |
| Program | `approved` | `/implement:start <program>` |
| Program | `implemented` or `superseded` | No icon |
| Epic | Planned or In progress, with a slice that is not done or with no slice | `/implement:start <program> <epic>` |
| Epic | Lifecycle open, all slices done, no pull request | `/pr:generate <branch>` |
| Epic | Lifecycle open, with a pull request, or status `merged` | `Check that pull request <pr> of <epic> merged, then record it with tracker.py set-pull-request-state and close the epic with tracker.py set-epic-state` |
| Epic | Lifecycle closed | No icon |

An epic that has all slices done and an open lifecycle shows the mark "Slices
done". The mark reads the lifecycle and the slice states, never the column.

## Data models

### The record index, `data/index.json`

| Field | Type | Meaning |
|---|---|---|
| `built_at` | A string, ISO 8601 in UTC | The time of the index build. It is a top-level key. It is not part of `sources`, so the stale check ignores it. The projector does not write it. |
| `entities.epic[].title` | A string or null | The title of the tracker record of the epic. It is null when the tracker holds no title or the build read no tracker. |

`schema_version` stays as it is. Both fields are optional for a reader. A
viewer that gets an older index shows no build time and shows the epic id in
place of a title. A test loads an index without the two fields.

### The board model, in the viewer

The shell loads the index once, as today. The data layer resolves the rows,
and the board components get them as props. The rule module returns one shape
for each board.

| Field | Meaning |
|---|---|
| `columns[]` | One entry for each column, with its key, label, cards, count, and hidden flag. |
| `columns[].emptyReason` | Why a column shows no card: no record has this state, or the search hides each record. |
| `shown` and `total` | The count of records that the board shows, and the count of records of that board in the index. On the program board, the total is every program. On an epic board, it is the epics or slices of that program. On the No program board, it is the slices with no program. |
| `orphans` | The count of slices that belong to no program. The No program card shows when the count is above zero. |

An epic card carries its status, its lifecycle, and its pull request as three
separate fields. A card holds only values that the data layer resolved from
the index. The rule module reads no DOM and makes no join of its own.
