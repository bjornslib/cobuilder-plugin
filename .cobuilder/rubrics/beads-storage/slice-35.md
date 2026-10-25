Kind: test-suite

# Rubric: Slice 35 — E8 epic and slice status on the board

Feature: beads-storage
Epic: beads-storage/E8
Slice goal: The epic status words in `joins.epic_status` follow the table of the E8 design, and the Work board counts epics by the word `completed`. The GREEN work adds the tests itself, since the RED stage is skipped.
Test command: `uv run pytest tests/test_epic_status_words.py tests/test_epic_state_in_tracker.py tests/test_build_index.py -q` and `cd plugins/artifact/viewer && npm run test`

The new test file is `tests/test_epic_status_words.py`. Read the status word table in `epic-E8-design.md` for the expected words.

## Criteria

### C1 — The status words follow the table [CRITICAL]

**Must be true:** `apply_epic_lifecycle` takes the resolved design stage as a second input. A build over a fixture with one design at each stage gives the word of the table for each epic. A closed epic reads `completed` for every stage. `projector.slice_entities` gives `in_progress` for a slice whose lifecycle is `in_progress`.

**Evidence to check:** Read the fixture and the test. Check each stage row against the table. Run the Python tests.

**Scoring:**
- 1.0: every row of the table has an assertion and the tests pass.
- 0.5: all rows are tested, but the slice `in_progress` case is not.
- 0.0: a word differs from the table.

### C2 — The viewer counts `completed` epics only [CRITICAL]

**Must be true:** In the viewer, `EpicState` gains `superseded`. `DONE_STATES` holds `completed` only, so it no longer holds `merged`. `DesignRow.done` counts the epics whose word is `completed`. The detail pane and the deck row show the same count. The card says "closed", as in "3 of 5 epics closed".

**Evidence to check:** Read `types.ts`, `bundle.ts`, `WorkDrawer.tsx`. Run `npm run test` in `plugins/artifact/viewer`. Open the Work board in the viewer and read one card.

**Scoring:**
- 1.0: the tests pass, the count agrees in both places, and the card text uses "closed".
- 0.5: the count is right, but the card text still says "done".
- 0.0: `merged` still counts as done.

### C3 — The board never says merged for a join number

**Must be true:** The drawer text does not say `merged` for a pull request number from the join. The green merge icon is gone from the deck row.

**Evidence to check:** Grep the drawer source for the word `merged`. Read the deck row.

**Scoring:**
- 1.0: no such text or icon remains.
- 0.0: it remains.

## Regression check

- `cd plugins/artifact/viewer && npm run build` writes the new `index.html`, and `uv run pytest tests/test_viewer_build.py -q` passes.
- `uv run pytest tests/test_epic_state_in_tracker.py -q` passes.

## Out of scope — do not penalise

- The next ready slice and the pull request chips. Slice 36 owns them.
