# Rubric: Slice 10 — the root test files

Feature: mechanical-smells
Epic: E2
Slice goal: `habit-sensors` reports no finding, other than `duplicated-code` and `non-essential-comment`, for the 30 root `tests/*.py` files that carried findings. Every test function name, every parameter id, and every `assert` stays.
Test command: uv run pytest tests -q && (cd plugins/artifact/viewer && npm run typecheck && npm run test)

Terms used below. **S** is the commit before the slice's first commit. To read S, run `git worktree add --detach /tmp/before-10 S`. **Sensor command** for a file F, run from the repo root:

```
habit-sensors --file F | python3 -c 'import sys,json;d=json.load(sys.stdin);p=sys.argv[1];print([(s["smell"],i["details"].get("line")) for s in d for i in s["issues"] if i["details"].get("file")==p])' F
```

The filter on `details.file` is required, because jscpd reports repo-wide clusters in `--file` mode. The **slice files** are the 30 root `tests/*.py` files that carried findings at S (45 findings: 26 oversized-file, 8 unused-import, 6 unused-variable, 3 high-complexity, 1 oversized-function, 1 too-many-parameters), plus every new test file or helper module the slice adds. 26 of the 30 files are over 200 lines at S. List them at S with `python3 -c 'from tests._repo_habit_slices import SLICES;print(SLICES[10])'` (run in the working tree) and by running the sensor command at S. The **limits** are: a file of 200 lines or fewer, a function of 12 lines or fewer, a complexity of 10 or less, and 3 parameters or fewer. The **ignored smells** are `duplicated-code` and `non-essential-comment`. The **baseline at S** for the whole repo is: pytest `2765 passed, 1 skipped` (127 slow tests are deselected, and `-m ''` runs them), and vitest `260 passed`. Read the finding counts per smell at S by command, not from memory. The **test inventory** is the output of `uv run pytest --collect-only -q`. A pytest node id holds the module path, so a split changes it. Compare the function name and the parameter id only. Make the **name set** from each line with `sed -E 's/^[^:]*:://'`. Count `assert` statements with:

```
find tests -name '*.py' | xargs cat | grep -cE '^\s*assert\b'
```


## Criteria
### C1 — the 30 test files report no finding [CRITICAL]
**Must be true:** Every slice file, and every new test file or helper, reports no finding except the ignored smells. That includes no `oversized-file`, `unused-import`, `unused-variable`, `high-complexity`, `oversized-function`, or `too-many-parameters`. A file is 200 lines or fewer. A residual `oversized-function` of 13 to 30 lines is allowed only when it is one test case or one setup unit, and the catalog section 7 lists it with its file and unit.
**Evidence to check:** Run the sensor command for each of the 30 files and each new file. List new files with `git diff --name-status S..HEAD -- tests`. Run `wc -l tests/*.py tests/**/*.py` and check that no file is over 200 lines. Confirm at S, in `/tmp/before-10`, that 26 files were over 200 lines.
**Scoring:**
- 1.0 — zero findings other than ignored smells, or only catalog-listed residuals, and every file is within 200 lines.
- 0.5 — at most five findings remain, or a residual is unlisted.
- 0.0 — more than five findings remain, or a file is over 200 lines.

### C2 — no test and no assertion was lost [CRITICAL]
**Must be true:** The name set of `uv run pytest --collect-only -q` after the slice holds every name of the set at S, with parameter ids. Slow tests count too. The `assert` count is at least the count at S. The suite reports at least `2765 passed, 1 skipped`. `tests/test_python_tests_preserved.py` and `tests/fixtures/python_test_names.json` exist, were taken at S, and pass. The pin also checks the `assert` count.
**Evidence to check:** In both trees run `uv run pytest --collect-only -q -m '' | grep '::' | sed -E 's/^[^:]*:://' | sort > /tmp/names-<tree>.txt`, and `diff` the two files. Only added lines may appear. Run the `assert` count command in both trees. Run `uv run pytest tests/test_python_tests_preserved.py -q`. Check the fixture came from S with `git log --diff-filter=A --format=%h -- tests/fixtures/python_test_names.json` and by diffing the names against `/tmp/names-before.txt`. Delete one test function, run the guard, see it fail, and restore the file.
**Scoring:**
- 1.0 — the diff shows no removed name, the `assert` count did not fall, the guard passes, and the guard fails on its break.
- 0.5 — the names are identical, but the `assert` count fell by up to five and the diff shows the removed asserts were duplicates, or the guard does not fail on its break.
- 0.0 — any name is missing, the `assert` count fell by more, or the guard is missing.

### C3 — the tests still test the code [CRITICAL]
**Must be true:** A deliberate break in a script that a split test file covers fails tests. After the slice, the same break fails the same tests (by function name and parameter id) as at S. A moved test did not lose its fixtures, markers, or parametrization.
**Evidence to check:** Pick one test file that was split (read it from `git diff S..HEAD --stat`). Name the script it tests. In `/tmp/before-10` flip one return value in that script, run `uv run pytest tests -q --no-header -p no:cacheprovider`, and record the failing names with the `sed` command of Terms. Restore the file. Repeat in the working tree. Do it for a second split test file and a second script. The failing name sets must match. Run `uv run pytest tests -q -m ''` and check that the slow tests (the `slow` marker) still run: `uv run pytest --collect-only -q -m slow | tail -1` gives the same count in both trees.
**Scoring:**
- 1.0 — both breaks fail the same names at S and now, and the slow count is equal.
- 0.5 — both break something, but the sets differ by up to three names.
- 0.0 — a break passes silently now, or the slow count fell.

### C4 — only test-side files changed
**Must be true:** The slice changes the 30 test files, the new test files and helpers, the slice table of the sensor check, the new guard and its fixture, and the catalog's residual list. It changes no script in `shared/` or `plugins/`, and no viewer or memory file.
**Evidence to check:** Run `git diff --name-only S..HEAD` and read the list. Run `git diff S..HEAD -- shared plugins .claude` and check it is empty for non-test paths.
**Scoring:**
- 1.0 — only test-side files.
- 0.5 — a source file changed, and the change is an import path.
- 0.0 — a source file changed in behavior.

### C5 — the sensor check and the pins cover this slice
**Must be true:** `SLICES[10]` in `tests/_repo_habit_slices.py` lists the 30 files, and `IGNORED_SMELLS[10]` holds the two ignored smells. The entry allows only the catalog-listed residuals. The export pin holds each new test helper that others import. The command-line pin is unchanged.
**Evidence to check:** Run `uv run pytest tests/test_repo_habit_clean.py tests/test_python_exports.py tests/test_script_cli_stable.py -q`. Run `git diff S..HEAD -- tests/fixtures/script_help.json` and check that it is empty.
**Scoring:**
- 1.0 — the entry lists 30 files, and all pins pass unchanged.
- 0.5 — the entry lists fewer than 30 files.
- 0.0 — no entry for slice 10, or `script_help.json` changed.

### C6 — no suppression, no new comment or duplication finding [CRITICAL]
**Must be true:** The slice adds no `noqa`, no `# type:` ignore comment, no `eslint-disable`, no `@ts-ignore`, no `as any`, no snooze entry, and no config exclusion. The 8 unused imports and 6 unused variables are deleted, not silenced. The `duplicated-code` and `non-essential-comment` counts of the 30 files do not rise above the counts at S.
**Evidence to check:** `git diff S..HEAD | grep '^+' | grep -E 'noqa|# *type: *ignore|eslint-disable|@ts-ignore|as any|snooze'` must print nothing. Run `git diff --name-only S..HEAD | grep -E 'pyproject|habit|sensor|snooze'` and read any config change. Run the sensor command for each file now and in `/tmp/before-10`, and compare the counts of the two ignored smells per file and in total.
**Scoring:**
- 1.0 — no suppression, and neither count rose.
- 0.5 — no suppression, and a count rose by up to five in total.
- 0.0 — any suppression, or a larger rise.


## Regression check
- All tests that passed before this slice must still pass. The baseline is `2765 passed, 1 skipped` for pytest and `260 passed` for vitest. A count may rise when the slice adds tests.
- Run `uv run pytest tests -q -m ''` once for the full suite. The slow tracker contract tests must pass.
- Run `uv run shared/habit_smells.py` and check that no new file breaks the limits.

## Out of scope — do not penalise
- `duplicated-code` and `non-essential-comment` findings that already existed at S. Slices 14 and 16 own them. Penalise only a rise in their count.
- Findings in scripts under `shared/` and `plugins/`. Slices 8 and 9 own them.
- A changed pytest node id, because the module path of a moved test changes. Judge by function name and parameter id.
- Findings in the memory plugin and the viewer.
