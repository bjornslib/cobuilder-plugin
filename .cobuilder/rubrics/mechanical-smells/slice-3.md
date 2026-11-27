# Rubric: Slice 3 — the change surface

Feature: mechanical-smells
Epic: E1
Slice goal: `habit-sensors` reports no finding for the five `shell/change/*` files (`Diff.tsx`, `Frame.tsx`, `Sheets.tsx`, `levels.ts`, `sections.tsx`), `shell/DiagramTiles.tsx`, and `shell/Pager.tsx`, including the `react-hooks/exhaustive-deps` finding. The change-view tests pass, and the diagram tiles still render.
Test command: uv run pytest tests -q && (cd plugins/artifact/viewer && npm run typecheck && npm run test)

Terms used below. **S** is the commit before the slice's first commit. **Sensor command** for a file F, run from the repo root:

```
habit-sensors --file F | python3 -c 'import sys,json;d=json.load(sys.stdin);p=sys.argv[1];print([(s["smell"],i["details"].get("line")) for s in d for i in s["issues"] if i["details"].get("file")==p])' F
```

The filter on `details.file` is required, because jscpd reports repo-wide clusters in `--file` mode. **Export names** of a file F, run from `plugins/artifact/viewer`:

```
node -e 'const ts=require("typescript"),p=require("path");const c=ts.parseJsonConfigFileContent(ts.readConfigFile("tsconfig.json",ts.sys.readFile).config,ts.sys,".");const f=p.resolve(process.argv[1]);const g=ts.createProgram([f],{...c.options,noEmit:true});const k=g.getTypeChecker();console.log(k.getExportsOfModule(k.getSymbolAtLocation(g.getSourceFile(f))).map(s=>s.name).sort().join("\n"))' F
```

To read the names at S, run `git worktree add --detach /tmp/before-3 S`, link `node_modules` and `plugins/artifact/viewer/node_modules` into it, and run the same command there.

## Criteria

### C1 — the slice's files report no structural finding [CRITICAL]
**Must be true:** The seven files, and every new file the slice adds under `shell/` or `shell/change/`, report no finding except `non-essential-comment`. A residual `oversized-function` finding is allowed only when the unit is 13 to 30 lines, is one render unit, and is listed in `docs/architecture/designs/mechanical-smells/findings-catalog.md` with its file and line.
**Evidence to check:** run the sensor command for each file. Run `git diff --name-status S..HEAD -- plugins/artifact/viewer/src` to list new files, and run the command for each.
**Scoring:**
- 1.0 — zero findings, or only catalog-listed residuals.
- 0.5 — at most three findings remain, or a residual is unlisted.
- 0.0 — more than three findings, or a file is over 200 lines.

### C2 — the hooks finding is fixed in the code, not hidden [CRITICAL]
**Must be true:** The `react-hooks/exhaustive-deps` finding in `shell/DiagramTiles.tsx` no longer appears. The fix changes the hook's dependencies or its callback. It adds no `eslint-disable` comment. The diagram tile still opens its zoom dialog.
**Evidence to check:** run the sensor command on `shell/DiagramTiles.tsx` and look for the `react-hooks/exhaustive-deps` smell. Run `git diff S..HEAD -- plugins/artifact/viewer/src/shell/DiagramTiles.tsx | grep -n eslint-disable`, which must print nothing. Run `npm run test -- DiagramTiles`.
**Scoring:**
- 1.0 — the finding is gone, no disable comment, and the test passes.
- 0.5 — the finding is gone, but the fix changes the hook's behavior in a way the test does not cover.
- 0.0 — the finding remains, or a disable comment hides it.

### C3 — behavior, build, and exports are unchanged [CRITICAL]
**Must be true:** The viewer suite reports at least 252 passing tests. The Python suite passes, including the byte-comparison of `index.html`. Each of the seven files keeps its export names, and the change-view tests pass.
**Evidence to check:** run the test command. Run the export-names command for each file in the working tree and in `/tmp/before-3`, and diff the lists. Run `npm run test -- exports`.
**Scoring:**
- 1.0 — all pass, the lists are identical, and the count is 252 or higher.
- 0.5 — all pass, but a name was added, or the vitest count fell.
- 0.0 — any test fails, or a name was removed.

### C4 — the change surface still renders
**Must be true:** In the built viewer, the change view of a pull request shows its levels, its sections, and its diff. A diagram tile opens its dialog and closes it. The pager moves between pages. The console has no error.
**Evidence to check:** serve the viewer, open it with the ChromeDevTools MCP tools, navigate to a change route, click a diagram tile, press the pager button, take snapshots, and read the console messages.
**Scoring:**
- 1.0 — all three work and the console has no error.
- 0.5 — they work, and the console has a warning.
- 0.0 — one fails, or the console has an error.

### C5 — the sensor check covers this slice
**Must be true:** `tests/test_viewer_habit_clean.py` holds an entry for slice 3 that lists the seven files, and it passes. The entry ignores `non-essential-comment`.
**Evidence to check:** run `uv run pytest tests/test_viewer_habit_clean.py -q`.
**Scoring:**
- 1.0 — the entry exists and passes.
- 0.5 — the entry lists fewer than the seven files.
- 0.0 — no entry.

### C6 — no suppression, no new comment finding
**Must be true:** The slice adds no `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any`, or `noqa`. The number of `non-essential-comment` findings in the slice's files does not rise above the count at S.
**Evidence to check:** `git diff S..HEAD -- plugins/artifact tests | grep '^+' | grep -E 'eslint-disable|@ts-ignore|@ts-expect-error|as any|noqa'` must print nothing. Count the comment findings per file, now and in `/tmp/before-3`.
**Scoring:**
- 1.0 — no suppression, and the comment count did not rise.
- 0.5 — the comment count rose by up to five.
- 0.0 — any suppression, or a larger rise.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged, except `tests/test_viewer_habit_clean.py`, `shell/exports.test.ts`, the catalog's residual list, and the committed `index.html`.

## Out of scope — do not penalise
- `non-essential-comment` findings that already existed at S. Slices 6 and 7 own them. Penalise only a rise.
- Findings in the logic layer, the atoms and sections, the shell, and the test files. Other slices own them.
- Findings outside the viewer. Epic E2 owns them.
