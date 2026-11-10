# Rubric: Slice 2 — A close counts only with proof, and archived issues stay in the read

Feature: `linear-tracker-adapter`
Epic: E1 — The adapter reads the plan
Slice goal: A close without proof reads as open, a canceled slice needs the outcome skipped, an archived closed slice stays in the read, and an unplanned issue lists but is never ready.
Test command: `uv run pytest tests -q`

## Criteria

### C1 — A completed slice with no passing score reads as open [CRITICAL]

**Must be true:** A slice in a completed state with no score, or a score below 0.90, reads as `open`. A slice with a score of 0.90 or more reads as `closed`. The next slice stays blocked while the first reads as open.

**Evidence to check:**
- Run `uv run pytest tests/test_tracker_linear_read.py -q` and read the names of the closed-rule tests.
- In the test, check the score values used: none, 0.89, 0.90, and 0.92.

**Scoring:**
- 1.0 — all four score cases pass and the next slice stays blocked
- 0.5 — the none case passes and the 0.89 boundary is untested
- 0.0 — a dragged slice reads as closed with no score

### C2 — A canceled slice and an epic follow the proof rule [CRITICAL]

**Must be true:** A canceled slice reads as closed only with the outcome `skipped`. An epic reads as closed only when all its slices read as closed.

**Evidence to check:**
- Run the tests for the canceled slice and the epic.
- Read `closed_with_proof` and the epic rule in `linear_rows.py`.

**Scoring:**
- 1.0 — both rules pass in a test with an open slice under a completed epic
- 0.5 — only the slice rule is tested
- 0.0 — a canceled slice with no outcome reads as closed

### C3 — Archived issues stay in the read, and unplanned issues are never ready

**Must be true:** A full read passes `include_archived` true. An archived closed slice appears in the list and counts as a closed blocker. An issue with no envelope lists with the state `unplanned` and is never in `next_ready`.

**Evidence to check:**
- Run the archive test and the unplanned test.
- Read the call to `api.issues` in `linear.py` and check the argument.

**Scoring:**
- 1.0 — all three behaviors pass
- 0.5 — the archive case passes and the unplanned case is missing
- 0.0 — an archived slice drops out of the read

## Regression check

- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged. Protected scope: slice 1 tests and the beads tests.

## Out of scope — do not penalise

- the request count, the rate limit, `prepare`, and every write.
