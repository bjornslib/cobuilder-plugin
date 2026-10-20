# Rubric: Slice 1 — the coach-check probe skips .js and .jsx files

Feature: coach-probe-skips-unscanned-files
Slice goal: `pick_probe_file` in `plugins/implement/scripts/habit_coach.py` no longer returns a `.js` or `.jsx` file. The habit-hooks typescript plugin scans only `**/*.ts` and `**/*.tsx`, so a `.js` probe makes habit-hooks print "outside [files]; nothing scanned", and `--check` reports a false failure.
Test command: uv run pytest tests/test_habit_coach.py -q

## Criteria

### C1 — a leading .js file no longer wins [CRITICAL]
**Must be true:** In a git repo whose `git ls-files` output lists a tracked `.js` file before a tracked `.py` file, `pick_probe_file` returns the `.py` file. The same holds for `.jsx` before `.ts`.
**Evidence to check:** build a temporary git repo with tracked `a.js` and `z.py`, then call `pick_probe_file`. Repeat with `a.jsx` and `z.ts`.
**Scoring:** 1.0 both pairs return the later file. 0.5 one pair. 0.0 either returns the `.js` or `.jsx` file.

### C2 — a repo with only .js or .jsx files has no probe [CRITICAL]
**Must be true:** With only `.js` and `.jsx` files tracked, `pick_probe_file` returns `None`, and `habit_coach.py --check` prints `coaching check failed: no tracked source file to probe in this project.` and exits with 1.
**Evidence to check:** temporary git repo with `only.js` and `only.jsx`. Call `pick_probe_file`. Then run `--check` from that repo and read the line and the exit code.
**Scoring:** 1.0 both hold. 0.5 only `pick_probe_file` returns `None`. 0.0 the `.js` file is still picked.

### C3 — the other languages still work
**Must be true:** `.py`, `.ts`, `.tsx`, `.php`, `.java`, and `.rb` files are each still picked.
**Evidence to check:** a parametrized test over these six extensions passes. A grep of `SOURCE_EXTENSIONS` in `habit_coach.py` lists all six and neither `.js` nor `.jsx`.
**Scoring:** 1.0 all six pass. 0.5 five pass. 0.0 fewer.

### C4 — a real run works on this machine
**Must be true:** `--check` run from `/Users/theb/Documents/Windsurf/think-with-ai` with the real `habit-hooks` prints a line that starts with `coaching works`.
**Evidence to check:** `cd /Users/theb/Documents/Windsurf/think-with-ai && uv run /Users/theb/Documents/Windsurf/cobuilder-plugin/plugins/implement/scripts/habit_coach.py --check`.
**Scoring:** 1.0 the line starts with `coaching works`. 0.0 anything else.

### C5 — tests are the contract, and the change is small [CRITICAL]
**Must be true:** `tests/test_habit_coach.py` holds new tests for C1 and C2 that fail on the old code. The `.js` and `.jsx` cases leave the "accepts each source extension" list, and no other test is removed or weakened. This slice changes only `plugins/implement/scripts/habit_coach.py` and `tests/test_habit_coach.py`. Other uncommitted edits already sit in this repo (tracker, install, and marketplace files). Another session made them. Ignore them, and do not touch them. All 72 baseline tests still pass or are accounted for.
**Evidence to check:** `git diff -- tests/test_habit_coach.py plugins/implement/scripts/habit_coach.py`. Run the new tests against `git show HEAD:plugins/implement/scripts/habit_coach.py`.
**Scoring:** 1.0 new tests fail on old code, only the two extension cases move, and this slice changed only the two named files. 0.5 an extra test is weakened or this slice changed a third file. 0.0 a test is edited to force a pass.

### C6 — the writing standard
**Must be true:** The module docstring says why `.js` and `.jsx` are not probe files. New comments and docstrings use no contractions and no semicolons. No TODO, FIXME, HACK, or XXX marker appears.
**Evidence to check:** read the changed lines. `uv run shared/skills/ste-writing/ste-lint.py plugins/implement/scripts/habit_coach.py`.
**Scoring:** 1.0 the reason is stated and the lines are clean. 0.5 lint findings only. 0.0 a marker, or no reason stated.

## Regression check

`uv run pytest tests/test_habit_coach.py -q` shows no failure that the baseline did not show.
