# Rubric: Slice 5 — the viewer test files

Feature: mechanical-smells
Epic: E1
Slice goal: `habit-sensors` reports no finding for the viewer's test files (the 20 `*.test.*` files that carried findings), apart from each recorded 13-to-30-line callback. The test count and every assertion stay the same, and the suite passes.
Test command: uv run pytest tests -q && (cd plugins/artifact/viewer && npm run typecheck && npm run test)

Terms used below. **S** is the commit before the slice's first commit. **Sensor command** for a file F, run from the repo root:

```
habit-sensors --file F | python3 -c 'import sys,json;d=json.load(sys.stdin);p=sys.argv[1];print([(s["smell"],i["details"].get("line")) for s in d for i in s["issues"] if i["details"].get("file")==p])' F
```

The filter on `details.file` is required, because jscpd reports repo-wide clusters in `--file` mode. The **baseline at S** for the viewer's test files is: 252 passing tests, 787 `expect(` calls, 234 `it` or `test` cases, and 59 `describe` blocks. Count them from `plugins/artifact/viewer/src` with:

```
find . -name '*.test.*' | xargs cat | grep -oE '\bexpect\(' | wc -l
find . -name '*.test.*' | xargs cat | grep -oE '^\s*(it|test)(\.each)?\(' | wc -l
```

To list the full test names, run `npx vitest run --reporter=json` from `plugins/artifact/viewer` and read `testResults[].assertionResults[].fullName`. To read the names at S, run `git worktree add --detach /tmp/before-5 S`, link `node_modules` and `plugins/artifact/viewer/node_modules` into it, and run the same command there.

## Criteria

### C1 — the test files report no finding [CRITICAL]
**Must be true:** Every viewer `*.test.*` file, and every new test file the slice adds, reports no finding except `non-essential-comment`. That includes no `explicit-any`, no `non-null-assertion`, and no `duplicate-import`. A residual `oversized-function` finding is allowed only when the callback is 13 to 30 lines, is one test case or one setup unit, and is listed in `docs/architecture/designs/mechanical-smells/findings-catalog.md` with its file and line.
**Evidence to check:** run the sensor command for each test file. Run `git diff --name-status S..HEAD -- plugins/artifact/viewer/src` to list new files, and run the command for each.
**Scoring:**
- 1.0 — zero findings, or only catalog-listed residuals.
- 0.5 — at most five findings remain, or a residual is unlisted.
- 0.0 — more than five findings, or a file is over 200 lines.

### C2 — no test and no assertion was lost [CRITICAL]
**Must be true:** The set of full test names after the slice equals the set at S. The `expect(` count is at least 787. The `it` or `test` count is at least 234. The viewer suite reports at least 252 passing tests.
**Evidence to check:** list the full names now and in `/tmp/before-5`, sort both, and diff them. Run the two count commands. Run `npm run test`.
**Scoring:**
- 1.0 — the name sets are identical and no count fell.
- 0.5 — the name sets are identical, but the `expect(` count fell by up to ten, and the diff shows the removed calls were duplicates.
- 0.0 — any test name is missing, or the counts fell by more.

### C3 — the tests still test the code [CRITICAL]
**Must be true:** A deliberate break in the source makes a test fail. After the slice, the same break fails the same tests as at S.
**Evidence to check:** in `/tmp/before-5` and in the working tree, change the return value of `routeHref` in `shell/model.ts` (or of any exported pure helper there), run `npm run test`, and record the failing test names. Restore the file. Repeat for `SECTION_KEYS` (remove one key). The failing sets must match at S and now.
**Scoring:**
- 1.0 — both breaks fail the same tests at S and now.
- 0.5 — both break something, but the sets differ by up to three tests.
- 0.0 — a break passes silently now.

### C4 — only test files changed
**Must be true:** The slice changes test files, new test helper files, the sensor check, the catalog's residual list, and the committed `index.html`. It changes no non-test source file, except an import path that a moved helper requires.
**Evidence to check:** `git diff --name-only S..HEAD` and read the list.
**Scoring:**
- 1.0 — only test-side files.
- 0.5 — a source file changed, and the change is an import path.
- 0.0 — a source file changed in behavior.

### C5 — the sensor check covers this slice
**Must be true:** `tests/test_viewer_habit_clean.py` holds an entry for slice 5 that lists the test files, and it passes. The entry ignores `non-essential-comment`, and it allows only the catalog-listed callbacks.
**Evidence to check:** run `uv run pytest tests/test_viewer_habit_clean.py -q`.
**Scoring:**
- 1.0 — the entry exists and passes.
- 0.5 — the entry lists fewer than the 20 files.
- 0.0 — no entry.

### C6 — no suppression, no new comment finding
**Must be true:** The slice adds no `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any`, or `noqa`. The number of `non-essential-comment` findings in the test files does not rise above the count at S.
**Evidence to check:** `git diff S..HEAD -- plugins/artifact tests | grep '^+' | grep -E 'eslint-disable|@ts-ignore|@ts-expect-error|as any|noqa'` must print nothing. Count the comment findings per file, now and in `/tmp/before-5`.
**Scoring:**
- 1.0 — no suppression, and the comment count did not rise.
- 0.5 — the comment count rose by up to five.
- 0.0 — any suppression, or a larger rise.

## Regression check
- All tests that passed before this slice must still pass.
- The Python suite passes, including the byte-comparison of `index.html`.

## Out of scope — do not penalise
- `non-essential-comment` findings that already existed at S. Slice 7 owns them. Penalise only a rise.
- Findings in source files. Slices 1 to 4 and 6 own them.
- Findings outside the viewer. Epic E2 owns them.
