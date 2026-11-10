# Rubric: Slice 8 — A change by a person shows at the next sync

Feature: `linear-tracker-adapter`
Epic: E4 — Two authors
Slice goal: A rename, reorder, or re-parent in `FakeLinear` shows in `plan_changes` and posts one comment, and a CoBuilder write raises none.
Test command: `uv run pytest tests -q`

## Criteria

### C1 — A change by a person shows [CRITICAL]

**Must be true:** A rename, a reorder, and a re-parent each show in `plan_changes` with the field, old value, and new value. `sync` posts one comment on each changed issue and refreshes the seen values.

**Evidence to check:**
- Run `uv run pytest tests/test_tracker_linear_sync.py -q`.
- Read the three change tests and the comment count.

**Scoring:**
- 1.0 — all three changes and the comment pass
- 0.5 — two of three
- 0.0 — a human change is not reported

### C2 — A CoBuilder write raises no change [CRITICAL]

**Must be true:** A claim and a state change by CoBuilder raise no entry. A repeated `sync` with no change returns an empty list.

**Evidence to check:**
- Run the no-change tests.
- Read the sequence: write, then `sync`.

**Scoring:**
- 1.0 — both pass
- 0.5 — the claim case only
- 0.0 — a CoBuilder write appears in `plan_changes`

### C3 — The CLI prints plan_changes only when set

**Must be true:** `tracker.py sync` prints `plan_changes` when the adapter sets it. For beads the output is unchanged.

**Evidence to check:**
- Run the CLI test and `uv run pytest tests/test_tracker_cli.py -q`.

**Scoring:**
- 1.0 — linear prints it and beads output is byte equal
- 0.5 — linear prints it and beads is untested
- 0.0 — beads output changed

## Regression check

- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged. Protected scope: slices 1 to 7 tests and the beads tests.

## Out of scope — do not penalise

- the seed and the unplanned skip in shared code.
