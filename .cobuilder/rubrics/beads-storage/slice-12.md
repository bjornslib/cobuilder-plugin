Kind: test-suite

# Rubric: Slice 12 — Status files regenerate from records

Feature: beads-storage
Epic: E3
Slice goal: regenerating the fixture corpus writes `00-status.md` and `04-slices.md` files that equal their golden files.
Test command: `uv run pytest tests/test_tracker_regenerate.py tests/test_shared_manifest.py tests/test_script_references.py tests/test_plugin_manifests.py -q`

## Criteria

### C1 — Regenerated status files equal the golden files [CRITICAL]
**Must be true:** regenerating the fixture corpus from `tests/fixtures/tracker/plans/` writes `00-status.md` and `04-slices.md` files that equal, byte for byte, the golden files under `tests/fixtures/tracker/golden/plans/`.
**Evidence to check:**
- `uv run pytest tests/test_tracker_regenerate.py::test_output_equals_golden -q` passes.
- `.cobuilder/rubrics/beads-storage/evidence/slice-12/` holds a hand check of each state line against the corpus values. The check lists each line and its matching corpus value.
**Scoring:**
- 1.0 — the golden test passes, and the hand check covers every state line.
- 0.5 — the golden test passes, but the hand check misses some state lines.
- 0.0 — the golden test fails, or the golden files differ from the output.

### C2 — Only state lines change [CRITICAL]
**Must be true:** every line that is not a state line is equal to its input line. The output differs from the input only on state lines.
**Evidence to check:**
- `uv run pytest tests/test_tracker_regenerate.py::test_prose_lines_unchanged -q` passes.
- A diff between the input and the output of the fixture run shows changes only on state lines.
**Scoring:**
- 1.0 — the test passes, and the diff shows state lines only.
- 0.5 — the test passes, but the diff check is missing.
- 0.0 — any prose line changes, or the test fails.

### C3 — Two runs write identical bytes
**Must be true:** running the regeneration twice on the same input gives identical output bytes both times.
**Evidence to check:**
- `uv run pytest tests/test_tracker_regenerate.py::test_second_run_is_identical -q` passes.
**Scoring:**
- 1.0 — the test passes.
- 0.0 — the test fails.

### C4 — No adapter writes nothing and raises the refusal
**Must be true:** calling the regeneration with no adapter raises `NoAdapterError`. The file tree has the same hashes before and after the call.
**Evidence to check:**
- `uv run pytest tests/test_tracker_regenerate.py::test_no_adapter_writes_nothing -q` passes.
**Scoring:**
- 1.0 — the test passes, and it asserts both the error and the unchanged hashes.
- 0.5 — the test passes, but it does not assert the hashes.
- 0.0 — the test fails, or a file changes.

### C5 — Manifest and reference tests pass after the new file
**Must be true:** the new module and the new test file pass the packaging and reference tests.
**Evidence to check:**
- `uv run pytest tests/test_shared_manifest.py tests/test_script_references.py tests/test_plugin_manifests.py -q` passes.
**Scoring:**
- 1.0 — all three pass.
- 0.5 — two pass.
- 0.0 — a test fails.

## Regression check
- All tests that passed before this slice still pass (`uv run pytest tests -q`).
- The status files of the live `docs/plans` tree are not rewritten by this slice's tests. A test runs only on a temporary copy.

## Out of scope — do not penalise
- The bundle index (slice 10) and the gate check and builds view (slice 11).
- Prose in `00-status.md` and `04-slices.md`. This slice writes state lines only.
- The write path that E4 adds. This slice adds the regeneration path only.
