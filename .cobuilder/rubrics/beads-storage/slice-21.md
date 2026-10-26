Kind: test-suite

# Rubric: Slice 21 — E5 pull request gate on beads

Feature: beads-storage
Epic: beads-storage/E5
Slice goal: `open_pull_request` adds a `gh:pr` gate for each blocked epic through `gate_create_argv(epic_bd_id, number)`. It stores the gate ids in the PR record `envelope.gates`. `set_pull_request_state(ref, merged)` resolves each gate through `gate_resolve_argv(gate_id)`. Reads skip the hidden gates. The E4 pull request state test passes unchanged.
Test command: `uv run pytest tests/test_tracker_beads_gate.py tests/test_tracker_beads_gate_real.py tests/test_pr_tracker_state.py -q -m ''`

The real-bd tests in `tests/test_tracker_beads_gate_real.py` carry the pytest mark `slow`. The default run skips them, so the command adds `-m ''` to run them. They skip without `bd`. The file `tests/test_pr_tracker_state.py` is created by E4 slice 15, so it must exist before this slice starts.

## Criteria

### C1 — The E4 pull request state test passes unchanged [CRITICAL]

**Must be true:** `tests/test_pr_tracker_state.py` passes. This slice does not edit that file, and it does not weaken any of its assertions.

**Evidence to check:** Run the file. Confirm that this slice's diff does not touch the file.

**Scoring:**
- 1.0: the file passes, and this slice does not change it.
- 0.5: the file passes, but this slice edits an assertion in it.
- 0.0: the file fails, or it was removed.

### C2 — `gh:pr` gates are created, stored, and resolved on merge [CRITICAL]

**Must be true:** `open_pull_request` keeps the blocker and adds one gate with kind `gh:pr` for each blocked epic, through `gate_create_argv(epic_bd_id, number)`. It stores the gate ids in the PR record `envelope.gates`. When `set_pull_request_state(ref, merged=True)` runs, the adapter resolves each stored gate through `gate_resolve_argv(gate_id)` before it closes the PR.

**Evidence to check:**
- Read `test_gate_argv_builders`, `test_open_pull_request_adds_one_gate_for_each_epic_and_keeps_the_blocker`, `test_open_pull_request_stores_the_gate_ids_in_the_pr_metadata`, and `test_merge_resolves_each_gate_before_it_closes_the_pr` in `tests/test_tracker_beads_gate.py`. They must assert the `gh:pr` kind, the create argv, and the resolve argv with the gate id.
- Read `test_merge_resolves_both_gates_and_frees_both_epics` in `tests/test_tracker_beads_gate_real.py`. Run it with `-m ''` and with `bd` on the path. A skip does not count.
- Read `test_gate_replay_rejects_a_drifted_await_id`. The replay must fail when the await id drifts.

**Scoring:**
- 1.0: the tests assert the kind, both argv, the stored ids, and the merge order, and they pass, and the real test passes with `bd`.
- 0.5: the replay tests pass, but the real test skips or is missing, or the stored ids are not asserted.
- 0.0: no gate is added, or the merge does not resolve it.

### C3 — A gate with no stored number stays pending

**Must be true:** A pull request gate with no stored number (no await id) does not resolve on merge. It stays pending, and the merge raises no error.

**Evidence to check:** Read `test_a_gate_with_no_stored_number_stays_pending`. It must assert that the merge resolves the first gate only and leaves the second pending. Read `test_an_open_state_resolves_no_gate` and `test_a_pr_with_no_stored_gates_calls_no_gate_command`, and `test_an_open_state_leaves_both_gates_pending` in the real file. They must assert that no gate command runs.

**Scoring:**
- 1.0: the tests assert the pending state, and they pass.
- 0.5: the test covers the case, but does not check the state.
- 0.0: no test, or the gate resolves with no number.

### C4 — Reads skip the hidden gates

**Must be true:** `bd list` hides gate rows, but an epic row lists its gate as a `blocks` dependency. A read skips a `blocks` dependency whose target bd did not list. Reads do not fail with open gates.

**Evidence to check:** Read `test_reads_survive_open_gates_that_bd_list_hides`. It must build an adapter from rows that carry such a dependency and read without an error.

**Scoring:**
- 1.0: the test asserts that the read succeeds and skips the hidden gate.
- 0.5: the test reads, but does not assert the skip.
- 0.0: no test, or a read raises an error with an open gate.

## Regression check

- `uv run pytest tests/test_pr_tracker_state.py -q` passes unchanged.
- `uv run pytest tests/test_tracker_beads_write.py -q` passes. Its open pull request replay still matches.

## Out of scope — do not penalise

- The claim and the ready query. Those belong to slices 19 and 20.
- The formula. That belongs to slice 22.
- Live `gh` calls. The tests use recorded argv, or a scratch `bd` workspace.
