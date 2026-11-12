# Rubric: Slice 1 — Tracer bullet: a crowded folder reaches GREEN

Feature: structure-coaching
Epic: E1
Slice goal: see row 1 of docs/plans/structure-coaching/04-slices.md
Test command: uv run pytest tests -q

## Criteria

### C1 — A new file in a crowded folder gives a coach message [CRITICAL]
**Must be true:** A PostToolUse payload from implement:green for an untracked file in a folder over the limit gives additionalContext that names the folder, the file count, and the limit.
**Evidence to check:**
- Run the test command.
- Read tests/test_structure_signals.py and tests/test_habit_coach.py for a crowded-folder case that asserts on the JSON output, not on prose.
**Scoring:**
- 1.0 — the case exists, runs the real signal code, and passes
- 0.5 — the case passes but uses a fake signal result
- 0.0 — no such case, or it fails

### C2 — An old file gives no structure text [CRITICAL]
**Must be true:** A committed file that is not added since the merge-base gives no structure finding, also in a crowded folder.
**Evidence to check:**
- Find the test for a committed old file in a crowded folder.
- Check that a repo with no merge-base still counts untracked and staged files as new.
**Scoring:**
- 1.0 — both cases are tested and pass
- 0.5 — one case only
- 0.0 — neither

### C3 — The coach never blocks and keeps its GREEN filter
**Must be true:** habit_coach.main returns 0 for every input, and a caller other than implement:green gets no output.
**Evidence to check:**
- Run tests/test_habit_coach.py.
- Read habit_coach.py for the agent_type filter.
**Scoring:**
- 1.0 — all existing coach tests pass and the filter is unchanged
- 0.5 — tests pass but the filter moved
- 0.0 — a test fails or the filter is gone

### C4 — The spike evidence is kept
**Must be true:** A transcript or log shows one real hook run, not a unit test, that delivered a crowded-folder message, with the time for that write.
**Evidence to check:**
- Look in the slice evidence folder and the GREEN report for the spike transcript.
**Scoring:**
- 1.0 — transcript with the message and the time
- 0.5 — transcript without the time
- 0.0 — no transcript

### C5 — The default limit and the count
**Must be true:** With no config file, the folder limit is 20. Test files count toward the folder total.
**Evidence to check:**
- Run a test or a script call on a synthetic folder of 21 files, of which 10 are test names, with no config file.
**Scoring:**
- 1.0 — a finding with limit 20 and count 21
- 0.5 — the limit is 20 but test files do not count
- 0.0 — another limit

### C6 — No crowded finding for a folder with no code file
**Must be true:** A new file in a folder over the limit gives no crowded-folder finding when the folder holds no file with a code suffix, such as a folder of 25 Markdown files.
**Evidence to check:**
- Run the script on a synthetic folder of 25 `.md` files and on one of 25 files with one `.py` file.
**Scoring:**
- 1.0 — no finding for the first, a finding for the second
- 0.5 — —
- 0.0 — a finding for the first, or none for the second

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope in the epic design must remain unchanged.

## Out of scope — do not penalise
- The name-stem cluster and generic-name signals (slice 2)
- The approved wording (slice 3)
- No repeat in a session (slice 4)
