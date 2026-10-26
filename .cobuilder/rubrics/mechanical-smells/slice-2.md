# Rubric: Slice 2 — the atoms and sections

Feature: mechanical-smells
Epic: E1
Slice goal: `habit-sensors` reports no finding for `shell/atoms.tsx`, `shell/sections.tsx`, and the three `shell/panels/*` files that carried findings (`Architecture.tsx`, `Intent.tsx`, `ProblemSolution.tsx`). The seven section renderers and the atom vocabulary import from their old files, and the section tests pass.
Test command: uv run pytest tests -q && (cd plugins/artifact/viewer && npm run typecheck && npm run test)

Terms used below. **S** is the commit before the slice's first commit. **Sensor command** for a file F, run from the repo root:

```
habit-sensors --file F | python3 -c 'import sys,json;d=json.load(sys.stdin);p=sys.argv[1];print([(s["smell"],i["details"].get("line")) for s in d for i in s["issues"] if i["details"].get("file")==p])' F
```

The filter on `details.file` is required, because jscpd reports repo-wide clusters in `--file` mode. **Export names** of a file F, run from `plugins/artifact/viewer`:

```
node -e 'const ts=require("typescript"),p=require("path");const c=ts.parseJsonConfigFileContent(ts.readConfigFile("tsconfig.json",ts.sys.readFile).config,ts.sys,".");const f=p.resolve(process.argv[1]);const g=ts.createProgram([f],{...c.options,noEmit:true});const k=g.getTypeChecker();console.log(k.getExportsOfModule(k.getSymbolAtLocation(g.getSourceFile(f))).map(s=>s.name).sort().join("\n"))' F
```

To read the names at S, run `git worktree add --detach /tmp/before-2 S`, link `node_modules` and `plugins/artifact/viewer/node_modules` into it, and run the same command there.

## Criteria

### C1 — the slice's files report no structural finding [CRITICAL]
**Must be true:** The five files, and every new file the slice adds under `shell/` or `shell/panels/`, report no finding except `non-essential-comment`. A residual `oversized-function` finding is allowed only when the unit is 13 to 30 lines, is one render unit, and is listed in `docs/architecture/designs/mechanical-smells/findings-catalog.md` with its file and line.
**Evidence to check:** run the sensor command for each file. Run `git diff --name-status S..HEAD -- plugins/artifact/viewer/src` to list new files, and run the command for each.
**Scoring:**
- 1.0 — zero findings, or only catalog-listed residuals.
- 0.5 — at most three findings remain, or a residual is unlisted.
- 0.0 — more than three findings, or a file is over 200 lines.

### C2 — the atom and section surfaces are unchanged [CRITICAL]
**Must be true:** `shell/atoms.tsx` still exports its 38 names, and `shell/sections.tsx` still exports its 7 names (`EpicGroupSection`, `UnresolvedSlicesSection`, `RubricsSection`, `PlanSection`, `PullRequestsSection`, `FlightDeckPanel`, `ShippedSection`). Each `shell/panels/*` file keeps its export names. Every old import path still resolves.
**Evidence to check:** run the export-names command for each of the files in the working tree and in `/tmp/before-2`, and diff the lists. Run `npm run test -- exports` and `npm run typecheck`.
**Scoring:**
- 1.0 — all lists identical, the pin and the typecheck pass.
- 0.5 — a name was added, and none was removed.
- 0.0 — any name was removed or renamed.

### C3 — behavior and build are unchanged [CRITICAL]
**Must be true:** The viewer suite reports at least 252 passing tests, including the section tests. The Python suite passes, including the test that rebuilds `index.html` and compares the bytes with the committed file.
**Evidence to check:** run the test command and read the vitest summary line.
**Scoring:**
- 1.0 — all pass, and the vitest count is 252 or higher.
- 0.5 — all pass, but the vitest count fell, or the build test was skipped.
- 0.0 — any test fails.

### C4 — the sections still render
**Must be true:** In the built viewer, a design page that holds the Rubrics and Plan sections shows both with their headings, and a pull request page shows the Shipped section. The console has no error.
**Evidence to check:** serve the viewer, open it with the ChromeDevTools MCP tools, navigate to those routes, take a snapshot of each, and read the console messages.
**Scoring:**
- 1.0 — the sections render and the console has no error.
- 0.5 — they render, and the console has a warning.
- 0.0 — a section is blank, or the console has an error.

### C5 — the sensor check covers this slice
**Must be true:** `tests/test_viewer_habit_clean.py` holds an entry for slice 2 that lists the slice's files, and it passes. The entry ignores `non-essential-comment`.
**Evidence to check:** run `uv run pytest tests/test_viewer_habit_clean.py -q`.
**Scoring:**
- 1.0 — the entry exists and passes.
- 0.5 — the entry exists but lists fewer than the five files.
- 0.0 — no entry.

### C6 — no suppression, no new comment finding
**Must be true:** The slice adds no `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any`, or `noqa`. The number of `non-essential-comment` findings in the slice's files does not rise above the count at S.
**Evidence to check:** `git diff S..HEAD -- plugins/artifact tests | grep '^+' | grep -E 'eslint-disable|@ts-ignore|@ts-expect-error|as any|noqa'` must print nothing. Count the comment findings per file, now and in `/tmp/before-2`.
**Scoring:**
- 1.0 — no suppression, and the comment count did not rise.
- 0.5 — the comment count rose by up to five.
- 0.0 — any suppression, or a larger rise.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged, except `tests/test_viewer_habit_clean.py`, `shell/exports.test.ts` (new names only if it pins them), the catalog's residual list, and the committed `index.html`.

## Out of scope — do not penalise
- `non-essential-comment` findings that already existed at S. Slices 6 and 7 own them. Penalise only a rise.
- Findings in the logic layer, the change surface, the shell, and the test files. Other slices own them.
- Findings outside the viewer. Epic E2 owns them.
