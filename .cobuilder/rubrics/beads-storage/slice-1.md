Kind: test-suite

# Rubric: Slice 1 — Tracer bullet: the fake adapter and the golden index

Feature: beads-storage
Epic: E1
Slice goal: A test loads the fixture corpus through the fake adapter, the projection of that corpus matches the expected index, and one next-ready case returns the right record.
Test command: `uv run pytest tests/test_tracker_projector.py tests/test_tracker_contract.py -q && uv run pytest tests -q`

## Criteria

### C1 — The projection matches the expected index [CRITICAL]
**Must be true:** the projection of the corpus, read through the fake adapter, equals the expected index file, key for key and value for value.
**Evidence to check:**
- `uv run pytest tests/test_tracker_projector.py -q` passes.
- Load `tests/fixtures/tracker/expected-index.json` and the projection of the corpus in one short script. The two JSON values compare equal after `json.loads`.
**Scoring:**
- 1.0 — the test passes and the two values compare equal.
- 0.5 — the test passes, but the comparison is not in the test body.
- 0.0 — the test fails, or the two values differ.

### C2 — The corpus files hold the shape the design names [CRITICAL]
**Must be true:** the four corpus files exist and parse as JSON. The program has `stage` and an envelope with `gate1` and `gate2b`, and no `gate3` key. The epics include exactly one epic with an envelope `deferred` key, and that epic has no `blocked_by` entries. Two epics name `pr-101` in `blocked_by`. The slices include one closed record with an envelope `score`, one in_progress record with an `assignee`, and one open record.
**Evidence to check:**
- Load each file under `tests/fixtures/tracker/corpus/` with `json.load`.
- Check each named key and value listed above.
**Scoring:**
- 1.0 — every named key and value holds.
- 0.5 — the files parse, but one named key or value differs.
- 0.0 — a file is missing, or it does not parse.

### C3 — One next-ready case returns the exact record
**Must be true:** `next_ready("slice", under="demo-E1")` on the fake adapter returns exactly one record, with id `demo-E1-s3`.
**Evidence to check:**
- `uv run pytest tests/test_tracker_contract.py::test_next_ready_slice_under_epic -q` passes.
- The test asserts the returned ids as a list, not a membership check.
**Scoring:**
- 1.0 — the test passes and asserts the exact list.
- 0.5 — the test passes, but it checks membership only.
- 0.0 — the test fails.

### C4 — The projection uses no live plan files
**Must be true:** the two test files named in the test command read only files under `tests/fixtures/tracker/`. No test in them reads `docs/plans/`.
**Evidence to check:**
- Run `uv run pytest tests/test_tracker_projector.py tests/test_tracker_contract.py -q`. It passes.
- Read both files and check each path string. No path string names `docs/plans/`.
**Scoring:**
- 1.0 — no path string names `docs/plans/`, and the run passes.
- 0.0 — any test reads `docs/plans/`.

### C5 — The projection is deterministic
**Must be true:** two projections of the same corpus give identical output, including the order of the `joins` list.
**Evidence to check:**
- Read `shared/tracker_port/projector.py`: the `joins` list is sorted.
- Run the projection twice in one script and compare the two outputs.
**Scoring:**
- 1.0 — the two outputs are equal, and the join order is sorted.
- 0.5 — the outputs are equal, but the order rests on dict insertion only.
- 0.0 — the two outputs differ.

## Regression check
- All tests that passed before this slice must still pass (`uv run pytest tests -q`).
- Files outside the slice scope stay unchanged: every plugin folder, and every file under `docs/`.

## Out of scope — do not penalise
- The files adapter (slice 3).
- The contract cases 2 to 6 (slice 2).
- The command-line entry point (slice 4).
- The usage reference (slice 5).
- The beads adapter (E2).
