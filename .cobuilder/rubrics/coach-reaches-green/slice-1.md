# Rubric: Slice 1 — E1: scan from the git root, fail on nothing scanned, no self-install

Feature: coach-reaches-green
Epic: E1
Slice goal: A GREEN payload for a file in a sub-folder of a temporary git repo reaches the stub with the repo root as its working directory. Output that says "nothing scanned" becomes a failure notice. A missing command gives a notice that names `/implement:install` and installs nothing.
Test command: uv run pytest tests -q

## Criteria

### C1 — the hook runs from the git root [CRITICAL]
**Must be true:** For a file inside a sub-folder of a git repo, `habit-hooks` runs with its working directory set to the repo top, whatever the hook's own working directory is.
**Evidence to check:** build a temporary git repo with `sub/x.py`. Put a stub `habit-hooks` on PATH that writes its `pwd` to a file. Run `habit_coach.py` with a GREEN payload for `sub/x.py` while the shell sits in `sub/`. Read the file.
**Scoring:** 1.0 the stub saw the repo root from a sub-folder and from an unrelated directory. 0.5 only from the root. 0.0 the stub saw the hook's own directory.

### C2 — "nothing scanned" is a failure, never a pass [CRITICAL]
**Must be true:** Habit-hooks output that contains "nothing scanned" or "is not a file in this project" gives exit code 2 inside the hook and a GREEN message that says habit-hooks failed to run and to report it. This holds when habit-hooks itself exits 0.
**Evidence to check:** stub that prints `habit-sensors: --file 'x' is not a file in this project; nothing scanned` and a pass line, exit 0. Read the hook's JSON output.
**Scoring:** 1.0 both marker texts give the failure notice. 0.5 one text. 0.0 the hook stays silent.

### C3 — the hook no longer installs anything [CRITICAL]
**Must be true:** `install_habit_hooks` is gone. With no `habit-hooks` on PATH, the hook runs no `uv` command, returns exit code 127, and tells GREEN to run `/implement:install`, which names every language in one command.
**Evidence to check:** `grep -n "install_habit_hooks\|uv tool install" plugins/implement/scripts/habit_coach.py`. Run the hook with an empty PATH and read the output.
**Scoring:** 1.0 no install code and the notice names `/implement:install`. 0.5 the install code is gone but the notice still says `habit-hooks[python]` only. 0.0 any install code remains.

### C4 — a real run works
**Must be true:** With the real `habit-hooks` on this machine, a GREEN payload for `shared/build_index.py` returns coaching when started from `plugins/architect`, the same as from the repo root.
**Evidence to check:** run the hook twice and compare the first 200 characters of each output.
**Scoring:** 1.0 same coaching from both. 0.5 coaching from the root only. 0.0 silent from the sub-folder.

### C5 — tests are the new contract, and the deletion is justified
**Must be true:** `tests/test_habit_coach.py` holds tests for C1, C2, and C3 that fail on the old code. The seven tests that pinned the self-install are gone, and nothing else is deleted or weakened. A test run on the old script fails these new tests.
**Evidence to check:** `git diff master -- tests/test_habit_coach.py`. List removed test names. Run the new tests against `git show master:plugins/implement/scripts/habit_coach.py`.
**Scoring:** 1.0 new tests fail on old code and only the seven self-install tests are removed. 0.5 an extra test is removed or weakened. 0.0 a test is edited to force a pass.

### C6 — the writing standard
**Must be true:** New comments, docstrings, and messages use no contractions and no semicolons. No TODO, FIXME, HACK, or XXX marker.
**Evidence to check:** `grep` the changed lines. `uv run shared/skills/ste-writing/ste-lint.py plugins/implement/scripts/habit_coach.py`.
**Scoring:** 1.0 clean. 0.5 lint findings only. 0.0 a marker.

## Regression check
Run the test command. The result must be at least the 808 baseline passes, minus the seven deleted tests, plus the new ones.
