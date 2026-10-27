# Rubric: Slice 8 — the `shared/` scripts (tracer bullet)

Feature: mechanical-smells
Epic: E2
Slice goal: `habit-sensors` reports no finding, other than `duplicated-code` and `non-essential-comment`, for the 11 files of `shared/*.py` and `shared/tracker_port/*.py` that carried findings. The sensor check, the export pin, and the command-line pin exist and pass. Each script keeps its `--help` text, and each moved name still imports from its old module.
Test command: uv run pytest tests -q && (cd plugins/artifact/viewer && npm run typecheck && npm run test)

Terms used below. **S** is the commit before the slice's first commit. To read S, run `git worktree add --detach /tmp/before-8 S`. **Sensor command** for a file F, run from the repo root:

```
habit-sensors --file F | python3 -c 'import sys,json;d=json.load(sys.stdin);p=sys.argv[1];print([(s["smell"],i["details"].get("line")) for s in d for i in s["issues"] if i["details"].get("file")==p])' F
```

The filter on `details.file` is required, because jscpd reports repo-wide clusters in `--file` mode. The **slice files** are the 11 files under `shared/` and `shared/tracker_port/` that carried findings at S (25 findings: 9 oversized-file, 6 high-complexity, 5 swallowed-exception, 3 too-many-parameters, 1 oversized-function, 1 unused-variable), plus every new module the slice adds beside them. List them at S with `python3 -c 'from tests._repo_habit_slices import SLICES;print(SLICES[8])'` (run in the working tree) and by running the sensor command at S. The **limits** are: a file of 200 lines or fewer, a function of 12 lines or fewer, a complexity of 10 or less, and 3 parameters or fewer. The **ignored smells** are `duplicated-code` and `non-essential-comment`. The **baseline at S** for the whole repo is: pytest `2765 passed, 1 skipped` (127 slow tests are deselected, and `-m ''` runs them), and vitest `260 passed`. Read the finding counts per smell at S by command, not from memory.

## Criteria
### C1 — the slice files report no finding [CRITICAL]
**Must be true:** Every slice file, and every new module the slice adds under `shared/`, reports no finding except the ignored smells. That means no `oversized-file`, `high-complexity`, `swallowed-exception`, `too-many-parameters`, `oversized-function`, or `unused-variable`. A file is 200 lines or fewer. A residual `oversized-function` is not allowed in a script.
**Evidence to check:** Run the sensor command for each of the 11 files and for each new file. List new files with `git diff --name-status S..HEAD -- shared`. Run `wc -l` on each. Run the same commands at S in `/tmp/before-8` and confirm the 25 findings were there.
**Scoring:**
- 1.0 — zero findings other than ignored smells, and every file is within 200 lines.
- 0.5 — at most three findings remain, all in one file.
- 0.0 — more than three findings remain, or any file is over 200 lines.

### C2 — the sensor check, the export pin, and the command-line pin exist and pass [CRITICAL]
**Must be true:** `tests/test_repo_habit_clean.py` and `tests/_repo_habit_slices.py` exist. `SLICES[8]` lists the 11 files, and `IGNORED_SMELLS[8]` holds `duplicated-code` and `non-essential-comment`. The check reuses the helpers of `tests/test_viewer_habit_clean.py`, filters on `details.file`, and fails when an ignored count of a slice file rises. `tests/test_python_exports.py` with `tests/fixtures/python_exports.json` pins every top-level `def`, `class`, and assigned name of each split module in `shared/`, taken at S. `tests/test_script_cli_stable.py` with `tests/fixtures/script_help.json` holds the `--help` text of each script under `shared/` and `plugins/*/scripts/`, taken at S.
**Evidence to check:** Run `uv run pytest tests/test_repo_habit_clean.py tests/test_python_exports.py tests/test_script_cli_stable.py -q`. Read the fixtures and compare them with S: in `/tmp/before-8`, run each `shared/*.py` script with `--help` and diff against `script_help.json`. Check that the fixture names came from S and not from the working tree by running `git log --diff-filter=A --format=%h -- tests/fixtures/python_exports.json` and reading the first diff. For the export pin, delete one re-export from a split module, run the pin, see it fail, and restore the file. For the command-line pin, rename one option in one script, run the pin, see it fail, and restore the file.
**Scoring:**
- 1.0 — all three checks exist, pass, and each fails on its break. The entry for slice 8 lists all 11 files.
- 0.5 — the checks pass but one does not fail on its break, or the entry lists fewer than 11 files.
- 0.0 — a check is missing, or a pin was taken from the working tree after the split.

### C3 — no behavior changed [CRITICAL]
**Must be true:** Each moved name imports from its old module. Each script prints the same `--help` text and keeps the same exit code and JSON shape for `tracker.py` operations. The full suite passes, and the viewer suite passes. The PEP 723 header stays on each entry file, and each new module imports without the script's own dependencies.
**Evidence to check:** Run `uv run pytest tests -q && (cd plugins/artifact/viewer && npm run typecheck && npm run test)` and `uv run pytest tests -q -m ''`. For each changed script, run `uv run <script> --help` and diff it with the same call in `/tmp/before-8`. Run `uv run shared/tracker.py doctor` now and at S and compare. For each new module, run `python3 -c 'import <module>'` from `shared/` with a clean interpreter (no `uv`).
**Scoring:**
- 1.0 — all runs match S and every test passes.
- 0.5 — one `--help` differs only in whitespace that the pin ignores, and all tests pass.
- 0.0 — a test fails, a name does not import, or `--help` changed.

### C4 — the tests still test the code [CRITICAL]
**Must be true:** A deliberate break in a split module fails tests. After the slice, the same break fails the same tests as at S.
**Evidence to check:** Pick one function that moved to a new module in `shared/` (read it from `git diff S..HEAD --stat`). In `/tmp/before-8` break the same function (flip one return value), run `uv run pytest tests -q -x --no-header -p no:cacheprovider` and record the failing test ids. Restore the file. Repeat in the working tree on the function at its new place. Also break one `tracker_port` function the same way. The failing sets must match.
**Scoring:**
- 1.0 — both breaks fail the same tests at S and now.
- 0.5 — both break something, but the sets differ by up to three tests.
- 0.0 — a break passes silently now.

### C5 — only the files in scope changed
**Must be true:** The slice changes the 11 slice files, the new modules it splits them into, the sensor check and its slice table, the three pins and their fixtures, and the catalog. It changes no plugin script, no test of a script's behavior (except an import path that a moved name requires), no viewer file, and no `docs/` ADR.
**Evidence to check:** Run `git diff --name-only S..HEAD` and read the list. Run `git diff S..HEAD -- tests | grep '^-' | grep -vE '^---'` and check that no removed test line is an assertion.
**Scoring:**
- 1.0 — only in-scope files.
- 0.5 — one out-of-scope file changed, and the change is an import path.
- 0.0 — a plugin script, a viewer file, or a test assertion changed.

### C6 — no suppression [CRITICAL]
**Must be true:** The slice adds no `noqa`, no `# type:` ignore comment, no `eslint-disable`, no `@ts-ignore`, no `as any`, no snooze entry, and no config exclusion in `pyproject.toml`, `.habit-sensors*`, or any sensor config. A narrowed catch lists the exact exception types. No `except Exception` is replaced by a bare `except:`, by `except BaseException`, or by `contextlib.suppress(Exception)`. The 5 swallowed-exception findings are cleared by narrowing only.
**Evidence to check:** `git diff S..HEAD | grep '^+' | grep -E 'noqa|# *type: *ignore|eslint-disable|@ts-ignore|as any|snooze|suppress\(Exception|except *:|except BaseException'` must print nothing. Run `git diff --name-only S..HEAD | grep -E 'pyproject|habit|sensor|snooze'` and read any config change. Run `git diff S..HEAD | grep -E '^\+\s*except Exception'` and check each hit against an explicit engineer decision in the slice notes.
**Scoring:**
- 1.0 — nothing printed, and each catch lists exact types.
- 0.5 — nothing printed, but one catch lists a broad base class such as `OSError` where a single type is visible in the code.
- 0.0 — any suppression, bare `except:`, `suppress(Exception)`, or a config exclusion.


## Regression check
- All tests that passed before this slice must still pass. The baseline is `2765 passed, 1 skipped` for pytest and `260 passed` for vitest. A count may rise when the slice adds tests.
- Run `uv run pytest tests -q -m ''` once for the full suite. The slow tracker contract tests must pass.
- Run `uv run shared/habit_smells.py` and check that no new file breaks the limits.

## Out of scope — do not penalise
- `duplicated-code` and `non-essential-comment` findings that already existed at S. Slices 14 and 16 own them. Penalise only a rise in their count.
- Findings in `plugins/*/scripts` and root tests. Slices 9 and 10 own them.
- Findings in the memory plugin and the viewer.
