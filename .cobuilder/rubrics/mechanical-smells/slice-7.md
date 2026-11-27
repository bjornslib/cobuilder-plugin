# Rubric: Slice 7 — the comments in viewer tests

Feature: mechanical-smells
Epic: E1
Slice goal: Every flagged comment in the viewer's test-side files (the `*.test.*` files and everything under a `testSupport` folder) gets the same per-comment review as slice 6. Restating comments, dividers, and dead code are deleted. A comment that explains why is kept, reworded shorter where that helps. Each file's kept comments are recorded in the kept-comments tables, and the sensor reports no `non-essential-comment` finding beyond those records. The viewer then reports no finding other than those kept why-comments and the recorded oversized-function residuals.
Test command: uv run pytest tests -q && (cd plugins/artifact/viewer && npm run typecheck && npm run test)

Decision on record (2026-10-27, the engineer): the sensor flags every `//` comment of 10 or more characters and every block or JSDoc comment of 15 or more characters, so a comment that explains why can never reach zero findings. The engineer chose to keep why-comments in the code and to record them. This rubric therefore replaces an earlier "zero findings" wording.

Terms used below. **S** is the commit before the slice's first commit. **Sensor command** for a file F, run from the repo root:

```
habit-sensors --file F | python3 -c 'import sys,json;d=json.load(sys.stdin);p=sys.argv[1];print([(s["smell"],i["details"].get("line")) for s in d for i in s["issues"] if i["details"].get("file")==p])' F
```

The filter on `details.file` is required, because jscpd reports repo-wide clusters in `--file` mode. **The slice's files** are the viewer files that are `*.test.*` files or live under a `testSupport` folder, and that report a `non-essential-comment` finding at S. **The kept-comments tables** are the markdown tables in `docs/architecture/designs/mechanical-smells/kept-comments/*.md` (columns File, Kept, Original). To read the state at S, run `git worktree add --detach /tmp/before-7 S`, with `node_modules` and `plugins/artifact/viewer/node_modules` linked in. The baseline at S is 260 passing viewer tests, 788 `expect(` calls, and 235 `it` or `test` cases.

## Criteria

### C1 — the sensor matches the records, and the review happened [CRITICAL]
**Must be true:** For every slice file, the number of `non-essential-comment` findings is at most the `Kept` value in the kept-comments tables, and a file that is not in a table has zero. The `Original` value equals the count at S. The review is real: the kept total is clearly below the original total, and no table row claims a `Kept` above the count the sensor reports now.
**Evidence to check:** run the sensor command for each slice file now and in `/tmp/before-7`. Read the tables. Compute the totals. Run `uv run pytest tests/test_viewer_habit_clean.py -q`, which holds the slice 7 check.
**Scoring:**
- 1.0 — every file within its record, `Original` values match S, and the kept total is lower than the original total by at least the restating comments you find in the sample of C3.
- 0.5 — one or two files exceed their record, or a few `Original` values are wrong.
- 0.0 — the records are missing, or more than two files exceed them, or nothing was deleted.

### C2 — no test code changed [CRITICAL]
**Must be true:** For every changed file, the code is identical once comments are stripped, and the slice adds or deletes no file. The test count and the `expect(` count are unchanged.
**Evidence to check:** run this from `plugins/artifact/viewer`. It prints a line for each file whose minified code differs from S:

```
for f in $(git diff --name-only S -- src | sed 's|^plugins/artifact/viewer/||'); do
  ext=ts; case "$f" in *.tsx) ext=tsx;; esac
  a=$(git show S:plugins/artifact/viewer/$f | npx --no-install esbuild --minify --loader=$ext | sha256sum)
  b=$(npx --no-install esbuild --minify --loader=$ext < $f | sha256sum)
  [ "$a" = "$b" ] || echo "CODE CHANGED: $f"
done
```

Run `git diff --name-status S -- plugins/artifact/viewer/src` and confirm there is no `A` or `D` line. Run `npm run test` and read the count. Run `find src -name '*.test.*' | xargs cat | grep -oE '\bexpect\(' | wc -l`. Run `uv run pytest tests/test_viewer_tests_preserved.py -q`.
**Scoring:**
- 1.0 — the loop prints nothing, no file was added or deleted, the vitest count is 260, and `expect(` is 788.
- 0.5 — the loop prints one file with a whitespace change only.
- 0.0 — it prints a file with a code change, or a count fell.

### C3 — the reviewer samples are clean [CRITICAL]
**Must be true:** Sample A, deleted comments: of at least 20, at most one explained why. Sample B, kept comments: of at least 20, at most two only restate the code or the name. In a test file, a comment explains why when it states the reason for a fixture value, the scenario behind a case, a known bug it pins, a constraint of the test environment, or a fact the code does not show.
**Evidence to check:** collect the removed comment text and the remaining comment findings, then draw repeatable samples:

```
git diff -U0 S -- 'plugins/artifact/viewer/src/**/*.test.*' 'plugins/artifact/viewer/src/**/testSupport/**' | grep -E '^-\s*(//|/\*|\*)' > /tmp/removed-7.txt
python3 -c "import random;L=open('/tmp/removed-7.txt').read().splitlines();random.seed(20261027);print('\n'.join(random.sample(L,min(25,len(L)))))"
```

For sample B list the remaining findings with the sensor command, draw 25 with the same seed, and read each comment in its file. Read each sampled deleted line with its surrounding code (`git show S:<file>`). Read ten reworded comments. Record both samples and the classes in the evidence file.
**Scoring:**
- 1.0 — sample A has at most one lost why-comment and sample B has at most two restatements.
- 0.5 — sample A has two lost, or sample B has three or four restatements.
- 0.0 — sample A has three or more lost (this also fires the abort condition of the program: report it), or sample B has five or more restatements.

### C4 — no dodge, no suppression
**Must be true:** The slice adds no `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any`, `noqa`, or `habit` suppression, and no config exclusion. It adds no comment in a form that the sensor ignores merely to keep text.
**Evidence to check:** `git diff S -- plugins/artifact tests .habit-hooks | grep '^+' | grep -E 'eslint-disable|@ts-ignore|@ts-expect-error|as any|noqa|habit-snooze|snooze'` must print nothing. Read the added lines of `.habit-hooks/config.toml`. Read ten added comment lines.
**Scoring:**
- 1.0 — nothing found.
- 0.5 — one comment is a disguised restatement.
- 0.0 — any suppression, or a new exclusion.

### C5 — the viewer reads clean except the records
**Must be true:** Across every file under `plugins/artifact/viewer/src` (and `vite*.ts`), `habit-sensors` reports no finding except `non-essential-comment` findings within the kept-comments records, and `oversized-function` residuals listed in `docs/architecture/designs/mechanical-smells/findings-catalog.md` section 7 (the table may be empty). The kept-comments tables cover slice 6 and slice 7 files, and nothing else. The built script in `plugins/artifact/viewer/index.html` is equal to S.
**Evidence to check:** run `habit-sensors --all`, keep the issues whose file starts with `plugins/artifact/viewer/` (add `plugins/` to jscpd paths that start with `artifact/`), and list what remains by smell. Read the catalog table and the kept-comments tables. Run the test command.
**Scoring:**
- 1.0 — only recorded findings remain, and all tests pass.
- 0.5 — a residual is unlisted, or up to five unrecorded findings remain.
- 0.0 — more than five unrecorded findings remain, or a test fails.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged, except `tests/test_viewer_habit_clean.py`, `tests/_viewer_habit_slices.py`, `tests/test_viewer_comments_only.py`, the kept-comments tables, the catalog, the rebuilt `index.html`, and its bundle copy.

## Out of scope — do not penalise
- Comment findings in source files that slice 6 already settled.
- Findings outside the viewer. Epic E2 owns them.
- A why-comment that stays as a finding, if it is recorded in the tables. That is the decision on record.
