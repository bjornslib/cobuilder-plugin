# Rubric: Slice 5 — Program, epic, and pull request state show in Linear

Feature: `linear-tracker-adapter`
Epic: E2 — The adapter writes progress
Slice goal: The write cases of the shared contract suite pass on `linear`, the program issue shows gate dates and stage, an epic keeps its branch, and a pull request is a linked issue that never blocks.
Test command: `uv run pytest tests -q`

## Criteria

### C1 — The program, epic, and gate contract cases pass [CRITICAL]

**Must be true:** The program stage, epic state, and gate value cases pass on `linear`. This includes the cases of `tests/test_tracker_program_state.py` and `tests/test_tracker_program_stage_status.py`. The `LINEAR_PENDING` entries for slice 5 are deleted.

**Evidence to check:**
- Run `uv run pytest tests/test_tracker_contract_writes.py tests/test_tracker_program_state.py tests/test_tracker_program_stage_status.py -q` and read the `linear` ids.
- Read `LINEAR_PENDING` and check that no entry names slice 4 or 5.

**Scoring:**
- 1.0 — all write cases pass for `linear`
- 0.5 — a case is skipped for `linear`
- 0.0 — a write case fails

### C2 — The program and epic show their state

**Must be true:** The program title shows the gate dates and the stage. `set_epic_state` with a branch keeps the branch. The program lifecycle follows its epics.

**Evidence to check:**
- Run the program and epic tests.
- Read the title string for a program with two gates set.

**Scoring:**
- 1.0 — title, branch, and lifecycle pass
- 0.5 — title only
- 0.0 — the stage does not reach the title

### C3 — A pull request is a linked issue that never blocks [CRITICAL]

**Must be true:** `open_pull_request` creates an issue with a `related` relation to each epic and no `blocks` relation. A merge moves it to completed. `next_ready` never returns it.

**Evidence to check:**
- Run the pull request tests.
- Read the relation kinds in `FakeLinear` after the call.

**Scoring:**
- 1.0 — relations, merge, and ready exclusion pass
- 0.5 — relations pass and merge is missing
- 0.0 — a pull request blocks an epic

## Regression check

- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged. Protected scope: slices 1 to 4 tests.

## Out of scope — do not penalise

- the claim, the ready rule, `sync`, and the seed.
