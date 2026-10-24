Kind: test-suite

# Rubric: Slice 29 — E7 migrate-mapping with dry run

Feature: beads-storage
Epic: beads-storage/E7
Slice goal: `migrate-mapping [--dry-run] [--plans-dir DIR]` converts a legacy scratch tracker in one sync. A dry run writes nothing. A second run changes nothing. An interrupted run resumes. It sets `external_ref` on each cb row that lacks it.
Test command: `uv run pytest tests/test_tracker_migrate_mapping.py tests/test_tracker_contract.py -q -m ''`

The real-bd tests carry the pytest mark `slow`. The default run skips them, so the command adds `-m ''` to run them. They skip without `bd`. A skip counts as no evidence for a criterion that names a live test.

## Criteria

### C1 — A dry run writes nothing and lists the changes [CRITICAL]

**Must be true:** On a legacy scratch tracker, `--dry-run` returns the change list with the actions `retype`, `label`, `unblock`, `track`, `gate`, `chain`, `defer`, `title`, and `text` as they apply. A `bd export` before and after the dry run is equal, and the call list holds no write and no sync.

**Evidence to check:** Run the live test with `-m ''`. Read the export comparison and the replay call list.

**Scoring:**
- 1.0: the list is asserted, and the export and the call list show no write.
- 0.5: the list is asserted, but no-write is asserted on one of the two.
- 0.0: the dry run writes a row, or the test skips with no transcript.

### C2 — The migration converts the legacy tracker in one sync [CRITICAL]

**Must be true:** The live test builds the legacy tracker (a `program` row, a PR task that blocks epics, gates, and no chains), runs the migration, and checks: the types are `feature` and `milestone`, `bd ready -t task --label cb` gives the slice frontier, the PR has `tracks` edges and no blocking edge, each cb row has the label and a correct `external_ref` (`gh-<n>` for a PR), and the call list holds exactly one sync.

**Evidence to check:** Run the live test. Read each assertion. A skip counts as no evidence.

**Scoring:**
- 1.0: all five checks are asserted and pass.
- 0.5: one check is missing.
- 0.0: the types or the frontier are wrong after the run, or the sync count is not one.

### C3 — A second run changes nothing, and an interrupted run resumes [CRITICAL]

**Must be true:** A second run returns an empty list, makes no write, and makes no sync. A replay test stops after the unblock step, and a rerun finishes the remaining steps and acts only on rows that differ. A native tracker gives an empty list at once.

**Evidence to check:** Read the second-run test and the interrupted-run replay. Compare the call lists.

**Scoring:**
- 1.0: all three cases are asserted on a call list or a returned list.
- 0.5: the second run is asserted, but the interrupted run is not.
- 0.0: a second run writes, or a rerun repeats a step that already holds.

### C4 — Foreign rows and the other custom types stay untouched

**Must be true:** A foreign row has no label added, no retype, and no edge change. The step on `types.custom` removes `program` and keeps the other entries. Without `--plans-dir`, only slice titles change, from the envelope.

**Evidence to check:** Read the foreign-row assertion and the `types.custom` assertion in the tests.

**Scoring:**
- 1.0: both are asserted on the live tracker or a call list.
- 0.5: one is asserted.
- 0.0: a foreign row changes, or another custom type is dropped.

## Regression check

- `uv run pytest tests/test_tracker_beads.py tests/test_tracker_cli.py -q` passes.
- `tracker.py --help` lists `migrate-mapping`.

## Out of scope — do not penalise

- The manual dry run on this repo and on think-with-ai, which the engineer runs.
- Restore from `bd export`, which stays not verified.
- The docs. Those belong to slice 30.
