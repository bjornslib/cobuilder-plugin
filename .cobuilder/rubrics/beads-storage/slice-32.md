Kind: test-suite

# Rubric: Slice 32 — E8 the tracker creates the program record, and design mode says so

Feature: beads-storage
Epic: beads-storage/E8
Slice goal: `set-program-stage <program> <stage> --plans-dir DIR` creates a missing program record. A write refuses when two rows hold one cb id. `doctor` lists the duplicates. The engineer allowed skipping the RED stage, so the GREEN work adds the tests itself.
Test command: `uv run pytest tests/test_tracker_program_create.py tests/test_tracker_contract.py tests/test_tracker_docs.py tests/test_tracker_usage_doc.py -q -m ''`

The new test file is `tests/test_tracker_program_create.py`. Its real-bd test carries the `slow` mark, so the command needs `-m ''`. A skip counts as no evidence for C3.

## Criteria

### C1 — A missing program is created with its stage and texts [CRITICAL]

**Must be true:** `set_program_stage(program, stage, plans_dir)` on a missing program, with an existing `goal.json`, calls `create_record` once. The new record holds the stage, the title, the outcome as `description`, the done-when list as `acceptance_criteria`, `external_ref` equal to the program id, and the lifecycle of `program_lifecycle(stage, ())`. A closing stage closes the record. A held program behaves as before.

**Evidence to check:** Read the replay test of the whole create argv and the fake-adapter test. Run the test file.

**Scoring:**
- 1.0: both adapters are tested for each field above and the tests pass.
- 0.5: the create is tested, but one field is not asserted.
- 0.0: no create, or a held program changes behavior.

### C2 — The refusals exit 4 and the CLI takes `--plans-dir` [CRITICAL]

**Must be true:** A missing program with no `plans_dir` exits 4 with the existing message. A missing `goal.json` exits 4 and names the path. The files adapter still refuses. `tracker.py set-program-stage --help` lists `--plans-dir`.

**Evidence to check:** Read the CLI tests for the exit codes. Run `uv run shared/tracker.py set-program-stage --help`.

**Scoring:**
- 1.0: both refusals assert exit 4, and the flag is in the help.
- 0.5: one refusal is untested.
- 0.0: a refusal exits 0, or the flag is missing.

### C3 — A duplicate row makes the write refuse [CRITICAL]

**Must be true:** `_find_row` raises `AdapterError` when two rows hold the cb id, and the text names both bd ids. `doctor` has a field `duplicates` that lists the cb ids with two rows. A live test in a scratch tracker makes a second row with a raw create and checks that the write refuses.

**Evidence to check:** Run the live test with `-m ''`. Read the assertion on both bd ids and on `duplicates`.

**Scoring:**
- 1.0: the live test ran, passed, and asserts the refusal and the doctor field.
- 0.5: the replay test asserts it, and the live test skipped.
- 0.0: a duplicate row still lets a write through.

### C4 — A seed over a held program creates no second program

**Must be true:** `seed-from-files` over a plan whose program the tracker holds creates the epics and slices, and it creates no second program row.

**Evidence to check:** Read the seed test. It must count program rows before and after.

**Scoring:**
- 1.0: the count stays one, and the test passes.
- 0.0: no test, or a second row appears.

## Regression check

- `uv run pytest tests/test_tracker_contract.py tests/test_tracker_beads_seed.py -q` passes.
- A grep finds no `bd` call outside `shared/tracker_port/` (`tests/test_tracker_docs.py`).

## Out of scope — do not penalise

- The index change. That belongs to slice 33.
- The edits to section 12 of `design-mode.md`. Slice 34 owns them. Slice 32 owns edits 1 and 2 only.
