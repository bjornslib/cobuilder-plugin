# Rubric: Slice 9 — The seed keeps the plan of Linear, and shared code skips unplanned issues

Feature: `linear-tracker-adapter`
Epic: E4 — Two authors
Slice goal: A second seed changes nothing, a differing plan field is a conflict, and the projector and the status writer skip unplanned issues.
Test command: `uv run pytest tests -q`

## Criteria

### C1 — The seed is idempotent and never overwrites [CRITICAL]

**Must be true:** A seed over an empty `FakeLinear` creates the issues. A second seed changes nothing. A differing plan field is reported as a conflict and stays as Linear holds it.

**Evidence to check:**
- Run `uv run pytest tests/test_tracker_linear_seed.py -q`.
- Compare the `FakeLinear` state before and after the second seed.

**Scoring:**
- 1.0 — create, repeat, and conflict pass
- 0.5 — the repeat passes and the conflict is missing
- 0.0 — the second seed overwrites a plan field

### C2 — Shared code skips unplanned records [CRITICAL]

**Must be true:** `project()` and `regenerate_status_files` skip a record with the state `unplanned` and raise no error. They rewrite the state lines from Linear records.

**Evidence to check:**
- Run the projector and regenerate tests with an unplanned issue present.
- Read the diff of `projector.py` and `regenerate.py`.

**Scoring:**
- 1.0 — no error and correct state lines
- 0.5 — no error but the state lines are untested
- 0.0 — a KeyError on the missing `n`

### C3 — The beads output is unchanged

**Must be true:** The beads projector and regenerate tests pass, and the golden index is byte equal.

**Evidence to check:**
- Run `uv run pytest tests/test_tracker_projector.py tests/test_tracker_regenerate.py -q`.

**Scoring:**
- 1.0 — all pass with no golden change
- 0.5 — all pass and the golden file changed
- 0.0 — a beads test fails

## Regression check

- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged. Protected scope: slices 1 to 8 tests and the beads tests.

## Out of scope — do not penalise

- the docs, the boundary record, and CLAUDE.md.
