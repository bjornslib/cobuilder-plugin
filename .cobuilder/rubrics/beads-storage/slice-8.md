Kind: test-suite

# Rubric: Slice 8 — Seed dry run lists the creates

Feature: beads-storage
Epic: E2
Slice goal: The seed script's dry run prints the planned `bd create` records for the mini plan and writes nothing. The output equals the checked-in file. An apply run creates each record once, in dependency order.
Test command: `uv run pytest tests/test_tracker_beads.py -q`

## Criteria

### C1 — The dry run prints exactly the checked-in output [CRITICAL]
**Must be true:** the dry run on the mini plan exits 0 and prints text that equals `tests/fixtures/tracker/beads/seed_dry_run.txt`, byte for byte. It also exits 0 when `bd` is not on `PATH`.
**Evidence to check:**
- `uv run pytest tests/test_tracker_beads.py -q -k "dry_run_prints or dry_run_needs_no_bd"` exits 0.
- Read the test: it compares stdout with the checked-in file, and it sets `PATH` to an empty directory.
**Scoring:**
- 1.0 — both assertions hold and pass.
- 0.5 — the output matches, but the no-`bd` case is not tested.
- 0.0 — the output differs, the exit code is not 0, or a test fails.

### C2 — Apply creates each record once, in dependency order, and a second apply creates nothing [CRITICAL]
**Must be true:** with a stub runner, the apply run sends one `create` call for each planned record. Each blocked-by target is created before the record that depends on it. When every id already appears in the recorded list, the second apply sends no `create` call.
**Evidence to check:**
- `uv run pytest tests/test_tracker_beads.py -q -k "apply_creates or second_apply"` exits 0.
- Read the two test functions: one counts the `create` calls and checks their order. The other checks that the count is zero.
**Scoring:**
- 1.0 — all three properties hold and pass.
- 0.5 — the create count is right, but the order or the second-run check is missing.
- 0.0 — a `create` call is duplicated or missing, or a test fails.

### C3 — Every planned line is a valid envelope
**Must be true:** each line of dry run output parses as a JSON object. Each object holds `title`, `kind`, and `metadata.cb.v` equal to 1.
**Evidence to check:**
- `uv run pytest tests/test_tracker_beads.py -q -k each_planned_line` exits 0.
- Read the test: it parses every line, and it checks the three keys.
**Scoring:**
- 1.0 — every line parses and holds all three keys.
- 0.5 — every line parses, but one key is not checked.
- 0.0 — any line fails to parse, or a test fails.

## Regression check

- `uv run pytest tests/test_tracker_beads.py -q -k "transcripts or list_json"` still passes. These are the slice 6 and slice 7 cases.
- The mini plan under `tests/fixtures/tracker/plans/beads-storage-mini/` has no diff from its state before slice 8.

## Out of scope — do not penalise

- The fresh clone check (slice 9). Nothing in this slice runs `bd init` or `bd sync`.
- The exact wording of the planned command text, as long as the checked-in file and the output agree.
- The internal structure of `beads_seed.py`, including its helper names.
