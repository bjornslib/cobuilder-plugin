# Rubric: Slice 6 — The board header shows the build time of the index

Feature: kanban-board
Epic: kanban-board/E1
Slice goal: `build_index.py` writes a top-level `built_at` that the stale check and the projector ignore. The board header shows that time. An index without `built_at` or epic titles still loads, and the board then shows no time and the epic id.
Test command: `cd plugins/artifact/viewer && npx vitest run && cd ../../.. && uv run pytest tests -q`
Slice tests: `tests/test_build_index_built_at.py`, `src/shell/board/LegacyIndex.test.tsx`

Worktree: `/Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board`

## Browser setup

Run these three commands from a shell, in this order. Then open the page. The second command is new in this slice, because `shared/build_index.py` now writes `built_at`.

1. `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && cd plugins/artifact/viewer && npm run build`
2. `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run shared/build_index.py`
3. `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run shared/migrate_bundle.py --bundle-dir /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board/.cobuilder-architect/self`

Page: `http://127.0.0.1:62583/active/viewer/index.html`. Set the window to 1280 by 800. The served data file is `.cobuilder-architect/self/data/index.json`, and `active` links to `self`. The readings below quote the record index of 2026-11-21. That index holds no `built_at` and no epic `title` yet, so this slice writes both.

## Criteria

### C1 — The index holds built_at at the top level, and the stale check ignores it [CRITICAL]

**Must be true:** `shared/build_index.py` writes `built_at` as an ISO 8601 time in UTC with second precision, ending in `Z`. The key sits at the top level, outside `sources`. The stale check compares `sources` only, so the key does not mark the index stale. The projector does not write it (contracts.md "The record index", epic-E1-design.md "The two index fields").

**Evidence to check:**
- Run `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run shared/build_index.py`.
- Read the key with `jq '{built_at, sources_keys: (.sources | keys)}' .cobuilder-architect/self/data/index.json`. `built_at` matches `^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$`, and `sources_keys` holds no `built_at`.
- Read `schema_version`. It still reads the value the index held before this slice.
- Run the build a second time with no change to the repo. The `sources` block is identical, and `built_at` is later or equal.
- Run `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run pytest tests/test_build_index_built_at.py tests/test_build_index.py -q`.

**Scoring:**
- 1.0 — the key holds the UTC shape at the top level. `sources` holds no such key. A second build keeps `sources` and moves the time, and both tests pass.
- 0.5 — the key holds the shape and sits inside `sources`, or the stale check reports a change from it.
- 0.0 — no key exists, the shape is wrong, or a Python test fails.

### C2 — The band shows the build time in a time element that carries the index value [CRITICAL]

**Must be true:** The band shows the build time in the reader's own time zone, in the form "Index built 21 Nov 2026, 09:41". The element is `time`, and its `dateTime` attribute is the exact `built_at` string. The time sits with the counts and never scrolls (interaction-design.md 6.4, ui-spec.jsonc BuildTime).

**Evidence to check:**
- Run the Browser setup, then open `#/board` at 1280 by 800.
- Read the accessibility tree. One `time` element exists, and its `dateTime` attribute equals the `built_at` value in `data/index.json`.
- Read the visible text. It equals that time in the time zone of the browser.
- Read the screenshot. The time sits in the band's right block, under or beside the counts.
- Scroll a column body. The band stays still.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/LegacyIndex.test.tsx`.

**Scoring:**
- 1.0 — one `time` element carries the exact index value, the text matches the reader's zone, and the band stays still.
- 0.5 — the time shows and the element is not `time`, or `dateTime` holds another form.
- 0.0 — the band shows no time while the index holds one.

### C3 — An index without built_at reads the absent sentence, and an epic without a title shows its epic id

**Must be true:** An index without `built_at` reads "No build time in this index" in the place and the type of the time. An epic without a title shows its `epic_id` in place of the title. Nothing reads "undefined" and no empty gap appears (interaction-design.md 3.1, 7.3).

**Evidence to check:**
- Copy the served data file: `cp .cobuilder-architect/self/data/index.json .cobuilder-architect/self/data/index.json.bak`.
- Remove the key and the titles in that copy: `jq 'del(.built_at) | .entities.epic |= map(.title = null)' .cobuilder-architect/self/data/index.json.bak > .cobuilder-architect/self/data/index.json`.
- Reload `#/board`. Read the band. It reads "No build time in this index". Open `#/board?program=beads-storage`. Read the card labels. They read E1 to E8.
- Search the page text for "undefined". It does not appear.
- Restore the file: `mv .cobuilder-architect/self/data/index.json.bak .cobuilder-architect/self/data/index.json`. Reload. The time returns.
- Run `cd plugins/artifact/viewer && npx vitest run src/shell/board/LegacyIndex.test.tsx`.

**Scoring:**
- 1.0 — both absent readings show, no cell reads "undefined", and the restore brings the time back.
- 0.5 — one absent reading shows and the other fails, or a cell reads "undefined".
- 0.0 — the board fails to draw on an index without the two fields.

### C4 — An older index still loads, and every board reading still holds

**Must be true:** A reader treats both fields as optional, so an index without them draws the full board. The program board keeps five stage columns. The epic board keeps three status columns, and the Work drawer still opens (contracts.md "The record index", interaction-design.md 7.3, 7.8).

**Evidence to check:**
- With the stripped index of C3 in place, read `#/board` at 1280 by 800. Five column heads draw, the Superseded rail holds its count, and the cards hold their counts and footers.
- Open `#/board?program=beads-storage`. Three status columns draw with the epic counts of that program.
- Open the Work drawer with the top bar's Work board button. It opens, and Escape closes it.
- Restore the file. Reload. The readings equal the readings before this slice.

**Scoring:**
- 1.0 — every board draws on the older index, and the drawer still opens.
- 0.5 — one board draws and a count or a column is missing.
- 0.0 — the board fails to draw, or the drawer breaks.

### C5 — The new files stay inside the habit-smell limits

**Must be true:** Each new file is about 200 lines or fewer. Each new function is about 50 lines or fewer, with a complexity of 10 or less.

**Evidence to check:**
- Run `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run plugins/implement/scripts/habit_coach.py --check`. It exits 0, which proves the coach runs.
- Read the coach findings for the modified `shell/board/headingBand.tsx`, `shell/board/model.ts`, and `shell/board/shape.ts`.
- Run `cd /Users/theb/Documents/Windsurf/cobuilder-plugin/.claude/worktrees/kanban-board && uv run shared/habit_smells.py --repo . --branch origin/master`, then read the three size groups for those files. Also read `shared/build_index.py` for any function that grew past 50 lines.

**Scoring:**
- 1.0 — no finding names a file or a function that this slice touched.
- 0.5 — one unit is over a limit, and the slice record gives its reason.
- 0.0 — two or more units are over the limits, or the coach cannot run.

## Regression check
- The manifest command passes: `cd plugins/artifact/viewer && npx vitest run && cd ../../.. && uv run pytest tests -q`.
- `cd plugins/artifact/viewer && npx tsc --noEmit` passes.
- `cd plugins/artifact/viewer && npm run build` passes, and `uv run pytest tests/test_viewer_build.py -q` passes.
- `cd plugins/artifact/viewer && npx vitest run src/data/bundle.test.tsx` passes.
- The index tests pass: `uv run pytest tests/test_build_index.py tests/test_prose_budget.py -q`.
- The validator restores the served data file after the absent case. It holds `built_at` when the validator finishes.
- Files outside the slice scope stay unchanged: the tracker, `tracker.py`, the bundle migration, the board controls, and every path outside `plugins/artifact/viewer/src/`, `shared/build_index.py`, and `plugins/artifact/viewer/index.html`.

## Out of scope — do not penalise
- Any board control: Find, Order, the Cards switch, the Hide button, and the copy icon. Slices 4 and 7 own them.
- The fifth route segment and the marked slice row. Slice 3 owns them.
- The No program card and the orphan board. Slice 5 owns them.
- A time on any surface other than the board's band.
- A rebuild of the self bundle that this epic does not run. The served copy refreshes at the next bundle rebuild.
- A tracker read that adds a title the tracker does not hold. A missing record gives `null`.
