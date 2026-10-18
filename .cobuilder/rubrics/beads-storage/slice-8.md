Kind: test-suite

# Rubric: Slice 8 — Beads dry run matches the backfill file

Feature: beads-storage
Epic: E2
Slice goal: The beads adapter's `seed-from-files` dry run prints the planned creates for the mini plan and writes nothing. The output equals `tests/fixtures/tracker/backfill/dry_run.txt`. An apply run creates each record once, in dependency order.
Test command: `uv run pytest tests/test_tracker_beads_seed.py -q`

## Criteria

### C1 — The dry run prints exactly the checked-in output [CRITICAL]
**Must be true:** the beads dry run on the mini plan prints text that equals `tests/fixtures/tracker/backfill/dry_run.txt`, byte for byte. The dry run makes no `bd` call.
**Evidence to check:**
- `uv run pytest tests/test_tracker_beads_seed.py -q -k "dry_run_prints or dry_run_needs_no_bd"` exits 0.
- Read the test: it compares stdout with the checked-in file, and its stub runner fails on any call.
**Scoring:**
- 1.0 — both assertions hold and pass.
- 0.5 — the output matches, but the no-`bd` case is not tested.
- 0.0 — the output differs, the exit code is not 0, or a test fails.

### C2 — Apply creates each record once, in dependency order, and a second apply creates nothing [CRITICAL]
**Must be true:** with a stub runner, the apply run sends one `create` call for each planned record. Each blocked-by target is created before the record that depends on it. When every id already appears in the recorded list, the second apply sends no `create` call.
**Evidence to check:**
- `uv run pytest tests/test_tracker_beads_seed.py -q -k "apply_creates or second_apply"` exits 0.
- Read the two test functions: one counts the `create` calls and checks their order. The other checks that the count is zero.
**Scoring:**
- 1.0 — all three properties hold and pass.
- 0.5 — the create count is right, but the order or the second-run check is missing.
- 0.0 — a `create` call is duplicated or missing, or a test fails.

### C3 — Every planned line is a valid record line
**Must be true:** each line of dry run output parses as a JSON object in the projector record shape of `tests/fixtures/tracker/backfill/dry_run.txt`: `id`, `kind`, `parent`, `blocked_by`, `lifecycle`, `assignee`, `envelope`, and `external_ref`. The dry run output equals that file.
**Evidence to check:**
- `uv run pytest tests/test_tracker_beads_seed.py -q` exits 0.
- Read the dry run test: it compares every line with the checked-in file.
**Scoring:**
- 1.0 — every line parses and equals the checked-in line.
- 0.0 — any line fails to parse, differs, or a test fails.

## Regression check

- `uv run pytest tests/test_tracker_beads_seed.py -q -k "transcripts or list_json"` still passes. These are the slice 6 and slice 7 cases.
- The mini plan under `tests/fixtures/tracker/plans/beads-storage-mini/` has no diff from its state before slice 8.

## Out of scope — do not penalise

- The fresh clone check (slice 9). Nothing in this slice runs `bd init` or `bd sync`.
- The exact wording of the planned command text, as long as the checked-in file and the output agree.
- The internal structure of the beads `seed-from-files` code, including its helper names.
