# Rubric: Review change 1 — the board uses the full width, and travel between surfaces moves

Feature: kanban-board
Epic: kanban-board/E1
Change goal: the engineer reviewed the board on 2026-11-23 and asked for two changes. First, a Kanban board route shows no left rail, and the board uses the full page width. Second, a move between the board levels and the work-item pages animates in the direction of travel. The engineer chose the "slide and fade" option, and also asked for the motion between the program board and an epic board.
Test command: `cd plugins/artifact/viewer && npx vitest run && cd ../../.. && uv run pytest tests -q`
Change tests: `src/shell/app/travel.test.ts`, `src/shell/board/BoardRail.test.tsx`

Worktree: `/Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board`
Base commit: `6cd94eb3`

## Browser setup

The orchestrator rebuilt the viewer and migrated the bundle. Page: `http://127.0.0.1:62583/active/viewer/index.html`. Set the window to 1280 by 800.

## Criteria

### C1 — No rail on a board route, and the board uses the full width [CRITICAL]

**Must be true:** On `#/board`, `#/board?program=beads-storage`, and `#/board?orphans=1`, the page shows no left rail and no rail trigger, also on the first load. The board region starts at the left edge of the body row and spans its full width. On a work-item route, for example `#/beads-storage/intent`, the rail shows as before.

**Evidence to check:**
- Load each board address in a fresh tab. Read the bounding box of the board region: its left edge is 0 (or within the page padding of the pane), and its width equals the viewport width less any scrollbar.
- Query the rail navigation landmark and the rail trigger. Neither exists on a board route.
- Load `#/beads-storage/intent`. The rail exists and the pane starts to its right.
- At 600 px width, a board route shows no rail trigger in the top bar.

**Scoring:**
- 1.0 — every board address shows no rail and no trigger, the board spans the full width, and a work-item route keeps its rail.
- 0.5 — the rail is gone but an empty gap or a dead trigger remains, or one board address still shows the rail.
- 0.0 — the rail still shows on `#/board`, or a work-item route lost its rail.

### C2 — Travel from the board to a page slides in from the right [CRITICAL]

**Must be true:** A move to a deeper surface (program board to epic board or No program board, epic board to an epic page or a slice address) brings the new surface in from about 32 px to the right with a fade, over about 220 ms, with easing `cubic-bezier(0.22, 0.75, 0.3, 1)`. The old surface leaves to the left with a fade. A move to a shallower surface mirrors it. A move between two surfaces of the same depth keeps the old behaviour.

**Evidence to check:**
- Read `travelOf` in `src/shell/app/travel.ts` and the table in `travel.test.ts`. Each pair in C2's list maps to the stated direction.
- In the browser, click a program card on `#/board`. Sample the new surface's `transform` and `opacity` at about 40 ms and at 300 ms (for example with `requestAnimationFrame` sampling or `getAnimations()`). Early: a positive x offset and opacity below 1. Late: no offset and opacity 1.
- Press "All programs". The program board enters with a negative x offset.
- Click a slice row link on an epic board. The epic page enters from the right, and the marked slice row is still in view after the motion ends.

**Scoring:**
- 1.0 — the direction, the offset, the fade, and the timing match in both directions, and the marked slice row ends in view.
- 0.5 — motion runs, but one direction is wrong, or it runs between same-depth surfaces, or the marked row ends out of view.
- 0.0 — no motion on travel from the board, or a test fails.

### C3 — Reduced motion turns the travel motion off

**Must be true:** With `prefers-reduced-motion: reduce`, or the shell's own reduce flag, the new surface shows at once, with no offset and no fade.

**Evidence to check:**
- Emulate `prefers-reduced-motion: reduce` (Puppeteer `page.emulateMediaFeatures`), reload, click a program card, and sample at about 40 ms: no transform offset, and opacity 1.

**Scoring:**
- 1.0 — no motion under reduced motion.
- 0.0 — motion still runs.

### C4 — No regression

**Must be true:** Every earlier board behaviour still works: Find, Order, Hide, the copy icon, the slice deep link, the Work drawer, and the browser back button. The console shows no error.

**Evidence to check:**
- Run the test command. All tests pass.
- In the browser, press Back after each travel in C2. The address and the surface return.
- Open the Work drawer from the top bar on `#/board` and close it.

**Scoring:**
- 1.0 — all pass, and the console shows no error.
- 0.5 — one earlier behaviour breaks in the browser while the tests pass.
- 0.0 — a test fails.

### C5 — Habit-smell limits

**Must be true:** The new and changed files stay inside the habit limits: functions 12 lines or fewer, files 200 lines or fewer, no comments without a Kept row.

**Evidence to check:**
- `uv run pytest tests/test_viewer_habit_clean.py -q` passes.
- `uv run plugins/implement/scripts/habit_coach.py --check` exits 0.

**Scoring:**
- 1.0 — both pass.
- 0.0 — either fails.

## Weights

C1 0.30, C2 0.35, C3 0.10, C4 0.15, C5 0.10. Accept at 0.90. A critical criterion below 1.0 fails the change.
