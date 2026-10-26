Kind: behavioral

# Rubric: Slice 31 — E8 spike notes into the adapter notes

Feature: beads-storage
Epic: beads-storage/E8
Slice goal: The adapter notes hold a new section, "Program stage in the tracker". Each spike finding has its command and its exit code. The slice changes no code.
Test command: `uv run pytest tests/test_tracker_docs.py -q` (regression only. The slice has no suite test of its own.)

## Criteria

### C1 — Each finding has a command and an exit code [CRITICAL]

**Must be true:** The section "Program stage in the tracker" in `shared/tracker-adapter-beads.md` holds one row for each of these findings: the counts and the drift between `goal.json` and the tracker, the write to a missing program (exit 4), the create of a program with its texts, the duplicate rows with the invisible write, the bd call count and time of the index build, and the ready call. Each row gives the command and the observed exit code.

**Evidence to check:** Read the section. Count the six findings. For each row, find the command and the exit code.

**Scoring:**
- 1.0: all six findings appear, and each has a command and an exit code.
- 0.5: all six appear, but one row has no exit code or no command.
- 0.0: a finding is missing, or an exit code comes from the design text and no run.

### C2 — The notes name the version and the manual cleanup [CRITICAL]

**Must be true:** The section names bd 1.3.0. It records the manual cleanup of a duplicate program row: close the newer row with `bd close <bd id> --force`, then sync.

**Evidence to check:** Read the section for the version and the cleanup steps.

**Scoring:**
- 1.0: the version and both cleanup steps appear.
- 0.5: the cleanup appears, but the version is missing.
- 0.0: the cleanup is missing.

### C3 — The slice changes no code

**Must be true:** The slice changes no file under `shared/tracker_port/`, `plugins/`, or `tests/`. Only `shared/tracker-adapter-beads.md` changes.

**Evidence to check:** List the files that the slice changed (`git show --stat` of its commit).

**Scoring:**
- 1.0: only the adapter notes changed.
- 0.5: a comment-only change in a code file.
- 0.0: behavior changed in a code file.

## Regression check

- `uv run pytest tests/test_tracker_docs.py -q` passes.
- `ste-lint.py` scores `shared/tracker-adapter-beads.md` no worse than its base.

## Out of scope — do not penalise

- Any change to the port, the index, or design mode. Slices 32 to 38 own those.
- The wording of the notes, when each row carries its command and exit code.
