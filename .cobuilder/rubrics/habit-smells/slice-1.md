# Rubric: Slice 1 — E1: `habit_smells.py`, the `habit.smells` gate key, and the scan tests

Feature: habit-smells
Epic: E1
Slice goal: The script writes `habit-smells.json` from a stub `habit-sensors`, records an incomplete run and a missing tool, and prints a summary. `verify_bundle.py` reports `habit.smells` as `ok`, `stale`, or nothing.
Test command: uv run pytest tests -q

## Criteria

### C1 — a full run writes grouped findings [CRITICAL]
**Must be true:** In a temporary fixture repo with a stub `habit-sensors` on PATH, `uv run shared/habit_smells.py --out <dir> --branch <base> --repo <fixture>` writes a `habit-smells.json` that groups the stub's findings per smell and per file, records the branch base, and marks the run complete. The stub receives `--branch <base>` and `--json` on its command line.
**Evidence to check:** run the script against a fixture repo you build yourself. Read `habit-smells.json` and the stub argv your harness captured.
**Scoring:** 1.0 file, grouping, branch, and argv all correct. 0.5 file present but grouping or the branch is wrong. 0.0 no file.

### C2 — incomplete run and missing tool are recorded [CRITICAL]
**Must be true:** When the stub prints an incomplete-run notice, the file holds `run_complete: false` and the tool name. When no `habit-sensors` is on PATH, the file holds `available: false` with a reason. The script does not crash in either case.
**Evidence to check:** run both cases against fixture repos and read the JSON.
**Scoring:** 1.0 both. 0.5 one. 0.0 neither, or a crash.

### C3 — the summary prints
**Must be true:** The script prints a per-group summary to stdout. The file stays the machine record.
**Evidence to check:** read stdout.
**Scoring:** 1.0 readable summary. 0.5 prints the whole record. 0.0 nothing.

### C4 — the `habit.smells` gate key [CRITICAL]
**Must be true:** `shared/verify_bundle.py` reports `habit.smells` as `ok` when `habit-smells.json` exists with `run_complete` true and the branch base within 200 commits of HEAD, as `stale` past 200, and as nothing when the file is missing. It joins the optional prefixes, so it never turns a passing bundle into a failing one.
**Evidence to check:** run the three cases. Run `uv run shared/verify_bundle.py --bundle-dir .cobuilder-architect/self` and confirm the overall result matches the pre-slice baseline.
**Scoring:** 1.0 all three states and no failure. 0.5 states work but a missing file reports something, or the key is required. 0.0 missing.

### C5 — tests and the writing standard [CRITICAL]
**Must be true:** `tests/test_habit_smells.py` exists and passes. The fixture uses a stub on PATH, never the real tool. `uv run pytest tests -q` passes.
**Evidence to check:** the test command. `uv run shared/skills/ste-writing/ste-lint.py` on the changed files.
**Scoring:** 1.0 all. 0.5 lint violations. 0.0 failing tests.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged: the SKILL.md mode sections, the commands, and `plugins/pr`.

## Out of scope — do not penalise
- Review and maintenance prose. Slices 2 and 3 do that.
- Trending and tagging. That is E3.