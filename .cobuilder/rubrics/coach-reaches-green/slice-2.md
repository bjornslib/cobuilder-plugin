# Rubric: Slice 2 — E2: habit_coach.py --check and the install proof step

Feature: coach-reaches-green
Epic: E2
Slice goal: `--check` prints "coaching works" for a coached file and for a scanned clean file. It exits 1 for unscanned output, a missing command, and a repo with no probe file. Install mode ends with a step that runs it after every install. A blind agent given Install mode runs the proof last.
Test command: uv run pytest tests -q

## Criteria

### C1 — `--check` passes for a coached file and a scanned clean file [CRITICAL]
**Must be true:** `habit_coach.py --check` in a git repo picks a tracked source file, runs the hook path, and prints "coaching works" with exit 0 when habit-hooks reports findings, and also when it reports a clean scan of that file.
**Evidence to check:** two stubs on PATH, one that exits 1 with coaching text and one that passes with no "nothing scanned" text. Run `uv run plugins/implement/scripts/habit_coach.py --check` in a temporary git repo with one tracked `.py` file.
**Scoring:** 1.0 both cases print "coaching works", exit 0. 0.5 one case. 0.0 neither.

### C2 — `--check` fails honestly [CRITICAL]
**Must be true:** It exits 1 and prints the reason in these cases: the stub says "nothing scanned"; `habit-hooks` is missing; the repo has no tracked source file.
**Evidence to check:** run the three cases and read the exit code and text.
**Scoring:** 1.0 all three exit 1 with a distinct reason. 0.5 two. 0.0 any prints "coaching works" for a failing case.

### C3 — a real run on this repo
**Must be true:** With the real `habit-hooks`, `--check` run at the repo root and from `plugins/architect` both print "coaching works" and exit 0.
**Evidence to check:** run both. Compare the exit codes.
**Scoring:** 1.0 both. 0.5 root only. 0.0 fails.

### C4 — Install mode ends with the proof [CRITICAL]
**Must be true:** `plugins/implement/skills/build/SKILL.md` Install mode has a step after the `habit-hooks init` step and the snooze offer that runs `${CLAUDE_PLUGIN_ROOT}/scripts/habit_coach.py --check`. It says to run the step after every install and to report success only on "coaching works". The Prerequisite section no longer says the hook installs habit-hooks.
**Evidence to check:** read Install mode and the Prerequisite section. A blind agent follows them: give a fresh subagent only `SKILL.md` Install mode and a description of a repo that finished the init step. Ask it to list the commands it would run next, in order. Do not mention the proof.
**Scoring:** 1.0 the agent names the `--check` command as its last command and says it reports success only on "coaching works". 0.5 the agent runs it but not last, or reports success without reading the output. 0.0 the agent skips it.

### C5 — tests and the writing standard
**Must be true:** `tests/test_habit_coach.py` holds tests for C1, C2, and C4 that fail on the code from before this slice. The full suite passes. New prose uses no contractions and no semicolons.
**Evidence to check:** the test command. `uv run shared/skills/ste-writing/ste-lint.py` on `SKILL.md`.
**Scoring:** 1.0 all. 0.5 lint findings only. 0.0 failing tests.

## Regression check
The full suite must pass. Slice 1 tests must still pass.
