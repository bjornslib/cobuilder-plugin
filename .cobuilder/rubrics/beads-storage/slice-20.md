Kind: test-suite

# Rubric: Slice 20 — E5 native ready on beads

Feature: beads-storage
Epic: beads-storage/E5
Slice goal: `next_ready` on beads calls `bd ready` through `ready_argv(under)`. The molecule root is dropped. The pull request and deferred epic rules apply in the adapter. The result matches E1 parity, or `native_ready` stays false.
Test command: `uv run pytest tests/test_tracker_beads_ready.py tests/test_tracker_contract.py -q`

The file `tests/test_tracker_beads_ready.py` is created by this slice. The command runs once the slice exists. The parity test skips without `bd`. A skip counts as no evidence for C1.

## Criteria

### C1 — Parity with E1 for program, epic, slice, and one `under` case [CRITICAL]

**Must be true:** For `program`, `epic`, and `slice`, and for one `under` case, the beads `next_ready` result equals the fake adapter result on the same corpus. The `under` case uses `demo-E1`.

**Evidence to check:** Run `tests/test_tracker_beads_ready.py` with `bd` on the path. The test must compare both adapters for each kind and for the `under` case.

**Scoring:**
- 1.0: the test runs with `bd`, and all four comparisons match.
- 0.5: the test runs, but it covers fewer kinds or skips the `under` case.
- 0.0: the test skips with no transcript, fails, or does not exist.

### C2 — The molecule root is dropped, and the pull request and deferred rules hold [CRITICAL]

**Must be true:** When `bd ready --mol` lists a molecule root, the adapter drops it. A pull request is never returned as ready. A deferred epic is never returned as ready. These rules apply in the adapter, not in the caller.

**Evidence to check:** Read the test for the molecule root, the pull request, and the deferred epic. Each must assert that the record is absent from the result. Read `ready_argv` and the adapter filter in `shared/tracker_port/beads.py`.

**Scoring:**
- 1.0: all three rules are asserted in the adapter, and the tests pass.
- 0.5: two of the three rules are asserted in the adapter.
- 0.0: a rule is missing, or it lives in the caller.

### C3 — `native_ready` matches the parity result

**Must be true:** `Capabilities.native_ready` is true only when C1 and C2 pass. If parity fails, the flag stays false. The design treats a hybrid ready as not native.

**Evidence to check:** Read the flag in `shared/tracker_port/beads.py`. Compare it with the parity test result. If the flag is true, the parity test must pass with no partial match.

**Scoring:**
- 1.0: the flag matches the parity result.
- 0.5: the flag is true, but the parity test covers only part of the cases.
- 0.0: the flag is true while parity fails.

## Regression check

- `uv run pytest tests/test_tracker_beads.py -q` passes.
- The contract run still passes the next-ready cases on the fake adapter.

## Out of scope — do not penalise

- The atomic claim. That belongs to slice 19.
- The pull request gate. That belongs to slice 21.
- The formula. That belongs to slice 22.
- Performance of `bd ready` on large corpora.
