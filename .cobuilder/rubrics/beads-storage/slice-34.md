Kind: behavioral

# Rubric: Slice 34 — E8 the strip step and the schema change

Feature: beads-storage
Epic: beads-storage/E8
Slice goal: `shared/strip_goal_stage.py` removes `stage` from a `goal.json` only when the tracker holds the same value. Design mode writes no `goal.stage` when a tracker exists. The engineer allowed skipping the RED stage, so the checks below are smoke runs and the tests that the GREEN work adds.
Test command: `uv run pytest tests/test_strip_goal_stage.py tests/test_sparse_design_corpus.py tests/test_tracker_docs.py -q`

The new test file is `tests/test_strip_goal_stage.py`. Another session may leave an untracked design folder that breaks the sparse-design test. The scorer sets it aside first.

## Criteria

### C1 — The strip removes the key only when the tracker agrees [CRITICAL]

**Must be true:** With a fake tracker and three designs (same stage, a different stage, no program), only the first loses the `stage` key. The report lists `stripped`, `kept` with its reason (`no program`, `no stage`, or `differs`), and `no stage field`. With no tracker config, the script exits 0 and reports each file as `kept: no tracker`. The script never reads the files adapter as a tracker.

**Evidence to check:** Run the test file. Then copy a design folder to a temp dir and run the script with `--dry-run` and without it.

**Scoring:**
- 1.0: the three-design test passes and the no-tracker run exits 0 with the stated report.
- 0.5: the three designs pass, but the no-tracker case is untested.
- 0.0: a key is removed while the tracker holds another value or none.

### C2 — The strip keeps the file shape and is idempotent [CRITICAL]

**Must be true:** The script keeps the key order and the indent of the file. A dry run writes nothing. A second run strips nothing.

**Evidence to check:** Compare the file bytes before and after a dry run. Run the script twice and read the second report.

**Scoring:**
- 1.0: the dry run leaves the bytes equal, and the second run strips nothing.
- 0.5: one of the two holds.
- 0.0: a dry run writes, or the key order changes.

### C3 — Design mode and the other prose write no `goal.stage`

**Must be true:** Edits 3 to 8 of the E8 design land in `design-mode.md` and in the architect `SKILL.md`. The §12 schema example holds no `stage`, and no `branch`, `pr`, or `state` in `epics[]`. The odyssey `SKILL.md` reads the stage with `tracker.py list-programs`, and calls `tracker.py set-program-stage <design> implemented` or `approved`. `CLAUDE.md` says the resolved stage must be one of `DESIGN_STAGES`. Each `tracker.py` operation a doc names is a subcommand of `tracker.py --help`.

**Evidence to check:** Read the schema block and the three prose files. Run `tests/test_tracker_docs.py`.

**Scoring:**
- 1.0: every listed edit is present and the docs test passes.
- 0.5: one edit is missing.
- 0.0: design mode still tells the reader to write `goal.stage` when a tracker exists.

### C4 — A design with no goal stage is accepted

**Must be true:** `tests/test_sparse_design_corpus.py` accepts a design with no goal stage when `stage_source` is `tracker`.

**Evidence to check:** Run the test with another session's folders set aside.

**Scoring:**
- 1.0: the test passes.
- 0.0: it fails.

## Regression check

- `uv run pytest tests/test_build_index.py -q` passes.
- `ste-lint.py` scores each edited doc no worse than its base.

## Out of scope — do not penalise

- Running the strip on the live repo. Slice 38 does that, by hand.
