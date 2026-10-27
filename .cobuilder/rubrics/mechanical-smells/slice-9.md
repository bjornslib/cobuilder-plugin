# Rubric: Slice 9 — the plugin scripts

Feature: mechanical-smells
Epic: E2
Slice goal: `habit-sensors` reports no finding, other than `duplicated-code` and `non-essential-comment`, for the 18 files under `plugins/*/scripts`, `.claude/**`, and `docs/**/probe_repo.py` that carried findings. Each script keeps its `--help` text.
Test command: uv run pytest tests -q && (cd plugins/artifact/viewer && npm run typecheck && npm run test)

Terms used below. **S** is the commit before the slice's first commit. To read S, run `git worktree add --detach /tmp/before-9 S`. **Sensor command** for a file F, run from the repo root:

```
habit-sensors --file F | python3 -c 'import sys,json;d=json.load(sys.stdin);p=sys.argv[1];print([(s["smell"],i["details"].get("line")) for s in d for i in s["issues"] if i["details"].get("file")==p])' F
```

The filter on `details.file` is required, because jscpd reports repo-wide clusters in `--file` mode. The **slice files** are the 18 files under `plugins/*/scripts/*.py`, `.claude/**`, and `docs/**/probe_repo.py` that carried findings at S (39 findings: 14 oversized-file, 9 high-complexity, 7 swallowed-exception, 4 oversized-function, 2 too-many-parameters, 2 unused-import, 1 unused-variable), plus every new module the slice adds beside them. List them at S with `python3 -c 'from tests._repo_habit_slices import SLICES;print(SLICES[9])'` (run in the working tree) and by running the sensor command at S. The **limits** are: a file of 200 lines or fewer, a function of 12 lines or fewer, a complexity of 10 or less, and 3 parameters or fewer. The **ignored smells** are `duplicated-code` and `non-essential-comment`. The **baseline at S** for the whole repo is: pytest `2765 passed, 1 skipped` (127 slow tests are deselected, and `-m ''` runs them), and vitest `260 passed`. Read the finding counts per smell at S by command, not from memory.

## Criteria
### C1 — the slice files report no finding [CRITICAL]
**Must be true:** Every slice file, and every new module in a plugin `scripts/` folder, reports no finding except the ignored smells. That includes no `oversized-file`, `high-complexity`, `swallowed-exception`, `oversized-function`, `too-many-parameters`, `unused-import`, or `unused-variable`. A file is 200 lines or fewer. Files under `shared/` are symlinks and stay as slice 8 left them.
**Evidence to check:** Run the sensor command for each of the 18 files and each new file. List new files with `git diff --name-status S..HEAD -- plugins .claude docs`. Run `wc -l` on each. Confirm at S, in `/tmp/before-9`, that the 39 findings were there.
**Scoring:**
- 1.0 — zero findings other than ignored smells, and every file is within 200 lines.
- 0.5 — at most three findings remain, all in one file.
- 0.0 — more than three findings remain, or a file is over 200 lines.

### C2 — the pins stay green and the entry covers this slice [CRITICAL]
**Must be true:** `SLICES[9]` in `tests/_repo_habit_slices.py` lists the 18 files, and `IGNORED_SMELLS[9]` holds the two ignored smells. The export pin holds each split plugin module, and the command-line pin holds each plugin script. The fixtures are not regenerated from the working tree: they differ from S only by added keys for new modules.
**Evidence to check:** Run `uv run pytest tests/test_repo_habit_clean.py tests/test_python_exports.py tests/test_script_cli_stable.py -q`. Run `git diff S..HEAD -- tests/fixtures/script_help.json` and check that no existing `--help` text changed. Delete one re-export from a split plugin module, run the export pin, see it fail, and restore the file. Rename one option in one plugin script and see the command-line pin fail, then restore it.
**Scoring:**
- 1.0 — the entry lists 18 files, all pins pass, no old `--help` text changed, and both breaks fail.
- 0.5 — the entry lists fewer than 18 files, or one break does not fail.
- 0.0 — a `--help` text changed, or a pin was regenerated from the working tree.

### C3 — every script still starts and behaves the same [CRITICAL]
**Must be true:** Each changed script keeps its PEP 723 header on the entry file and its `__main__` block. Each new module imports without the script's own dependencies. A hook (for example `.claude/hooks/deny-git-stash.py`) gives the same decision for the same input. The full suite and the viewer suite pass.
**Evidence to check:** Run `uv run pytest tests -q && (cd plugins/artifact/viewer && npm run typecheck && npm run test)` and `uv run pytest tests -q -m ''`. For each changed script, run `uv run <script> --help` and diff it with `/tmp/before-9`. Where a safe call exists, run one real call in both trees and diff the output. For `deny-git-stash.py`, pipe a `git stash` Bash tool input and a `git status` input on stdin in both trees and compare the exit code and the output.
**Scoring:**
- 1.0 — all runs match S.
- 0.5 — one real call differs only in a timestamp or path, and all tests pass.
- 0.0 — a script fails to start, a decision differs, or a test fails.

### C4 — the tests still test the code [CRITICAL]
**Must be true:** A deliberate break in a split plugin module fails tests. After the slice, the same break fails the same tests as at S.
**Evidence to check:** Pick one function that moved to a new module (read it from `git diff S..HEAD --stat`). In `/tmp/before-9` flip one return value in it, run `uv run pytest tests -q --no-header -p no:cacheprovider`, and record the failing test ids. Restore the file. Repeat in the working tree on the function at its new place. Also break one function in an unsplit script of the slice. The failing sets must match.
**Scoring:**
- 1.0 — both breaks fail the same tests at S and now.
- 0.5 — both break something, but the sets differ by up to three tests.
- 0.0 — a break passes silently now.

### C5 — only the files in scope changed
**Must be true:** The slice changes the 18 slice files, the new modules it splits them into, the slice table of the sensor check, the new keys of the fixtures, and the catalog. It changes nothing in `shared/`, in the root tests (except an import path that a moved name requires), in the viewer, or in the memory plugin.
**Evidence to check:** Run `git diff --name-only S..HEAD` and read the list. Run `git diff S..HEAD -- tests | grep '^-' | grep -vE '^---'` and check that no removed line is an assertion.
**Scoring:**
- 1.0 — only in-scope files.
- 0.5 — one out-of-scope file changed, and the change is an import path.
- 0.0 — a `shared/` file, a viewer file, or an assertion changed.

### C6 — no suppression [CRITICAL]
**Must be true:** The slice adds no `noqa`, no `# type:` ignore comment, no `eslint-disable`, no `@ts-ignore`, no `as any`, no snooze entry, and no config exclusion in `pyproject.toml`, `.habit-sensors*`, or any sensor config. A narrowed catch lists the exact exception types. No `except Exception` is replaced by a bare `except:`, by `except BaseException`, or by `contextlib.suppress(Exception)`. The 7 swallowed-exception findings are cleared by narrowing only. A hook that must not fail the host catches the exact exceptions it can see.
**Evidence to check:** `git diff S..HEAD | grep '^+' | grep -E 'noqa|# *type: *ignore|eslint-disable|@ts-ignore|as any|snooze|suppress\(Exception|except *:|except BaseException'` must print nothing. Run `git diff --name-only S..HEAD | grep -E 'pyproject|habit|sensor|snooze'` and read any config change. Run `git diff S..HEAD | grep -E '^\+\s*except Exception'` and check each hit against an explicit engineer decision in the slice notes.
**Scoring:**
- 1.0 — nothing printed, and each catch lists exact types.
- 0.5 — nothing printed, but one catch lists a broad base class where a single type is visible in the code.
- 0.0 — any suppression, bare `except:`, `suppress(Exception)`, or a config exclusion.


## Regression check
- All tests that passed before this slice must still pass. The baseline is `2765 passed, 1 skipped` for pytest and `260 passed` for vitest. A count may rise when the slice adds tests.
- Run `uv run pytest tests -q -m ''` once for the full suite. The slow tracker contract tests must pass.
- Run `uv run shared/habit_smells.py` and check that no new file breaks the limits.

## Out of scope — do not penalise
- `duplicated-code` and `non-essential-comment` findings that already existed at S. Slices 14 and 16 own them. Penalise only a rise in their count.
- Findings in `shared/` and root tests. Slices 8 and 10 own them.
- Findings in the memory plugin and the viewer.
