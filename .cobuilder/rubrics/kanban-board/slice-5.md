# Rubric: Slice 5 — The No program card opens the slices that belong to no program

Feature: kanban-board
Epic: kanban-board/E1
Slice goal: The program board shows one No program card while such slices exist. It opens `#/board?orphans=1` with those slices by status, and a slice card there opens in place. The card is absent when no such slice exists, and it never counts as a program.
Test command: `cd plugins/artifact/viewer && npx vitest run && cd ../../.. && uv run pytest tests -q`
Slice tests: `src/shell/board/orphanBoard.test.ts`, `src/shell/board/NoProgram.test.tsx`

Worktree: `/Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board`

## Browser setup

Run these two commands from a shell, in this order. Then open the page.

1. `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && cd plugins/artifact/viewer && npm run build`
2. `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run shared/migrate_bundle.py --bundle-dir /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board/.cobuilder-architect/self`

Page: `http://127.0.0.1:62583/active/viewer/index.html`. Set the window to 1280 by 800. Use the browser tools to read the accessibility tree and the screenshot. The readings below quote the record index of 2026-11-21. On that index 65 slices name a plan that no design holds, in 6 plans: 12 planned, 1 in progress, and 52 completed.

## Criteria

### C1 — The program board shows one No program card while orphan slices exist [CRITICAL]

**Must be true:** The index holds a slice whose plan slug names no program. The program board then shows one full width card between the command row and the columns. The card reads "No program" and states two counts: the orphan slice count and the plan count. The card sits outside the five columns (interaction-design.md 6.3, ui-spec.jsonc NoProgramCard).

**Evidence to check:**
- Run the Browser setup, then open `#/board` at 1280 by 800. Read the card. The name reads "No program", and one number equals the orphan slice count and one equals the plan count.
- Compare the two numbers with `entities.slice`, `entities.design`, and `joins.slice_to_epic` in `data/index.json`. On 2026-11-21 they read 65 slices and 6 plans.
- Read the screenshot. The card is 44 px tall, full width, and sits above the column heads.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/NoProgram.test.tsx`.

**Scoring:**
- 1.0 — one card shows, both counts match the index, and the card sits outside the columns.
- 0.5 — the card shows and one count is wrong, or the card sits inside a column.
- 0.0 — no card shows while orphan slices exist, or two cards show.

### C2 — The card opens the No program board, and it groups the orphan slices by plan slug [CRITICAL]

**Must be true:** A press on the card writes `#/board?orphans=1`. The board holds three status columns under a band whose subject reads "No program", with the back link at the left. The slices group under a head that names the plan slug and the count of that plan's matching slices. Each slice sits in the column of its own state (interaction-design.md 5.9, 6.3, contracts.md "The address of the board").

**Evidence to check:**
- Press the card. Read the address. It reads `#/board?orphans=1`. Read the subject. An `h2` reads "No program".
- Read the three heads and their counts. On 2026-11-21 they read Planned 12, In progress 1, Done 52.
- Read the group heads. They name the plan slugs and their counts: priority-dev-spike 31, structure-coaching 19, level-page-restructure 5, priority-ask-question 4, coach-reaches-green 3, describe-boundaries 3.
- Read the counts block. It holds the Slices pair only, and it reads 65 of 65.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/orphanBoard.test.ts`.

**Scoring:**
- 1.0 — the address, the subject, the three column counts, the six group heads, and the Slices pair all match the index.
- 0.5 — the board opens and one count or one group head is wrong, or the subject is missing.
- 0.0 — the card opens no board, or the slices are not grouped by plan.

### C3 — A slice card there expands in place and shows its end state, its score, and its attempts [CRITICAL]

**Must be true:** No page exists for a slice with no program, so the card is a button that expands in place. The panel shows "Ends with", "Score", "Attempts", and the raw state. A slice with no score reads "Not scored". One card opens at a time (interaction-design.md 5.9, 3.2, 6.3, ui-spec.jsonc OrphanSliceCard).

**Evidence to check:**
- On `#/board?orphans=1`, press a card in Done. Read the panel. It holds the three facts and the raw word `completed`.
- Read the address. It still reads `#/board?orphans=1`, and no new entry appears in the history.
- Compare the score and the attempts with `entities.slice` for that slice id.
- Press a second card. The first closes and the second opens. Press the second again. It closes.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/NoProgram.test.tsx`.

**Scoring:**
- 1.0 — the card expands in place with the three facts, the address does not change, and one card opens at a time.
- 0.5 — the panel shows and one fact is missing, or more than one card opens.
- 0.0 — the card navigates, or the panel shows no fact.

### C4 — The card never counts as a program, and it is absent when the index holds no orphan slice

**Must be true:** The No program card is not a program. The Programs pair keeps the design count as its total, and the card sits outside the five columns. When the index holds no orphan slice the card is absent (interaction-design.md 3.3, contracts.md "Data models", `orphans`).

**Evidence to check:**
- On `#/board`, read the Programs pair while the card shows. Its total equals `entities.design`, namely 27 on 2026-11-21.
- Read the five column counts. Together they equal the Programs shown count. The No program row adds nothing to either number.
- Read the absent case from the test. `NoProgram.test.tsx` renders an index with no orphan slice and expects no card and no rail.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/NoProgram.test.tsx`.

**Scoring:**
- 1.0 — the Programs total equals the design count, the columns sum to the shown count, and the absent case passes.
- 0.5 — the card shows and the Programs total counts it, or the absent case fails.
- 0.0 — the card draws as a sixth column, or it shows when no orphan slice exists.

### C5 — The program key wins over the orphan key, and the back link returns to the program board

**Must be true:** When an address holds both `program` and `orphans=1`, the program key wins and the epic board shows. The back link on the No program board writes `#/board`. The card is still there (contracts.md "The address of the board", interaction-design.md 5.9).

**Evidence to check:**
- Open `#/board?orphans=1&program=beads-storage`. The epic board of beads-storage shows, and no orphan group head shows.
- Open `#/board?orphans=1` and press "← All programs". The address reads `#/board`, and the No program card shows.

**Scoring:**
- 1.0 — the program key wins, and the back link returns to the program board with its card.
- 0.5 — the program key wins, and the back link drops the card or the board.
- 0.0 — the orphan board wins, or no back link exists.

### C6 — The new files stay inside the habit-smell limits

**Must be true:** Each new file is about 200 lines or fewer. Each new function is about 50 lines or fewer, with a complexity of 10 or less.

**Evidence to check:**
- Run `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run plugins/implement/scripts/habit_coach.py --check`. It exits 0, which proves the coach runs.
- Read the coach findings for `shell/board/orphanBoard.ts`, `shell/board/noProgramCard.tsx`, and the modified `shell/board/shape.ts` and `model.ts`.
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
- The slice 1 and slice 2 board tests still pass: `cd plugins/artifact/viewer && npx vitest run src/shell/board/programBoard.test.ts src/shell/board/epicBoard.test.ts src/shell/board/EpicBoard.test.tsx`.
- Files outside the slice scope stay unchanged: `shared/`, the tracker, the bundle migration, and every path outside `plugins/artifact/viewer/src/` and `plugins/artifact/viewer/index.html`. This slice reuses the in-place card of slice 2. It does not rewrite it.

## Out of scope — do not penalise
- Find on the orphan board, and the Order control. The orphan board has no Order and no Cards switch. Slice 4 owns the search.
- The build time in the band, and an index without it. Slice 6 owns them.
- The copy icon and the notices. Slice 7 owns them.
- A page for an orphan slice. No page exists, so the card opens in place.
- A tracker write, or a repair of the epic header that the join cannot resolve. The drawer's Unresolved panel still reports it.
- A change to the Work drawer's Unresolved panel or its counts.
