# Rubric: Slice 1 — The program board shows each program by stage

Feature: kanban-board
Epic: kanban-board/E1
Slice goal: In a browser on the real bundle, the top bar link opens `#/board`. Each program shows once as a card in the column of its stage, with its epic counts by status and its slice count, and the Superseded column starts hidden. The Work drawer still opens over the board. Typecheck, tests, and build hold.
Test command: `cd plugins/artifact/viewer && npx vitest run && cd ../../.. && uv run pytest tests -q`
Slice tests: `src/shell/board/address.test.ts`, `src/data/boardRows.test.ts`, `src/shell/board/programBoard.test.ts`, `src/shell/board/KanbanRoute.test.tsx`

Worktree: `/Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board`

## Browser setup

Run these two commands from a shell, in this order. Then open the page.

1. `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && cd plugins/artifact/viewer && npm run build`
2. `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run shared/migrate_bundle.py --bundle-dir /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board/.cobuilder-architect/self`

Page: `http://127.0.0.1:62583/active/viewer/index.html`. The server on port 62583 serves this worktree's bundle, because `active` links to `self`. Set the window to 1280 by 800. Use the browser tools to read the accessibility tree and the screenshot. The readings below quote the record index of 2026-11-21: 27 designs, 112 epics, 195 slices, and 4 superseded designs.

## Criteria

### C1 — The top bar link opens the board and marks the current page [CRITICAL]

**Must be true:** A press on the top bar link named "Kanban board" changes the address to `#/board`. The board page replaces the level in the pane. The link carries `aria-current="page"`, and the page holds one `h1` that reads "Kanban board" (interaction-design.md 5.1, 3.2).

**Evidence to check:**
- Run the Browser setup, then open `#/` and press the top bar's "Kanban board" link.
- Read the accessibility tree. One link is named "Kanban board" and carries `aria-current="page"`. One `h1` reads "Kanban board".
- Read the address. It reads `#/board`. Read the screenshot at 1280 by 800. The heading band, the command row, and the column heads draw.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/KanbanRoute.test.tsx`.

**Scoring:**
- 1.0 — the press writes `#/board`, the link marks current, the `h1` reads "Kanban board", and the route test passes.
- 0.5 — the board draws at `#/board`, and the link does not mark current or the address is another one.
- 0.0 — no link exists, the page is blank, or the route test fails.

### C2 — Each program sits once in the column of its stage [CRITICAL]

**Must be true:** Every design of the index draws once as a card, in the column of its stage. The five columns keep the order of `src/shell/workDeck.ts`: Needs a decision, Ready to build, In review, Shipped, Superseded. A stage that names no column goes to the first column. The card keeps the raw word (interaction-design.md 6.1, epic-E1-design.md "The columns").

**Evidence to check:**
- Open `#/board` at 1280 by 800. Read each column's accessibility tree. Each card is an `li` inside the column's `ul`.
- Count the cards and compare with `entities.design` in `data/index.json`. The index of 2026-11-21 holds 27 designs.
- Reading check from that index: beads-storage in Ready to build, cobuilder-viewer in In review, plugin-split in Shipped, inflight-record-store in Needs a decision.
- Press the Superseded rail, then read maintainable-viewer in that column.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/programBoard.test.ts`.

**Scoring:**
- 1.0 — each design appears once, in the column of its stage, and the five heads keep the lane order.
- 0.5 — one card sits in the wrong column, one design is missing or doubled, or the head order differs from the lane order.
- 0.0 — the columns hold no card, or the program board test fails.

### C3 — The Superseded column starts hidden, and the header states the shown and total counts [CRITICAL]

**Must be true:** At `#/board` with no `hide` key, Superseded draws as a 44 px rail with its label and its count. A press on the rail shows the column again, and the address keeps that choice. The Programs pair in the band reads the shown count and the index count. On 2026-11-21 it reads 23 of 27, because 4 designs are superseded (interaction-design.md 2.3, 5.5, ui-spec.jsonc HiddenColumnRail, epic-E1-design.md "Observable end").

**Evidence to check:**
- Open `#/board`. Read the rail's accessible name. It reads "Show Superseded, 4 programs".
- Read the `dl` named "Shown counts". The Programs pair reads 23 of 27.
- Press the rail. The column draws, the rail is gone, the address gains a `hide` key, and the pair reads 27 of 27.
- Reload the page. The column stays visible.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/programBoard.test.ts`.

**Scoring:**
- 1.0 — the rail shows the label and the count. The pair matches the index (23 of 27). The rail press writes the address and survives a reload.
- 0.5 — the rail shows and the pair reads the same number twice, or the rail press does not write the address.
- 0.0 — Superseded draws as a full column, or no rail exists.

### C4 — A program card states its epic counts by status and its slice footer

**Must be true:** The card holds the name, the outcome, three epic counts, and a slice footer. The counts follow the status map. The footer reads "<done> of <total> slices done". It adds " · next #<n>" when a planned slice exists. It reads "No slices yet" at zero slices (interaction-design.md 6.1, ui-spec.jsonc ProgramCard).

**Evidence to check:**
- Read three cards at 1280 by 800. On 2026-11-21 the index gives: beads-storage with Planned 1, In progress 0, Done 7, and the footer "38 of 38 slices done". cobuilder-viewer with In progress 19 and the footer "15 of 18 slices done · next #1". kanban-board with the footer "No slices yet".
- Compare each reading with `entities.epic`, `joins.epic_status`, and `entities.slice` in `data/index.json`.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/programBoard.test.ts`.

**Scoring:**
- 1.0 — the three counts and the footer match the index for each card read.
- 0.5 — the counts show and one foot or the footer is wrong, for example a slice total that drops a slice.
- 0.0 — a card holds no counts, or no footer exists.

### C5 — The five stage columns fit at 1280 by 800 with no page-level sideways scroll

**Must be true:** The abort condition of `goal.json` does not hold. At 1280 by 800 the five columns draw side by side. The document does not scroll sideways. Each column body scrolls its own cards (interaction-design.md 6.1, 9.1, 11.3).

**Evidence to check:**
- Open `#/board` at 1280 by 800. Press the Superseded rail, so that five columns are visible.
- Read the screenshot. Five column heads sit side by side, and no horizontal scrollbar shows on the document.
- Evaluate `document.documentElement.scrollWidth <= document.documentElement.clientWidth` in the console. It reads true.
- Scroll one column body with the wheel. The page stays still, and the other columns do not move.

**Scoring:**
- 1.0 — five columns draw at 1280, the document reports no horizontal overflow, and one column body scrolls alone.
- 0.5 — the columns draw and the document overflows by a few pixels, or the whole board scrolls sideways.
- 0.0 — fewer than five columns draw, or the page scrolls sideways, which trips the abort condition.

### C6 — The Work drawer still opens over the board

**Must be true:** The top bar's Work board button opens the drawer over the board. The board does not scroll, and Escape closes the drawer with the board as the reader left it (interaction-design.md 5.10).

**Evidence to check:**
- On `#/board`, press the Work board button. Read the accessibility tree. A dialog opens, and the overlay dims the board.
- Press Escape. The dialog closes. The address still reads `#/board`, and Superseded is still hidden.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/KanbanRoute.test.tsx`.

**Scoring:**
- 1.0 — the drawer opens over the board, and Escape restores the board with its state.
- 0.5 — the drawer opens and the board loses its hidden column or its address.
- 0.0 — the Work board button does nothing on the board.

### C7 — An unknown key or a full hide list still gives a readable board

**Must be true:** The board address reads `#/board`. An unknown key or value is ignored, and the default holds. A `hide` list that names every column drops its last key, so one column stays visible (epic-E1-design.md "The address").

**Evidence to check:**
- Open `#/board?zzz=1`. The program board reads as `#/board`.
- Open `#/board?hide=decision,build,review,shipped,superseded`. One column stays visible, and the board draws.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/address.test.ts`.

**Scoring:**
- 1.0 — both addresses give a program board with at least one visible column, and the address test passes.
- 0.5 — one address gives an empty board, or the full hide list leaves no column.
- 0.0 — an address throws, or the address test fails.

### C8 — The new files stay inside the habit-smell limits

**Must be true:** Each new file is about 200 lines or fewer. Each new function is about 50 lines or fewer, with a complexity of 10 or less.

**Evidence to check:**
- Run `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run plugins/implement/scripts/habit_coach.py --check`. It exits 0, which proves the coach runs.
- Read the coach findings for the new files under `src/shell/board/`, `src/data/`, and `src/shell/app/state/boardModel.ts`.
- Run `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run shared/habit_smells.py --repo . --branch origin/master`, then read the `oversized-file`, `oversized-function`, and `high-complexity` groups for those files.

**Scoring:**
- 1.0 — no finding names a new file or a new function of this slice.
- 0.5 — one unit is over a limit, and the slice record gives its reason.
- 0.0 — two or more units are over the limits, or the coach cannot run.

## Regression check
- The manifest command passes: `cd plugins/artifact/viewer && npx vitest run && cd ../../.. && uv run pytest tests -q`.
- `cd plugins/artifact/viewer && npx tsc --noEmit` passes.
- `cd plugins/artifact/viewer && npm run build` passes, and `uv run pytest tests/test_viewer_build.py -q` passes. The committed `plugins/artifact/viewer/index.html` equals a fresh build.
- `cd plugins/artifact/viewer && npx vitest run src/data/bundle.test.tsx` passes. No board file resolves a join.
- The Work drawer tests and the Work board route tests still pass.
- Files outside the slice scope stay unchanged: `shared/`, `plugins/implement/`, the tracker, the bundle migration, and every path outside `plugins/artifact/viewer/src/` and `plugins/artifact/viewer/index.html`.

## Out of scope — do not penalise
- The two targets on a program card, the body link and the name link. Slice 2 checks the press that opens the epic board, and the name link that opens the program page.
- The epic board, the status columns, the Cards switch, and the epic title in the index. Slice 2 owns them.
- The fifth route segment, the marked slice row, and the scroll to that row. Slice 3 owns them.
- Find, Order, and the Hide button. This slice has the default rail only. Slice 4 owns the controls.
- The No program card and the orphan board. Slice 5 owns them.
- The build time in the band, and an index without it. Slice 6 owns them.
- The copy icon, the "Prompt copied" notice, and the "Copy failed" notice. Slice 7 owns them.
- The epic counts of a program on the epic board, and any count scoped to a lower board.
