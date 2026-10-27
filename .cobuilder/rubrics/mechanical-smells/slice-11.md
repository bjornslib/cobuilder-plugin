# Rubric: Slice 11 — the memory hooks

Feature: mechanical-smells
Epic: E2
Slice goal: `habit-sensors` reports no finding, other than `non-essential-comment`, for the 7 files in `plugins/cobuilder-memory/hooks/` (34 findings at the start of E2: 17 oversized-function, 6 explicit-any, 5 too-many-parameters, 4 oversized-file, 2 high-complexity). `run.ts`, `pane.tsx`, `hindsight.ts`, and the four smaller hook files are split or reduced. Each hook export keeps its name. `tsc` and the plugin tests pass.
Test command: uv run pytest tests -q && (cd plugins/artifact/viewer && npm run typecheck && npm run test) && claude plugin test plugins/cobuilder-memory && npx tsc -p plugins/cobuilder-memory --noEmit

Terms used below. **S** is the commit before the slice's first commit. **Sensor command** for a file F, run from the repo root:

```
habit-sensors --file F | python3 -c 'import sys,json;d=json.load(sys.stdin);p=sys.argv[1];print([(s["smell"],i["details"].get("line")) for s in d for i in s["issues"] if i["details"].get("file")==p])' F
```

The filter on `details.file` is required, because jscpd reports repo-wide clusters in `--file` mode. The limits are: 200 lines for a file, 12 lines for a function, complexity 10, and 3 parameters. Read the exact limits from the sensor output at S. The **baseline at S** is: pytest `2765 passed, 1 skipped` (127 slow tests are deselected by default), vitest `260 passed`, and the memory plugin `76 pass` in 8 files. List the hook files with `ls plugins/cobuilder-memory/hooks` and `git diff --name-status S..HEAD -- plugins/cobuilder-memory/hooks`. To read S, run `git worktree add --detach /tmp/before-11 S` and link `node_modules` into it.

## Criteria

### C1 — the hook files report no finding [CRITICAL]
**Must be true:** Each of the 7 original hook files, and each new file that the slice adds under `plugins/cobuilder-memory/hooks/`, reports no finding except `non-essential-comment`. That means no `oversized-file` (over 200 lines), no `oversized-function`, no `high-complexity`, no `too-many-parameters`, and no `explicit-any`. The slice must not raise `duplicated-code` in these files above the count at S. A 13-to-30-line `oversized-function` residual is NOT allowed here, because the epic allows residuals only in test files.
**Evidence to check:** run the sensor command for each of the 7 files and for each new file. Run `git diff --name-status S..HEAD -- plugins/cobuilder-memory/hooks` to find the new files. Run `grep -rnE '\bany\b' plugins/cobuilder-memory/hooks --include='*.ts' --include='*.tsx'` and read each hit.
**Scoring:**
- 1.0 — zero findings, and no new file is over 200 lines.
- 0.5 — at most three findings remain, none of them `explicit-any`.
- 0.0 — more than three findings, an `explicit-any` remains, or a file is over 200 lines.

### C2 — the hook exports and the plugin behavior are unchanged [CRITICAL]
**Must be true:** Every export that a hook file had at S still imports from the same module path. The memory plugin still reports `76 pass` in 8 files. `tsc` reports no error. A typed seam replaces each `any`, and the change adds no runtime branch.
**Evidence to check:** list the exports at S and now, for each hook file, with `grep -nE '^export ' <file>` in `/tmp/before-11` and in the working tree. Diff the two lists. Names may appear in a new module only if the old module re-exports them. Run `claude plugin test plugins/cobuilder-memory` and `npx tsc -p plugins/cobuilder-memory --noEmit`. Run `uv run pytest tests/test_memory_tests_preserved.py -q` if the file exists.
**Scoring:**
- 1.0 — the export lists match, `76 pass`, and `tsc` is clean.
- 0.5 — the export lists match and `tsc` is clean, but the pass count is below 76 because of a test the slice did not touch (state which).
- 0.0 — an export is missing or renamed, `tsc` fails, or a test fails.

### C3 — the tests still test the code [CRITICAL]
**Must be true:** A deliberate break in a split hook module makes the same tests fail before and after the slice.
**Evidence to check:** in `/tmp/before-11` and in the working tree, change the return value of one function in `run.ts` (or in the module that holds its code now) and one function in `pane.tsx` (or its new module). Run `claude plugin test plugins/cobuilder-memory` each time, and record the failing test names. Restore each file. The failing sets must match at S and now.
**Scoring:**
- 1.0 — both breaks fail the same tests at S and now.
- 0.5 — both breaks fail tests, but the sets differ by up to three tests.
- 0.0 — a break passes silently now.

### C4 — only the files in scope changed
**Must be true:** The slice changes the hook files, new hook modules, the type file `plugins/cobuilder-memory/types/index.d.ts` only where a typed seam needs it, the sensor check entry for slice 11, and the catalog if needed. It does not change a test file. It does not change the viewer, a Python script, or a plugin outside `cobuilder-memory`.
**Evidence to check:** `git diff --name-only S..HEAD` and read the list.
**Scoring:**
- 1.0 — only files in scope.
- 0.5 — one extra file changed, and the change is an import path or a type.
- 0.0 — a test file or an out-of-scope file changed in behavior.

### C5 — the sensor check covers this slice
**Must be true:** `tests/test_repo_habit_clean.py` and `tests/_repo_habit_slices.py` hold an entry for slice 11 that lists the 7 hook files and the new files. The entry ignores only `non-essential-comment`. The check also fails when the ignored count of a file rises.
**Evidence to check:** run `uv run pytest tests/test_repo_habit_clean.py -q`. Read the entry for key `11` in `tests/_repo_habit_slices.py` and compare it with `ls plugins/cobuilder-memory/hooks`.
**Scoring:**
- 1.0 — the entry lists every hook file and passes.
- 0.5 — the entry misses a new file, or it ignores a second smell.
- 0.0 — no entry, or the check fails.

### C6 — no suppression, no new comment finding
**Must be true:** The slice adds no `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, `as any`, `noqa`, snooze entry, or config exclusion. The `non-essential-comment` count of each hook file does not rise above the count at S.
**Evidence to check:** `git diff S..HEAD -- plugins tests .habit* | grep '^+' | grep -E 'ts-ignore|ts-expect-error|eslint-disable|as any|noqa|snooze|exclude'` must print nothing. Check the repo root for a habit-sensors config file and confirm `git diff S..HEAD` does not touch it. Count comment findings per file, now and in `/tmp/before-11`.
**Scoring:**
- 1.0 — no suppression, and the comment count did not rise.
- 0.5 — the comment count rose by up to five.
- 0.0 — any suppression, or a larger rise.

## Regression check
- All tests that passed before this slice must still pass: pytest, vitest, and the memory plugin tests.
- The viewer build check (`tests/test_viewer_build.py`) passes.

## Out of scope — do not penalise
- `non-essential-comment` findings that already existed at S. Slice 16 owns them. Penalise only a rise.
- Findings in the memory test files. Slices 12 and 13 own them.
- Findings in Python files, the viewer, and prose files.
