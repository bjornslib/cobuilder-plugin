Kind: test-suite

# Rubric: Slice 10 — Bundle index unchanged after the port

Feature: beads-storage
Epic: E3
Slice goal: `build_index.py` writes the same `data/index.json` for this repo as before the change, and the viewer `index.html` is byte equal.
Test command: `uv run pytest tests/test_build_index_port.py tests/test_build_index.py tests/test_build_index_plan_docs.py tests/test_build_index_gate_docs.py tests/test_build_index_rubrics.py tests/test_viewer_build.py -q`

## Criteria

### C1 — The bundle index for this repo keeps every byte except the recorded volatile keys [CRITICAL]
**Must be true:** after the change, one run of the bundle build on this repo writes `data/index.json` that equals the pre-change file. The only differences are keys that change on every run. Each such key appears in the evidence with its before and after value.
**Evidence to check:**
- `.cobuilder/rubrics/beads-storage/evidence/slice-10/` holds the pre-change `data/index.json` and the post-change `data/index.json`.
- The evidence lists every key that differs, with both values. Each listed key is a run-specific value, such as a timestamp or a commit value.
- Compare the two files outside the listed keys. The bytes match.
**Scoring:**
- 1.0 — the files match outside the listed volatile keys, and the evidence lists each volatile key.
- 0.5 — the files match outside the volatile keys, but the evidence omits one volatile key or its values.
- 0.0 — any other byte differs, or the evidence is missing.

### C2 — The viewer page is byte equal before and after [CRITICAL]
**Must be true:** the SHA-256 of `.cobuilder-architect/self/viewer/index.html` after the change equals the value recorded before the change. The viewer source does not change.
**Evidence to check:**
- `evidence/slice-10/` holds the before and after SHA-256 values.
- The two values are equal.
- `uv run pytest tests/test_viewer_build.py -q` passes.
- `git diff --name-only` shows no file under `plugins/artifact/viewer/src/`.
**Scoring:**
- 1.0 — the hashes match, the viewer test passes, and no viewer source file changed.
- 0.5 — the hashes match, but the viewer test or the source check is missing.
- 0.0 — the hashes differ, or the viewer test fails.

### C3 — The entity output matches the checked-in golden file
**Must be true:** a run of the bundle build on the miniature plans tree in `tests/fixtures/tracker/plans/` produces entities equal to `tests/fixtures/tracker/golden/build_index_entities.json`.
**Evidence to check:**
- `uv run pytest tests/test_build_index_port.py -q` passes, including the golden case.
- The golden file is checked in, and it holds the entity output.
**Scoring:**
- 1.0 — the golden case passes, and the golden file is checked in.
- 0.5 — the golden case passes, but the golden file is not checked in.
- 0.0 — the golden case fails.

### C4 — Both index paths are written from one run
**Must be true:** one run of the bundle build writes `data/index.json` and `.cobuilder-architect/self/data/index.json`. Both files exist after the run.
**Evidence to check:**
- `uv run pytest tests/test_build_index_port.py -q` passes, including the two-path case.
**Scoring:**
- 1.0 — the two-path case passes.
- 0.5 — one path is written, and the other path is untested.
- 0.0 — either path is missing after the run.

### C5 — Existing build-index tests pass unchanged
**Must be true:** the existing build-index and viewer tests pass with no edit to their files.
**Evidence to check:**
- `uv run pytest tests/test_build_index.py tests/test_build_index_plan_docs.py tests/test_build_index_gate_docs.py tests/test_build_index_rubrics.py tests/test_viewer_build.py -q` passes.
- `git diff --name-only` shows none of these five test files.
**Scoring:**
- 1.0 — all five files pass, and none changed.
- 0.5 — all five pass, but one file changed to make it pass.
- 0.0 — a test fails.

### C6 — The new port test runs with no live plans tree
**Must be true:** the port test passes when the live plans tree is absent. It reads only fixture files.
**Evidence to check:**
- In a temporary copy of the repo with `docs/plans` removed, `uv run pytest tests/test_build_index_port.py -q` passes.
**Scoring:**
- 1.0 — the test passes in the copy without `docs/plans`.
- 0.5 — the test passes, but the copy check is missing.
- 0.0 — the test fails without `docs/plans`.

## Regression check
- All tests that passed before this slice still pass (`uv run pytest tests -q`). Compare against the run recorded before the change.
- The bundle data for other repos under `.cobuilder-architect/` is unchanged.

## Out of scope — do not penalise
- The gate check and the builds view (slice 11).
- The status-file writer (slice 12).
- The viewer source and its build output, which do not change in this slice.
- The parity of the 15 live plans beyond this repo's bundle index. ADR-0040 bars a suite test from reading the live tree, so the check is manual.
