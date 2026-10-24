Kind: behavioral

# Rubric: Slice 30 — E7 docs, install, usage

Feature: beads-storage
Epic: beads-storage/E7
Slice goal: The usage guide names `claim-next` and `migrate-mapping` as moment rows. `slice-loop.md` names `claim-next` as the way to take the next slice. `install.md` says that an existing tracker needs `migrate-mapping`, and that a snapshot comes first. The adapter notes drop the obsolete sections. Each tracker.py operation that a doc names is a subcommand.
Test command: `uv run pytest tests/test_tracker_docs.py tests/test_tracker_usage_doc.py tests/test_install_tracker_config.py tests/test_install_command.py tests/test_prose_budget.py -q`

The slice changes docs and one hook reminder. It changes no adapter code.

## Criteria

### C1 — Each operation a doc names is a subcommand of `tracker.py` [CRITICAL]

**Must be true:** Every `tracker.py` operation that the usage guide, `slice-loop.md`, `install.md`, and the hook reminder name appears in the output of `uv run shared/tracker.py --help`, and it includes `claim-next` and `migrate-mapping`. A reader who runs the usage examples gets the output that the guide shows.

**Evidence to check:** Run `tracker.py --help`. Extract the operation names from the four texts, and check each against the help. Run `tests/test_tracker_usage_doc.py`.

**Scoring:**
- 1.0: every name resolves, and the usage test passes.
- 0.5: every name resolves, but the usage test was not run.
- 0.0: a doc names an operation that is not a subcommand.

### C2 — The docs name no bd command outside the adapter notes [CRITICAL]

**Must be true:** `tests/test_tracker_docs.py` passes, and a grep finds no `bd` command in `tracker-usage.md`, `slice-loop.md`, `install.md`, or the hook reminder. The port rule holds: only `shared/tracker_port/` calls bd.

**Evidence to check:** Run the test and the grep. Read the result.

**Scoring:**
- 1.0: the test passes and the grep is empty.
- 0.5: the test passes, but one doc holds a bd command in an example.
- 0.0: the test fails, or a doc tells the reader to run bd.

### C3 — The obsolete sections are dropped and the build still runs [CRITICAL]

**Must be true:** The adapter notes no longer hold the sections that ADR-0044 lists under "Obsolete after this ADR", or they carry a pointer to ADR-0044 in place of the text. `uv run shared/build_index.py` exits 0, and `uv run shared/prose_budget.py check` and `ste-lint.py` pass on the changed docs.

**Evidence to check:** Run the three commands. Read each exit code. Compare the notes with the list in ADR-0044.

**Scoring:**
- 1.0: all three commands exit 0 and no listed section remains as live text.
- 0.5: the commands pass, but one listed section remains as live text.
- 0.0: a command fails.

### C4 — `install.md` asks for a snapshot first

**Must be true:** `install.md` states, for an existing tracker, that a `bd export` snapshot comes first, then `migrate-mapping --dry-run`, then the run. The install tests pass with that text.

**Evidence to check:** Run `tests/test_install_command.py`. Check the order of the three steps in the file.

**Scoring:**
- 1.0: the order is right and the tests pass.
- 0.5: the order is right, but a test needed a change that is not explained.
- 0.0: the dry run or the snapshot step is missing.

## Regression check

- `uv run pytest tests/test_tracker_docs.py tests/test_install_command.py -q` passes.
- The Hindsight allow rules in the setup skill still match the names in `hindsight.ts`, so `tests/test_install_command.py` stays green.

## Out of scope — do not penalise

- The wording of the docs, when the checks pass.
- The adapter code. Slices 24 to 29 own it.
