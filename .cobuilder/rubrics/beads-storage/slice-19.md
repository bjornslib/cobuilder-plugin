Kind: test-suite

# Rubric: Slice 19 — E5 atomic claim on beads

Feature: beads-storage
Epic: beads-storage/E5
Slice goal: `claim_slice` on beads uses one atomic `bd update --claim` call with `--if-assignee`. Eight concurrent claims give one winner, and a mismatch gives exit 3.
Test command: `uv run pytest tests/test_tracker_contract.py tests/test_tracker_beads_claim.py -q`

The file `tests/test_tracker_beads_claim.py` is created by this slice. The command runs once the slice exists. The race test skips without `bd`. A skip counts as no evidence for C2.

## Criteria

### C1 — Contract case 3 passes on beads with one write [CRITICAL]

**Must be true:** `test_claim_leaves_assignee` passes for the beads adapter. `claim_argv(issue_id, claimant, expected)` returns one argv that carries `--claim` and `--if-assignee`.

**Evidence to check:**
- `uv run pytest tests/test_tracker_contract.py -q` passes, and the beads case runs.
- Read `claim_argv` in `shared/tracker_port/beads.py`. It returns one argv, not two calls.

**Scoring:**
- 1.0: the contract case passes on beads, and `claim_argv` builds one argv with both flags.
- 0.5: the case passes, but the claim still runs as two calls.
- 0.0: the case fails, or the beads adapter is not in the contract run.

### C2 — Eight concurrent claims give one winner [CRITICAL]

**Must be true:** A test in `tests/test_tracker_beads_claim.py` runs eight concurrent claims on one issue. Exactly one claim succeeds, and the other seven are refused.

**Evidence to check:** Run the file with `bd` on the path. Read the test body. It must start eight claims at once and assert one winner and seven refusals. A run that skips does not count.

**Scoring:**
- 1.0: the test runs with `bd`, passes, and asserts one winner and seven refusals.
- 0.5: the test runs and passes, but asserts a weaker count.
- 0.0: the test skips with no transcript, fails, or does not exist.

### C3 — A mismatch gives exit 3 [CRITICAL]

**Must be true:** When `--if-assignee` refuses a claim, the adapter raises or returns with exit code 3. The design records that `bd` exits 13 on a mismatch, so the mapping must cover that case.

**Evidence to check:** Read the test that covers a refused claim. It must assert exit 3. Confirm that `shared/tracker_port/beads.py` maps the bd exit 13 to exit 3.

**Scoring:**
- 1.0: the test asserts exit 3, and the mapping from 13 to 3 appears in the adapter.
- 0.5: the test asserts a refusal, but not the exit code.
- 0.0: no refusal test, or a refused claim returns success.

### C4 — `atomic_claim` is true only with the claim tests passing

**Must be true:** `Capabilities.atomic_claim` is true for beads. `test_capabilities_flags` in `tests/test_tracker_beads.py` asserts the new value. The claim tests pass in the same state.

**Evidence to check:** Read the flag in `shared/tracker_port/beads.py`. Read the matching assertion in `tests/test_tracker_beads.py`. Run that file.

**Scoring:**
- 1.0: the flag is true, the assertion matches, and both test files pass.
- 0.5: the flag is true, but the assertion was not updated.
- 0.0: the flag is true while a claim test fails.

## Regression check

- `uv run pytest tests/test_tracker_beads.py tests/test_tracker_beads_write.py -q` passes.
- The fake adapter claim path still passes the contract case.

## Out of scope — do not penalise

- Native ready. That belongs to slice 20.
- The pull request gate. That belongs to slice 21.
- Lease expiry. Slice 18 records it as unverified.
- Wording of the adapter docstrings.
