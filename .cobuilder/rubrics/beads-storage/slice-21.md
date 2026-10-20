Kind: test-suite

# Rubric: Slice 21 — E5 pull request gate on beads

Feature: beads-storage
Epic: beads-storage/E5
Slice goal: `open_pull_request` adds a `gh:pr` gate. `set_pull_request_state(ref, merged)` resolves that gate through `gate_resolve_argv(gate_id)`. The E4 pull request state test passes unchanged.
Test command: `uv run pytest tests/test_tracker_beads_gate.py tests/test_pr_tracker_state.py -q`

The file `tests/test_tracker_beads_gate.py` is created by this slice. The file `tests/test_pr_tracker_state.py` is created by E4 slice 15, so it must exist before this slice starts. The command runs once both files exist.

## Criteria

### C1 — The E4 pull request state test passes unchanged [CRITICAL]

**Must be true:** `tests/test_pr_tracker_state.py` passes. This slice does not edit that file, and it does not weaken any of its assertions.

**Evidence to check:** Run the file. Confirm that this slice's diff does not touch the file.

**Scoring:**
- 1.0: the file passes, and this slice does not change it.
- 0.5: the file passes, but this slice edits an assertion in it.
- 0.0: the file fails, or it was removed.

### C2 — `gh:pr` gate resolves on merge through `gate_resolve_argv` [CRITICAL]

**Must be true:** `open_pull_request` adds a gate with kind `gh:pr`. When `set_pull_request_state(ref, merged=True)` runs, the adapter resolves that gate through `gate_resolve_argv(gate_id)`.

**Evidence to check:** Read the test in `tests/test_tracker_beads_gate.py` for the open and merge path. It must assert the gate kind and the argv that resolves it. The argv must carry the gate id.

**Scoring:**
- 1.0: the test asserts the `gh:pr` kind and the resolve argv, and it passes.
- 0.5: the test asserts the resolve, but not the kind or the argv.
- 0.0: no gate is added, or the merge does not resolve it.

### C3 — A gate with no stored number stays pending

**Must be true:** A pull request gate with no stored number does not resolve on merge. It stays pending.

**Evidence to check:** Read the test that covers a missing number. It must assert the pending state after `set_pull_request_state` runs.

**Scoring:**
- 1.0: the test asserts pending, and it passes.
- 0.5: the test covers the case, but does not check the state.
- 0.0: no test, or the gate resolves with no number.

## Regression check

- `uv run pytest tests/test_pr_tracker_state.py -q` passes unchanged.
- `uv run pytest tests/test_tracker_beads_write.py -q` passes. Its open pull request replay still matches.

## Out of scope — do not penalise

- The claim and the ready query. Those belong to slices 19 and 20.
- The formula. That belongs to slice 22.
- Live `gh` calls. The tests use recorded argv.
