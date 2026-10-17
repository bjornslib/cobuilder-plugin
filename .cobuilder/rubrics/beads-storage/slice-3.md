Kind: test-suite

# Rubric: Slice 3 — Files adapter reads the plans tree

Feature: beads-storage
Epic: E1
Slice goal: The files adapter lists the miniature plans tree, and every write it receives exits 2.
Test command: `uv run pytest tests/test_tracker_files.py -q && uv run pytest tests -q`

## Criteria

### C1 — The files adapter lists the miniature program [CRITICAL]
**Must be true:** `FilesAdapter(plans_dir).list_programs()` on the miniature plans tree returns one record with id `beads-storage-mini`.
**Evidence to check:**
- `uv run pytest tests/test_tracker_files.py::test_lists_programs_from_plans_tree -q` passes.
- The test asserts the returned ids as a list.
**Scoring:**
- 1.0 — the test passes and the list is exactly `["beads-storage-mini"]`.
- 0.5 — the test passes, but it does not assert the full list.
- 0.0 — the test fails.

### C2 — Slices come from the slice table [CRITICAL]
**Must be true:** `list_slices()` returns one record for each data row of the fixture `04-slices.md`. Each record has a `lifecycle` value that matches the row state.
**Evidence to check:**
- `uv run pytest tests/test_tracker_files.py::test_lists_slices_from_04 -q` passes.
- Read the fixture `tests/fixtures/tracker/plans/beads-storage-mini/04-slices.md`. Count its data rows. Compare the count with the length of the returned list.
**Scoring:**
- 1.0 — the test passes, and the count matches the data rows.
- 0.5 — the test passes, but it does not compare the count.
- 0.0 — the count differs or the test fails.

### C3 — Every write raises the no-adapter error [CRITICAL]
**Must be true:** every write method of `FilesAdapter` raises `NoAdapterError`. None of them changes a file.
**Evidence to check:**
- `uv run pytest tests/test_tracker_files.py::test_every_write_exits_2 -q` passes.
- Hash the fixture plans tree before and after the test run. The hashes match.
**Scoring:**
- 1.0 — every write method raises, and the hashes match.
- 0.0 — any write method returns normally, or any file changed.

### C4 — The files adapter reads the plans tree only
**Must be true:** `FilesAdapter` reads only files under the plans directory it receives. It does not read `.cobuilder/tracker.yaml` or any file under `docs/plans/`.
**Evidence to check:**
- Read `shared/tracker_port/files.py`. Each `open` or read call takes a path under the `plans_dir` argument.
**Scoring:**
- 1.0 — every read stays under `plans_dir`.
- 0.0 — any read reaches a path outside `plans_dir`.

### C5 — Gate values come from the status file
**Must be true:** for the fixture `00-status.md`, `list_programs()` returns a record whose envelope holds each gate value that the status file names.
**Evidence to check:**
- Read `tests/fixtures/tracker/plans/beads-storage-mini/00-status.md`. List the gate values it names.
- Print the envelope of the returned program record. Each named gate value appears in it.
**Scoring:**
- 1.0 — every named gate value appears in the envelope.
- 0.5 — some gate values appear.
- 0.0 — no gate value appears, or the envelope is empty.

## Regression check
- The fake-adapter tests from slices 1 and 2 still pass (`uv run pytest tests/test_tracker_contract.py tests/test_tracker_projector.py -q`).
- No existing test under `tests/` fails after this slice (`uv run pytest tests -q`).

## Out of scope — do not penalise
- The command-line entry point (slice 4).
- The usage reference (slice 5).
- The beads adapter (E2).
- The regenerate and seed write methods (E2 and E3). They must still raise `NoAdapterError` here.
