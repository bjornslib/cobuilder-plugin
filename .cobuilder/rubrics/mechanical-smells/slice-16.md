# Rubric: Slice 16 — the comments outside the viewer

Feature: mechanical-smells
Epic: E2
Slice goal: Every flagged comment in the 18 files outside the viewer (146 `non-essential-comment` findings at the start of E2) gets a per-comment review, as in slices 6 and 7. A comment that only restates the code, a divider, and commented-out code are deleted. A comment that explains why is kept, reworded shorter where that helps. Each file's kept comments are recorded in the `slice16-*.md` tables, and the sensor reports no comment finding beyond those records. The code is unchanged once comments are stripped. After this slice the whole repo reports no finding apart from the recorded residuals and the kept why-comments.
Test command: uv run pytest tests -q && (cd plugins/artifact/viewer && npm run typecheck && npm run test) && claude plugin test plugins/cobuilder-memory && npx tsc -p plugins/cobuilder-memory --noEmit

Decision on record (2026-10-27, the engineer): the sensor flags every `//` comment of 10 or more characters and every block or JSDoc comment of 15 or more characters, so a comment that explains why can never reach zero findings. The engineer chose to keep why-comments in the code and to record them, not to move them and not to tune the sensor.

Terms used below. **S** is the commit before the slice's first commit. **Sensor command** for a file F, run from the repo root:

```
habit-sensors --file F | python3 -c 'import sys,json;d=json.load(sys.stdin);p=sys.argv[1];print([(s["smell"],i["details"].get("line")) for s in d for i in s["issues"] if i["details"].get("file")==p])' F
```

The filter on `details.file` is required, because jscpd reports repo-wide clusters in `--file` mode. **The slice's files** are the files outside `plugins/artifact/viewer` that report a `non-essential-comment` finding at S. Expect 18 files and 146 findings. Get the list from `habit-sensors --all` in `/tmp/before-16`, made by `git worktree add --detach /tmp/before-16 S`, with `node_modules` linked in. If the count differs, use the real count. **The kept-comments tables** are the markdown tables in `docs/architecture/designs/mechanical-smells/kept-comments/slice16-*.md` (columns File, Kept, Original). Python files carry `#` comments and docstrings that the sensor flags. TypeScript files carry `//` and block comments.

## Criteria

### C1 — the sensor matches the records, and the review happened [CRITICAL]
**Must be true:** For every slice file, the number of `non-essential-comment` findings is at most its `Kept` value, and a file with no table row has zero. Each `Original` value equals the count at S. The kept total is clearly below the original total of 146. No row claims a `Kept` above what the sensor reports now.
**Evidence to check:** run the sensor command for each slice file now and in `/tmp/before-16`. Read the `slice16-*.md` tables. Compute the totals. Run `uv run pytest tests/test_repo_habit_clean.py -q`, which holds the slice 16 entry.
**Scoring:**
- 1.0 — every file within its record, every `Original` matches S, and the kept total is lower than the original total by at least the restating comments you find in the C3 sample.
- 0.5 — one or two files exceed their record, or a few `Original` values are wrong.
- 0.0 — records are missing, more than two files exceed them, or nothing was deleted.

### C2 — no code changed [CRITICAL]
**Must be true:** For every changed file, the code is identical once comments are stripped. The slice adds or deletes no source file. A removed docstring is a comment change only when it is a docstring that the code does not read. A docstring that a test or a command reads, such as an argparse `description` taken from `__doc__`, is code.
**Evidence to check:** for Python, run from the repo root. It prints each file whose comment-free tree differs from S:

```
for f in $(git diff --name-only S -- '*.py'); do
  a=$(git show S:$f | python3 -c 'import sys,ast;t=ast.parse(sys.stdin.read())
for n in ast.walk(t):
    if isinstance(n,(ast.Module,ast.FunctionDef,ast.AsyncFunctionDef,ast.ClassDef)) and n.body and isinstance(n.body[0],ast.Expr) and isinstance(getattr(n.body[0],"value",None),ast.Constant) and isinstance(n.body[0].value.value,str): n.body[0]=ast.Pass()
print(ast.unparse(t))' | sha256sum)
  b=$(python3 -c 'import sys,ast;t=ast.parse(open(sys.argv[1]).read())
for n in ast.walk(t):
    if isinstance(n,(ast.Module,ast.FunctionDef,ast.AsyncFunctionDef,ast.ClassDef)) and n.body and isinstance(n.body[0],ast.Expr) and isinstance(getattr(n.body[0],"value",None),ast.Constant) and isinstance(n.body[0].value.value,str): n.body[0]=ast.Pass()
print(ast.unparse(t))' $f | sha256sum)
  [ "$a" = "$b" ] || echo "CODE CHANGED: $f"
done
```

For TypeScript, run the esbuild loop of slice 6 over the changed `*.ts` files under `plugins/cobuilder-memory`, with `--loader=ts` and `npx --no-install esbuild --minify`. Run `git diff --name-status S -- . ':!docs' ':!.cobuilder'` and confirm no `A` or `D` line apart from the new guard test and its fixtures. Run the slice's code guard, `uv run pytest tests/test_comments_only_repo.py -q` or the file name that `git diff --name-status S -- tests` shows, and confirm it hashes Python through `ast.unparse` and TypeScript through esbuild. Run each changed script with `--help` and diff against S, and run `uv run pytest tests/test_script_cli_stable.py -q`.
**Scoring:**
- 1.0 — the loops print nothing, no file was added or deleted, the guard passes, and `--help` text is equal.
- 0.5 — one file differs by a docstring that the validator confirms no code reads.
- 0.0 — any file shows a code change, or a `--help` text or a shell-visible string changed.

### C3 — the reviewer samples are clean [CRITICAL]
**Must be true:** Sample A, deleted comments: of at least 20, at most one explained why. Sample B, kept comments: of at least 20, at most two only restate the code or the name. A comment explains why when it states a reason, a constraint, a trade-off, an ordering requirement, a library or platform quirk, a hook contract, or a fact that the code does not show. A comment that restates the code, labels a section, or repeats a name does not.
**Evidence to check:** collect the removed comment text, then draw a repeatable sample with seed 20261027:

```
git diff -U0 S -- . ':!plugins/artifact/viewer' ':!docs' ':!.cobuilder' ':!*.md' | grep -E '^-\s*(#|//|/\*|\*|"""|'"'''"')' > /tmp/removed-16.txt
python3 -c "import random;L=open('/tmp/removed-16.txt').read().splitlines();random.seed(20261027);print('\n'.join(random.sample(L,min(25,len(L)))))"
```

For sample B list the remaining findings with the sensor command over the slice files, draw 25 with the same seed, and read each in its file. Read each sampled deleted line with its code in `git show S:<file>`. Read ten reworded comments: a rewording must keep the reason. Record both samples and the classes in the evidence file.
**Scoring:**
- 1.0 — sample A has at most one lost why-comment, and sample B has at most two restatements.
- 0.5 — sample A has two lost, or sample B has three or four restatements.
- 0.0 — sample A has three or more lost (report it, because it fires the abort condition of the program), or sample B has five or more restatements.

### C4 — the whole repo is clean apart from the records [CRITICAL]
**Must be true:** A final scan of the whole repo, outside the viewer and inside it, shows only three kinds of finding: kept why-comments within the records of slices 6, 7, and 16, the `oversized-function` residuals in test files that the catalog lists with file and unit, and nothing else. The epic goal is met: no finding other than those.
**Evidence to check:** run `habit-sensors --all` at the repo root and save the JSON. Group the issues by smell and by file. For each `non-essential-comment` file, compare its count with the `Kept` value in `docs/architecture/designs/mechanical-smells/kept-comments/*.md`. For each `oversized-function` finding, find its file and line in catalog section 7. Any smell outside these two kinds fails. Run `uv run pytest tests/test_repo_habit_clean.py tests/test_viewer_habit_clean.py -q`.
**Scoring:**
- 1.0 — only recorded kept comments and listed residuals remain.
- 0.5 — one or two unrecorded findings remain, and the validator names them.
- 0.0 — three or more unrecorded findings, or any finding of another smell that was in scope of E2.

### C5 — no dodge, no suppression
**Must be true:** The slice adds no `noqa`, `# type: ignore`, `eslint-disable`, `@ts-ignore`, `as any`, `habit-snooze`, and no exclusion in `.habit-hooks/config.toml`. It keeps no text by a disguise that the sensor ignores: a string literal that holds a moved comment, a docstring that a function gains to carry a deleted `#` comment, a JSDoc wrapper around a restating sentence, or a comment shortened below the sensor threshold (10 characters for `//` and `#`, 15 for blocks) to hide a still-useless fragment.
**Evidence to check:** `git diff S | grep '^+' | grep -E 'noqa|type: *ignore|eslint-disable|@ts-ignore|as any|snooze'` must print nothing. `git diff S -- .habit-hooks` must show no new exclusion. Count docstrings at S and now in the slice files with `grep -c '"""'` and confirm the count did not rise by more than the number of new functions. Read ten added comment lines, and read every added comment shorter than 12 characters.
**Scoring:**
- 1.0 — nothing found.
- 0.5 — one comment is a disguised restatement.
- 0.0 — any suppression, a new exclusion, or two or more disguises.

### C6 — tests and builds are unchanged
**Must be true:** The Python suite passes, including the byte-comparison of `index.html`. The viewer suite reports 260 passing tests. The memory plugin reports 76 passing tests in 8 files, and `tsc` is clean. Only files in scope changed: the slice files, the `slice16-*.md` tables, the guard test and its fixture, and the sensor check files.
**Evidence to check:** run the test command. Run `git diff --name-only S` and read each path. Run `uv run pytest tests -q` and read the pass count against the count at S in `/tmp/before-16` (it may rise only by the new guard tests).
**Scoring:**
- 1.0 — all pass with the counts above, and only files in scope changed.
- 0.5 — all pass, and one stray file changed with a reason.
- 0.0 — any test fails, a count fell, or a file outside scope changed in behavior.

## Regression check
- All tests that passed before this slice must still pass, including the slow tests with `-m ''`.
- Every script keeps its `--help` text, and every module keeps its exports (`tests/test_script_cli_stable.py`, `tests/test_python_exports.py`).
- The test guards keep passing: `tests/test_python_tests_preserved.py` and `tests/test_memory_tests_preserved.py`.

## Out of scope — do not penalise
- Comment findings inside `plugins/artifact/viewer`. Slices 6 and 7 own them, and C4 only reads their records.
- Prose in Markdown files. A Markdown file is not a comment file.
- A why-comment that stays as a finding, if a `slice16-*.md` table records it. That is the decision on record.
- Structural and duplication findings that slices 8 to 15 recorded as residuals.
