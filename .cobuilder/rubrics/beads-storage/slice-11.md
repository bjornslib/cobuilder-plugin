Kind: test-suite

# Rubric: Slice 11 — Gate check and builds view read the port

Feature: beads-storage
Epic: E3
Slice goal: `verify_gate.py` and `build_builds_view.py` return the same result for every plan under `docs/plans` as before the change, and their reads go through the port.
Test command: `uv run pytest tests/test_tracker_read_spy.py tests/test_verify_gate_port.py tests/test_build_builds_view_port.py tests/test_verify_gate.py tests/test_verify_gate_2b.py tests/test_verify_gate_links.py tests/test_build_builds_view.py -q`

## Criteria

### C1 — Gate check and builds view match the pre-change output for every plan [CRITICAL]
**Must be true:** for each directory under `docs/plans`, `verify_gate.py --plan <dir>` gives the same output after the change as before it. For the same plans, `build_builds_view.py` gives the same output as before.
**Evidence to check:**
- `.cobuilder/rubrics/beads-storage/evidence/slice-11/` holds one before file and one after file for each plan and each script.
- Compare each pair. Every pair is equal.
- The count of plan pairs equals the count of directories under `docs/plans`.
**Scoring:**
- 1.0 — every pair is equal, and the count of pairs equals the count of plan directories.
- 0.5 — every pair is equal, but the pair count is short of the plan count.
- 0.0 — any pair differs, or the evidence is missing.

### C2 — The adapter path opens no plan file [CRITICAL]
**Must be true:** on the fake adapter, `list_programs` and `next_ready` open no file under `docs/plans`. The gate check on the fake adapter, for both the 4a and 4b checks, also opens no such file.
**Evidence to check:**
- `uv run pytest tests/test_tracker_read_spy.py -q` passes.
- The spy in that test counts file opens and reads under `docs/plans`, and the counts are zero for all four calls.
**Scoring:**
- 1.0 — all four calls show zero file opens under `docs/plans`, and the test passes.
- 0.5 — the test passes, but one of the four calls is untested.
- 0.0 — any call opens a file under `docs/plans`, or the test fails.

### C3 — Both readers match their golden outputs
**Must be true:** the gate check on the miniature plans tree through the files adapter returns a result equal to `tests/fixtures/tracker/golden/verify_gate.json`. The builds view returns output equal to `tests/fixtures/tracker/golden/builds_view.json`.
**Evidence to check:**
- `uv run pytest tests/test_verify_gate_port.py tests/test_build_builds_view_port.py -q` passes.
- Both golden files are checked in.
**Scoring:**
- 1.0 — both golden cases pass, and both files are checked in.
- 0.5 — one golden case passes.
- 0.0 — both fail, or a golden file is missing.

### C4 — Existing gate and builds-view tests pass unchanged
**Must be true:** the existing gate and builds-view tests pass with no edit to their files.
**Evidence to check:**
- `uv run pytest tests/test_verify_gate.py tests/test_verify_gate_2b.py tests/test_verify_gate_links.py tests/test_build_builds_view.py -q` passes.
- `git diff --name-only` shows none of these four test files.
**Scoring:**
- 1.0 — all four pass, and none changed.
- 0.5 — all four pass, but one changed to pass.
- 0.0 — a test fails.

### C5 — One module parses gate lines
**Must be true:** after the change, the gate-line parsing lives in one module, `shared/gate_status.py`. No other script in `shared/` or `plugins/` parses gate lines from plan text.
**Evidence to check:**
- Search `shared/` and `plugins/` for the gate-line pattern that `shared/gate_status.py` defines. Only `shared/gate_status.py` matches.
**Scoring:**
- 1.0 — the only match is `shared/gate_status.py`.
- 0.5 — one other match exists, and the evidence explains it.
- 0.0 — two or more other matches exist, with no explanation.

## Regression check
- All tests that passed before this slice still pass (`uv run pytest tests -q`).
- The viewer source and `tests/test_viewer_build.py` stay unchanged by this slice.

## Out of scope — do not penalise
- The bundle index build (slice 10).
- The status-file writer (slice 12).
- Changes to gate rules or to the builds-view layout. This slice moves the reads only.
