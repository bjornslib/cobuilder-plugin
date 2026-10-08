# Rubric: Slice 3 — E3: self-only describe in baseline, and the docs

Feature: describe-boundaries
Epic: E3
Slice goal: `baseline-derivation.md` and `SKILL.md` run describe per district for self-analysis only, and keep describe-lite for `--repo`. A blind agent given a `--repo` run does not call describe. `SKILL.md` marks describe internal and names its two callers.
Test command: uv run pytest tests -q --deselect tests/test_commands.py::test_odyssey_review_name_appears_nowhere_in_prose

This slice edits files that govern a mode's procedure. Score behavior from blind transcripts.

## Criteria

### C1 — self-analysis baseline describes districts without a current record [CRITICAL]
**Must be true:** A fresh agent given the baseline files and the task "baseline this repo (no `--repo`)" derives the district map first. It then runs `boundary_check.py` and invokes describe through `Skill("architect:architecture", args="describe ...")` for each district whose record is missing or stale. It skips a district that is `ok`.
**Evidence to check:** the blind transcript.
**Scoring:** 1.0 as written. 0.5 describes every district without the check. 0.0 never describes.

### C2 — a `--repo` baseline never calls describe [CRITICAL]
**Must be true:** A second fresh agent given the task "baseline `--repo ~/code/other`" derives the district map and the inventory only. It does not invoke describe and does not write `docs/architecture/contexts/` in any repo.
**Evidence to check:** the second transcript. Grep it for `describe`.
**Scoring:** 1.0 no describe. 0.0 any describe call.

### C3 — baseline names the mode and not a plugin path
**Must be true:** The baseline files call describe by `Skill("architect:architecture", ...)`. They contain no `plugins/architect/` path.
**Evidence to check:** `grep -rn "plugins/architect" plugins/pr`.
**Scoring:** 1.0 none. 0.0 a path appears.

### C4 — SKILL.md marks describe internal and names the callers
**Must be true:** The `architecture` `SKILL.md` line for describe says it is internal, has no command file, and is called by design mode and by `pr:baseline` for self-analysis. The README and the umbrella routing guide do not list `/architect:describe` as a command.
**Evidence to check:** read the line. `grep -rn "architect:describe" README.md plugins/cobuilder-full-lifecycle`.
**Scoring:** 1.0 all. 0.5 SKILL.md only. 0.0 not updated.

### C5 — wiring tests and the writing standard
**Must be true:** `tests/test_describe_integration.py` has cases that fail when the baseline files drop the self-only rule or the call. Prose passes the writing standard. The architect version in `plugin.json` and `marketplace.json` match.
**Evidence to check:** run the tests. Break the rule in a scratch copy. Run `ste-lint.py`.
**Scoring:** 1.0 all. 0.5 tests do not catch the break. 0.0 no tests.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged: the script, design-mode.md.

## Out of scope — do not penalise
- A cap on district count, or a skip flag.
- Foreign-repo describe.
