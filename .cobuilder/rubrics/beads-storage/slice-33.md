Kind: test-suite

# Rubric: Slice 33 — E8 the index reads the stage from the tracker, with a fallback

Feature: beads-storage
Epic: beads-storage/E8
Slice goal: `design.stage` in `data/index.json` comes from the tracker program, then from a legacy `goal.json` stage. The build reads one snapshot and makes at most three bd calls. The GREEN work adds the tests itself, since the RED stage is skipped.
Test command: `uv run pytest tests/test_index_stage_source.py tests/test_build_index.py tests/test_build_index_port.py tests/test_sparse_design_corpus.py -q -m ''`

The new test file is `tests/test_index_stage_source.py`. The fixtures are under `tests/fixtures/tracker/stage/`. The sparse-design test fails while another session leaves an untracked design folder: the scorer sets such folders aside first.

## Criteria

### C1 — The six cases of the stage table give the stated result [CRITICAL]

**Must be true:** On the fake adapter, with a corpus under `tests/fixtures/tracker/stage/`:
- the tracker holds a valid stage: `design.stage` is that stage and `stage_source` is `tracker`;
- no tracker program or no stage, and a valid `goal.json` stage: the goal stage, `stage_source` is `goal`;
- both valid and different: the tracker wins, and the build adds a warning that names both values;
- a value outside `DESIGN_STAGES` in either source: a failure that names the source and the value;
- no stage anywhere: a failure that names the design and the call `tracker.py set-program-stage <design> backlog --plans-dir docs/plans`;
- the tracker cannot be read: a warning with the error text, and each design uses its goal stage.

**Evidence to check:** Read the test for each case. Run the file.

**Scoring:**
- 1.0: all six cases have a passing test that asserts the stated result.
- 0.5: five cases are tested.
- 0.0: fewer than five, or the tracker does not win in the differing case.

### C2 — One snapshot and at most three bd calls [CRITICAL]

**Must be true:** `all_records()` exists on the port. The beads adapter implements it with one `bd list`. `reader.snapshot(repo)` returns one `TrackerSnapshot`, catches `AdapterError`, runs `next_ready("slice")` once for a non-files adapter, and sets `ready` to `None` for the files adapter. A counting runner shows at most three bd calls for one build.

**Evidence to check:** Read the counting test and `reader.py`. Run the test.

**Scoring:**
- 1.0: the counting test passes with a limit of three, and the snapshot is one object.
- 0.5: the count is tested, but the limit is four or more.
- 0.0: no count test, or the build still reads the tracker four times.

### C3 — The other readers still work

**Must be true:** `project_goal` no longer requires `stage`. The old calls `reader.epic_records` and `reader.slice_records` still work and use `all_records()`. The existing stage tests in `test_build_index.py` pass with the new failure text.

**Evidence to check:** Run `tests/test_build_index.py` and `tests/test_build_index_port.py`.

**Scoring:**
- 1.0: both pass.
- 0.5: they pass, but an assertion was weakened without a reason.
- 0.0: one fails.

## Regression check

- `uv run pytest tests/test_tracker_contract.py -q -m ''` passes, including a contract case for `all_records` on the fake, the files, and the beads replay.
- `uv run shared/build_index.py` on this repo exits 0 (set another session's untracked folders aside first).

## Out of scope — do not penalise

- The strip step and the `design-mode.md` schema edits. Slice 34 owns them.
- Board display. Slices 35 and 36 own it.
