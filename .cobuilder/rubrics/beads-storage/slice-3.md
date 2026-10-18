Kind: test-suite

# Rubric: Slice 3 — Files adapter reads the plans tree and backfill dry run

Feature: beads-storage
Epic: E1
Slice goal: The files adapter lists the miniature plans tree, and every write it receives exits 2. The fake adapter's backfill dry run lists the creates, the list equals the checked-in file, and a second run creates nothing. The backfill reference names each workflow step in the ADR-0040 backfill section.
Test command: `uv run pytest tests/test_tracker_files.py -q && uv run pytest tests -q`

## Criteria

### C1 — The fake-adapter dry run equals the checked-in file [CRITICAL]
**Must be true:** `seed_from_files(mini plan)` on `FakeAdapter` returns the creates. The printed lines equal `tests/fixtures/tracker/backfill/dry_run.txt`, byte for byte.
**Evidence to check:**
- `uv run pytest tests/test_tracker_files.py -q -k backfill_dry_run_matches_fixture` passes.
- Read the test. It compares every printed line with the checked-in file.
**Scoring:**
- 1.0 — the test passes, and it compares every line.
- 0.5 — the test passes, but it compares only part of the output.
- 0.0 — the output differs, or the test fails.

### C2 — A second run creates nothing [CRITICAL]
**Must be true:** after the creates are written in memory, a second `seed_from_files` call on `FakeAdapter` returns an empty list.
**Evidence to check:**
- `uv run pytest tests/test_tracker_files.py -q -k second_run_creates_nothing` passes.
- Read the test. It calls `seed_from_files` twice, and it checks that the second result is empty.
**Scoring:**
- 1.0 — the test passes, and the second result is checked.
- 0.5 — the test passes, but the in-memory write step is not part of it.
- 0.0 — the second result is not empty, or the test fails.

### C3 — Every write raises the no-adapter error [CRITICAL]
**Must be true:** every write method of `FilesAdapter` raises `NoAdapterError`. None of them changes a file. The `seed-from-files` write path counts as a write method.
**Evidence to check:**
- `uv run pytest tests/test_tracker_files.py -q -k every_write_exits_2` passes.
- Hash the fixture plans tree before and after the test run. The hashes match.
**Scoring:**
- 1.0 — every write method raises, and the hashes match.
- 0.0 — any write method returns normally, or any file changed.

### C4 — The backfill reference names each workflow step
**Must be true:** `shared/tracker-backfill.md` names each workflow step in the ADR-0040 backfill section. The reference states no step count.
**Evidence to check:**
- `uv run pytest tests/test_tracker_files.py -q -k backfill_reference_names_operations` passes.
- Read `shared/tracker-backfill.md`. Check each step of the ADR-0040 backfill section against it.
- Grep the reference for a number that counts its steps. The grep finds none.
**Scoring:**
- 1.0 — every step is named, and the reference states no count.
- 0.5 — every step is named, but the reference states a count.
- 0.0 — a step is missing from the reference.

### C5 — Listing and gate values come from the plans tree
**Must be true:** `FilesAdapter(plans_dir).list_programs()` returns one record with id `beads-storage-mini`. `list_slices()` returns one record for each data row of the fixture `04-slices.md`. The program envelope holds each gate value that `00-status.md` names. `FilesAdapter` reads only files under `plans_dir`.
**Evidence to check:**
- `uv run pytest tests/test_tracker_files.py -q -k "lists_programs or lists_slices"` passes.
- Read `shared/tracker_port/files.py`. Each `open` or read call takes a path under the `plans_dir` argument.
**Scoring:**
- 1.0 — every property holds, and the tests pass.
- 0.5 — some properties hold.
- 0.0 — a read reaches a path outside `plans_dir`, or a test fails.

## Regression check
- The fake-adapter tests from slices 1 and 2 still pass (`uv run pytest tests/test_tracker_contract.py tests/test_tracker_projector.py -q`).
- No existing test under `tests/` fails after this slice (`uv run pytest tests -q`).

## Out of scope — do not penalise
- The command-line entry point (slice 4).
- The usage reference (slice 5).
- The beads adapter and its `seed-from-files` method (E2).
- Any `bd` call, any Dolt clone, and any live-account call.
- Edits to install and `implement:start` (E4).
