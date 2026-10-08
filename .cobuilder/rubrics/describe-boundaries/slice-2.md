# Rubric: Slice 2 — E2: design stage 1 and stage 6

Feature: describe-boundaries
Epic: E2
Slice goal: `design-mode.md` runs the check and describe in stage 1, and the stage 6 reviewer fails a design when `--require` exits non-zero. A blind agent given the file follows the order.
Test command: uv run pytest tests -q --deselect tests/test_commands.py::test_odyssey_review_name_appears_nowhere_in_prose

This slice edits a file that governs another mode's procedure. Score behavior, not wording. Evidence is a transcript of one fresh subagent.

## Criteria

### C1 — stage 1 lists touched paths, then runs the check [CRITICAL]
**Must be true:** A fresh agent given only `design-mode.md` and a realistic task ("design a change to the `shared/` index builder") writes down the paths the change touches before it runs `boundary_check.py --paths`. It runs the check before it reads the challenge stage.
**Evidence to check:** the blind agent's tool-call transcript, in order.
**Scoring:** 1.0 paths first, check second. 0.5 check runs with no path list. 0.0 no check.

### C2 — describe runs for stale, missing, and uncovered areas only [CRITICAL]
**Must be true:** In the transcript, the agent invokes describe through `Skill("architect:architecture", args="describe ...")` or states it would, for a context reported `stale`, `missing`, or `uncovered`. It does not invoke describe for a context reported `ok`.
**Evidence to check:** the transcript with a check output that mixes `ok` and `stale`.
**Scoring:** 1.0 describes only the non-ok areas. 0.5 describes all. 0.0 never describes.

### C3 — the check runs again after describe
**Must be true:** After describe, the agent reruns the check and proceeds only when it is clean.
**Evidence to check:** the transcript.
**Scoring:** 1.0 reruns. 0.5 states it but does not run it. 0.0 no rerun.

### C4 — stage 6 fails a design on a non-zero exit [CRITICAL]
**Must be true:** `design-mode.md` stage 6 tells the reviewer to run `boundary_check.py --require` for the design's touched paths. It makes a non-zero exit a FAIL finding that cites the context id or path. A fresh agent playing the reviewer, given a repo with a stale context, reports FAIL.
**Evidence to check:** read stage 6. Read the second blind transcript.
**Scoring:** 1.0 written and followed. 0.5 written, not followed. 0.0 absent.

### C5 — wiring test and standard
**Must be true:** `tests/test_describe_integration.py` has cases that fail when `design-mode.md` drops the stage 1 call or the stage 6 rule. `SKILL.md` says design calls describe. Prose passes the writing standard.
**Evidence to check:** run the new tests. Remove the stage 6 sentence in a scratch copy and confirm a test fails. Run `ste-lint.py`.
**Scoring:** 1.0 all. 0.5 tests exist but pass without the sentence. 0.0 no tests.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged: baseline files, the script, the README.

## Out of scope — do not penalise
- Baseline calling describe. Slice 3 does that.
- Changing the design stage order, or adding a stage.
