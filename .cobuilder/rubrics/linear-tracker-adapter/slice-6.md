# Rubric: Slice 6 — Next-ready follows the slice and epic order

Feature: `linear-tracker-adapter`
Epic: E3 — Ready and claim
Slice goal: The ready cases of the shared contract suite pass on `linear`, and ready checks the open blockers of the parent epic.
Test command: `uv run pytest tests -q`

## Criteria

### C1 — The ready, pull request, and sync contract cases pass [CRITICAL]

**Must be true:** The ready, deferred-epic, pull request, and `sync` cases pass on `linear`. An epic with a future defer date holds its slices. The `LINEAR_PENDING` entries for slice 6 are deleted.

**Evidence to check:**
- Run `uv run pytest tests/test_tracker_contract.py tests/test_tracker_contract_writes.py -q` and read the `linear` ids for `next_ready`, pull request, and `sync` cases.
- Read `LINEAR_PENDING` and check that no entry names slice 6.

**Scoring:**
- 1.0 — all ready cases pass for `linear`
- 0.5 — one case is skipped
- 0.0 — a ready case fails

### C2 — The epic order holds [CRITICAL]

**Must be true:** The first slice of epic 2 is not ready while epic 1 is open. A slice whose own blocker is open is not ready.

**Evidence to check:**
- Run `uv run pytest tests/test_tracker_linear_ready.py -q`.
- Read the test with two epics.

**Scoring:**
- 1.0 — both cases pass
- 0.5 — only the slice blocker case
- 0.0 — the first slice of epic 2 is ready

### C3 — Pull requests and unplanned issues are never ready

**Must be true:** `next_ready` never returns a record of kind `pr` or the state `unplanned`.

**Evidence to check:**
- Run the exclusion test.
- Read the kinds in the result.

**Scoring:**
- 1.0 — both are excluded in a test that holds both
- 0.5 — only one is tested
- 0.0 — either is returned

## Regression check

- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged. Protected scope: slices 1 to 5 tests.

## Out of scope — do not penalise

- the claim rule and release.
