Kind: test-suite

# Rubric: Slice 9 — Fresh clone initializes and syncs

Feature: beads-storage
Epic: E2
Slice goal: In a temp directory, with real `bd` and `git` and no stubs, a fresh git clone of the seeded origin runs `bd init --remote`, `bd list --json`, and `bd sync` with exit 0. A second fresh clone sees the same records.
Test command: `uv run pytest tests/test_tracker_beads.py -q -k fresh_clone`

## Criteria

### C1 — The first fresh clone initializes, lists, and syncs without error [CRITICAL]
**Must be true:** in the first fresh clone, `bd init --remote`, `bd list --json`, and `bd sync` each exit 0. No line of their combined output starts with `Error`. The sorted ids from `bd list --json` equal the ids that the seed created.
**Evidence to check:**
- `uv run pytest tests/test_tracker_beads.py -q -k fresh_clone -s` exits 0. The `-s` flag keeps the printed transcript.
- The printed transcript shows the exit code of each command.
- Read the transcript: no line begins with `Error`.
**Scoring:**
- 1.0 — all three commands exit 0, no error line appears, and the ids match.
- 0.5 — the commands exit 0, but an error-free check or the id check is missing from the output.
- 0.0 — any command exits non-zero, any error line appears, or the ids differ.

### C2 — A second fresh clone sees the same programs, epics, and slices [CRITICAL]
**Must be true:** the second fresh clone, made from the same origin, runs the same three commands with exit 0. Its counts per kind (program, epic, slice, pr) equal the counts in the first clone.
**Evidence to check:**
- The transcript shows a second `git clone` and the same three `bd` commands in a second directory.
- Read the test: it compares the per-kind counts of both clones.
**Scoring:**
- 1.0 — the second clone exits 0 for all commands, and its counts match the first clone.
- 0.5 — the second clone exits 0, but the counts are not compared.
- 0.0 — the second clone fails, or its counts differ.

### C3 — The run stays in its temp directory
**Must be true:** every `bd` and `git` command runs in the temp directory or in a clone under it. The run creates no file in the repository and changes no file outside the temp directory.
**Evidence to check:**
- The transcript prints the working directory of each command, and each one sits under the temp directory.
- Read the test: it uses `tempfile.TemporaryDirectory` and removes the directory when the test ends.
- `git status --short` in the repository shows no new file from the run. The rubric file and the design file are the only expected changes.
**Scoring:**
- 1.0 — every command runs under the temp directory, and the directory is removed.
- 0.5 — every command runs under the temp directory, but the directory is not removed.
- 0.0 — any command runs outside the temp directory, or the repository changes.

## Regression check

- `uv run pytest tests/test_tracker_beads.py -q -k "transcripts or list_json or dry_run"` still passes. These are the slice 6 to 8 cases.
- `bd --version` reports the version that the transcripts record (1.3.0).

## Out of scope — do not penalise

- The number of records in the mini plan, as long as the first and second clones agree with the seed.
- The exact `bd` output text, as long as the exit codes and the id and count checks hold.
- The internal structure of the test helpers.
- The consent wording in `shared/tracker-adapter-beads.md`. That file is checked in its own slice review.
