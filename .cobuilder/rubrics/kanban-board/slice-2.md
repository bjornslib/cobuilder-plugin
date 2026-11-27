# Rubric: Slice 2 — A program card opens the epic board of that program

Feature: kanban-board
Epic: kanban-board/E1
Slice goal: A click on a program card opens `#/board?program=<id>`. Each epic sits in its status column by the map in `contracts.md`, with its tracker title. The Cards switch shows the slices, an epic card opens its epic page, and the back control returns to the program board.
Test command: `cd plugins/artifact/viewer && npx vitest run && cd ../../.. && uv run pytest tests -q`
Slice tests: `src/shell/board/status.test.ts`, `src/shell/board/epicBoard.test.ts`, `src/shell/board/EpicBoard.test.tsx`, `tests/test_build_index_epic_title.py`

Worktree: `/Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board`

## Browser setup

Run these three commands from a shell, in this order. Then open the page. The third command is new in this slice, because `shared/build_index.py` now writes the epic title.

1. `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && cd plugins/artifact/viewer && npm run build`
2. `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run shared/build_index.py`
3. `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run shared/migrate_bundle.py --bundle-dir /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board/.cobuilder-architect/self`

Page: `http://127.0.0.1:62583/active/viewer/index.html`. Set the window to 1280 by 800. Use the browser tools to read the accessibility tree and the screenshot. The readings below quote the record index of 2026-11-21. A card label is the tracker title when the index holds one. It is the epic id when `entities.epic[].title` is null.

## Criteria

### C1 — A program card opens the epic board of that program [CRITICAL]

**Must be true:** A real pointer press inside the card's padding writes `#/board?program=<id>`. The press lands away from the name and the copy slot, and it draws the epic board of that program. The name on the card opens `#/<program>/intent`. The browser back button restores the program board (contracts.md "The targets of a card", interaction-design.md 5.3, 5.6, 11.2).

**Evidence to check:**
- Run the Browser setup, then open `#/board` at 1280 by 800. Press the body of the beads-storage card inside its padding.
- Read the address. It reads `#/board?program=beads-storage`. Read the band. An `h2` reads "beads-storage", and the link "← All programs" sits at the left.
- Return to `#/board`. Press the name "cobuilder-viewer" on its card. The address reads `#/cobuilder-viewer/intent`.
- Press the browser back button. The board returns.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/EpicBoard.test.tsx`.

**Scoring:**
- 1.0 — the body press opens the board of that program, the name opens the program page, and the back button restores the board.
- 0.5 — the name opens the program page and the body press does nothing, or the board opens for another id.
- 0.0 — no card opens a second board.

### C2 — Each epic sits in the column of its status, with its title and its raw word [CRITICAL]

**Must be true:** The board maps each epic by `joins.epic_status` to Planned, In progress, or Done, with the map in contracts.md. A value that no row names goes to In progress and keeps its raw word. A missing value goes to In progress and reads "no status". The card label is the tracker title. It is `epic_id` when the index holds no title (epic-E1-design.md "The two index fields", interaction-design.md 6.2, 7.4, 7.5, ui-spec.jsonc EpicCard).

**Evidence to check:**
- Run the Browser setup. Read `entities.epic[].title` in `data/index.json` for beads-storage and cobuilder-viewer.
- Open `#/board?program=beads-storage`. Read the three heads and their counts. On 2026-11-21 they read Planned 1, In progress 0, Done 7. Each card shows its title, and its epic id when the title is null.
- Open `#/board?program=cobuilder-viewer`. In progress reads 19.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/status.test.ts` and `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run pytest tests/test_build_index_epic_title.py -q`.

**Scoring:**
- 1.0 — every epic of the program appears once in the mapped column. The counts match the index. Each label is the title or the epic id.
- 0.5 — one epic sits in the wrong column. A card shows a branch tail or a raw id where the index holds a title.
- 0.0 — no status columns exist, cards hold no label, or the Python test fails.

### C3 — The Cards switch shows the program's slices under their epic heads [CRITICAL]

**Must be true:** The epic board holds the Cards switch with "Epics" pressed. A press on "Slices" writes `cards=slices`, presses that button, and groups the program's slices under a head for each epic that has a matching slice. Each slice sits in the column of its own state (interaction-design.md 5.4, 6.2, ui-spec.jsonc SliceCard, epic-E1-design.md "The columns").

**Evidence to check:**
- On `#/board?program=beads-storage`, press "Slices". Read the address and the pressed button.
- Read the columns. Beads-storage holds 38 slices, and all are completed on 2026-11-21. Done holds 38 cards under eight epic heads.
- Open `#/board?program=cobuilder-viewer&cards=slices`. Planned holds 3 cards and In progress holds 0, while Done holds 15. Each card sits under the head of its epic.
- Compare the card numbers with `joins.slice_to_epic` and `entities.slice` in `data/index.json`.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/epicBoard.test.ts`.

**Scoring:**
- 1.0 — the switch writes `cards=slices`, each slice sits in its own state column under its epic head, and the counts match the index.
- 0.5 — the switch works and one slice sits under a wrong head or in a wrong column, or a head is missing.
- 0.0 — no switch exists, or the slices grain drops slices.

### C4 — A slice that joins no epic sits under the head No epic, and the epics grain states its count

**Must be true:** A slice with no epic whose plan slug names a design is unjoined. On the slices grain it sits under the head `No epic`, in the column of its own state. That card expands in place, because no epic page exists. On the epics grain, one line under the columns reads "<n> slices join no epic. Switch to Slices to see them." The line is absent at zero (epic-E1-design.md "The slice membership", "The counts", contracts.md "Data models").

**Evidence to check:**
- Open `#/board?program=beads-storage`. Read below the columns. No line shows, because this program holds no unjoined slice.
- Read `joins.slice_to_epic` and `entities.design` in `data/index.json`, then count the slices whose plan slug names a design and whose epic head names no epic. The index of 2026-11-21 holds none, so no `No epic` head shows in this window.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/epicBoard.test.ts src/shell/board/EpicBoard.test.tsx`. The fixture pins two unjoined slices in two states. It gives one `No epic` head in each of those columns. The line holds the count, and the card expands in place.

**Scoring:**
- 1.0 — the fixture gives the two heads, the line with its count, and the in-place card, and the live board holds no false line.
- 0.5 — the line shows and the head or the in-place card is missing, or the count is wrong.
- 0.0 — the totals drop an unjoined slice, or no `No epic` head can appear.

### C5 — The band names the program, scopes the counts to it, and All programs returns

**Must be true:** The band holds the `h1` "Kanban board" and an `h2` with the program name. It holds the back link "← All programs". It holds two count pairs scoped to the board, for epics and slices. A press on the back link writes `#/board` with the search kept. Focus moves to the `h1`, and the board region scrolls to 0 (epic-E1-design.md "The counts", interaction-design.md 5.3, 6.4).

**Evidence to check:**
- On `#/board?program=beads-storage`, read the `dl`. It reads "8 of 8 epics" and "38 of 38 slices". The slice pair counts an unjoined slice when one exists.
- Press "← All programs". The address reads `#/board`, focus sits on the `h1`, and the board region is at scroll position 0.
- On `#/board?program=kanban-board`, read the pair. It reads "0 of 0 epics" and "0 of 0 slices", with three empty columns.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/EpicBoard.test.tsx`.

**Scoring:**
- 1.0 — the band names the program, both pairs match the index for that program, and the back link returns to the program board.
- 0.5 — the band names the program and a pair reads an index-wide count, or focus does not move.
- 0.0 — the band holds no program name, or no back link exists.

### C6 — An epic card head opens the page of that epic, and the pips row does not

**Must be true:** A press on an epic card head writes `#/<program>/build/epics/<epic>`. The pips row is a separate control. A press on it shows the epic's slice list. The address stays as it was (contracts.md "The targets of a card", interaction-design.md 5.6, 11.2).

**Evidence to check:**
- On `#/board?program=beads-storage`, press the head of the E1 card. The address reads `#/beads-storage/build/epics/E1`.
- Press the back button. Press the pips row of the same card. The slice list opens, `aria-expanded` reads true, and the address stays `#/board?program=beads-storage`.
- Read the pips row's accessible name. It reads "Show the <n> slices of <label>", where n is the slice count of that epic. It reads "Hide …" when open. The E1 card of beads-storage holds 5 slices on 2026-11-21.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/EpicBoard.test.tsx`.

**Scoring:**
- 1.0 — the head opens the epic page, the pips row opens the list in place, and the address shows the difference.
- 0.5 — the head opens the page and the pips row also navigates, or the list does not open.
- 0.0 — an epic card holds no target.

### C7 — The new files stay inside the habit-smell limits

**Must be true:** Each new file is about 200 lines or fewer. Each new function is about 50 lines or fewer, with a complexity of 10 or less.

**Evidence to check:**
- Run `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run plugins/implement/scripts/habit_coach.py --check`. It exits 0, which proves the coach runs.
- Read the coach findings for `shell/board/epicBoard.ts`, `shell/board/epicCard.tsx`, `shell/board/commandRow.tsx`, `shell/board/orphanCard.tsx`, and the modified board files.
- Run `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run shared/habit_smells.py --repo . --branch origin/master`, then read the three size groups for those files.

**Scoring:**
- 1.0 — no finding names a new file or a new function of this slice.
- 0.5 — one unit is over a limit, and the slice record gives its reason.
- 0.0 — two or more units are over the limits, or the coach cannot run.

## Regression check
- The manifest command passes: `cd plugins/artifact/viewer && npx vitest run && cd ../../.. && uv run pytest tests -q`.
- `cd plugins/artifact/viewer && npx tsc --noEmit` passes.
- `cd plugins/artifact/viewer && npm run build` passes, and `uv run pytest tests/test_viewer_build.py -q` passes.
- `cd plugins/artifact/viewer && npx vitest run src/data/bundle.test.tsx` passes. No board file resolves a join.
- The index build keeps its old keys. `uv run pytest tests -q` passes, and `uv run pytest tests/test_build_index.py -q` passes when that file exists.
- Files outside the slice scope stay unchanged: the tracker, `tracker.py`, the bundle migration, the Work drawer, and every path outside `plugins/artifact/viewer/src/`, `shared/build_index.py`, and `plugins/artifact/viewer/index.html`.

## Out of scope — do not penalise
- The fifth route segment, the marked slice row, and the scroll to that row. Slice 3 owns them.
- Find, Order, and the Hide button on an epic board column. Slice 4 owns them.
- The No program card and the orphan board. Slice 5 owns them.
- The build time in the band, and an index without it. Slice 6 owns them.
- The copy icon, the "Slices done" mark, and the notices. Slice 7 owns them.
- A status word on a slice card, and a slice card that shows a score. The Done column uses the compact card.
- A tracker write of the epic title. No path in this epic writes a title back to the tracker.
