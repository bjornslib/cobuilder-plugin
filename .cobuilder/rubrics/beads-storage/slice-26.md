Kind: test-suite

# Rubric: Slice 26 — E7 pull request as a milestone with tracks

Feature: beads-storage
Epic: beads-storage/E7
Slice goal: `open_pull_request` creates a `milestone` with the label and `external_ref gh-<n>`, and one `tracks` edge for each epic. It adds no `blocks` edge and no gate. A read gives `tracks`. `set_pull_request_state(merged)` only closes the milestone. `beads_gates.py` is gone.
Test command: `uv run pytest tests/test_tracker_beads_edges.py tests/test_tracker_contract.py tests/test_pr_tracker_state.py -q -m ''`

The real-bd tests carry the pytest mark `slow`. The default run skips them, so the command adds `-m ''` to run them. They skip without `bd`. A skip counts as no evidence for a criterion that names a live test.

## Criteria

### C1 — A pull request holds its epics by `tracks` and blocks nothing [CRITICAL]

**Must be true:** The call list of `open_pull_request` for two epics holds one create with `--type milestone`, `--labels cb`, and `--external-ref gh-<n>`, then two `bd dep add <pr> <epic> --type tracks`. It holds no `dep add <epic> <pr>`, no `blocks` type, and no gate call. Contract case 5 passes on the fake and on the beads replay: a PR with `tracks` leaves both epics ready, and a merge changes no ready set.

**Evidence to check:** Run the contract and replay tests. Read the recorded argv list. Read the case 5 assertion on the ready sets before and after the merge.

**Scoring:**
- 1.0: the argv list and case 5 match on both adapters.
- 0.5: the argv is right, but case 5 runs on one adapter only.
- 0.0: an edge points from an epic to the PR, a gate call remains, or case 5 asserts the old block.

### C2 — A live PR leaves both slice frontiers in `bd ready` [CRITICAL]

**Must be true:** The live test opens a PR for two epics in a scratch tracker. `bd ready -t task --label cb` still lists the ready slice of each epic, and `bd ready -t milestone` or the task list shows no claim of the PR.

**Evidence to check:** Run the file with `-m ''` and `bd` on the path. A skip counts as no evidence.

**Scoring:**
- 1.0: the test runs, passes, and asserts both frontiers.
- 0.5: the test asserts one frontier only.
- 0.0: the test skips with no transcript, or a slice is hidden.

### C3 — A read gives `tracks` and a merge only closes the milestone [CRITICAL]

**Must be true:** `list_pull_requests` gives each PR record `tracks` from the dependencies of type `tracks` whose target bd listed, and it skips a foreign target. `set_pull_request_state(ref, merged)` makes one close call, and no `dep rm` and no `gate resolve`. The record of a PR is found by `--external-ref gh-<n>`.

**Evidence to check:** Read the read test with a foreign target. Read the call list of the merge. Read the lookup argv.

**Scoring:**
- 1.0: all three are asserted on a call list or a record.
- 0.5: one is not asserted.
- 0.0: a foreign target breaks the read, or the merge makes a gate or edge call.

### C4 — The gate module and its tests are gone

**Must be true:** `shared/tracker_port/beads_gates.py`, the gate argv in `bd_runner.py`, `tests/test_tracker_beads_gate.py`, and `tests/test_tracker_beads_gate_real.py` do not exist. A grep of `shared/tracker_port/` for `gate` calls finds none.

**Evidence to check:** List the files. Run the grep and read the result in the evidence.

**Scoring:**
- 1.0: the files are gone and the grep result is empty.
- 0.5: the files are gone, but a dead gate helper remains.
- 0.0: a gate call remains.

## Regression check

- `uv run pytest tests/test_tracker_cli.py tests/test_tracker_beads.py -q` passes.
- The slice 15 behavior holds as the contract states it now: a PR record holds its epics.

## Out of scope — do not penalise

- Native ready. That belongs to slice 27.
- Migration of old gates. That belongs to slice 29.
- A later gate for a dependent epic.
