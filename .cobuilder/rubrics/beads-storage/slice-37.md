Kind: test-suite

# Rubric: Slice 37 — E8 repair-status with a dry run

Feature: beads-storage
Epic: beads-storage/E8
Slice goal: `tracker.py repair-status [--dry-run] [--plans-dir DIR] [--index PATH]` stamps missing program stages and closes stale epics and slices by stated rules. A dry run writes nothing. A second run changes nothing. The GREEN work adds the tests itself, since the RED stage is skipped.
Test command: `uv run pytest tests/test_repair_status.py tests/test_repair_status_real.py tests/test_tracker_contract.py -q -m ''`

The new test files are `tests/test_repair_status.py` and `tests/test_repair_status_real.py` (slow). The fixtures are under `tests/fixtures/tracker/repair/`. A skip counts as no evidence for C3.

## Criteria

### C1 — The rules and the holds give the stated result [CRITICAL]

**Must be true:** `plan_repair(records, legacy_stages, merged)` is a pure function that returns `changes`, `holds`, `unresolved`, and `unchecked`. The fixture corpus covers each rule and each hold. A design at `approved`, `review`, `backlog`, or `decided` never gets a close, whatever the evidence says. An epic and its slices close when the design stage is `implemented` or `superseded`, or when a closed pull request record tracks the epic, or when the index file shows `joins.epic_status[epic] == "merged"`. The engineer states that `cobuilder-memory` is implemented, so a stage that the engineer stated closes its epics: the guard of the design (choice E) must not hold an epic of a design whose stage the engineer set. Every change carries its rule name.

**Evidence to check:** Read the rule test over the repair fixture. Check each rule name and each hold in the result.

**Scoring:**
- 1.0: every rule and every hold has an assertion, and the live designs never close.
- 0.5: the rules pass, but one hold is untested.
- 0.0: a live design gets a close.

### C2 — No GitHub call and the evidence sources are stated [CRITICAL]

**Must be true:** No code in `shared/tracker_port/` calls `gh`. The merged-pull-request evidence comes only from a closed pull request record and from the `--index` file. The CLI lists `repair-status` in `--help`, and the files adapter refuses it.

**Evidence to check:** Grep `shared/tracker_port/` for `gh ` and `subprocess`. Run `uv run shared/tracker.py --help`. Read the files-adapter test.

**Scoring:**
- 1.0: the grep is empty, the help lists the operation, and the files adapter refuses.
- 0.5: one of the three fails.
- 0.0: the port calls `gh`.

### C3 — A dry run writes nothing, and the run is idempotent [CRITICAL]

**Must be true:** A dry run leaves the fake state file unchanged and makes no write and no sync. A live run sets `_batching`, makes the writes, and publishes once. A second run returns an empty `changes`. A scratch tracker with a real bd repairs a corpus, runs again, and finds no change. A replay test stops after the stamps and resumes. A contract case checks the dry run on both adapters.

**Evidence to check:** Run the live file with `-m ''`. Read the call list of the dry run.

**Scoring:**
- 1.0: the live test ran and passed, and the dry run, the second run, and the resume tests pass.
- 0.5: the replay tests pass, and the live test skipped.
- 0.0: a dry run writes, or a second run changes a record.

### C4 — Stamps use the existing path

**Must be true:** A stamp or a create uses the code path of `set_program_stage`. A close uses `close --force` on a bd row, and the fake adapter sets the lifecycle.

**Evidence to check:** Read the call list in the replay test.

**Scoring:**
- 1.0: the calls match.
- 0.5: the result matches, but a separate code path is used.
- 0.0: the stamp skips the lifecycle rule.

## Regression check

- `uv run pytest tests/test_tracker_contract.py tests/test_tracker_cli.py -q` passes.
- `tests/test_tracker_docs.py` passes: no bd call appears outside `shared/tracker_port/`.

## Out of scope — do not penalise

- Running the repair on the live tracker. Slice 38 does that, by hand.
