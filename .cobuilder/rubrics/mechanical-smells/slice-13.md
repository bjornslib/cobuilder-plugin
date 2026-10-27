# Rubric: Slice 13 — `pane.test.ts` and `run.test.ts`

Feature: mechanical-smells
Epic: E2
Slice goal: `habit-sensors` reports no finding, other than `non-essential-comment`, for `plugins/cobuilder-memory/tests/pane.test.ts`, `plugins/cobuilder-memory/tests/run.test.ts`, and the new files that split them (155 findings at the start of E2: 62 explicit-any, 47 duplicated-code, 40 oversized-function, 4 oversized-file, 2 too-many-parameters). The files are split by concern, the stubs are typed, and the setup is shared. The 76 test names stay.
Test command: uv run pytest tests -q && (cd plugins/artifact/viewer && npm run typecheck && npm run test) && claude plugin test plugins/cobuilder-memory && npx tsc -p plugins/cobuilder-memory --noEmit

Terms used below. **S** is the commit before the slice's first commit. **Sensor command** for a file F, run from the repo root:

```
habit-sensors --file F | python3 -c 'import sys,json;d=json.load(sys.stdin);p=sys.argv[1];print([(s["smell"],i["details"].get("line")) for s in d for i in s["issues"] if i["details"].get("file")==p])' F
```

The filter on `details.file` is required, because jscpd reports repo-wide clusters in `--file` mode. The limits are: 200 lines for a file, 12 lines for a function, complexity 10, and 3 parameters. The **baseline at S** is: pytest `2765 passed, 1 skipped`, vitest `260 passed`, and the memory plugin `76 pass` in 8 files (slice 12 does not change the count). Read the new split files with `git diff --name-status S..HEAD -- plugins/cobuilder-memory/tests`. To read S, run `git worktree add --detach /tmp/before-13 S` and link `node_modules` into it. Count the `pane.test.ts` and `run.test.ts` tests at S with `claude plugin test plugins/cobuilder-memory` in `/tmp/before-13`.

## Criteria

### C1 — the split files report no finding and stay under 200 lines [CRITICAL]
**Must be true:** Every file that comes from `pane.test.ts` or `run.test.ts` (the originals, if they remain, and each new file) reports no finding except `non-essential-comment`. That includes no `explicit-any`, no `duplicated-code`, no `too-many-parameters`, no `oversized-file`, and every file has 200 lines or fewer. A residual `oversized-function` finding is allowed only when the callback is 13 to 30 lines, is one test case or one setup unit, and is listed in `docs/architecture/designs/mechanical-smells/findings-catalog.md` with its file and unit.
**Evidence to check:** run the sensor command for each file. Run `wc -l` on each file. Run `git diff --name-status S..HEAD -- plugins/cobuilder-memory/tests` to find the new files. Run `grep -nE '\bany\b' <file>` for each file and read each hit.
**Scoring:**
- 1.0 — zero findings, or only catalog-listed residuals, and every file is 200 lines or fewer.
- 0.5 — at most five findings remain, none of them `explicit-any`, or a residual is unlisted.
- 0.0 — more than five findings, an `explicit-any` remains, or a file is over 200 lines.

### C2 — the 76 test names stay and no assertion was lost [CRITICAL]
**Must be true:** The set of full test names after the slice equals the set at S. The plugin tests report `76 pass` in the same number of files or more. The count of assertions does not fall. A new split file does not make a test run twice.
**Evidence to check:** run `uv run pytest tests/test_memory_tests_preserved.py -q`, which reads `tests/fixtures/memory_test_names.json`. Run `claude plugin test plugins/cobuilder-memory` in the working tree and in `/tmp/before-13`, and diff the sorted lists of test names. Count assertions in both trees with `find plugins/cobuilder-memory -path '*/node_modules' -prune -o -name '*.test.ts*' -print | xargs cat | grep -oE '\bexpect\(' | wc -l`.
**Scoring:**
- 1.0 — the name sets are identical, `76 pass`, and no assertion count fell.
- 0.5 — the name sets are identical, but the assertion count fell by up to five, and the diff shows the removed calls were duplicates.
- 0.0 — any name is missing or duplicated, or the count fell by more.

### C3 — the stubs are typed, and the types are honest [CRITICAL]
**Must be true:** No `any` remains in the split files or the shared setup. A typed seam replaces each stub. The slice adds no `as any`, no unchecked `as unknown as` cast, and no change to a runtime hook. `tsc` reports no error. A new type goes in `types/index.d.ts` or in a test helper, and not in a hook source file.
**Evidence to check:** run `npx tsc -p plugins/cobuilder-memory --noEmit`. Run `git diff S..HEAD -- plugins/cobuilder-memory | grep '^+' | grep -nE 'as any|: any|<any>|as unknown as'` and read each hit. Run `git diff --name-only S..HEAD -- plugins/cobuilder-memory/hooks` and confirm it lists no file.
**Scoring:**
- 1.0 — no `any`, `tsc` is clean, and no hook source file changed.
- 0.5 — `tsc` is clean, but one or two `as unknown as` casts remain.
- 0.0 — any `any`, a `tsc` error, or a changed hook source file.

### C4 — the tests still test the code [CRITICAL]
**Must be true:** A deliberate break in a split hook module makes the same tests fail before and after the slice.
**Evidence to check:** in `/tmp/before-13` and in the working tree, change the return value of one function in `run.ts` (or its module after slice 11) and one in `pane.tsx` (or its module). Run `claude plugin test plugins/cobuilder-memory` each time, and record the failing test names. Restore each file. The failing sets must match at S and now.
**Scoring:**
- 1.0 — both breaks fail the same tests at S and now.
- 0.5 — both break something, but the sets differ by up to three tests.
- 0.0 — a break passes silently now.

### C5 — only the files in scope changed, and the sensor check covers the slice
**Must be true:** The slice changes `pane.test.ts`, `run.test.ts`, the new test files and helpers that come from them, `types/index.d.ts` only where a seam needs it, the sensor check, the name pin, and the catalog's residual list. It does not change a hook source file, the six smaller test files of slice 12, or a file outside `plugins/cobuilder-memory` and `tests`. `tests/_repo_habit_slices.py` holds an entry for slice 13 that lists the two files and each new file, and it ignores only `non-essential-comment`.
**Evidence to check:** `git diff --name-only S..HEAD` and read the list. Run `uv run pytest tests/test_repo_habit_clean.py -q`. Read the entry for key `13` and compare it with the new files.
**Scoring:**
- 1.0 — only files in scope, and the entry lists every file and passes.
- 0.5 — one extra file changed with an import path only, or the entry misses a new file.
- 0.0 — a hook source file changed, or no entry.

### C6 — no suppression, no new comment finding
**Must be true:** The slice adds no `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, `as any`, `noqa`, snooze entry, or config exclusion. The total `non-essential-comment` count of the split files does not rise above the count of the two originals at S. The `duplicated-code` count of the other memory files does not rise, because a shared helper must not copy code elsewhere.
**Evidence to check:** `git diff S..HEAD -- plugins tests .habit* | grep '^+' | grep -E 'ts-ignore|ts-expect-error|eslint-disable|as any|noqa|snooze|exclude'` must print nothing. Confirm that the habit-sensors config file at the repo root is unchanged. Count comment findings for the files now, and for the two originals in `/tmp/before-13`.
**Scoring:**
- 1.0 — no suppression, and the counts did not rise.
- 0.5 — the comment count rose by up to five.
- 0.0 — any suppression, or a larger rise.

## Regression check
- All tests that passed before this slice must still pass: pytest, vitest, and the memory plugin tests.
- `npx tsc -p plugins/cobuilder-memory --noEmit` stays clean.
- The files that slices 11 and 12 cleaned still report no finding.

## Out of scope — do not penalise
- `non-essential-comment` findings that already existed at S. Slice 16 owns them. Penalise only a rise.
- Findings in the hook source files and the six smaller test files. Slices 11 and 12 own them.
- Findings in Python files, the viewer, and prose files.
