# Rubric: Slice 3 — E3: the maintenance mode pair diff, its wiring tests, and the commands

Feature: habit-smells
Epic: E3
Slice goal: `SKILL.md` "### Maintenance Mode" runs the same script, tags each pair against the prior report's Mechanical smells section, and feeds the pairs into the trend report. Both command files name the step.
Test command: uv run pytest tests -q

This slice edits a file that governs another mode's procedure. Score behavior, not wording. Evidence is a transcript of one fresh subagent.

## Criteria

### C1 — the same script runs, then the pair diff [CRITICAL]
**Must be true:** A fresh agent given only `SKILL.md` maintenance mode and a realistic task runs the script through the documented call before it reads the prior report. It diffs each pair of smell and file between `habit-smells.json` and the prior report's Mechanical smells section.
**Evidence to check:** the blind agent's tool-call transcript, in order, with a prior `habit-smells.json` record and a prior report provided.
**Scoring:** 1.0 script first, prior report second, diff third. 0.5 it compares against a report but skips the prior reads in some order, or no prior-record read. 0.0 no diff.

### C2 — the four tags [CRITICAL]
**Must be true:** A pair in the prior report and not now is RESOLVED. A pair not in the prior report is NEW. A pair whose count rose is ESCALATED. An unchanged pair is STABLE. The trend report states each tag.
**Evidence to check:** the transcript with input that carries one pair per case.
**Scoring:** 1.0 all four correct. 0.5 three or fewer correct, or a missing tag for an existing pair. 0.0 no tags.

### C3 — no prior scan
**Must be true:** When no prior report or prior habit-smells record exists, the run states the first-scan case instead of tagging pairs against nothing.
**Evidence to check:** the transcript with no prior artifact.
**Scoring:** 1.0 first-scan statement, no tags. 0.5 it proceeds but the tags name no baseline. 0.0 it invents a baseline.

### C4 — the commands name the step
**Must be true:** `commands/review.md` and `commands/maintenance.md` each carry text about the habit-hooks step. A fresh agent reading `commands/maintenance.md` expects the step in its run.
**Evidence to check:** read both files. Read the second blind transcript for the expectation.
**Scoring:** 1.0 both files and the behavior. 0.5 one file. 0.0 neither.

### C5 — the wiring tests and the standard [CRITICAL]
**Must be true:** `tests/test_habit_smells_integration.py` has cases that fail when `SKILL.md` drops the script call, the four tags, the prior-report diff, or when `commands/maintenance.md` drops its text. Prose passes the writing standard.
**Evidence to check:** run the new tests. Remove one rule in a scratch copy and confirm a test fails. Run `ste-lint.py`.
**Scoring:** 1.0 all. 0.5 tests exist but pass without the prose. 0.0 no tests.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged: the script, the gate key, the review mode section, `commands/review.md`, and `plugins/pr`.

## Out of scope — do not penalise
- Review mode's classification rules. Slice 2 does that.
- A change to the script's flags or output file. Slice 1 did that.