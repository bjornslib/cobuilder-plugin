# Rubric: Slice 1 — the logic layer (tracer bullet)

Feature: mechanical-smells
Epic: E1
Slice goal: `habit-sensors` reports no finding for `data/bundle.ts`, `data/joins.ts`, `data/types.ts`, `data/works.ts`, and `shell/model.ts` (all under `plugins/artifact/viewer/src/`). The viewer tests pass, the exported names of those files match the list taken before the slice, and the committed `index.html` rebuilds byte-identically.
Test command: uv run pytest tests -q && (cd plugins/artifact/viewer && npm run typecheck && npm run test)

Terms used below. **S** is the commit before the slice's first commit. **Sensor command** for a file F, run from the repo root:

```
habit-sensors --file F | python3 -c 'import sys,json;d=json.load(sys.stdin);p=sys.argv[1];print([(s["smell"],i["details"].get("line")) for s in d for i in s["issues"] if i["details"].get("file")==p])' F
```

The filter on `details.file` is required, because jscpd reports repo-wide clusters in `--file` mode. **Export names** of a file F, run from `plugins/artifact/viewer`:

```
node -e 'const ts=require("typescript"),p=require("path");const c=ts.parseJsonConfigFileContent(ts.readConfigFile("tsconfig.json",ts.sys.readFile).config,ts.sys,".");const f=p.resolve(process.argv[1]);const g=ts.createProgram([f],{...c.options,noEmit:true});const k=g.getTypeChecker();console.log(k.getExportsOfModule(k.getSymbolAtLocation(g.getSourceFile(f))).map(s=>s.name).sort().join("\n"))' F
```

To read the names at S, run `git worktree add --detach /tmp/before-1 S`, link `node_modules` and `plugins/artifact/viewer/node_modules` into it, and run the same command there.

## Criteria

### C1 — the slice's files report no structural finding [CRITICAL]
**Must be true:** Each of the five files, and every new file the slice adds under `data/` or `shell/` for the split, reports no finding except `non-essential-comment`. A residual `oversized-function` finding is allowed only when the unit is 13 to 30 lines, is one unit, and is listed in `docs/architecture/designs/mechanical-smells/findings-catalog.md` with its file and line.
**Evidence to check:** run the sensor command for each file. Run `git diff --name-status S..HEAD -- plugins/artifact/viewer/src` to list the new files, and run the command for each. Read the residual list in the catalog.
**Scoring:**
- 1.0 — zero findings, or only catalog-listed residuals.
- 0.5 — at most three findings remain, or a residual is unlisted.
- 0.0 — more than three findings, or a file is over 200 lines.

### C2 — the export surface is unchanged [CRITICAL]
**Must be true:** For `shell/model.ts` (44 names), `shell/atoms.tsx` (38), `shell/sections.tsx` (7), `shell/App.tsx` (2), `data/bundle.ts` (45), `data/types.ts` (24), `data/works.ts` (5), and `data/joins.ts` (2), the export names now equal the names at S. Every old import path still resolves.
**Evidence to check:** run the export-names command for the eight files in the working tree and in `/tmp/before-1`, and diff the two lists for each file. Run `npm run typecheck`.
**Scoring:**
- 1.0 — all eight lists identical, typecheck passes.
- 0.5 — a name was added, and none was removed.
- 0.0 — any name was removed or renamed.

### C3 — behavior and build are unchanged [CRITICAL]
**Must be true:** The viewer suite still reports 252 passing tests. The Python suite passes, and it includes the test that rebuilds `index.html` and compares the bytes with the committed file.
**Evidence to check:** run the test command. Read the vitest summary line and `tests/test_viewer_build.py` in the pytest output.
**Scoring:**
- 1.0 — all pass, and the vitest count is 252 or higher.
- 0.5 — all pass, but the vitest count fell, or the build test was skipped.
- 0.0 — any test fails.

### C4 — the sensor check exists and detects a finding
**Must be true:** `tests/test_viewer_habit_clean.py` holds an entry for slice 1 that lists the slice's files. It runs the sensor per file, keeps only issues whose `details.file` is that file, and skips when `habit-sensors` or `node_modules` is absent. It ignores `non-essential-comment` for this slice.
**Evidence to check:** run `uv run pytest tests/test_viewer_habit_clean.py -q` and expect a pass. Append a 25-line function to a slice file, run the test again and expect a failure, then restore the file with `git checkout`.
**Scoring:**
- 1.0 — passes clean and fails on the injected function.
- 0.5 — passes clean but does not fail on the injection, or it keeps unrelated clusters.
- 0.0 — missing.

### C5 — the export pin exists and detects a loss
**Must be true:** `plugins/artifact/viewer/src/shell/exports.test.ts` pins the export names of the eight surfaces, and it passes.
**Evidence to check:** run `npm run test -- exports`. Rename one export in a copy of `shell/model.ts`, run it again, expect a failure, and restore the file.
**Scoring:**
- 1.0 — passes, and fails on the rename.
- 0.5 — passes, but it pins fewer than the eight surfaces.
- 0.0 — missing.

### C6 — no suppression, no new comment finding
**Must be true:** The slice adds no `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any`, or `noqa`. The number of `non-essential-comment` findings in the slice's files does not rise above the count at S.
**Evidence to check:** `git diff S..HEAD -- plugins/artifact tests | grep '^+' | grep -E 'eslint-disable|@ts-ignore|@ts-expect-error|as any|noqa'` must print nothing. Count the comment findings per file with the sensor command, now and in `/tmp/before-1`.
**Scoring:**
- 1.0 — no suppression, and the comment count did not rise.
- 0.5 — the comment count rose by up to five.
- 0.0 — any suppression, or a larger rise.

### C7 — the viewer still renders
**Must be true:** The built viewer opens, and the board page and one design page show their headings with no console error.
**Evidence to check:** serve the viewer, open it with the ChromeDevTools MCP tools, take a snapshot of the board route and of one design route, and read the console messages.
**Scoring:**
- 1.0 — both pages render, and the console has no error.
- 0.5 — both render, and the console has a warning.
- 0.0 — a page is blank, or the console has an error.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged, except `tests/test_viewer_habit_clean.py`, `shell/exports.test.ts`, the catalog's residual list, and the committed `index.html`. The slice scope is the five logic files and the new files that split them.

## Out of scope — do not penalise
- `non-essential-comment` findings that already existed at S. Slices 6 and 7 own them. Penalise only a rise.
- Findings in the atoms, sections, change surface, shell, and test files. Slices 2 to 5 own them.
- Findings outside the viewer. Epic E2 owns them.
