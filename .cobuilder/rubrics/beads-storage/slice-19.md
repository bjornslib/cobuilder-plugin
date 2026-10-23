Kind: test-suite

# Rubric: Slice 19 — E5 atomic claim on beads

Feature: beads-storage
Epic: beads-storage/E5
Slice goal: `claim_slice` on beads makes one write, `bd update <id> --claim --actor <claimant>`, with no read-back. Eight concurrent claims give one winner. A held claim gives an adapter error (CLI exit 3). The call has no `--if-assignee`.
Test command: `uv run pytest tests/test_tracker_contract.py tests/test_tracker_beads_claim.py tests/test_tracker_beads_atomic_claim.py tests/test_tracker_beads_claim_real.py -q -m ''`

The real-bd tests in `tests/test_tracker_beads_claim_real.py` carry the pytest mark `slow`. The default run skips them, so the command adds `-m ''` to run them. The real tests skip without `bd`. A skip counts as no evidence for C2.

## Criteria

### C1 — Contract case 3 passes on beads with one write [CRITICAL]

**Must be true:** `test_claim_leaves_assignee` passes for the beads adapter. `claim_argv(issue_id, claimant)` in `shared/tracker_port/bd_runner.py` returns `["update", issue_id, "--claim", "--actor", claimant]`. The claim is one write, with no read-back and no `--if-assignee`.

**Evidence to check:**
- `uv run pytest tests/test_tracker_contract.py -q` passes, and the beads case runs.
- Read `claim_argv` in `shared/tracker_port/bd_runner.py`. It returns one argv with `--claim` and `--actor`, and it has no `--if-assignee`.
- Read `test_claim_argv_is_update_claim_with_the_actor_flag`, `test_claim_argv_never_carries_if_assignee_or_status_flags`, and `test_claim_writes_once_then_syncs_with_no_read_back` in `tests/test_tracker_beads_atomic_claim.py`.

**Scoring:**
- 1.0: the contract case passes on beads, `claim_argv` builds the one argv above, and the tests assert one write and no read-back.
- 0.5: the case passes, but the claim runs more than one write, or reads back after the claim.
- 0.0: the case fails, the argv carries `--if-assignee`, or the beads adapter is not in the contract run.

### C2 — Eight concurrent claims give one winner [CRITICAL]

**Must be true:** `test_eight_concurrent_claims_give_one_winner` in `tests/test_tracker_beads_claim_real.py` runs eight concurrent claims on one issue in a scratch workspace. Exactly one claim succeeds, and the other seven raise an adapter error.

**Evidence to check:** Run the file with `-m ''` and with `bd` on the path. Read the test body. It must start eight claims at once and assert one winner and seven refusals. A run that skips does not count.

**Scoring:**
- 1.0: the test runs with `bd`, passes, and asserts one winner and seven refusals.
- 0.5: the test runs and passes, but asserts a weaker count.
- 0.0: the test skips with no transcript, fails, or does not exist.

### C3 — A held claim gives an adapter error (CLI exit 3) [CRITICAL]

**Must be true:** When bd refuses a claim with exit 1 and `already claimed by` in stderr, the adapter raises `AdapterError`. The CLI maps that error to exit 3. The adapter names the holder, and it writes nothing else. A closed target also raises `AdapterError`. A missing target raises `ArgumentError`, as the fake adapter does.

**Evidence to check:** Read `test_held_claim_raises_adapter_error_naming_the_holder_and_writes_nothing_else`, `test_closed_target_raises_adapter_error_after_one_refused_write`, and `test_missing_target_raises_argument_error_like_the_fake_and_calls_only_list` in `tests/test_tracker_beads_atomic_claim.py`. Read `test_a_held_claim_refuses_a_second_claimant` in `tests/test_tracker_beads_claim_real.py`. Confirm that the adapter in `shared/tracker_port/beads.py` reads stderr for `already claimed by`. The adapter does not map bd exit 13, because `--claim` never gives it.

**Scoring:**
- 1.0: the tests assert `AdapterError` with the holder named, and the stderr match is in the adapter.
- 0.5: the tests assert a refusal, but not the error type or the holder.
- 0.0: no refusal test, or a refused claim returns success.

### C4 — `atomic_claim` is true only with the claim tests passing

**Must be true:** `Capabilities.atomic_claim` is true for beads. `test_atomic_claim_flag_is_true_for_beads_and_false_for_files` and `test_doctor_shows_atomic_claim_true_for_beads` in `tests/test_tracker_beads_atomic_claim.py` assert the value. The claim tests pass in the same state.

**Evidence to check:** Read the flag in `shared/tracker_port/beads.py`. Read the two tests. Run the test command.

**Scoring:**
- 1.0: the flag is true, the assertions match, and all claim test files pass.
- 0.5: the flag is true, but an assertion was not updated.
- 0.0: the flag is true while a claim test fails.

## Regression check

- `uv run pytest tests/test_tracker_beads.py tests/test_tracker_beads_write.py -q` passes.
- The fake adapter claim path still passes the contract case.

## Out of scope — do not penalise

- Native ready. That belongs to slice 20.
- The pull request gate. That belongs to slice 21.
- Lease expiry. Slice 18 records the observed result: an expired lease does not free a claim, and `bd reclaim` does.
- Wording of the adapter docstrings.
