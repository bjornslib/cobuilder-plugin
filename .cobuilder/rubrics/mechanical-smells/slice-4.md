# Rubric: Slice 4 — the shell and chrome

Feature: mechanical-smells
Epic: E1
Slice goal: `habit-sensors` reports no finding for the 17 shell and chrome files (`App.tsx`, `components/work/{DesignCard,StageBadge,WorkBoard}.tsx`, `hooks/use-mobile.ts`, `shell/{App,InShort,Rail,Sheet,TopBar,WorkDrawer,jump,markdown}.tsx` or `.ts`, `shell/{hooks,readiness,workDeck}.ts`, and `vite.config.ts` under `plugins/artifact/viewer/`). `ShellApp` and `Theme` still export from `shell/App.tsx`, and the full viewer suite and the build pass.
Test command: uv run pytest tests -q && (cd plugins/artifact/viewer && npm run typecheck && npm run test)

Terms used below. **S** is the commit before the slice's first commit. **Sensor command** for a file F, run from the repo root:

```
habit-sensors --file F | python3 -c 'import sys,json;d=json.load(sys.stdin);p=sys.argv[1];print([(s["smell"],i["details"].get("line")) for s in d for i in s["issues"] if i["details"].get("file")==p])' F
```

The filter on `details.file` is required, because jscpd reports repo-wide clusters in `--file` mode. **Export names** of a file F, run from `plugins/artifact/viewer`:

```
node -e 'const ts=require("typescript"),p=require("path");const c=ts.parseJsonConfigFileContent(ts.readConfigFile("tsconfig.json",ts.sys.readFile).config,ts.sys,".");const f=p.resolve(process.argv[1]);const g=ts.createProgram([f],{...c.options,noEmit:true});const k=g.getTypeChecker();console.log(k.getExportsOfModule(k.getSymbolAtLocation(g.getSourceFile(f))).map(s=>s.name).sort().join("\n"))' F
```

To read the names at S, run `git worktree add --detach /tmp/before-4 S`, link `node_modules` and `plugins/artifact/viewer/node_modules` into it, and run the same command there.

## Criteria

### C1 — the slice's files report no structural finding [CRITICAL]
**Must be true:** The 17 files, and every new file the slice adds under `shell/` or `components/work/`, report no finding except `non-essential-comment`. A residual `oversized-function` finding is allowed only when the unit is 13 to 30 lines, is one render unit, and is listed in `docs/architecture/designs/mechanical-smells/findings-catalog.md` with its file and line.
**Evidence to check:** run the sensor command for each file. Run `git diff --name-status S..HEAD -- plugins/artifact/viewer` to list new files, and run the command for each.
**Scoring:**
- 1.0 — zero findings, or only catalog-listed residuals.
- 0.5 — at most five findings remain, or a residual is unlisted.
- 0.0 — more than five findings, or a file is over 200 lines.

### C2 — the two lint findings are fixed in the code [CRITICAL]
**Must be true:** The `jsx-a11y/media-has-caption` finding in `shell/InShort.tsx` is gone because the media element now carries a captions track, not because the rule is disabled. The two `non-null-assertion` findings in `shell/App.tsx` are gone because the code checks for the null case. No `!` assertion, `as` cast, or `eslint-disable` replaces them.
**Evidence to check:** run the sensor command on both files. Read `git diff S..HEAD -- plugins/artifact/viewer/src/shell/InShort.tsx plugins/artifact/viewer/src/shell/App.tsx`. Look for a `<track kind="captions">` element and for null checks.
**Scoring:**
- 1.0 — all three findings gone through real code changes.
- 0.5 — gone, but one fix is a cast or an empty caption track.
- 0.0 — a finding remains, or a disable comment hides it.

### C3 — behavior, build, and exports are unchanged [CRITICAL]
**Must be true:** The viewer suite reports at least 252 passing tests. The Python suite passes, including the byte-comparison of `index.html`. `shell/App.tsx` still exports the default `ShellApp` and the type `Theme`. Every other file keeps its export names.
**Evidence to check:** run the test command. Run the export-names command for each file in the working tree and in `/tmp/before-4`, and diff the lists. Run `npm run test -- exports`.
**Scoring:**
- 1.0 — all pass, the lists are identical, and the count is 252 or higher.
- 0.5 — all pass, but a name was added, or the vitest count fell.
- 0.0 — any test fails, or a name was removed.

### C4 — the shell still works
**Must be true:** In the built viewer, a click on a rail row changes the route and the page. The top bar's theme control switches the theme. The work drawer opens and closes. The board lists its design cards. The console has no error.
**Evidence to check:** serve the viewer, open it with the ChromeDevTools MCP tools, perform each action, take a snapshot after each, and read the console messages.
**Scoring:**
- 1.0 — all four actions work and the console has no error.
- 0.5 — they work, and the console has a warning.
- 0.0 — an action fails, or the console has an error.

### C5 — the sensor check covers this slice
**Must be true:** `tests/test_viewer_habit_clean.py` holds an entry for slice 4 that lists the 17 files, and it passes. The entry ignores `non-essential-comment`.
**Evidence to check:** run `uv run pytest tests/test_viewer_habit_clean.py -q`.
**Scoring:**
- 1.0 — the entry exists and passes.
- 0.5 — the entry lists fewer than the 17 files.
- 0.0 — no entry.

### C6 — no suppression, no new comment finding
**Must be true:** The slice adds no `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any`, or `noqa`. The number of `non-essential-comment` findings in the slice's files does not rise above the count at S.
**Evidence to check:** `git diff S..HEAD -- plugins/artifact tests | grep '^+' | grep -E 'eslint-disable|@ts-ignore|@ts-expect-error|as any|noqa'` must print nothing. Count the comment findings per file, now and in `/tmp/before-4`.
**Scoring:**
- 1.0 — no suppression, and the comment count did not rise.
- 0.5 — the comment count rose by up to five.
- 0.0 — any suppression, or a larger rise.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged, except `tests/test_viewer_habit_clean.py`, `shell/exports.test.ts`, the catalog's residual list, and the committed `index.html`.

## Out of scope — do not penalise
- `non-essential-comment` findings that already existed at S. Slices 6 and 7 own them. Penalise only a rise.
- Findings in the logic layer, the atoms and sections, the change surface, and the test files. Other slices own them.
- Findings outside the viewer. Epic E2 owns them.
- The size of this slice. It is one slice by decision.
