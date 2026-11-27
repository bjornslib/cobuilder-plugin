# Architecture: Kanban board

Grounded in ADR-0050, `docs/architecture/designs/kanban-board/contracts.md`, and `intent.json`.

## Fit

| Module | Role in this feature |
|---|---|
| `shared/build_index.py` | Projects the epic `title` from the tracker record, and writes the top-level `built_at`. Neither field enters `sources` or the projector. |
| `plugins/artifact/viewer/src/data/types/` | Gains the optional `title` on the epic entity and the optional `built_at` on the index. |
| `plugins/artifact/viewer/src/data/` | Resolves the board rows from the index once, through the existing joins. The board makes no join of its own. |
| `plugins/artifact/viewer/src/shell/model/routes.ts` | Reads `board` as a reserved first segment with a query, and reads a fifth segment `sliceN` on an epic page. |
| `plugins/artifact/viewer/src/shell/board/` (new) | Pure rule modules (columns, counts, empty reasons, sorts, the address codec, the start prompt) and the board components. |
| `plugins/artifact/viewer/src/shell/app/` | The shell renders the board page for the board route, beside the existing landing and work pages. |
| `plugins/artifact/viewer/src/shell/topBar/` | One link to the board. The Work board button still opens the drawer. |
| `plugins/artifact/viewer/src/shell/workDeck.ts` | The five stage lanes keep one definition, which the board reads too. |
| The epic page in `plugins/artifact/viewer/src/shell/sections/` | Brings the slice row of `sliceN` into view and marks it. |

## Endpoints

None on a server. The viewer gains these addresses, from `contracts.md`:

- `#/board`, `#/board?program=<id>`, `#/board?orphans=1`, with the query keys `q`, `sort`, `hide`, and `cards`.
- `#/<program>/build/epics/<epic>/<n>` for a slice row on its epic page.

## Data

No table. The record index `data/index.json` gains two optional fields:

- `built_at`, a top-level ISO 8601 string in UTC.
- `entities.epic[].title`, a string or null.

`schema_version` stays. The committed bundle data changes on each index build, because `built_at` changes.

## Flow

1. The reader opens `#/board`. The shell hook loads the index once, as today.
2. The route reader returns the board route with its query.
3. The data layer resolves the design rows, with epics, slices, and tracker facts.
4. The column rule groups the rows into stage columns, with counts and empty reasons, and the board draws them.
5. A click on a program card writes `#/board?program=<id>`. The same loaded rows feed the epic board.
6. A click on an epic card or a slice card navigates to the epic page. A slice address marks its row.
7. A click on a copy icon writes the start prompt to the clipboard and shows a notice.

## External

- The browser clipboard API, `navigator.clipboard.writeText`. A refused write shows "Copy failed" with the prompt text.
- No environment variable, no webhook, and no network call beyond the existing load of the bundle data.
