# Rubric: Slice 12 — the memory test support and six smaller test files

Feature: mechanical-smells
Epic: E2
Slice goal: `habit-sensors` reports no finding, other than `non-essential-comment`, for the memory test support and the six smaller memory test files (7 files, 128 findings at the start of E2: 89 explicit-any, 21 oversized-function, 17 duplicated-code, 1 high-complexity). The fakes are typed, the long callbacks are split, and the setup is shared. The 76 test names stay.
Test command: uv run pytest tests -q && (cd plugins/artifact/viewer && npm run typecheck && npm run test) && claude plugin test plugins/cobuilder-memory && npx tsc -p plugins/cobuilder-memory --noEmit

Terms used below. **S** is the commit before the slice's first commit. **Sensor command** for a file F, run from the repo root:

```
habit-sensors --file F | python3 -c 'import sys,json;d=json.load(sys.stdin);p=sys.argv[1];print([(s["smell"],i["details"].get("line")) for s in d for i in s["issues"] if i["details"].get("file")==p])' F
```

The filter on `details.file` is required, because jscpd reports repo-wide clusters in `--file` mode. The limits are: 200 lines for a file, 12 lines for a function, complexity 10, and 3 parameters. The **baseline at S** is: pytest `2765 passed, 1 skipped`, vitest `260 passed`, and the memory plugin `76 pass` in 8 files. The 7 files are the test support under `plugins/cobuilder-memory/tests/` and six test files. `pane.test.ts` and `run.test.ts` belong to slice 13 and are NOT in this slice. Read the list of 7 from the slice 12 entry in `tests/_repo_habit_slices.py`, and cross-check it with `git diff --name-status S..HEAD -- plugins/cobuilder-memory/tests`. To read S, run `git worktree add --detach /tmp/before-12 S` and link `node_modules` into it.

## Criteria

### C1 — the 7 files report no finding [CRITICAL]
**Must be true:** Each of the 7 files, and each new helper or test file that the slice adds, reports no finding except `non-essential-comment`. That includes no `explicit-any`, no `duplicated-code`, no `high-complexity`, and no `oversized-file` (over 200 lines). A residual `oversized-function` finding is allowed only when the callback is 13 to 30 lines, is one test case or one setup unit, and is listed in `docs/architecture/designs/mechanical-smells/findings-catalog.md` with its file and unit.
**Evidence to check:** run the sensor command for each of the 7 files and for each new file. Run `grep -rnE '\bany\b' plugins/cobuilder-memory/tests --include='*.ts' --include='*.tsx'` and read each hit. Run `git diff --name-status S..HEAD -- plugins/cobuilder-memory` to list new files.
**Scoring:**
- 1.0 — zero findings, or only catalog-listed residuals.
- 0.5 — at most five findings remain, none of them `explicit-any`, or a residual is unlisted.
- 0.0 — more than five findings, an `explicit-any` remains, or a file is over 200 lines.

### C2 — the 76 test names stay and no assertion was lost [CRITICAL]
**Must be true:** The set of full test names after the slice equals the set at S. The plugin tests report `76 pass`. The count of `expect(` calls (or the plugin's assertion form) does not fall.
**Evidence to check:** run `uv run pytest tests/test_memory_tests_preserved.py -q`, which reads `tests/fixtures/memory_test_names.json`. Run `claude plugin test plugins/cobuilder-memory` in the working tree and in `/tmp/before-12`, and diff the sorted lists of test names. Count assertions in both trees with `find plugins/cobuilder-memory -path '*/node_modules' -prune -o -name '*.test.ts*' -print | xargs cat | grep -oE '\bexpect\(' | wc -l`.
**Scoring:**
- 1.0 — the name sets are identical and no assertion count fell.
- 0.5 — the name sets are identical, but the assertion count fell by up to five, and the diff shows the removed calls were duplicates.
- 0.0 — any name is missing, or the count fell by more.

### C3 — the fakes are typed, and the types are honest [CRITICAL]
**Must be true:** No `any` remains in the 7 files or the new files. A typed seam (for example `type HookEvent = { tool: string; args: Record<string, unknown> }`) replaces each fake. The slice adds no `as any`, no `as unknown as` cast that hides a wrong shape without a comment-free reason in the type itself, and no change to a runtime hook. `tsc` reports no error.
**Evidence to check:** run `npx tsc -p plugins/cobuilder-memory --noEmit`. Run `git diff S..HEAD -- plugins/cobuilder-memory | grep '^+' | grep -nE 'as any|: any|<any>|as unknown as'` and read each hit. Run `git diff --name-only S..HEAD -- plugins/cobuilder-memory/hooks` and confirm it lists no hook source file.
**Scoring:**
- 1.0 — no `any`, `tsc` is clean, and no hook source file changed.
- 0.5 — `tsc` is clean, but one or two `as unknown as` casts remain.
- 0.0 — any `any`, a `tsc` error, or a changed hook source file.

### C4 — the tests still test the code [CRITICAL]
**Must be true:** A deliberate break in the hook code makes the same tests fail before and after the slice.
**Evidence to check:** in `/tmp/before-12` and in the working tree, change the return value of one function in `hooks/hindsight.ts` (or the module that holds it now) and of one function in a hook that a smaller test file covers. Run `claude plugin test plugins/cobuilder-memory`, and record the failing test names. Restore each file. The failing sets must match at S and now.
**Scoring:**
- 1.0 — both breaks fail the same tests at S and now.
- 0.5 — both break something, but the sets differ by up to three tests.
- 0.0 — a break passes silently now.

### C5 — only the files in scope changed, and the sensor check covers the slice
**Must be true:** The slice changes the 7 files, new test helper files, `types/index.d.ts` only where a seam needs it, the sensor check, the name pin, and the catalog's residual list. It does not change `pane.test.ts`, `run.test.ts`, a hook source file, or a file outside `plugins/cobuilder-memory` and `tests`. `tests/_repo_habit_slices.py` holds an entry for slice 12, which ignores only `non-essential-comment`.
**Evidence to check:** `git diff --name-only S..HEAD` and read the list. Run `uv run pytest tests/test_repo_habit_clean.py -q`.
**Scoring:**
- 1.0 — only files in scope, and the entry exists and passes.
- 0.5 — one extra file changed with an import path only, or the entry misses a new file.
- 0.0 — a hook source or slice 13 file changed, or no entry.

### C6 — no suppression, no new comment finding
**Must be true:** The slice adds no `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, `as any`, `noqa`, snooze entry, or config exclusion. The `non-essential-comment` count of each file does not rise above the count at S. The `duplicated-code` count of the other memory test files does not rise.
**Evidence to check:** `git diff S..HEAD -- plugins tests .habit* | grep '^+' | grep -E 'ts-ignore|ts-expect-error|eslint-disable|as any|noqa|snooze|exclude'` must print nothing. Confirm that the habit-sensors config file at the repo root is unchanged. Count comment findings per file, now and in `/tmp/before-12`.
**Scoring:**
- 1.0 — no suppression, and the counts did not rise.
- 0.5 — the comment count rose by up to five.
- 0.0 — any suppression, or a larger rise.

## Regression check
- All tests that passed before this slice must still pass: pytest, vitest, and the memory plugin tests.
- `npx tsc -p plugins/cobuilder-memory --noEmit` stays clean.

## Out of scope — do not penalise
- `non-essential-comment` findings that already existed at S. Slice 16 owns them. Penalise only a rise.
- Findings in `pane.test.ts` and `run.test.ts`. Slice 13 owns them.
- Findings in the hook source files. Slice 11 owns them.
- Findings in Python files, the viewer, and prose files.
