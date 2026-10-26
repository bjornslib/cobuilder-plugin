# Rubric: Slice 6 — the comments in viewer source

Feature: mechanical-smells
Epic: E1
Slice goal: Every flagged comment in the viewer's source files gets a per-comment review. A comment that only restates the code, a divider, and commented-out code are deleted. A comment that explains why is kept, reworded shorter where that helps. Each file's kept comments are recorded in the kept-comments tables, and the sensor reports no `non-essential-comment` finding beyond those records. A reviewer sample finds no deleted comment that explained why, and no kept comment that only restates the code.
Test command: uv run pytest tests -q && (cd plugins/artifact/viewer && npm run typecheck && npm run test)

Decision on record (2026-10-27, the engineer): the sensor flags every `//` comment of 10 or more characters and every block or JSDoc comment of 15 or more characters, so a comment that explains why can never reach zero findings. The engineer chose to keep why-comments in the code and to record them, not to move them and not to tune the sensor. This rubric therefore replaces an earlier "zero findings" wording.

Terms used below. **S** is the commit before the slice's first commit. **Sensor command** for a file F, run from the repo root:

```
habit-sensors --file F | python3 -c 'import sys,json;d=json.load(sys.stdin);p=sys.argv[1];print([(s["smell"],i["details"].get("line")) for s in d for i in s["issues"] if i["details"].get("file")==p])' F
```

The filter on `details.file` is required, because jscpd reports repo-wide clusters in `--file` mode. **The slice's files** are the viewer files under `plugins/artifact/viewer/src` and `plugins/artifact/viewer/vite*.ts` that are NOT `*.test.*` files and NOT under a `testSupport` folder (slice 7 owns those), and that report a `non-essential-comment` finding at S. **The kept-comments tables** are the markdown tables in `docs/architecture/designs/mechanical-smells/kept-comments/*.md` (columns File, Kept, Original). To read the state at S, run `git worktree add --detach /tmp/before-6 S`, with `node_modules` and `plugins/artifact/viewer/node_modules` linked in.

## Criteria

### C1 — the sensor matches the records, and the review happened [CRITICAL]
**Must be true:** For every slice file, the number of `non-essential-comment` findings is at most the `Kept` value in the kept-comments tables, and a file that is not in a table has zero. The `Original` value equals the count at S. The review is real: the total kept is clearly below the total original (restating comments, dividers, and dead code are gone), and no table row claims a `Kept` above the count the sensor reports now.
**Evidence to check:** run the sensor command for each slice file now and in `/tmp/before-6`. Read the tables. Compute the total original, the total kept, and the total now. Run `uv run pytest tests/test_viewer_habit_clean.py -q`, which holds the slice 6 check.
**Scoring:**
- 1.0 — every file within its record, `Original` values match S, and the kept total is lower than the original total by at least the number of comments you find to be restating or dividers in the sample of C3.
- 0.5 — one or two files exceed their record, or a few `Original` values are wrong.
- 0.0 — the records are missing, or more than two files exceed them, or nothing was deleted.

### C2 — no code changed [CRITICAL]
**Must be true:** For every changed file, the code is identical once comments are stripped, and the slice adds or deletes no source file.
**Evidence to check:** run this from `plugins/artifact/viewer`. It prints a line for each file whose minified code differs from S:

```
for f in $(git diff --name-only S -- src vite.config.ts vite.bundleData.ts | sed 's|^plugins/artifact/viewer/||'); do
  ext=ts; case "$f" in *.tsx) ext=tsx;; esac
  a=$(git show S:plugins/artifact/viewer/$f | npx --no-install esbuild --minify --loader=$ext | sha256sum)
  b=$(npx --no-install esbuild --minify --loader=$ext < $f | sha256sum)
  [ "$a" = "$b" ] || echo "CODE CHANGED: $f"
done
```

Also run `git diff --name-status S -- plugins/artifact/viewer/src` and confirm every line is `M` for a source file (no `A` or `D`, apart from nothing). Also run `uv run pytest tests/test_viewer_comments_only.py -q` if it exists.
**Scoring:**
- 1.0 — the loop prints nothing and no file was added or deleted.
- 0.5 — it prints one file, and the diff shows a whitespace or import-order change only.
- 0.0 — it prints a file with a code change.

### C3 — the reviewer samples are clean [CRITICAL]
**Must be true:** Sample A, deleted comments: of at least 20, at most one explained why. Sample B, kept comments: of at least 20, at most two only restate the code or the name. A comment explains why when it states a reason, a constraint, a trade-off, an ordering requirement, a library or browser quirk, or a fact that the code does not show. A comment that only restates the code, labels a section, or repeats a type or name does not.
**Evidence to check:** collect the removed comment text and the remaining comment findings, then draw repeatable samples:

```
git diff -U0 S -- plugins/artifact/viewer/src ':(exclude,glob)**/*.test.*' ':(exclude,glob)**/testSupport/**' | grep -E '^-\s*(//|/\*|\*)' > /tmp/removed-6.txt
python3 -c "import random;L=open('/tmp/removed-6.txt').read().splitlines();random.seed(20261027);print('\n'.join(random.sample(L,min(25,len(L)))))"
```

For sample B list the remaining findings with the sensor command over the slice files, draw 25 with the same seed, and read each comment in its file. Read each sampled deleted line with its surrounding code (`git show S:<file>`) and classify it. Also read ten comments that the slice reworded: a rewording must keep the reason. Record both samples and the classes in the evidence file.
**Scoring:**
- 1.0 — sample A has at most one lost why-comment and sample B has at most two restatements.
- 0.5 — sample A has two lost, or sample B has three or four restatements.
- 0.0 — sample A has three or more lost (this also fires the abort condition of the program: report it), or sample B has five or more restatements.

### C4 — no dodge, no suppression
**Must be true:** The slice adds no `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any`, `noqa`, or `habit` suppression, and no config exclusion. It adds no comment in a form that the sensor ignores merely to keep text, such as a block of text moved into a string, a JSX comment `{/* */}` that was a normal comment before, or a JSDoc wrapper around the same restating sentence.
**Evidence to check:** `git diff S -- plugins/artifact tests .habit-hooks | grep '^+' | grep -E 'eslint-disable|@ts-ignore|@ts-expect-error|as any|noqa|habit-snooze|snooze'` must print nothing. Read the added lines of `.habit-hooks/config.toml`, which must show no new exclusion. Count the `{/*` occurrences at S and now across the slice files (`git grep -c '{/\*'`); the count must not rise. Read ten added comment lines.
**Scoring:**
- 1.0 — nothing found.
- 0.5 — one comment is a disguised restatement.
- 0.0 — any suppression, or a new exclusion, or a rise in JSX comments that carry kept text.

### C5 — tests and build are unchanged
**Must be true:** The viewer suite reports 260 passing tests or more. The Python suite passes, including the byte-comparison of `index.html`. The built script in `plugins/artifact/viewer/index.html` is byte-equal to S, because comments leave no trace in it. Its CSS may differ only by utility rules that Tailwind found in comment text.
**Evidence to check:** run the test command. Compare the `<script>` parts of `git show S:plugins/artifact/viewer/index.html` and the working file.
**Scoring:**
- 1.0 — all pass, and the script is equal.
- 0.5 — all pass, but the script differs only in ways that the rebuild test explains.
- 0.0 — any test fails, or the script changed.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged, except the sensor check `tests/test_viewer_habit_clean.py` and `tests/_viewer_habit_slices.py`, the new guard `tests/test_viewer_comments_only.py`, the kept-comments tables, the rebuilt `index.html`, and its bundle copy.

## Out of scope — do not penalise
- Comment findings in `*.test.*` files and `testSupport` folders. Slice 7 owns them.
- Structural findings. Slices 1 to 5 own them, and they stay as they are.
- Findings outside the viewer. Epic E2 owns them.
- A why-comment that stays as a finding, if it is recorded in the tables. That is the decision on record.
