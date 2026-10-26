# Rubric: Slice 7 — the comments in viewer tests

Feature: mechanical-smells
Epic: E1
Slice goal: `habit-sensors` reports no `non-essential-comment` finding for the viewer test files that carried the 422 comment findings, and the reviewer sample meets the same limit as slice 6. The viewer then reports no finding apart from the recorded residual.
Test command: uv run pytest tests -q && (cd plugins/artifact/viewer && npm run typecheck && npm run test)

Terms used below. **S** is the commit before the slice's first commit. **Sensor command** for a file F, run from the repo root:

```
habit-sensors --file F | python3 -c 'import sys,json;d=json.load(sys.stdin);p=sys.argv[1];print([(s["smell"],i["details"].get("line")) for s in d for i in s["issues"] if i["details"].get("file")==p])' F
```

The filter on `details.file` is required, because jscpd reports repo-wide clusters in `--file` mode. **The slice's files** are the viewer `*.test.*` files that report a `non-essential-comment` finding at S. List them with the sensor command in a worktree at S (`git worktree add --detach /tmp/before-7 S`, with `node_modules` and `plugins/artifact/viewer/node_modules` linked in). The baseline at S is 252 passing tests, 787 `expect(` calls, and 234 `it` or `test` cases.

## Criteria

### C1 — the comment findings are gone [CRITICAL]
**Must be true:** None of the slice's files reports a `non-essential-comment` finding.
**Evidence to check:** run the sensor command for each file in the working tree, and count the `non-essential-comment` entries.
**Scoring:**
- 1.0 — zero.
- 0.5 — at most ten remain.
- 0.0 — more than ten remain.

### C2 — no test code changed [CRITICAL]
**Must be true:** For every changed test file, the code is identical once comments are stripped. The test count and the `expect(` count are unchanged.
**Evidence to check:** run this from `plugins/artifact/viewer`. It prints a line for each file whose minified code differs from S:

```
for f in $(git diff --name-only S..HEAD -- src | sed 's|^plugins/artifact/viewer/||'); do
  ext=ts; case "$f" in *.tsx) ext=tsx;; esac
  a=$(git show S:plugins/artifact/viewer/$f | npx --no-install esbuild --minify --loader=$ext | sha256sum)
  b=$(npx --no-install esbuild --minify --loader=$ext < $f | sha256sum)
  [ "$a" = "$b" ] || echo "CODE CHANGED: $f"
done
```

Run `npm run test` and read the count. Run `find src -name '*.test.*' | xargs cat | grep -oE '\bexpect\(' | wc -l`.
**Scoring:**
- 1.0 — the loop prints nothing, the count is 252 or higher, and `expect(` is 787 or higher.
- 0.5 — the loop prints one file with a whitespace change only.
- 0.0 — it prints a file with a code change, or a count fell.

### C3 — the reviewer sample keeps the comments that explain why [CRITICAL]
**Must be true:** Of at least 20 sampled comment changes, at most one removed or reworded a comment that explained why. In a test file, a comment explains why when it states the reason for a fixture value, the scenario behind a case, a known bug it pins, or a constraint of the test environment.
**Evidence to check:** collect the removed comment lines, then draw a repeatable sample:

```
git diff -U0 S..HEAD -- 'plugins/artifact/viewer/src/**/*.test.*' | grep -E '^-\s*(//|/\*|\*)' > /tmp/removed-7.txt
python3 -c "import random;L=open('/tmp/removed-7.txt').read().splitlines();random.seed(20261026);print('\n'.join(random.sample(L,min(25,len(L)))))"
```

Read each sampled line with its surrounding code (`git show S:<file>`), and classify it. Read every comment the slice added or reworded. Record the sample and the classes in the evidence file.
**Scoring:**
- 1.0 — at most one of the sampled changes lost a why-comment.
- 0.5 — two lost one.
- 0.0 — three or more lost one. This also fires the abort condition of the program: report it.

### C4 — no dodge, no suppression
**Must be true:** The slice adds no `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any`, `noqa`, or `habit` suppression. It adds no comment in a form that the sensor ignores merely to keep text. It adds no exclusion to `.habit-hooks/config.toml`.
**Evidence to check:** `git diff S..HEAD -- plugins/artifact tests .habit-hooks | grep '^+' | grep -E 'eslint-disable|@ts-ignore|@ts-expect-error|as any|noqa|habit-snooze|snooze'` must print nothing. Read the added lines of `.habit-hooks/config.toml`. Read ten added comment lines.
**Scoring:**
- 1.0 — nothing found.
- 0.5 — one comment is a disguised restatement.
- 0.0 — any suppression, or a new exclusion.

### C5 — the viewer reads clean, and the residuals are recorded
**Must be true:** Across every file under `plugins/artifact/viewer/src`, `habit-sensors` reports no finding except the catalog-listed `oversized-function` residuals. The catalog lists each residual with its file and line. Python-side checks still pass.
**Evidence to check:** run `habit-sensors --all`, keep the issues whose file starts with `plugins/artifact/viewer/`, and list what remains. Read the residual list in `docs/architecture/designs/mechanical-smells/findings-catalog.md`. Run the test command.
**Scoring:**
- 1.0 — only listed residuals remain, and all tests pass.
- 0.5 — a residual is unlisted, or up to five findings remain.
- 0.0 — more than five findings remain, or a test fails.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged, except `tests/test_viewer_habit_clean.py` (a slice 7 entry, and the final whole-viewer check) and the catalog.

## Out of scope — do not penalise
- Comment findings in source files. Slice 6 owns them.
- Findings outside the viewer. Epic E2 owns them.
