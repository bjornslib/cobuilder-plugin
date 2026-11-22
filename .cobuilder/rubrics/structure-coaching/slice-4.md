# Rubric: Slice 4 — The coach uses the wording, repeats nothing, and is silent about smells for an unscanned extension

Feature: structure-coaching
Epic: E2
Slice goal: see row 4 of docs/plans/structure-coaching/04-slices.md
Test command: uv run pytest tests -q

## Criteria

### C1 — Structure text for every extension [CRITICAL]
**Must be true:** A GREEN write of a .go file gives a structure message and makes no habit-hooks call.
**Evidence to check:**
- Run tests/test_habit_coach.py and find the unscanned-extension case.
**Scoring:**
- 1.0 — tested and passes
- 0.5 — message but habit-hooks still called
- 0.0 — absent

### C2 — No repeat in a session [CRITICAL]
**Must be true:** A second write in the same session_id gives no repeat of the same finding. A new session gives it again. A missing session_id or a bad record file does not raise.
**Evidence to check:**
- Run tests/test_structure_runner.py.
**Scoring:**
- 1.0 — all four cases
- 0.5 — two or three
- 0.0 — fewer

### C3 — The approved wording is used
**Must be true:** The rendered text comes from shared/structure-messages.json, and no message text is hardcoded in the scripts.
**Evidence to check:**
- Read structure_runner.py and habit_coach.py for message strings.
- Find a test that changes a template and sees the new text.
**Scoring:**
- 1.0 — templates only, tested
- 0.5 — templates only, not tested
- 0.0 — hardcoded text

### C4 — The coach still never blocks
**Must be true:** The coach returns 0 in every hook-mode case, and the real habit-hooks failure message for a scanned file stays.
**Evidence to check:**
- Run tests/test_habit_coach.py.
**Scoring:**
- 1.0 — all pass
- 0.5 — —
- 0.0 — a failure

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope in the epic design must remain unchanged.

## Out of scope — do not penalise
- The install step (slice 5)
- Any cap on findings, which the design rules out
