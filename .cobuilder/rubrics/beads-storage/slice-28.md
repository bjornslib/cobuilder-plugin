Kind: test-suite

# Rubric: Slice 28 — E7 claim-next on beads

Feature: beads-storage
Epic: beads-storage/E7
Slice goal: `claim-next [--under X] <claimant>` claims the first ready cb slice in one `bd ready --claim` call, and also sets the parent epic `in_progress` when it is not yet. Nothing ready gives `null` and exit 0. The label filter keeps a foreign task out.
Test command: `uv run pytest tests/test_tracker_claim_next.py tests/test_tracker_contract.py -q -m ''`

The real-bd tests carry the pytest mark `slow`. The default run skips them, so the command adds `-m ''` to run them. They skip without `bd`. A skip counts as no evidence for a criterion that names a live test.

## Criteria

### C1 — The claim argv is one call with the label filter, and the foreign task is skipped [CRITICAL]

**Must be true:** `claim_next_argv` returns `bd ready -t task --label cb --claim --actor <claimant> [--parent X] --json --limit 0`. A live test with a foreign task of priority 0 and a cb slice shows that the claim takes the cb slice. The record comes from the list row, with `in_progress` and the claimant.

**Evidence to check:** Read the replay test of the argv. Run the live test with `-m ''` and `bd` on the path. A skip counts as no evidence.

**Scoring:**
- 1.0: the argv is asserted and the live test passes.
- 0.5: the argv is asserted, but the live foreign-task test is missing.
- 0.0: the argv has no `--label cb`, or the claim takes the foreign task.

### C2 — The parent epic is set `in_progress` in the same sync, and only when needed [CRITICAL]

**Must be true:** After the claim, the adapter finds the parent epic of the claimed slice in the rows it read, and it runs `bd update <epic bd id> --status in_progress` once. It makes no epic write when the epic is already `in_progress` or `closed`. The claim and the epic write go out in one publish. A live test reads the epic row after the claim and finds `in_progress`, and a second claim under the same epic makes no epic write.

**Evidence to check:** Read the replay call list for an open epic, an in_progress epic, and a closed epic. Count the `update` calls and the sync calls. Run the live test.

**Scoring:**
- 1.0: all three cases are asserted on the call list, the publish count is one, and the live read shows the epic state.
- 0.5: the open case is asserted, but the skip cases or the publish count are not.
- 0.0: the epic is never updated, or it is updated when already in_progress or closed.

### C3 — Nothing ready gives `null` with exit 0, and errors map to exit codes [CRITICAL]

**Must be true:** An empty frontier gives `{"ok": true, "result": null}` and exit 0, with no epic write. An `--under` that names no record, a slice, or a PR gives `ArgumentError` (exit 4). A bd failure gives `AdapterError` with `claim-next refused` (exit 3). A legacy tracker gives an `AdapterError` that names `migrate-mapping`. The files adapter gives exit 2.

**Evidence to check:** Run the CLI tests for each case and read the exit codes and the JSON.

**Scoring:**
- 1.0: every case has a test with the exit code and the output asserted.
- 0.5: one case has no test.
- 0.0: an empty result is an error, or an exit code is wrong.

### C4 — Eight parallel calls give eight different slices

**Must be true:** A test with eight parallel `claim-next` calls on eight ready slices gives eight different slices, and the fake adapter picks the first of `next_ready("slice", under)`.

**Evidence to check:** Run the test with `-m ''` and read its assertion on the set of claimed ids.

**Scoring:**
- 1.0: the test runs and asserts eight distinct ids.
- 0.5: the test asserts a weaker count.
- 0.0: the test skips with no transcript or two calls claim one slice.

## Regression check

- `uv run pytest tests/test_tracker_beads_atomic_claim.py tests/test_tracker_beads_claim_real.py -q -m ''` passes, so `claim-slice` still works.
- `tracker.py --help` lists `claim-next`.

## Out of scope — do not penalise

- The migration. That belongs to slice 29.
- The docs for `claim-next`. Those belong to slice 30.
- The two-machine claim race, which the notes keep as not verified.
