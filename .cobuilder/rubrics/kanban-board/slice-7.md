# Rubric: Slice 7 — A copy icon gives the start prompt of a program or an epic

Feature: kanban-board
Epic: kanban-board/E1
Slice goal: A click on the copy icon of a card with a next workflow puts the exact prompt from `contracts.md` on the clipboard and shows "Prompt copied". A refused write shows "Copy failed" with the prompt text. An open epic with all slices done shows "Slices done", and a finished record has no icon.
Test command: `cd plugins/artifact/viewer && npx vitest run && cd ../../.. && uv run pytest tests -q`
Slice tests: `src/shell/board/prompt.test.ts`, `src/shell/board/CopyPrompt.test.tsx`

Worktree: `/Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board`

## Browser setup

Run these two commands from a shell, in this order. Then open the page.

1. `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && cd plugins/artifact/viewer && npm run build`
2. `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run shared/migrate_bundle.py --bundle-dir /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board/.cobuilder-architect/self`

Page: `http://127.0.0.1:62583/active/viewer/index.html`. Set the window to 1280 by 800. Use the browser tools to read the accessibility tree and the screenshot. The readings below quote the record index of 2026-11-21. A copy button's accessible name reads "Copy the start prompt for <name>".

## Criteria

### C1 — Each record gets the exact prompt of its row, and a finished record gets no icon [CRITICAL]

**Must be true:** The rule reads the lifecycle and the slice states, never the column, and the first match wins. The closed epic is the first row, so a finished record never offers a prompt. The lines are exact. Each placeholder holds the record's own id, epic id, branch, or pull request number (contracts.md "The start prompt", epic-E1-design.md "The start prompt").

**Evidence to check:**
- On `#/board`, read the copy buttons. The kanban-board card offers `/implement:start kanban-board`, because its stage is `approved`. The cobuilder-viewer card offers `/architect:design cobuilder-viewer`, because its stage is `review`. Press the Superseded rail. The plugin-split card and the maintainable-viewer card hold no copy button.
- Open `#/board?program=beads-storage`. The E6 card offers `/implement:start beads-storage E6`, because it is `unstarted` with no slice. The E1 card holds no copy button, because its lifecycle is closed.
- Open `#/board?program=cobuilder-viewer`. The E2 card offers the merge-check line, and that line names pull request 21 and epic E2.
- Open `#/board?program=review-link`. The E1 card offers `/pr:generate design/review-link/E1`, because its lifecycle is open, its three slices are done, it holds no pull request, and its branch is `design/review-link/E1`.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/prompt.test.ts`.

**Scoring:**
- 1.0 — each card read offers its exact line or no icon, and the closed epic is checked before any prompt row.
- 0.5 — one line holds a wrong placeholder, or a closed record offers a prompt.
- 0.0 — no prompt shows, or the prompt test fails.

### C2 — A copy press writes the prompt and shows Prompt copied without moving focus [CRITICAL]

**Must be true:** A press on the copy icon writes one line to `navigator.clipboard`. The board shows "Prompt copied" in one `role="status"` notice at the board's top right. Focus stays on the copy button, and the notice leaves after 1800 ms (interaction-design.md 5.7, 4.2, 8.2, ui-spec.jsonc CopyNotice).

**Evidence to check:**
- On `#/board`, press the copy icon of the kanban-board card. Read the clipboard with `navigator.clipboard.readText()` in the console, or paste into the Find field.
- Read the accessibility tree. One status region reads "Prompt copied", and the focused element is still the copy button.
- Read the screenshot. The notice sits at the top right of the board.
- Wait 1800 ms. The notice is gone.
- Press the icon twice, with a short pause between. The dwell restarts, and the notice is still there after the second press.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/CopyPrompt.test.tsx`.

**Scoring:**
- 1.0 — the clipboard holds the exact line, the notice shows and leaves after 1800 ms, and focus does not move.
- 0.5 — the clipboard holds the line and the notice is missing, or it stays on screen.
- 0.0 — the press writes nothing, or the copy test fails.

### C3 — A refused write shows Copy failed with the prompt text, and Close or Escape dismisses it

**Must be true:** A refused write shows "Copy failed" with the prompt in a selectable `code` block and a Close button. The notice holds until Close or Escape, because it holds text the reader needs. Focus returns to the copy button that produced the notice (interaction-design.md 3.2, 7.1, 8.4, ui-spec.jsonc CopyNotice).

**Evidence to check:**
- On `#/board`, replace the write with a refusal in the console: `navigator.clipboard.writeText = () => Promise.reject(new Error("blocked"))`.
- Press the copy icon of the kanban-board card. Read the notice. It reads "Copy failed", holds the line `/implement:start kanban-board` in a `code` block, and holds a Close button. The text is selectable.
- Press Escape. The notice is gone, and focus sits on the copy button.
- Repeat the refusal and press Close. The notice is gone, and focus sits on the copy button.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/CopyPrompt.test.tsx`.

**Scoring:**
- 1.0 — the failure notice holds the text, and both Close and Escape dismiss it and restore focus.
- 0.5 — the notice shows the two words and no prompt text.
- 0.0 — a refusal shows a success notice, or the notice cannot be dismissed.

### C4 — An open epic with every slice done shows Slices done

**Must be true:** The "Slices done" mark shows when the lifecycle is open, the epic holds at least one slice, and every slice is done. The mark reads the lifecycle and the slice states, never the column (contracts.md "The start prompt", epic-E1-design.md "The start prompt").

**Evidence to check:**
- On `#/board?program=cobuilder-viewer`, read the E2 card. It carries the "Slices done" mark, and it sits in the In progress column.
- On `#/board?program=beads-storage`, read the E1 card. It carries no mark, because its lifecycle is closed.
- Read `joins.epic_status` and the slice states of E2 and E1 in `data/index.json` to confirm both cases.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/prompt.test.ts`.

**Scoring:**
- 1.0 — the mark shows on an open epic with every slice done, and it is absent on a closed epic.
- 0.5 — the mark shows and one of the two cases reads wrong, for example a closed epic with the mark.
- 0.0 — no mark exists, or a closed epic shows it.

### C5 — The copy press does not navigate, and the icon sits above the card's target

**Must be true:** The copy icon sits above the card's stretched target, so a press copies and opens no page. The address stays as it was. A press on the card body still opens the next level (interaction-design.md 11.2).

**Evidence to check:**
- On `#/board`, read the address, press the copy icon of the kanban-board card, and read the address again. It is unchanged.
- Press the card body inside its padding. The address becomes `#/board?program=kanban-board`.
- Press the browser back button. The board returns.

**Scoring:**
- 1.0 — the icon press leaves the address alone, and the body press still navigates.
- 0.5 — the icon copies and also opens the board, or the body press stops working.
- 0.0 — the two controls cannot be told apart, or the icon opens a page.

### C6 — The new files stay inside the habit-smell limits

**Must be true:** Each new file is about 200 lines or fewer. Each new function is about 50 lines or fewer, with a complexity of 10 or less.

**Evidence to check:**
- Run `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run plugins/implement/scripts/habit_coach.py --check`. It exits 0, which proves the coach runs.
- Read the coach findings for `shell/board/prompt.ts`, `shell/board/notice.tsx`, `shell/board/useCopyPrompt.ts`, and the modified card files.
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
- The earlier board tests still pass: `cd plugins/artifact/viewer && npx vitest run src/shell/board`.
- The clipboard is the only write. No test or run calls `tracker.py`, and no file under `shared/tracker_port/` changes.
- Files outside the slice scope stay unchanged: the tracker, `tracker.py`, the bundle migration, the build time, and every path outside `plugins/artifact/viewer/src/` and `plugins/artifact/viewer/index.html`.

## Out of scope — do not penalise
- Any write to the tracker, or a change to a workflow state. The only write is the clipboard.
- The build time in the band, and an index without it. Slice 6 owns them.
- The No program card and the orphan board. Slice 5 owns them.
- Find, Order, the Cards switch, and the Hide button. Slice 4 owns them.
- A copy icon on a slice card. Contracts give prompts to programs and epics only.
- A prompt for a record whose row already gives no icon. A closed epic, a program at `implemented` or `superseded`, and an epic with all slices done and a null branch all hold no icon.
- A notice for the unknown program. Slice 4 and the address own that notice.
