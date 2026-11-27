# Rubric: Slice 3 — A slice card opens its epic page with the slice row marked

Feature: kanban-board
Epic: kanban-board/E1
Slice goal: A click on a slice card opens `#/<program>/build/epics/<epic>/<n>`. The epic page shows the section of that epic, brings the slice row into view, and marks it. A reload of that address gives the same view. Every older address reads as before.
Test command: `cd plugins/artifact/viewer && npx vitest run && cd ../../.. && uv run pytest tests -q`
Slice tests: `src/shell/model/routes.board.test.ts`, `src/shell/SliceRow.mark.test.tsx`

Worktree: `/Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board`

## Browser setup

Run these two commands from a shell, in this order. Then open the page.

1. `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && cd plugins/artifact/viewer && npm run build`
2. `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run shared/migrate_bundle.py --bundle-dir /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board/.cobuilder-architect/self`

Page: `http://127.0.0.1:62583/active/viewer/index.html`. Set the window to 1280 by 800. Use the browser tools to read the accessibility tree and the screenshot. The readings below quote the record index of 2026-11-21. On that index the epic cobuilder-viewer/E1 holds one slice in state `planned`. The card of slice 1 sits in the Planned column of the slices grain.

## Criteria

### C1 — A slice card opens the epic page with the slice as the fifth segment [CRITICAL]

**Must be true:** A press on a slice card of a program writes `#/<program>/build/epics/<epic>/<n>`. A slice row inside an epic's own slice list opens the same address for its slice. One builder produces that address for both paths. The two agree (contracts.md "The targets of a card", epic-E1-design.md "The targets of a card").

**Evidence to check:**
- Run the Browser setup, then open `#/board?program=cobuilder-viewer&cards=slices`. Press the card for slice 1 of E1.
- Read the address. It reads `#/cobuilder-viewer/build/epics/E1/1`.
- Press the browser back button. The board returns with `cards=slices` still in the address.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/model/routes.board.test.ts`.

**Scoring:**
- 1.0 — the card press writes the five-segment address, the back button restores the board, and the route test pins the field and the builder.
- 0.5 — the card opens the epic page at `#/<program>/build/epics/<epic>` with no slice segment, or the back button loses the grain.
- 0.0 — a slice card opens no page, or the route test fails.

### C2 — The epic page opens that epic, opens the row of slice n, marks it, and scrolls it into view [CRITICAL]

**Must be true:** The Build level pages to the section of that epic. It opens the epic, opens the row of slice n, and marks the row. The mark is `aria-current="true"` and the word "Marked" in a chip. The pane scrolls the row into view after the pane reset (epic-E1-design.md "The marked slice row", interaction-design.md 5.6, 8.4).

**Evidence to check:**
- Load `#/cobuilder-viewer/build/epics/E1/1` at 1280 by 800. Read the screenshot. The epic section is open, and the row of slice 1 sits inside the viewport.
- Read the accessibility tree. One row carries `aria-current="true"` and the chip "Marked".
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/SliceRow.mark.test.tsx`.

**Scoring:**
- 1.0 — the section opens, the row of slice n opens and carries both marks, and the row is inside the viewport.
- 0.5 — the row is marked and the viewport does not reach it, or the mark is a colour alone.
- 0.0 — no row is marked, or the epic section does not open.

### C3 — A reload of that address gives the same view

**Must be true:** The address holds the whole view. A reload and a second tab give the same epic section and the same open row. They give the same mark (interaction-design.md 2.3).

**Evidence to check:**
- On `#/cobuilder-viewer/build/epics/E1/1`, press reload. Read the three readings of C2 again.
- Open the same address in a second tab. Read the same three readings.

**Scoring:**
- 1.0 — both reads equal the first read.
- 0.5 — one read loses the mark or the scroll position on the first paint.
- 0.0 — the reload shows the epic section with no mark, or another level.

### C4 — Every older address reads as before

**Must be true:** The route model gains one field for the fifth segment, and every other address keeps its meaning. `#/<program>/build/epics/<epic>` opens the epic section with no marked row. `#/<program>/intent` opens the program level. `#/` opens the board (contracts.md "The targets of a card", epic-E1-design.md "Observable end").

**Evidence to check:**
- Open `#/cobuilder-viewer/build/epics/E1`. The epic section opens, and no row carries `aria-current="true"`.
- Open `#/cobuilder-viewer/intent`. The program level draws as it did before this slice.
- Open `#/`. The board draws.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/model/routes.board.test.ts`. The older address keeps the fifth segment null.

**Scoring:**
- 1.0 — all three addresses read as before, and the older epic address marks no row.
- 0.5 — one older address draws a different level or picks up a mark.
- 0.0 — an older address fails to draw, or the route test fails.

### C5 — The address opens one slice row and leaves the other rows closed

**Must be true:** The address opens the row of slice n and the slice list of that epic. This address opens no other row of the epic. A press on another row opens that row alone (epic-E1-design.md "The marked slice row", interaction-design.md 5.6).

**Evidence to check:**
- On `#/beads-storage/build/epics/E1/2`, read the epic's slice list. The pips toggle reads `aria-expanded="true"`. The row of slice 2 is open, and the rows of slices 1, 3, 4, and 5 are closed.
- Press the row of slice 4. Row 4 opens and row 2 closes.

**Scoring:**
- 1.0 — exactly one row opens, the list is expanded, and a press moves the open row.
- 0.5 — the list is expanded with every row closed, or two rows open at once.
- 0.0 — the list stays collapsed, or the address opens no row.

### C6 — The new files stay inside the habit-smell limits

**Must be true:** Each new file is about 200 lines or fewer. Each new function is about 50 lines or fewer, with a complexity of 10 or less.

**Evidence to check:**
- Run `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run plugins/implement/scripts/habit_coach.py --check`. It exits 0, which proves the coach runs.
- Read the coach findings for `shell/board/sliceRow.tsx`, `shell/sections/sliceAnchor.ts`, and the modified `shell/model/routes.ts` and `shell/sections/` files.
- Run `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run shared/habit_smells.py --repo . --branch origin/master`, then read the three size groups for those files.

**Scoring:**
- 1.0 — no finding names a new file or a new function of this slice.
- 0.5 — one unit is over a limit, and the slice record gives its reason.
- 0.0 — two or more units are over the limits, or the coach cannot run.

## Regression check
- The manifest command passes: `cd plugins/artifact/viewer && npx vitest run && cd ../../.. && uv run pytest tests -q`.
- `cd plugins/artifact/viewer && npx tsc --noEmit` passes.
- `cd plugins/artifact/viewer && npm run build` passes, and `uv run pytest tests/test_viewer_build.py -q` passes.
- `cd plugins/artifact/viewer && npx vitest run src/data/bundle.test.tsx` passes.
- The existing level and route tests pass: `cd plugins/artifact/viewer && npx vitest run src/shell/model src/shell/sections`.
- Files outside the slice scope stay unchanged: `shared/`, the tracker, the Work drawer's behaviour, the bundle migration, and every path outside `plugins/artifact/viewer/src/` and `plugins/artifact/viewer/index.html`.

## Out of scope — do not penalise
- Find, Order, the Hide button, and the rail press on the epic board. Slice 4 owns them.
- The No program card, the orphan board, and a slice card that expands in place for a slice with no program. Slices 2 and 5 own them.
- The build time in the band, and an index without it. Slice 6 owns them.
- The copy icon, the "Slices done" mark, and the notices. Slice 7 owns them.
- A page for one slice of its own. No such page exists. The fifth segment opens the epic page.
- The Work drawer's own row behaviour and its focus rules.
