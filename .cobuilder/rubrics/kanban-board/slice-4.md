# Rubric: Slice 4 — Find, Order, and Hide shape the board, and the address keeps them

Feature: kanban-board
Epic: kanban-board/E1
Slice goal: The search narrows both boards, Order sorts the program cards by name, open work, and progress, and Hide turns a column into a rail with its count. The header shows the true total, an empty column states its reason, and a reload restores the board from the address.
Test command: `cd plugins/artifact/viewer && npx vitest run && cd ../../.. && uv run pytest tests -q`
Slice tests: `src/shell/board/search.test.ts`, `src/shell/board/BoardControls.test.tsx`

Worktree: `/Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board`

## Browser setup

Run these two commands from a shell, in this order. Then open the page.

1. `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && cd plugins/artifact/viewer && npm run build`
2. `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run shared/migrate_bundle.py --bundle-dir /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board/.cobuilder-architect/self`

Page: `http://127.0.0.1:62583/active/viewer/index.html`. Set the window to 1280 by 800. Use the browser tools to read the accessibility tree and the screenshot. The readings below quote the record index of 2026-11-21: 27 designs, 112 epics, and 195 slices. A card set always follows the rule in interaction-design.md 5.2. Compare a reading with that rule and the index when the index moves.

## Criteria

### C1 — Find narrows both boards, and each key press replaces the address [CRITICAL]

**Must be true:** A press on `/` moves focus into Find and selects its text, and a click does the same. The key does nothing while a dialog is open, or while focus sits in a field, select, or textarea. Each key press writes `q` with a history replace, so typing adds no history entry. A program matches on its name, an epic title, or a slice title. An epic matches on its title, its epic id, or a slice title. A slice matches on its title, its epic title or id, or the plan slug (interaction-design.md 5.2, 8.1).

**Evidence to check:**
- Run the Browser setup, then open `#/board`. Read `history.length` in the console, press `/`, and type a word that names one program, such as "book-index-tiering".
- Read the address. It holds `q=book-index-tiering`. Read `history.length` again. It equals the first value.
- Read the cards. Each visible card is one that the rule keeps. Compare the card set with the rule and `data/index.json`.
- Press the browser back button once. The board leaves, because the typing added no entry. It does not step through the typed characters.
- Open the Work drawer, press `/`, and read the focused element. Focus stays in the drawer. Close the drawer.
- Open `#/board?program=beads-storage&cards=slices` and type a slice title word. The slice cards narrow.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/search.test.ts`.

**Scoring:**
- 1.0 — `/` and a click both focus Find, the address holds `q`, typing adds no history entry, and both boards narrow by the rule.
- 0.5 — the search narrows and the address is not written, or a history entry appears for each key press.
- 0.0 — the search does not narrow a board, or the search test fails.

### C2 — Order sorts the program cards three ways inside each column

**Must be true:** The Order select shows on the program board only. `name` is the default. `open` orders by the count of epics that are not done, highest first, then by name. `progress` orders by the share of epics done, highest first, then by name. A program with no epic counts as 0. The columns never reorder (contracts.md "The order of the program cards", interaction-design.md 3.2, 6.1).

**Evidence to check:**
- Open `#/board`, press the Superseded rail, and read the In review column. Name order reads book-index-tiering, then cobuilder-viewer.
- Choose "Most open work". The In review column reads cobuilder-viewer (19 epics not done), then book-index-tiering (1). The address gains `sort=open`.
- Choose "Progress". Ready to build reads cobuilder-implement (2 of 2 done), then beads-storage (7 of 8). Then gate-state-resolution and kanban-board follow in name order, because both sit at 0. In review returns to name order, because both programs sit at 0.
- Read the column heads. Their order does not change with the sort.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/programBoard.test.ts`.

**Scoring:**
- 1.0 — all three orders match the rule for each card read, and the columns keep their order.
- 0.5 — one order is wrong, or a program with no epic sorts as if it held one.
- 0.0 — the select does nothing, or the columns reorder.

### C3 — Hide turns a column into a rail with its count, and the rail returns it [CRITICAL]

**Must be true:** Each visible column head holds a Hide button whose visible word is "Hide" and whose accessible name names the column. A press writes the `hide` list in column order and turns the column into a 44 px rail that keeps the column's count. A press on the rail shows the column again. The Hide button of the last visible column is disabled and reads `title="One column stays visible"` (interaction-design.md 5.5, 3.2, 7.7).

**Evidence to check:**
- On `#/board`, press "Hide Shipped". Read the rail's name. It reads "Show Shipped, 5 programs" on 2026-11-21, because five designs hold stage `implemented`. Read the address. The `hide` keys follow column order.
- Press the rail. The column returns, and the address loses that key.
- Hide columns until one stays. Read its Hide button. It is disabled and carries the title.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/BoardControls.test.tsx`.

**Scoring:**
- 1.0 — a Hide press writes the rail with its count, the rail press returns the column, and the last Hide button is disabled.
- 0.5 — the rail works and its count is wrong, or the hide list follows click order.
- 0.0 — no Hide button exists, or the last visible column can be hidden.

### C4 — Each empty column states its reason, and a board with no match states one sentence with a Clear button

**Must be true:** A column that holds no record before the search states that cause. It reads "No program is in this stage.", "No epic has this status.", or "No slice has this state.". A column that the search empties states its own cause. It reads "No program matches “<q>”.", "No epic matches “<q>”.", or "No slice matches “<q>”." A board that the search empties keeps its columns. It shows one sentence with a Clear the search button (interaction-design.md 3.1, ui-spec.jsonc EmptyColumnNotice, BoardNoMatch).

**Evidence to check:**
- Open `#/board?program=beads-storage`. The In progress column holds no epic on 2026-11-21. It reads "No epic has this status.".
- Type "zzz" in Find. Read one sentence: "No program, epic, or slice matches “zzz”." and the button "Clear the search". Press the button. The search clears and the board returns.
- Open `#/board?program=cobuilder-viewer` and type "zzz". The sentence reads "No epic or slice of cobuilder-viewer matches “zzz”.".
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/BoardControls.test.tsx`.

**Scoring:**
- 1.0 — each empty column states the right cause, and a board with no match states one sentence with a Clear button that works.
- 0.5 — one column shows the sentence for the other cause, or the Clear button does nothing.
- 0.0 — an empty column holds no sentence, or a board with no match draws blank bodies.

### C5 — The header total does not fall with the search, and the shown count equals the visible column sum

**Must be true:** The header shows the count the board shows and the count the index holds. The shown count is the sum of the visible column counts after the search. The total never falls with a search (interaction-design.md 2.2, epic-E1-design.md "The counts").

**Evidence to check:**
- On `#/board`, read the `dl`. Read each column count in the accessibility tree.
- Type "zzz" in Find. Read the Programs pair. The first number is 0 and the second does not change.
- Type a word that keeps one card. Read the pair again. The first number equals the sum of the visible column counts, and the second is the index total.
- Compare the total with `entities.design`.

**Scoring:**
- 1.0 — the shown number equals the visible column sum at each step, and the total stays at the index count.
- 0.5 — the shown number is right and the total falls with the search, or one pair holds a stale sum.
- 0.0 — no count pair exists, or the numbers disagree with the cards.

### C6 — A reload of the same address restores the search, the order, the grain, and the hidden columns [CRITICAL]

**Must be true:** The address holds the whole view, so a reload, a shared link, and the back button restore the same board. A board change, a sort, a card grain change, and a hide each push one history entry. The address records each of them (interaction-design.md 2.1, 2.3, 5.5, contracts.md "The address of the board").

**Evidence to check:**
- On `#/board`, type "beads", choose "Most open work", hide Shipped, and hide Superseded. Copy the address. Press reload. Read the cards, the select, and the rails. They equal the first read.
- Open `#/board?program=beads-storage&cards=slices&q=tracer`. Press reload. The slices grain and the search hold.
- Open the copied address in a second tab. The board equals the first read.
- Press the browser back button once after a sort press. The board before that sort returns.

**Scoring:**
- 1.0 — a reload, a second tab, and the back button each restore the exact view, and a sort press adds one entry.
- 0.5 — one of the search, the sort, the grain, or the hidden set is lost on a reload.
- 0.0 — a reload returns the default board.

### C7 — The new files stay inside the habit-smell limits

**Must be true:** Each new file is about 200 lines or fewer. Each new function is about 50 lines or fewer, with a complexity of 10 or less.

**Evidence to check:**
- Run `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run plugins/implement/scripts/habit_coach.py --check`. It exits 0, which proves the coach runs.
- Read the coach findings for `shell/board/search.ts`, `shell/board/useFindFocus.ts`, and the modified `shell/board/columns.tsx`, `commandRow.tsx`, and `model.ts`.
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
- The slice 1 board tests still pass: `cd plugins/artifact/viewer && npx vitest run src/shell/board/address.test.ts src/shell/board/programBoard.test.ts src/shell/board/KanbanRoute.test.tsx`.
- Files outside the slice scope stay unchanged: `shared/`, the tracker, the Work drawer's own search, the bundle migration, and every path outside `plugins/artifact/viewer/src/` and `plugins/artifact/viewer/index.html`.

## Out of scope — do not penalise
- The No program card and the orphan board. Slice 5 owns them.
- The build time in the band, and an index without it. Slice 6 owns them.
- The copy icon and the notices. Slice 7 owns them.
- The fifth route segment and the marked slice row. Slice 3 owns them.
- A sort on the epic board or the No program board. The Order select is absent there.
- A change to the Work drawer's own search, sort, or filter.
- A countdown, a debounce, or an animation on the search.
