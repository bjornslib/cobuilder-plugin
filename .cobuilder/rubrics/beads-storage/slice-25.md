Kind: test-suite

# Rubric: Slice 25 — E7 hierarchy and ordering edges

Feature: beads-storage
Epic: beads-storage/E7
Slice goal: Each epic has a `blocks` edge to the epic before it, and each slice to the slice before it. A seed gives both chains. A deferred epic gets `--defer <date>`. The projector emits the epic `blocked_by` joins. The live seed matches the projector frontier.
Test command: `uv run pytest tests/test_tracker_beads_edges.py tests/test_tracker_contract.py -q -m ''`

The real-bd tests carry the pytest mark `slow`. The default run skips them, so the command adds `-m ''` to run them. They skip without `bd`. A skip counts as no evidence for a criterion that names a live test.

## Criteria

### C1 — The seed creates both chains with one `dep add` for each `blocked_by` [CRITICAL]

**Must be true:** `_epic_and_slice_records` and `design_records` give each epic `blocked_by` the epic before it, and the first epic has none. `create_record` sends one `bd dep add` for each `blocked_by`. Epics are created in order, so the target exists.

**Evidence to check:** Read the record tests for a plan with three epics. Read the recorded call list of a seed. Count the `dep add` calls.

**Scoring:**
- 1.0: the records and the call list show the chain, with one `dep add` for each edge and none for the first epic.
- 0.5: the chain is right, but the call count or the first-epic case is not asserted.
- 0.0: an epic chain edge is missing, or an edge targets an epic that does not exist yet.

### C2 — A live seed matches the projector frontier [CRITICAL]

**Must be true:** The live test seeds the corpus into a scratch tracker and compares `bd ready -t task --label cb` with the projector frontier for slices. The test skips without `bd`.

**Evidence to check:** Run the file with `-m ''` and `bd` on the path. Read the test body. It must assert equal sets. A skip counts as no evidence.

**Scoring:**
- 1.0: the test runs, passes, and compares the two sets.
- 0.5: the test runs, but it compares only a count.
- 0.0: the test skips with no transcript, fails, or does not exist.

### C3 — A deferred epic gets a native defer date, and others get none [CRITICAL]

**Must be true:** An epic whose envelope holds `deferred` gets `--defer <date>` on create. A closed or in_progress epic gets no defer flag. A live check shows the slices of the deferred epic absent from `bd ready`.

**Evidence to check:** Read the argv tests for the three epic states. Read the live check.

**Scoring:**
- 1.0: the three argv cases and the live check are asserted.
- 0.5: the argv cases pass, but the live check is missing.
- 0.0: a closed or in_progress epic gets a defer flag, or the deferred epic's slices appear in `bd ready`.

### C4 — The fixture index changes only by the new joins

**Must be true:** The regenerated `expected-index.json` differs from the old file only by the epic `blocked_by` joins. A grep of the readers of the projector output finds no reader of epic `blocked_by` that the change breaks.

**Evidence to check:** Read the diff of `expected-index.json`. Run the grep named in the design, and read its result in the slice evidence.

**Scoring:**
- 1.0: the diff holds only the new joins, and the grep result is in the evidence.
- 0.5: the diff is right, but the grep result is missing.
- 0.0: the diff holds other changes.

## Regression check

- `uv run pytest tests/test_tracker_beads.py tests/test_tracker_cli.py -q` passes.
- The golden index tests of E3 pass with the new joins.

## Out of scope — do not penalise

- The pull request milestone. That belongs to slice 26.
- Native ready. That belongs to slice 27.
- The fixture date move to 2099. That belongs to slice 27.
