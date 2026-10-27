# Rubric: Slice 14 — the duplicated Python code

Feature: mechanical-smells
Epic: E2
Slice goal: `habit-sensors` reports no `duplicated-code` finding for the Python files that carried one (39 files, 118 findings at the start of E2). The author judged each cluster and moved the common part into one helper, or recorded why the copies stay. Every test name and every `--help` text stays.
Test command: uv run pytest tests -q && (cd plugins/artifact/viewer && npm run typecheck && npm run test)

Terms used below. **S** is the commit before the slice's first commit. **Sensor command** for a file F, run from the repo root:

```
habit-sensors --file F | python3 -c 'import sys,json;d=json.load(sys.stdin);p=sys.argv[1];print([(s["smell"],i["details"].get("line")) for s in d for i in s["issues"] if i["details"].get("file")==p])' F
```

The filter on `details.file` is required, because jscpd reports repo-wide clusters in `--file` mode. **The slice's files** are the Python files that report `duplicated-code` at S, and every new Python file that the slice adds. Get the list at S with `habit-sensors --all` in `/tmp/before-14` and keep the `duplicated-code` issues. Expect 39 files and 118 findings. If the count differs, record the real count and use it. To read the state at S, run `git worktree add --detach /tmp/before-14 S`. The test baseline at S is the count that `uv run pytest tests -q` reports there (2765 passed, 1 skipped at the start of E2, minus any change from slices 8 to 13) and 260 viewer tests. The slow tests run with `-m ''`.

## Criteria

### C1 — no duplicated-code finding remains [CRITICAL]
**Must be true:** Every slice file, and every new Python file, reports no `duplicated-code` finding. The slice raises no other count. It adds no `oversized-file` (over 200 lines), `oversized-function` (over 50 lines), `high-complexity` (over 10), or `too-many-parameters` (over 5) finding. It does not raise the `non-essential-comment` count in any file.
**Evidence to check:** run the sensor command for each slice file now. Run it for each file from `git diff --name-status S..HEAD -- '*.py'` with status `A`. Run `uv run pytest tests/test_repo_habit_clean.py -q`, which holds the slice 14 entry. Count `non-essential-comment` per file now and in `/tmp/before-14`.
**Scoring:**
- 1.0 — zero `duplicated-code` findings, no new smell of another kind, and no rise in comment findings.
- 0.5 — one or two files still report `duplicated-code`, or a new finding of another kind appears in one file.
- 0.0 — more than two files report `duplicated-code`, or a new file is over 200 lines.

### C2 — each cluster was judged, with no copy-and-rename dodge [CRITICAL]
**Must be true:** Each removed cluster went to one shared helper, or the copies were made different for a real reason. No file hides a clone by a cosmetic change. Such changes are: renaming variables, reordering statements, splitting one line, changing quotes, or adding a no-op line, solely to defeat the clone detector. A helper has a real name that says what it does. A copy that stays is allowed only when the catalog or the slice notes record why, and the sensor still reports no finding for it.
**Evidence to check:** list the pairs from `git diff S..HEAD -- '*.py'`. For each removed block, find where the code lives now: `git diff -U0 S..HEAD -- '*.py' | grep '^-' ` and search for the same logic with `git grep`. Read at least ten clusters, or all of them if fewer, as removed code beside the new helper and its callers. Fail a cluster when the "new" code is the old code with changed names and the same shape. Also run `habit-sensors --all` and confirm the total `duplicated-code` count in Python files is zero, and that no clone moved to a file outside the slice (compare the repo-wide Python `duplicated-code` count at S and now).
**Scoring:**
- 1.0 — every sampled cluster has one real helper or a recorded reason, and the repo-wide count fell to zero.
- 0.5 — one sampled cluster is a cosmetic dodge.
- 0.0 — two or more clusters are dodges, or a clone moved to an unscanned place.

### C3 — test names, assertions, and help text stay [CRITICAL]
**Must be true:** The set of test function names and parameter ids equals the set at S, and the `assert` count did not fall. The `--help` text of each script is byte-equal to the pin. Each module still exports every public name that it exported at S.
**Evidence to check:** run `uv run pytest tests/test_python_tests_preserved.py tests/test_script_cli_stable.py tests/test_python_exports.py -q`. Count `assert` statements in the root tests now and in `/tmp/before-14` with `grep -rEc '^\s*assert\b' tests --include='*.py'` summed. For each changed script, run `uv run <script> --help` now and at S, and diff the output. Run the full test command.
**Scoring:**
- 1.0 — all three guards pass, the help diffs are empty, and no count fell.
- 0.5 — all guards pass, but the `assert` count fell by up to five and the diff shows only duplicate asserts that moved into a helper test.
- 0.0 — any test name, option, or export is missing.

### C4 — behavior is unchanged
**Must be true:** A deliberate break in a shared helper fails the same tests that a break in the old copies failed at S. A changed script still starts and still runs one safe real call.
**Evidence to check:** pick one new or changed helper. In the working tree, change its return value and run `uv run pytest tests -q -x`. Note the failing tests, then restore the file. In `/tmp/before-14`, make the equivalent break in one old copy and run the same command. Both runs must fail at least one test, and the tests of the caller's own module must be among them. Run each changed script with `--help`, and run one safe read-only call where the script has one. Run `uv run pytest tests -q -m ''` once for the slow tests.
**Scoring:**
- 1.0 — both breaks fail tests in the caller's module, and every changed script starts.
- 0.5 — both breaks fail, but only a broader test catches the new one.
- 0.0 — the break passes silently now, or a script fails to start.

### C5 — only the files in scope changed
**Must be true:** The slice changes slice files, new helper modules that the slice adds, the sensor check files (`tests/test_repo_habit_clean.py`, `tests/_repo_habit_slices.py`), pin fixtures only when a new export is added, and the catalog. It changes no viewer source and no memory plugin file. A new helper in `shared/` reaches the plugins through the existing symlink and does not add a path that names another plugin (`plugins/<other>/`).
**Evidence to check:** `git diff --name-status S..HEAD` and read each path. Run `git grep -nE "plugins/[a-z-]+/" -- <new helper files>` and confirm no cross-plugin path. Run `uv run pytest tests -q -k "package or symlink or vendored"`.
**Scoring:**
- 1.0 — only files in scope, and no cross-plugin path.
- 0.5 — one stray file with a trivial, reasoned change.
- 0.0 — a file outside scope changed in behavior, or a cross-plugin path appears.

### C6 — no suppression
**Must be true:** The slice adds no `noqa`, `# type: ignore`, `eslint-disable`, `@ts-ignore`, `as any`, `habit-snooze`, and no config exclusion in `.habit-hooks/config.toml` or a jscpd ignore. It adds no `except Exception` that replaces a narrow catch.
**Evidence to check:** `git diff S..HEAD | grep '^+' | grep -E 'noqa|type: *ignore|eslint-disable|@ts-ignore|as any|snooze|jscpd|except Exception|except:|suppress\(Exception'` must print nothing, and `git diff S..HEAD -- .habit-hooks` must show no new exclusion.
**Scoring:**
- 1.0 — nothing found.
- 0.0 — any suppression or exclusion.

## Regression check
- All tests that passed before this slice must still pass, in the fast run and in the `-m ''` run.
- The viewer suite still reports 260 passing tests.
- The memory plugin suite is unaffected: `claude plugin test plugins/cobuilder-memory && npx tsc -p plugins/cobuilder-memory --noEmit`.

## Out of scope — do not penalise
- `non-essential-comment` findings that exist at S. Slice 16 owns them. Penalise only a rise.
- Duplicated prose in Markdown files. Slice 15 owns it.
- Duplicated code in the memory plugin's TypeScript tests. Slices 12 and 13 own it.
- Structural findings that existed at S and that slices 8 to 10 left as recorded residuals.
