# Rubric: Slice 4 — A slice result shows in Linear

Feature: `linear-tracker-adapter`
Epic: E2 — The adapter writes progress
Slice goal: The slice writes change `FakeLinear`: the workflow state, the score and attempts in the title, a comment per attempt, and an envelope that round-trips.
Test command: `uv run pytest tests -q`

## Criteria

### C1 — The slice writes move the Linear state [CRITICAL]

**Must be true:** `set_slice_state` moves the issue through the `states` map. A skipped slice goes to the canceled state with the outcome in the envelope. A renamed state of the same type still maps.

**Evidence to check:**
- Run `uv run pytest tests/test_tracker_linear_writes.py -q`.
- Read the state map test with a renamed state.

**Scoring:**
- 1.0 — state moves, skip, and rename all pass
- 0.5 — the rename case is missing
- 0.0 — a state write does not reach `FakeLinear`

### C2 — The envelope round-trips [CRITICAL]

**Must be true:** An envelope with a string, a number, a path, and a list of paths comes back equal in a value-level compare.

**Evidence to check:**
- Run the round-trip test.
- Read the test and check that it compares each value, not only the key set.

**Scoring:**
- 1.0 — all four value kinds compare equal
- 0.5 — the list of paths is missing
- 0.0 — any value differs

### C3 — The title and comments show progress

**Must be true:** The attachment title shows the state word, score, and attempts. `record_attempt` and `add_note` each post one comment.

**Evidence to check:**
- Run the title and comment tests.
- Read the title string in the test.

**Scoring:**
- 1.0 — title and both comments pass
- 0.5 — the title only
- 0.0 — no comment is posted

## Regression check

- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged. Protected scope: slices 1 to 3 tests.

## Out of scope — do not penalise

- program, epic, and pull request writes, the claim, and `sync`.
